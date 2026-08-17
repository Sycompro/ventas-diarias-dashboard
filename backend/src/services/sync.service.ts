import { db } from '../config/database.js';
import { redis } from '../config/redis.js';
import { companies, sales, saleItems, salePayments, syncLogs } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import axios from 'axios';
import https from 'https';
import { decrypt } from './crypto.service.js';
import { createBillingClient, fetchDocuments, fetchReportDocuments, fetchSaleNotes, fetchSaleNoteDetail } from './billing-api.service.js';

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
      
      // 1. Fetch y procesar Documentos
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

        // Guardar el establecimiento real en rawJson
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
          // 1. Items
          await db.delete(saleItems).where(eq(saleItems.saleId, insertedSale.id));
          if (docAny.items && Array.isArray(docAny.items) && docAny.items.length > 0) {
            for (const rawItem of docAny.items) {
              const rawItemAny = rawItem as any;
              const itDesc = rawItemAny.item?.description || rawItemAny.description || 'Ítem';
              const itUnit = rawItemAny.item?.unit_type_id || rawItemAny.unit_type_id || 'NIU';
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
                category: cat
              });
            }
          } else {
            // Fallback inteligente para clasificar por negocio
            const totalNum = parseFloat(totalAmount) || 0;
            let itemCategory = '02';
            let itemDescription = 'Servicio General';

            const isGymOrServiceCompany = company.subdomain?.toLowerCase().includes('gym') || company.name?.toLowerCase().includes('gym');
            if (isGymOrServiceCompany) {
              if (totalNum === 8.0) {
                itemCategory = '02';
                itemDescription = 'Rutina Diaria (Pase Diario)';
              } else if (totalNum === 80.0) {
                itemCategory = '02';
                itemDescription = 'Rutina Mensual';
              } else if (totalNum === 180.0 || totalNum === 60.0) {
                itemCategory = '02';
                itemDescription = 'Rutina de Tres Meses';
              } else if (totalNum === 75.0) {
                itemCategory = '02';
                itemDescription = 'Promo 3 Personas';
              } else if (totalNum === 70.0) {
                itemCategory = '02';
                itemDescription = 'Promo 5 Personas';
              } else if (totalNum >= 25.0) {
                itemCategory = '02';
                itemDescription = `Rutina / Membresía (S/. ${totalNum.toFixed(2)})`;
              } else {
                itemCategory = '01';
                if (totalNum === 1.5 || totalNum === 2.0) itemDescription = 'Agua Mineral San Carlos';
                else if (totalNum === 2.5) itemDescription = 'Gatorade / Agua San Luis';
                else if (totalNum === 3.0) itemDescription = 'Agua San Luis 1L / Powerade';
                else if (totalNum === 5.0) itemDescription = 'Dilyte / Quemador';
                else if (totalNum === 6.0) itemDescription = 'Bebida Fury Energy / Proteína Sachet';
                else if (totalNum === 7.0) itemDescription = 'Pre Entreno Sachet';
                else if (totalNum === 10.0) itemDescription = 'Monster Energy 473ml';
                else itemDescription = `Bebida / Suplemento Físico (S/. ${totalNum.toFixed(2)})`;
              }
            } else {
              itemCategory = totalNum > 50 ? '02' : '01';
              itemDescription = itemCategory === '02' ? 'Servicio General' : 'Venta de Producto / Mercadería';
            }

            await db.insert(saleItems).values({
              saleId: insertedSale.id,
              description: itemDescription,
              quantity: '1',
              unitPrice: totalAmount,
              total: totalAmount,
              category: itemCategory
            });
          }

          // 2. Payments
          await db.delete(salePayments).where(eq(salePayments.saleId, insertedSale.id));
          
          let pList: any[] = [];
          const rawPayments = docAny.payments?.PAGOS || docAny.payments?.CUOTA || docAny.payments || [];
          if (Array.isArray(rawPayments)) {
            pList = rawPayments;
          } else if (rawPayments && typeof rawPayments === 'object') {
            pList = Array.isArray(rawPayments.PAGOS) ? rawPayments.PAGOS : (Array.isArray(rawPayments.CUOTA) ? rawPayments.CUOTA : []);
          }

          if (pList.length > 0) {
            await db.insert(salePayments).values(
              pList.map((p: any) => ({
                saleId: insertedSale.id,
                paymentMethodId: getPaymentMethodId(p.description || p.payment_method_type?.description || 'Efectivo'),
                amount: (p.amount || p.payment || totalAmount).toString(),
                reference: p.reference || '',
              }))
            );
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

      // 2. Fetch y procesar Notas de Venta
      let saleNotes: any[] = [];
      try {
        saleNotes = await fetchSaleNotes(client, chunk.start, chunk.end);
      } catch (noteErr: any) {
        console.warn(`[Sync Service] Warning: Error al obtener notas de venta del ${chunk.start} al ${chunk.end}:`, noteErr.message);
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
          documentTypeId: '80', // Codigo para Nota de Venta
          series: parsedSeries,
          number: parsedNumber,
          total: note.total.toString(),
          currency: note.currency_type_id || 'PEN',
          sellerName,
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
            sellerName,
            customerName: note.customer_name || 'Cliente Varios',
            status: isVoided ? 'voided' : 'active',
            issuedAt,
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
              detailedItems.map(item => {
                const itDesc = item.item?.description || item.description || 'Ítem';
                const itUnit = item.item?.unit_type_id || item.unit_type_id || 'NIU';
                const isService = itUnit === 'ZZ' || isServiceItem(itDesc);
                return {
                  saleId: insertedSale.id,
                  description: itDesc,
                  quantity: (item.quantity || 1).toString(),
                  unitPrice: item.unit_price ? item.unit_price.toString() : (item.total || note.total).toString(),
                  total: item.total ? item.total.toString() : note.total.toString(),
                  category: isService ? '02' : '01',
                };
              })
            );
          } else {
            // Fallback inteligente para Notas de Venta
            const totalNum = parseFloat(note.total || '0') || 0;
            let itemCategory = '02';
            let itemDescription = 'Rutina / Membresía (NV)';

            if (totalNum === 8.0) {
              itemCategory = '02';
              itemDescription = 'Rutina Diaria (Pase Diario)';
            } else if (totalNum === 80.0) {
              itemCategory = '02';
              itemDescription = 'Rutina Membresía';
            } else if (totalNum < 25.0) {
              itemCategory = '01';
              itemDescription = `Bebida / Suplemento Físico (S/. ${totalNum.toFixed(2)})`;
            }

            await db.insert(saleItems).values({
              saleId: insertedSale.id,
              description: itemDescription,
              quantity: '1',
              unitPrice: note.total.toString(),
              total: note.total.toString(),
              category: itemCategory,
            });
          }
        }

        if (insertedSale) {
          // Borrar pagos anteriores
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
