import { db, sqlClient } from '../config/database.js';
import { sales, saleItems, salePayments, companies } from '../db/schema.js';
import { eq, or, sql } from 'drizzle-orm';
import { redis } from '../config/redis.js';

function mapPaymentMethodId(description: string = 'Efectivo'): string {
  const descUpper = description.trim().toUpperCase();
  if (descUpper === 'EFECTIVO') return '01';
  if (descUpper === 'YAPE') return '02';
  if (descUpper === 'TARJETA DE DÉBITO' || descUpper === 'TARJETA DE DEBITO') return '03';
  if (descUpper === 'TRANSFERENCIA') return '04';
  if (descUpper === 'CRÉDITO' || descUpper === 'CREDITO') return '99';
  if (descUpper.includes('VISA') || descUpper.includes('TARJETA') || descUpper.includes('CREDITO') || descUpper.includes('CRÉDITO')) return '06';
  if (descUpper === 'CONTADO') return '10';
  if (descUpper === 'PLIN') return '05';
  return '01';
}

interface WebhookPayload {
  event?: string;
  type?: string;
  data?: any;
  [key: string]: any;
}

/**
 * Encuentra la empresa correspondiente al webhook recibido
 */
export async function resolveCompanyForWebhook(
  companyIdParam?: string,
  payload?: any
): Promise<any | null> {
  // 1. Por ID directo en parámetro
  if (companyIdParam) {
    const found = await db.query.companies.findFirst({
      where: eq(companies.id, companyIdParam),
    });
    if (found) return found;
  }

  // 2. Por RUC en el payload
  const ruc = payload?.company_number || 
              payload?.company?.number || 
              payload?.company?.ruc || 
              payload?.data?.company_number ||
              payload?.data?.company?.number;

  if (ruc) {
    const found = await db.query.companies.findFirst({
      where: eq(companies.ruc, String(ruc)),
    });
    if (found) return found;
  }

  // 3. Por subdominio en el payload
  const subdomain = payload?.subdomain || payload?.data?.subdomain;
  if (subdomain) {
    const found = await db.query.companies.findFirst({
      where: eq(companies.subdomain, String(subdomain)),
    });
    if (found) return found;
  }

  // 4. Fallback: Si solo hay una empresa registrada, usarla
  const allCompanies = await db.query.companies.findMany({ limit: 2 });
  if (allCompanies.length === 1) {
    return allCompanies[0];
  }

  return null;
}

/**
 * Procesa el evento del webhook proveniente de Facturador Pro
 */
