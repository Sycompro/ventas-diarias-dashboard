import { db } from '../config/database.js';
import { companies, sales, saleItems, salePayments, syncLogs } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import axios from 'axios';
import https from 'https';
import { decrypt } from './crypto.service.js';
import { createBillingClient, fetchDocuments, fetchReportDocuments, fetchSaleNotes, fetchSaleNoteDetail } from './billing-api.service.js';

export interface SyncResult {
  syncedCount: number;
}

export async function syncCompany(companyId: string): Promise<SyncResult> {
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
      if (descUpper.includes('VISA') || descUpper.includes('TARJETA') || descUpper.includes('CREDITO') || descUpper.includes('CRÉDITO')) return '06';
      if (descUpper === 'CONTADO') return '10';
      
      return '01'; // Default to Efectivo
    };
    
    // Sincronizamos por defecto los últimos 30 días
    const dateEnd = new Date();
    const dateStart = new Date();
    dateStart.setDate(dateStart.getDate() - 30);
    
    const startDateStr = dateStart.toISOString().split('T')[0];
    const endDateStr = dateEnd.toISOString().split('T')[0];
    
    // Fetch documents list (main metadata)
    const documents = await fetchDocuments(client, startDateStr, endDateStr);
    
    // Fetch report documents (contains desgloses de pagos in PAGOS key)
    const reportDocs = await fetchReportDocuments(client, startDateStr, endDateStr);
    
    // Build a map of key -> payments array
    const paymentsLookup = new Map<string, any[]>();
    for (const rd of reportDocs) {
      const key = `${rd.document_type_id}_${rd.number}`;
      if (rd.payments && Array.isArray(rd.payments.PAGOS)) {
        paymentsLookup.set(key, rd.payments.PAGOS);
      }
    }
    
    for (const doc of documents) {
      const stateId = String(doc.state_type_id);
      // Procesar documentos con estado válido o anulados/rechazados (01=registrado, 03=enviado, 05=aceptado, 11=anulado, 09=anulado, 13=anulado)
      if (!['01', '03', '05', '07', '09', '11', '13'].includes(stateId)) continue;
      
      let issuedAt: Date;
      try {
        if (doc.date_of_issue && doc.date_of_issue.includes('-')) {
          const parts = doc.date_of_issue.split('-');
          if (parts[0].length === 4) {
            // YYYY-MM-DD
            issuedAt = new Date(`${doc.date_of_issue}T${doc.time_of_issue || '00:00:00'}`);
          } else {
            // DD-MM-YYYY
            const [day, month, year] = parts;
            issuedAt = new Date(`${year}-${month}-${day}T${doc.time_of_issue || '00:00:00'}`);
          }
        } else {
          issuedAt = new Date(`${doc.date_of_issue}T${doc.time_of_issue || '00:00:00'}`);
        }
        
        if (isNaN(issuedAt.getTime())) {
          issuedAt = new Date();
        }
      } catch (e) {
        issuedAt = new Date();
      }

      const isVoided = ['09', '11', '13'].includes(stateId);
      
      let parsedSeries = '';
      let parsedNumber = '';
      if (doc.number && doc.number.includes('-')) {
        const parts = doc.number.split('-');
        parsedSeries = parts[0];
        parsedNumber = parts[1];
      } else {
        parsedSeries = doc.series || '';
        parsedNumber = doc.number || '';
      }
      
      const [insertedSale] = await db.insert(sales).values({
        companyId,
        externalId: String(doc.external_id || doc.id),
        documentTypeId: doc.document_type_id,
        series: parsedSeries,
        number: parsedNumber,
        total: doc.total.toString(),
        currency: 'PEN',
        sellerName: doc.user_name || 'Desconocido',
        customerName: doc.customer_name || 'Cliente Varios',
        issuedAt,
        status: isVoided ? 'voided' : 'active',
        rawJson: doc,
      }).onConflictDoUpdate({
        target: [sales.companyId, sales.externalId],
        set: {
          series: parsedSeries,
          number: parsedNumber,
          total: doc.total.toString(),
          status: isVoided ? 'voided' : 'active',
          syncedAt: new Date(),
        },
      }).returning({ id: sales.id });
      
      if (insertedSale) {
        // Verificar si ya tiene items guardados
        const existingItems = await db
          .select()
          .from(saleItems)
          .where(eq(saleItems.saleId, insertedSale.id));

        const needsSync = existingItems.length === 0 ||
          (existingItems.length === 1 && existingItems[0].description === 'Venta de Bienes o Servicios (Consolidado)');

        if (needsSync) {
          let itemsToInsert: any[] = [];

          if (doc.download_xml) {
            try {
              const response = await fetch(doc.download_xml, {
                method: 'GET',
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'application/xml, text/xml, */*'
                }
              });
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const xmlText = await response.text();
              
              // Parsear items desde XML
              let startIdx = 0;
              while (true) {
                const startNode = xmlText.indexOf('<cac:InvoiceLine>', startIdx);
                if (startNode === -1) break;
                const endNode = xmlText.indexOf('</cac:InvoiceLine>', startNode);
                if (endNode === -1) break;
                
                const lineText = xmlText.substring(startNode, endNode + '</cac:InvoiceLine>'.length);
                startIdx = endNode + '</cac:InvoiceLine>'.length;
                
                let description = '';
                const descMatch = lineText.match(/<cbc:Description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/cbc:Description>/);
                if (descMatch) {
                  description = descMatch[1].trim();
                }
                
                let quantity = '1';
                let unitCode = '';
                const qtyMatch = lineText.match(/<cbc:InvoicedQuantity\s+unitCode="([^"]+)">([^<]+)<\/cbc:InvoicedQuantity>/);
                if (qtyMatch) {
                  unitCode = qtyMatch[1];
                  quantity = qtyMatch[2].trim();
                }
                
                let unitPrice = '0';
                const priceMatch = lineText.match(/<cac:AlternativeConditionPrice>[\s\S]*?<cbc:PriceAmount[^>]*>([^<]+)<\/cbc:PriceAmount>/);
                if (priceMatch) {
                  unitPrice = priceMatch[1].trim();
                } else {
                  const basePriceMatch = lineText.match(/<cac:Price>[\s\S]*?<cbc:PriceAmount[^>]*>([^<]+)<\/cbc:PriceAmount>/);
                  if (basePriceMatch) {
                    unitPrice = basePriceMatch[1].trim();
                  }
                }
                
                const qtyVal = parseFloat(quantity) || 0;
                const priceVal = parseFloat(unitPrice) || 0;
                const total = (qtyVal * priceVal).toFixed(2);
                
                const category = unitCode === 'ZZ' ? '02' : '01';
                
                itemsToInsert.push({
                  saleId: insertedSale.id,
                  description,
                  quantity,
                  unitPrice,
                  total,
                  category
                });
              }
            } catch (err: any) {
              console.warn(`[Sync Service] Warning: Failed to download/parse XML for doc ${doc.number}:`, err.message);
            }
          }

          // Fallback si no se pudieron extraer items del XML
          if (itemsToInsert.length === 0) {
            itemsToInsert.push({
              saleId: insertedSale.id,
              description: 'Venta de Bienes o Servicios (Consolidado)',
              quantity: '1',
              unitPrice: doc.total.toString(),
              total: doc.total.toString(),
              category: '01' // Default a Producto
            });
          }

          // Insertar los items
          await db.delete(saleItems).where(eq(saleItems.saleId, insertedSale.id));
          await db.insert(saleItems).values(itemsToInsert);
        }
      }
      
      if (insertedSale) {
        // Delete any existing payments for this sale to avoid duplicates
        await db.delete(salePayments).where(eq(salePayments.saleId, insertedSale.id));
        
        // Search payments in report lookup map
        const lookupKey = `${doc.document_type_id}_${doc.number}`;
        const reportPayments = paymentsLookup.get(lookupKey);
        
        if (reportPayments && reportPayments.length > 0) {
          await db.insert(salePayments).values(
            reportPayments.map(p => ({
              saleId: insertedSale.id,
              paymentMethodId: getPaymentMethodId(p.description),
              amount: p.amount.toString(),
              reference: p.reference || '',
            }))
          );
        } else {
          // Fallback: If no payments are registered, insert a default payment as Cash (Efectivo - "01")
          await db.insert(salePayments).values({
            saleId: insertedSale.id,
            paymentMethodId: '01',
            amount: doc.total.toString(),
            reference: 'Default Cash Payment (Synced)',
          });
        }
      }
      documentsSynced++;
    }

    // Sincronizar Notas de Venta (document_type_id = '80')
    let saleNotes: any[] = [];
    try {
      saleNotes = await fetchSaleNotes(client, startDateStr, endDateStr);
    } catch (e: any) {
      console.warn(`[Sync Service] Warning: Could not fetch sale notes:`, e.message);
    }

    for (const note of saleNotes) {
      const stateId = String(note.state_type_id);
      // Procesar notas de venta con estado válido o anuladas/rechazadas (01=registrado, 03=enviado, 05=aceptado, 11=anulado, 09=anulado, 13=anulado)
      if (!['01', '03', '05', '07', '09', '11', '13'].includes(stateId)) continue;

      let issuedAt: Date;
      try {
        if (note.date_of_issue && note.date_of_issue.includes('-')) {
          const parts = note.date_of_issue.split('-');
          if (parts[0].length === 4) {
            issuedAt = new Date(`${note.date_of_issue}T${note.time_of_issue || '00:00:00'}`);
          } else {
            const [day, month, year] = parts;
            issuedAt = new Date(`${year}-${month}-${day}T${note.time_of_issue || '00:00:00'}`);
          }
        } else {
          issuedAt = new Date(`${note.date_of_issue}T${note.time_of_issue || '00:00:00'}`);
        }
        if (isNaN(issuedAt.getTime())) {
          issuedAt = new Date();
        }
      } catch (e) {
        issuedAt = new Date();
      }

      const isVoided = ['09', '11', '13'].includes(stateId);
      
      let parsedSeries = note.series || '';
      let parsedNumber = note.number || '';
      if (!parsedSeries && note.number_full && note.number_full.includes('-')) {
        const parts = note.number_full.split('-');
        parsedSeries = parts[0];
        parsedNumber = parts[1];
      }

      const [insertedSale] = await db.insert(sales).values({
        companyId,
        externalId: String(note.external_id || note.id),
        documentTypeId: '80', // Codigo para Nota de Venta
        series: parsedSeries,
        number: parsedNumber,
        total: note.total.toString(),
        currency: note.currency_type_id || 'PEN',
        sellerName: note.seller_name || 'Desconocido',
        customerName: note.customer_name || 'Cliente Varios',
        issuedAt,
        status: isVoided ? 'voided' : 'active',
        rawJson: note,
      }).onConflictDoUpdate({
        target: [sales.companyId, sales.externalId],
        set: {
          series: parsedSeries,
          number: parsedNumber,
          total: note.total.toString(),
          status: isVoided ? 'voided' : 'active',
          syncedAt: new Date(),
        },
      }).returning({ id: sales.id });

      if (insertedSale) {
        // Primero borrar items previos
        await db.delete(saleItems).where(eq(saleItems.saleId, insertedSale.id));

        // Intentar obtener los items detallados desde el record endpoint
        let detailedItems: any[] | null = null;
        try {
          const detail = await fetchSaleNoteDetail(client, note.external_id);
          if (detail && Array.isArray(detail.items)) {
            detailedItems = detail.items;
          }
        } catch (err: any) {
          // Ignorar fallas del record endpoint
        }

        if (detailedItems && detailedItems.length > 0) {
          await db.insert(saleItems).values(
            detailedItems.map(item => ({
              saleId: insertedSale.id,
              description: item.item?.description || item.description,
              quantity: item.quantity.toString(),
              unitPrice: item.unit_price ? item.unit_price.toString() : '0',
              total: item.total ? item.total.toString() : '0',
              category: item.item?.item_type_id || ((item.item?.description || item.description || '').toLowerCase().includes('servicio') ? '02' : '01'),
            }))
          );
        } else if (note.items_for_report && note.items_for_report.length > 0) {
          // Fallback a items_for_report si no hay detalle
          await db.insert(saleItems).values(
            note.items_for_report.map((item: any) => ({
              saleId: insertedSale.id,
              description: item.description,
              quantity: item.quantity.toString(),
              unitPrice: '0',
              total: '0',
              category: (item.description || '').toLowerCase().includes('servicio') ? '02' : '01',
            }))
          );
        }
      }

      if (insertedSale) {
        // Borrar pagos anteriores
        await db.delete(salePayments).where(eq(salePayments.saleId, insertedSale.id));

        if (note.payments && note.payments.length > 0) {
          await db.insert(salePayments).values(
            note.payments.map((p: any) => ({
              saleId: insertedSale.id,
              paymentMethodId: p.payment_method_type_id || '01',
              amount: (p.payment || p.amount || note.total).toString(),
              reference: p.reference || '',
            }))
          );
        } else {
          // Fallback a Efectivo (Cash - "01")
          await db.insert(salePayments).values({
            saleId: insertedSale.id,
            paymentMethodId: '01',
            amount: note.total.toString(),
            reference: 'Default Cash Payment (Synced NV)',
          });
        }
      }

      documentsSynced++;
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
  }
  
  return { syncedCount: documentsSynced };
}

export async function syncAllCompanies(): Promise<void> {
  const activeCompanies = await db.query.companies.findMany({
    where: eq(companies.isActive, true)
  });
  
  const results = await Promise.allSettled(
    activeCompanies.map(c => syncCompany(c.id))
  );
  
  results.forEach((result, idx) => {
    if (result.status === 'rejected') {
      console.error(`Sincronización fallida para la empresa ${activeCompanies[idx].id}:`, result.reason);
    }
  });
}
