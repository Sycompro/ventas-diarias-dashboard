import { db } from '../config/database.js';
import { companies, sales, saleItems, salePayments, syncLogs } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { decrypt } from './crypto.service.js';
import { createBillingClient, fetchDocuments } from './billing-api.service.js';

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
    
    // Sincronizamos por defecto los últimos 30 días
    const dateEnd = new Date();
    const dateStart = new Date();
    dateStart.setDate(dateStart.getDate() - 30);
    
    const startDateStr = dateStart.toISOString().split('T')[0];
    const endDateStr = dateEnd.toISOString().split('T')[0];
    
    const documents = await fetchDocuments(client, startDateStr, endDateStr);
    
    for (const doc of documents) {
      const stateId = String(doc.state_type_id);
      // Solo procesar documentos con estado válido (01=registrado, 03=enviado, 05=aceptado)
      if (!['01', '03', '05'].includes(stateId)) continue;
      
      const issuedAt = new Date(`${doc.date_of_issue}T${doc.time_of_issue || '00:00:00'}`);
      const isVoided = ['09', '11', '13'].includes(stateId);
      
      const [insertedSale] = await db.insert(sales).values({
        companyId,
        externalId: String(doc.external_id || doc.id),
        documentTypeId: doc.document_type_id,
        series: doc.series || '',
        number: doc.number || '',
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
      
      if (insertedSale && doc.payments) {
        await db.delete(salePayments).where(eq(salePayments.saleId, insertedSale.id));
        
        if (doc.payments.length > 0) {
          await db.insert(salePayments).values(
            doc.payments.map(payment => ({
              saleId: insertedSale.id,
              paymentMethodId: payment.payment_method_type_id,
              amount: payment.amount.toString(),
              reference: payment.reference,
            }))
          );
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
