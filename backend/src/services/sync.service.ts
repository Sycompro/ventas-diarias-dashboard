import { db } from '../config/database.js';
import { companies, sales, saleItems, salePayments, syncLogs } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { decrypt } from './crypto.service.js';
import { createBillingClient, fetchDocuments, fetchReportDocuments } from './billing-api.service.js';

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
      // Solo procesar documentos con estado válido (01=registrado, 03=enviado, 05=aceptado)
      if (!['01', '03', '05'].includes(stateId)) continue;
      
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
      
      if (insertedSale && doc.items) {
        await db.delete(saleItems).where(eq(saleItems.saleId, insertedSale.id));
        
        if (doc.items.length > 0) {
          await db.insert(saleItems).values(
            doc.items.map(item => ({
              saleId: insertedSale.id,
              description: item.description,
              quantity: item.quantity.toString(),
              unitPrice: item.unit_price.toString(),
              total: item.total.toString(),
              category: item.item_type_id || 'GENERAL',
            }))
          );
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
