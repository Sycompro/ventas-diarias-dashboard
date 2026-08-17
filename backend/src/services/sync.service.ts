import { db, sqlClient } from '../config/database.js';
import { redis } from '../config/redis.js';
import { companies, sales, saleItems, salePayments, syncLogs, purchases as purchasesTable, purchasePayments as purchasePaymentsTable } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import axios from 'axios';
import https from 'https';
import { decrypt } from './crypto.service.js';
import { createBillingClient, fetchDocuments, fetchReportDocuments, fetchSaleNotes, fetchSaleNoteDetail, fetchPurchases } from './billing-api.service.js';

function parseXmlItems(xmlText: string, isServiceItem: (desc: string) => boolean): any[] {
  const items: any[] = [];
  let startIdx = 0;
  
  let lineStartTag = '<cac:InvoiceLine>';
  let lineEndTag = '</cac:InvoiceLine>';
  let qtyTagPattern = /<cbc:InvoicedQuantity\s+unitCode="([^"]+)">([^<]+)<\/cbc:InvoicedQuantity>/;
  
  if (xmlText.includes('<cac:CreditNoteLine>')) {
    lineStartTag = '<cac:CreditNoteLine>';
    lineEndTag = '</cac:CreditNoteLine>';
    qtyTagPattern = /<cbc:CreditedQuantity\s+unitCode="([^"]+)">([^<]+)<\/cbc:CreditedQuantity>/;
  } else if (xmlText.includes('<cac:DebitNoteLine>')) {
    lineStartTag = '<cac:DebitNoteLine>';
    lineEndTag = '</cac:DebitNoteLine>';
    qtyTagPattern = /<cbc:DebitedQuantity\s+unitCode="([^"]+)">([^<]+)<\/cbc:DebitedQuantity>/;
  }
  
  while (true) {
    const startNode = xmlText.indexOf(lineStartTag, startIdx);
    if (startNode === -1) break;
    const endNode = xmlText.indexOf(lineEndTag, startNode);
    if (endNode === -1) break;
    
    const lineText = xmlText.substring(startNode, endNode + lineEndTag.length);
    startIdx = endNode + lineEndTag.length;
    
    // Extract description
    let description = 'Ítem';
    const descMatch = lineText.match(/<cbc:Description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/cbc:Description>/);
    if (descMatch) {
      description = descMatch[1].trim();
    }
    
    // Extract quantity and unitCode
    let quantity = '1';
    let unitCode = 'NIU';
    const qtyMatch = lineText.match(qtyTagPattern);
    if (qtyMatch) {
      unitCode = qtyMatch[1];
      quantity = qtyMatch[2].trim();
    }
    
    // Extract price including tax (AlternativeConditionPrice)
    let unitPrice = '0';
    const priceMatch = lineText.match(/<cac:AlternativeConditionPrice>[\s\S]*?<cbc:PriceAmount[^>]*>([^<]+)<\/cbc:PriceAmount>/);
    if (priceMatch) {
      unitPrice = priceMatch[1].trim();
    } else {
      // Fallback to base price
      const basePriceMatch = lineText.match(/<cac:Price>[\s\S]*?<cbc:PriceAmount[^>]*>([^<]+)<\/cbc:PriceAmount>/);
      if (basePriceMatch) {
        unitPrice = basePriceMatch[1].trim();
      }
    }
    
    const qtyVal = parseFloat(quantity) || 0;
    const priceVal = parseFloat(unitPrice) || 0;
    const total = (qtyVal * priceVal).toFixed(2);
    
    const isService = unitCode === 'ZZ' || isServiceItem(description);
    const category = isService ? '02' : '01';
    
    items.push({
      description,
      quantity,
      unitPrice,
      total,
      category,
      unitType: unitCode
    });
  }
  
  return items;
}

export interface SyncResult {
  syncedCount: number;
}

