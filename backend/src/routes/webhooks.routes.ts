import { Router } from 'express';
import { resolveCompanyForWebhook, processBillingWebhook } from '../services/webhook.service.js';

const router = Router();

/**
 * POST /api/webhooks/billing/:companyId?
 * Endpoint receptor para Facturador Pro Webhooks.
 * Soporta URL con ID de empresa o resolución automática por RUC/Subdominio.
 */
router.post('/billing/:companyId?', async (req, res) => {
  try {
    const { companyId } = req.params;
    const payload = req.body;

    console.log('[Webhook Route] 📥 Recibida petición webhook de Facturador Pro');

    // 1. Identificar la empresa
    const company = await resolveCompanyForWebhook(companyId, payload);
    if (!company) {
      console.warn('[Webhook Route] ⚠️ No se pudo identificar la empresa asociada al webhook');
      return res.status(404).json({
        success: false,
        message: 'Empresa no encontrada o no registrada en el Dashboard',
      });
    }

    // 2. Procesar el documento / evento
    const result = await processBillingWebhook(company.id, payload);

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error('[Webhook Route] ❌ Error general en receptor de webhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al procesar webhook',
      error: error.message,
    });
  }
});

/**
 * GET /api/webhooks/health
 * Verificación rápida de disponibilidad del receptor
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'active',
    endpoint: '/api/webhooks/billing',
    supported_events: [
      'document.created',
      'document.accepted',
      'document.observed',
      'document.rejected',
      'document.voided',
      'sale_note.created',
      'purchase.created',
    ],
  });
});

export default router;
