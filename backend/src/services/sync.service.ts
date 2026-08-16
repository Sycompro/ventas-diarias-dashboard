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
    
    // Fetch documents list (main metadata)
    const documents = await fetchDocuments(client, startDateStr, endDateStr);
    
    // Fetch report documents (contains desgloses de pagos in PAGOS key)
    const reportDocs = await fetchReportDocuments(client, startDateStr, endDateStr);
    
    // Build a map of key -> payments array
    const paymentsLookup = new Map<string, any[]>();
    for (const rd of reportDocs) {
      const key = `${rd.document_type_id}_${rd.number}`;
      if (rd.payments) {
        if (Array.isArray(rd.payments.PAGOS) && rd.payments.PAGOS.length > 0) {
          paymentsLookup.set(key, rd.payments.PAGOS);
        } else if (Array.isArray(rd.payments.CUOTA) && rd.payments.CUOTA.length > 0) {
          // Map cuotas as payments with description "Crédito"
          paymentsLookup.set(key, rd.payments.CUOTA.map((c: any) => ({
            description: c.description || 'Crédito',
            reference: c.reference || '',
            amount: c.amount,
            symbol: c.symbol || 'S/'
          })));
        }
      }
    }
    
    // 1. Procesar TODOS los comprobantes históricos desde reportDocs (contiene el rango completo con impuestos y pagos)
    const processedKeys = new Set<string>();

    for (const rd of reportDocs) {
      const docTypeId = String(rd.document_type_id || '03');
      const docNumber = String(rd.number || '');
      const docKey = `${docTypeId}_${docNumber}`;
      processedKeys.add(docKey);

      let parsedSeries = '';
      let parsedNumber = '';
      if (docNumber && docNumber.includes('-')) {
        const parts = docNumber.split('-');
        parsedSeries = parts[0];
        parsedNumber = parts[1];
      } else {
        parsedSeries = rd.series || '';
        parsedNumber = docNumber;
      }

      const isVoided = rd.status === 'Anulado' || ['09', '11', '13'].includes(String(rd.state_type_id));
      const sellerName = rd.user || rd.user_name || rd.seller_name || rd.seller || 'Desconocido';
      const customerName = rd.name_customer || rd.customer_name || 'Cliente Varios';
      const totalAmount = parseFloat(rd.total || 0).toString();

      let issuedAt = new Date();
      if (rd.date_of_issue) {
        const timePart = rd.time_of_issue || '12:00:00';
        issuedAt = new Date(`${rd.date_of_issue}T${timePart}-05:00`);
      }

      const rawJson = {
        ...rd,
        total_taxed: rd.total_taxed,
        total_igv: rd.total_igv,
        total_exonerated: rd.total_exonerated,
        total_unaffected: rd.total_unaffected,
        total: rd.total,
        user_name: sellerName,
        customer_name: customerName,
      };

      const externalId = rd.external_id ? String(rd.external_id) : `rep_${docTypeId}_${docNumber}`;

      const [insertedSale] = await db.insert(sales).values({
        companyId,
        externalId,
        documentTypeId: docTypeId,
        series: parsedSeries,
        number: parsedNumber,
        total: totalAmount,
        currency: rd.currency_type_id || 'PEN',
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
        // Items consolidado
        const existingItems = await db.select().from(saleItems).where(eq(saleItems.saleId, insertedSale.id));
        if (existingItems.length === 0) {
          await db.insert(saleItems).values({
            saleId: insertedSale.id,
            description: 'Venta de Bienes o Servicios (Consolidado)',
            quantity: '1',
            unitPrice: totalAmount,
            total: totalAmount,
            category: '01'
          });
        }

        // Payments
        await db.delete(salePayments).where(eq(salePayments.saleId, insertedSale.id));
        const rawPayments = rd.payments?.PAGOS || rd.payments?.CUOTA || [];
        if (Array.isArray(rawPayments) && rawPayments.length > 0) {
          await db.insert(salePayments).values(
            rawPayments.map((p: any) => ({
              saleId: insertedSale.id,
              paymentMethodId: getPaymentMethodId(p.description || 'Efectivo'),
              amount: (p.amount || totalAmount).toString(),
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
      }
      documentsSynced++;
    }

    // 2. Procesar documentos adicionales de la lista general (para enriquecer XML y items)
    for (const doc of documents) {
      const stateId = String(doc.state_type_id);
      if (!['01', '03', '05', '07', '09', '11', '13'].includes(stateId)) continue;
      
      const docKey = `${doc.document_type_id}_${doc.number}`;
      const issuedAt = parseDocumentIssuedAt(doc);
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
      
      const docAny = doc as any;
      const sellerName = doc.user_name || docAny.seller_name || docAny.user?.name || docAny.seller || 'Desconocido';
      
      const [insertedSale] = await db.insert(sales).values({
        companyId,
        externalId: String(doc.external_id || doc.id),
        documentTypeId: doc.document_type_id,
        series: parsedSeries,
        number: parsedNumber,
        total: doc.total.toString(),
        currency: 'PEN',
        sellerName,
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
          sellerName,
          customerName: doc.customer_name || 'Cliente Varios',
          status: isVoided ? 'voided' : 'active',
          issuedAt,
          rawJson: doc,
          syncedAt: new Date(),
        },
      }).returning({ id: sales.id });
      
      if (insertedSale && !processedKeys.has(docKey)) {
        // Si no vino en reportDocs, insertar pagos por defecto
        await db.delete(salePayments).where(eq(salePayments.saleId, insertedSale.id));
        await db.insert(salePayments).values({
          saleId: insertedSale.id,
          paymentMethodId: '01',
          amount: doc.total.toString(),
          reference: 'Default Cash Payment (Synced)',
        });
        documentsSynced++;
      }
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