function parseDocumentIssuedAt(item: any): Date {
  try {
    let timePart = '00:00:00';
    if (item.time_of_issue) {
      timePart = item.time_of_issue;
    } else if (item.time) {
      timePart = item.time;
    } else if (item.created_at) {
      const match = item.created_at.match(/(\d{2}:\d{2}:\d{2})/);
      if (match) timePart = match[1];
    }

    let datePart = '';
    if (item.date_of_issue && item.date_of_issue.includes('-')) {
      const parts = item.date_of_issue.split('-');
      if (parts[0].length === 4) {
        datePart = item.date_of_issue;
      } else {
        const [day, month, year] = parts;
        datePart = `${year}-${month}-${day}`;
      }
    } else if (item.created_at) {
      datePart = item.created_at.split(' ')[0];
    }

    if (datePart) {
      const isoString = `${datePart}T${timePart}-05:00`;
      const d = new Date(isoString);
      if (!isNaN(d.getTime())) return d;
    }
  } catch (e) {
    // fallback
  }
  return new Date();
}

export async function syncCompany(companyId: string, days: number = 90, customStart?: string, customEnd?: string): Promise<SyncResult> {
  const startedAt = new Date();
  let syncStatus = 'success';
  let documentsSynced = 0;
  let errorMessage: string | null = null;
  
  try {
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId)
    });
    
    if (!company) throw new Error('Company not found');
    
    const decryptedToken = decrypt(company.apiTokenEncrypted, company.apiTokenIv, company.apiTokenTag);
    const client = createBillingClient(company.subdomain, decryptedToken);
    
    // Fetch company configuration to get active payment methods
    let paymentMethods: any[] = [];
    try {
      const companyConfigRes = await client.get('/company');
      paymentMethods = companyConfigRes.data?.payment_method_types || [];
    } catch (e: any) {
      console.warn(`[Sync Service] Warning: Could not fetch company config for payment methods mapping:`, e.message);
    }
    
    // Helper to resolve paymentMethodId from description
    const getPaymentMethodId = (description: string): string => {
      const descUpper = description.trim().toUpperCase();
      const match = paymentMethods.find((m: any) => m.description.trim().toUpperCase() === descUpper);
      if (match) return match.id;
      
      // Fallbacks
      if (descUpper === 'EFECTIVO') return '01';
      if (descUpper === 'YAPE') return '02';
      if (descUpper === 'TARJETA DE DÉBITO' || descUpper === 'TARJETA DE DEBITO') return '03';
      if (descUpper === 'TRANSFERENCIA') return '04';
      if (descUpper === 'CRÉDITO' || descUpper === 'CREDITO') return '99';
      if (descUpper.includes('VISA') || descUpper.includes('TARJETA') || descUpper.includes('CREDITO') || descUpper.includes('CRÉDITO')) return '06';
      if (descUpper === 'CONTADO') return '10';
      
      return '01'; // Default to Efectivo
    };
    
    // Sincronización inteligente de rango de días
    const dateEnd = new Date();
    const dateStart = new Date();
    dateStart.setDate(dateStart.getDate() - days);
    
    const startDateStr = customStart || dateStart.toISOString().split('T')[0];
    const endDateStr = customEnd || dateEnd.toISOString().split('T')[0];
    
    // Helper to determine category: '02' for Service, '01' for Product
    const isServiceItem = (desc: string = ''): boolean => {
      const d = desc.toLowerCase();
      return (
        d.includes('mensual') ||
        d.includes('membres') ||
        d.includes('trimestral') ||
        d.includes('semestral') ||
        d.includes('anual') ||
        d.includes('semanal') ||
        d.includes('pase') ||
        d.includes('clase') ||
        d.includes('personal') ||
        d.includes('trainer') ||
        d.includes('servicio') ||
        d.includes('matricula') ||
        d.includes('matrícula') ||
        d.includes('inscrip') ||
        d.includes('mantenimiento') ||
        d.includes('reparacion') ||
        d.includes('instalacion') ||
        d.includes('consulta') ||
        d.includes('atencion') ||
        d.includes('asesoria') ||
        d.includes('nutricion') ||
        d.includes('fisioterapia') ||
        d.includes('ingreso') ||
        d.includes('ticket') ||
        d.includes('rutina') ||
        d.includes('crossfit') ||
        d.includes('fitness') ||
        d.includes('gym')
      );
    };

    // Calcular chunks de 10 días para evitar timeouts en facturador
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const dateChunks: { start: string; end: string }[] = [];
    let currentStart = new Date(start);
    
    while (currentStart <= end) {
      let currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + 9); // Bloques de 10 días
      if (currentEnd > end) {
        currentEnd = new Date(end);
      }
      dateChunks.push({
        start: currentStart.toISOString().split('T')[0],
        end: currentEnd.toISOString().split('T')[0]
      });
      currentStart.setDate(currentStart.getDate() + 10);
    }

    console.log(`[Sync Service] Empresa ${companyId}: Iniciando sincronización en ${dateChunks.length} bloques de fecha.`);

    for (const chunk of dateChunks) {
      console.log(`[Sync Service] Sincronizando bloque de ${chunk.start} a ${chunk.end}...`);
      
      let documents: any[] = [];
      try {
        documents = await fetchDocuments(client, chunk.start, chunk.end);
      } catch (docErr: any) {
        console.warn(`[Sync Service] Warning: Error al obtener documentos del ${chunk.start} al ${chunk.end}:`, docErr.message);
      }

      for (const doc of documents) {
        const stateId = String(doc.state_type_id);
        if (!['01', '03', '05', '07', '09', '11', '13'].includes(stateId)) continue;
        
        const docTypeId = String(doc.document_type_id || '03');
        const docNumber = String(doc.number || '');
        const issuedAt = parseDocumentIssuedAt(doc);
        const isVoided = ['09', '11', '13'].includes(stateId);
        
        let parsedSeries = '';
        let parsedNumber = '';
        if (docNumber && docNumber.includes('-')) {
          const parts = docNumber.split('-');
          parsedSeries = parts[0];
          parsedNumber = parts[1];
        } else {
          parsedSeries = doc.series || '';
          parsedNumber = docNumber;
        }
        
        const docAny = doc as any;
        const sellerName = doc.user_name || docAny.seller_name || docAny.user?.name || docAny.seller || 'Desconocido';
        const customerName = doc.customer_name || docAny.customer_name || docAny.name_customer || 'Cliente Varios';
        const totalAmount = parseFloat(doc.total as any || 0).toString();

        const rawJson = {
          ...doc,
          establishment_id: docAny.establishment_id || docAny.establishment?.id || null,
          user_name: sellerName,
          customer_name: customerName,
        };
        
        const externalId = doc.external_id ? String(doc.external_id) : `doc_${docTypeId}_${docNumber}`;
        
        const [insertedSale] = await db.insert(sales).values({
          companyId,
          externalId,
          documentTypeId: docTypeId,
          series: parsedSeries,
          number: parsedNumber,
          total: totalAmount,
          currency: docAny.currency_type_id || 'PEN',
          sellerName,
          customerName,
          issuedAt,
          status: isVoided ? 'voided' : 'active',
          rawJson,
        }).onConflictDoUpdate({
          target: [sales.companyId, sales.externalId],
          set: {
            series: parsedSeries,
            number: parsedNumber,
            total: totalAmount,
            sellerName,
            customerName,
            status: isVoided ? 'voided' : 'active',
            issuedAt,
            rawJson,
            syncedAt: new Date(),
          },
        }).returning({ id: sales.id });
        
        if (insertedSale) {
          await db.delete(saleItems).where(eq(saleItems.saleId, insertedSale.id));
          
          if (docAny.items && Array.isArray(docAny.items) && docAny.items.length > 0) {
            for (const item of docAny.items) {
              const rawItemAny = item as any;
              const itDesc = rawItemAny.description || rawItemAny.item?.description || 'Ítem';
              const itUnit = rawItemAny.unit_type_id || rawItemAny.item?.unit_type_id || 'NIU';
              const itQty = (rawItemAny.quantity || 1).toString();
              const itPrice = (rawItemAny.unit_price || rawItemAny.unit_value || totalAmount).toString();
              const itTotal = (rawItemAny.total || totalAmount).toString();
              
              const isService = itUnit === 'ZZ' || isServiceItem(itDesc);
              const cat = isService ? '02' : '01';

              await db.insert(saleItems).values({
                saleId: insertedSale.id,
                description: itDesc,
                quantity: itQty,
                unitPrice: itPrice,
                total: itTotal,
                category: cat,
                unitType: itUnit || null
              });
            }
          } else {
            let parsedItems: any[] = [];
            if (doc.download_xml) {
              try {
                const xmlRes = await axios.get(doc.download_xml, {
                  responseType: 'text',
                  timeout: 7000,
                  httpsAgent: new https.Agent({ rejectUnauthorized: false })
                });
                const xmlText = xmlRes.data;
                parsedItems = parseXmlItems(xmlText, isServiceItem);
              } catch (xmlErr: any) {
                console.warn(`[Sync Service] Error downloading/parsing XML for ${doc.number || doc.id}:`, xmlErr.message);
              }
            }

            if (parsedItems.length > 0) {
              for (const item of parsedItems) {
                await db.insert(saleItems).values({
                  saleId: insertedSale.id,
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  total: item.total,
                  category: item.category,
                  unitType: item.unitType || null
                });
              }
            } else {
              const totalNum = parseFloat(totalAmount) || 0;
              const isService = totalNum >= 25.0 || totalNum === 8.0;
              const itemCategory = isService ? '02' : '01';
              const itemDescription = isService 
                ? (totalNum === 8.0 ? 'Rutina Diaria (Pase Diario)' : `Servicio / Membresía (S/. ${totalNum.toFixed(2)})`)
                : `Producto / Bebida (S/. ${totalNum.toFixed(2)})`;

              await db.insert(saleItems).values({
                saleId: insertedSale.id,
                description: itemDescription,
                quantity: '1',
                unitPrice: totalAmount,
                total: totalAmount,
                category: itemCategory,
                unitType: isService ? 'ZZ' : 'NIU'
              });
            }
          }

          await db.delete(salePayments).where(eq(salePayments.saleId, insertedSale.id));
          
          let pList: any[] = [];
          if (docAny.payments) {
            if (Array.isArray(docAny.payments)) {
              pList = docAny.payments;
            } else if (typeof docAny.payments === 'object') {
              if (Array.isArray(docAny.payments.PAGOS)) {
                pList = docAny.payments.PAGOS;
              } else if (Array.isArray(docAny.payments.CUOTA)) {
                pList = docAny.payments.CUOTA;
              } else {
                pList = Object.values(docAny.payments);
              }
            }
          }

          if (pList.length > 0) {
            for (const p of pList) {
              const pType = String(p.payment_method_type_id || p.codigo || p.id || '01');
              const pAmount = (p.payment || p.amount || p.total || totalAmount).toString();
              const pRef = p.reference || p.referencia || p.destination_description || '';
              
              await db.insert(salePayments).values({
                saleId: insertedSale.id,
                paymentMethodId: getPaymentMethodId(p.payment_method_type?.description || p.description || 'Efectivo'),
                amount: pAmount,
                reference: pRef,
              });
            }
          } else {
            await db.insert(salePayments).values({
              saleId: insertedSale.id,
              paymentMethodId: '01',
              amount: totalAmount,
              reference: 'Default Cash Payment (Synced)',
            });
          }
          
          documentsSynced++;
        }
      }
    }

    console.log(`[Sync Service] Consultando notas de venta del ${startDateStr} al ${endDateStr}...`);
    let saleNotes: any[] = [];
    try {
      saleNotes = await fetchSaleNotes(client, startDateStr, endDateStr);
    } catch (noteErr: any) {
      console.warn(`[Sync Service] Warning: Error al obtener notas de venta:`, noteErr.message);
    }

    for (const note of saleNotes) {
      const stateId = String(note.state_type_id);
      if (!['01', '03', '05', '07', '09', '11', '13'].includes(stateId)) continue;

      const issuedAt = parseDocumentIssuedAt(note);
      const isVoided = ['09', '11', '13'].includes(stateId);
      
      let parsedSeries = note.series || '';
      let parsedNumber = String(note.number || '');
      if (note.number_full && String(note.number_full).includes('-')) {
        const parts = String(note.number_full).split('-');
        parsedSeries = parts[0];
        parsedNumber = parts[1];
      } else if (note.identifier && String(note.identifier).includes('-')) {
        const parts = String(note.identifier).split('-');
        parsedSeries = parts[0];
        parsedNumber = parts[1];
      }

      const sellerName = note.user_name || note.seller_name || note.user?.name || note.seller || 'Desconocido';

      const [insertedSale] = await db.insert(sales).values({
        companyId,
        externalId: String(note.external_id || note.id),
        documentTypeId: '80',
        series: parsedSeries,
        number: parsedNumber,
        total: note.total.toString(),
        currency: note.currency_type_id || 'PEN',
        sellerName,
        customerName: note.customer_name || 'Cliente Varios',
        issuedAt,
        status: isVoided ? 'voided' : 'active',
        rawJson: {
          ...note,
          establishment_id: note.seller?.establishment_id || note.establishment_id || null,
          establishment_description: note.seller?.establishment?.description || note.establishment?.description || null,
        },
      }).onConflictDoUpdate({
        target: [sales.companyId, sales.externalId],
        set: {
          series: parsedSeries,
          number: parsedNumber,
          total: note.total.toString(),
          sellerName,
          customerName: note.customer_name || 'Cliente Varios',
          status: isVoided ? 'voided' : 'active',
          issuedAt,
          rawJson: {
            ...note,
            establishment_id: note.seller?.establishment_id || note.establishment_id || null,
            establishment_description: note.seller?.establishment?.description || note.establishment?.description || null,
          },
          syncedAt: new Date(),
        },
      }).returning({ id: sales.id });

      if (insertedSale) {
        await db.delete(saleItems).where(eq(saleItems.saleId, insertedSale.id));

        const noteItems = note.items || note.items_for_report || [];

        if (Array.isArray(noteItems) && noteItems.length > 0) {
          const count = noteItems.length || 1;
          const totalNum = parseFloat(note.total || '0') || 0;
          const fallbackItemTotal = (totalNum / count).toFixed(2);

          await db.insert(saleItems).values(
            noteItems.map((item: any) => {
              const itDesc = item.item?.description || item.description || 'Ítem';
              const itUnit = item.item?.unit_type_id || item.unit_type_id || 'NIU';
              const itemQty = parseFloat(item.quantity || '1') || 1;
              const itTotal = item.total ? String(item.total) : (item.unit_price ? (parseFloat(item.unit_price) * itemQty).toFixed(2) : fallbackItemTotal);
              const unitPrice = item.unit_price ? String(item.unit_price) : (parseFloat(itTotal) / itemQty).toFixed(2);
              const isService = itUnit === 'ZZ' || isServiceItem(itDesc);
              return {
                saleId: insertedSale.id,
                description: itDesc,
                quantity: itemQty.toString(),
                unitPrice,
                total: itTotal,
                category: isService ? '02' : '01',
                unitType: itUnit || null,
              };
            })
          );
        } else {
          const totalNum = parseFloat(note.total || '0') || 0;
          const isService = totalNum >= 25.0 || totalNum === 8.0;
          const itemCategory = isService ? '02' : '01';
          const itemDescription = isService
            ? (totalNum === 8.0 ? 'Rutina Diaria (Pase Diario)' : `Servicio / Membresía (S/. ${totalNum.toFixed(2)})`)
            : `Producto / Bebida (S/. ${totalNum.toFixed(2)})`;

          await db.insert(saleItems).values({
            saleId: insertedSale.id,
            description: itemDescription,
            quantity: '1',
            unitPrice: note.total.toString(),
            total: note.total.toString(),
            category: itemCategory,
            unitType: isService ? 'ZZ' : 'NIU'
          });
        }

        await db.delete(salePayments).where(eq(salePayments.saleId, insertedSale.id));

        if (note.payments && note.payments.length > 0) {
          await db.insert(salePayments).values(
            note.payments.map((p: any) => ({
              saleId: insertedSale.id,
              paymentMethodId: getPaymentMethodId(p.payment_method_type?.description || p.description || 'Efectivo'),
              amount: (p.payment || p.amount || note.total).toString(),
              reference: p.reference || '',
            }))
          );
        } else {
          await db.insert(salePayments).values({
            saleId: insertedSale.id,
            paymentMethodId: '01',
            amount: note.total.toString(),
            reference: 'Default Cash Payment (Synced NV)',
          });
        }

        documentsSynced++;
      }
    }

    console.log(`[Sync Service] Consultando compras del ${startDateStr} al ${endDateStr}...`);
    let purchasesList: any[] = [];
    try {
      purchasesList = await fetchPurchases(client, startDateStr, endDateStr);
    } catch (purchErr: any) {
      console.warn(`[Sync Service] Warning: Error al obtener compras:`, purchErr.message);
    }

    for (const purchase of purchasesList) {
      const stateId = String(purchase.state_type_id);
      if (!['01', '03', '05', '07', '09', '11', '13'].includes(stateId)) continue;

      const issuedAt = parseDocumentIssuedAt(purchase);
      const isVoided = ['09', '11', '13'].includes(stateId);
      
      const numberFull = purchase.number || '';
      const supplierName = purchase.supplier?.name || purchase.supplier_name || 'Proveedor Varios';

      const [insertedPurchase] = await db.insert(purchasesTable).values({
        companyId,
        externalId: String(purchase.external_id || purchase.id),
        number: numberFull,
        total: purchase.total.toString(),
        currency: purchase.currency_type_id || 'PEN',
        supplierName,
        issuedAt,
        status: isVoided ? 'voided' : 'active',
        rawJson: purchase,
        establishmentId: purchase.establishment_id || null,
      }).onConflictDoUpdate({
        target: [purchasesTable.companyId, purchasesTable.externalId],
        set: {
          number: numberFull,
          total: purchase.total.toString(),
          supplierName,
          status: isVoided ? 'voided' : 'active',
          issuedAt,
          rawJson: purchase,
          establishmentId: purchase.establishment_id || null,
          syncedAt: new Date(),
        },
      }).returning({ id: purchasesTable.id });

      if (insertedPurchase) {
        await db.delete(purchasePaymentsTable).where(eq(purchasePaymentsTable.purchaseId, insertedPurchase.id));

        if (purchase.payments && purchase.payments.length > 0) {
          await db.insert(purchasePaymentsTable).values(
            purchase.payments.map((p: any) => ({
              purchaseId: insertedPurchase.id,
              paymentMethodId: getPaymentMethodId(p.payment_method_type?.description || p.description || 'Efectivo'),
              amount: (p.payment || p.amount || purchase.total).toString(),
              reference: p.reference || '',
            }))
          );
        } else {
          await db.insert(purchasePaymentsTable).values({
            purchaseId: insertedPurchase.id,
            paymentMethodId: '01',
            amount: purchase.total.toString(),
            reference: 'Default Cash Purchase (Synced)',
          });
        }
      }
    }

    // 3. Limpieza automática de duplicados históricos asegurando exactamente 1 registro por documento oficial
    try {
      await sqlClient`
        DELETE FROM sales a USING sales b
        WHERE a.id < b.id 
          AND a.company_id = b.company_id 
          AND a.document_type_id = b.document_type_id 
          AND a.series = b.series 
          AND a.number = b.number;
      `;
    } catch (dedupErr: any) {
      console.warn(`[Sync Service] Warning during sales deduplication:`, dedupErr.message);
    }
  } catch (error: any) {
    syncStatus = 'failed';
    errorMessage = error.message;
    console.error(`Error syncing company ${companyId}:`, error);
  } finally {
    await db.insert(syncLogs).values({
      companyId,
      syncType: 'scheduled',
      status: syncStatus,
      documentsSynced,
      errorMessage,
      startedAt,
      finishedAt: new Date(),
    });

    try {
      const keys = await redis.keys(`*${companyId}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (redisErr) {
      // ignore
    }
  }
  
  return { syncedCount: documentsSynced };
}

export async function syncAllCompanies(days: number = 5): Promise<void> {
  const activeCompanies = await db.query.companies.findMany({
    where: eq(companies.isActive, true)
  });
  
  const results = await Promise.allSettled(
    activeCompanies.map(c => syncCompany(c.id, days))
  );
  
  results.forEach((result, idx) => {
    if (result.status === 'rejected') {
      console.error(`Sincronización fallida para la empresa ${activeCompanies[idx].id}:`, result.reason);
    }
  });
}