export async function processBillingWebhook(
  companyId: string,
  payload: WebhookPayload
): Promise<{ success: boolean; message: string; saleId?: string }> {
  try {
    const eventName = payload.event || payload.type || 'document.created';
    const docData = payload.data || payload;

    if (!docData) {
      return { success: false, message: 'No se encontraron datos del documento en el payload' };
    }

    // Identificar si es anulación
    const isVoided = eventName === 'document.voided' || 
                     eventName === 'document.rejected' || 
                     ['09', '11', '13'].includes(String(docData.state_type_id));

    // Determinar tipo de documento (01: Factura, 03: Boleta, 80: Nota de Venta, etc.)
    let docTypeId = String(docData.document_type_id || '03');
    if (eventName.includes('sale_note') || docData.is_sale_note) {
      docTypeId = '80';
    }

    // Extraer serie y correlativo
    let parsedSeries = String(docData.series || docData.series_id || '');
    let parsedNumber = String(docData.number || '');
    
    if (!parsedSeries && docData.number_full && String(docData.number_full).includes('-')) {
      const parts = String(docData.number_full).split('-');
      parsedSeries = parts[0];
      parsedNumber = parts[1];
    } else if (!parsedSeries && docData.identifier && String(docData.identifier).includes('-')) {
      const parts = String(docData.identifier).split('-');
      parsedSeries = parts[0];
      parsedNumber = parts[1];
    } else if (!parsedSeries && docData.filename && String(docData.filename).includes('-')) {
      const parts = String(docData.filename).split('-');
      if (parts.length >= 4) {
        parsedSeries = parts[2];
        parsedNumber = parts[3];
      }
    }

    const externalId = String(docData.external_id || docData.id || `${parsedSeries}-${parsedNumber}`);
    const totalAmount = parseFloat(docData.total || docData.total_value || '0').toFixed(2);
    const currency = docData.currency_type_id || 'PEN';
    const sellerName = docData.user_name || 
                       docData.seller_name || 
                       docData.user?.name || 
                       docData.seller?.name || 
                       'Desconocido';
    
    const customerName = docData.customer_name || 
                         docData.customer?.name || 
                         docData.customer?.description || 
                         'Clientes - Varios';

    // Fecha de emisión
    let issuedAt = new Date();
    if (docData.date_of_issue) {
      const timeStr = docData.time_of_issue || '00:00:00';
      issuedAt = new Date(`${docData.date_of_issue}T${timeStr}`);
    } else if (docData.created_at) {
      issuedAt = new Date(docData.created_at);
    }

    // Guardar / Actualizar en la tabla sales
    const [insertedSale] = await db.insert(sales).values({
      companyId,
      externalId,
      documentTypeId: docTypeId,
      series: parsedSeries,
      number: parsedNumber,
      total: totalAmount,
      currency,
      sellerName,
      customerName,
      issuedAt,
      status: isVoided ? 'voided' : 'active',
      rawJson: {
        ...docData,
        establishment_id: docData.establishment_id || docData.establishment?.id || docData.seller?.establishment_id || null,
        establishment_description: docData.establishment_description || docData.establishment?.description || docData.seller?.establishment?.description || null,
      },
    }).onConflictDoUpdate({
      target: [sales.companyId, sales.externalId],
      set: {
        documentTypeId: docTypeId,
        series: parsedSeries,
        number: parsedNumber,
        total: totalAmount,
        currency,
        sellerName,
        customerName,
        status: isVoided ? 'voided' : 'active',
        issuedAt,
        rawJson: {
          ...docData,
          establishment_id: docData.establishment_id || docData.establishment?.id || docData.seller?.establishment_id || null,
          establishment_description: docData.establishment_description || docData.establishment?.description || docData.seller?.establishment?.description || null,
        },
        syncedAt: new Date(),
      },
    }).returning({ id: sales.id });

    if (insertedSale && !isVoided) {
      // 1. Procesar Ítems
      await db.delete(saleItems).where(eq(saleItems.saleId, insertedSale.id));
      const itemsList = docData.items || docData.items_for_report || [];

      if (Array.isArray(itemsList) && itemsList.length > 0) {
        await db.insert(saleItems).values(
          itemsList.map((item: any) => {
            const itDesc = item.item?.description || item.description || 'Ítem';
            const itUnit = item.item?.unit_type_id || item.unit_type_id || 'NIU';
            const unitPrice = (item.unit_price || item.price || item.total || totalAmount).toString();
            const itTotal = (item.total || item.total_value || totalAmount).toString();
            const isService = itUnit === 'ZZ' || parseFloat(itTotal) >= 25.0 || parseFloat(itTotal) === 8.0;

            return {
              saleId: insertedSale.id,
              description: itDesc,
              quantity: (item.quantity || 1).toString(),
              unitPrice,
              total: itTotal,
              category: isService ? '02' : '01',
              unitType: itUnit || null,
            };
          })
        );
      } else {
        // Item fallback
        const totalNum = parseFloat(totalAmount);
        const isService = totalNum >= 25.0 || totalNum === 8.0;
        await db.insert(saleItems).values({
          saleId: insertedSale.id,
          description: isService ? (totalNum === 8.0 ? 'Rutina Diaria (Pase Diario)' : `Servicio (S/. ${totalAmount})`) : `Producto (S/. ${totalAmount})`,
          quantity: '1',
          unitPrice: totalAmount,
          total: totalAmount,
          category: isService ? '02' : '01',
          unitType: isService ? 'ZZ' : 'NIU',
        });
      }

      // 2. Procesar Pagos
      await db.delete(salePayments).where(eq(salePayments.saleId, insertedSale.id));
      const paymentsList = docData.payments || [];

      if (Array.isArray(paymentsList) && paymentsList.length > 0) {
        await db.insert(salePayments).values(
          paymentsList.map((p: any) => ({
            saleId: insertedSale.id,
            paymentMethodId: mapPaymentMethodId(p.payment_method_type?.description || p.description || 'Efectivo'),
            amount: (p.payment || p.amount || totalAmount).toString(),
            reference: p.reference || p.referencia || p.destination_description || '',
          }))
        );
      } else {
        // Default Efectivo
        await db.insert(salePayments).values({
          saleId: insertedSale.id,
          paymentMethodId: '01',
          amount: totalAmount,
          reference: 'Default Cash Payment (Webhook)',
        });
      }
    }

    // Invalidar caches de métricas en Redis para reflejo instantáneo en la UI
    try {
      const keys = await redis.keys(`*${companyId}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch {}

    console.log(`[Webhook Service] ✅ Procesado evento '${eventName}' para venta ${parsedSeries}-${parsedNumber} (S/. ${totalAmount}) - Usuario: ${sellerName}`);

    return {
      success: true,
      message: `Venta ${parsedSeries}-${parsedNumber} procesada exitosamente`,
      saleId: insertedSale?.id,
    };
  } catch (error: any) {
    console.error('[Webhook Service] ❌ Error procesando webhook:', error.message);
    return { success: false, message: error.message };
  }
}
