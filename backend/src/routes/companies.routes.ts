import { Router } from 'express';
import { db, sqlClient } from '../config/database.js';
import { companies } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from '../services/crypto.service.js';
import { testConnection, createBillingClient } from '../services/billing-api.service.js';
import { syncCompany } from '../services/sync.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { getSalesTrend } from '../services/analytics.service.js';
import { getCompanyBranches, resolveBranchSeries } from '../services/branch-resolver.service.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req: any, res) => {
  try {
    const comp = await db.query.companies.findFirst({
      where: eq(companies.id, req.user.companyId)
    });
    
    if (!comp || !comp.isActive) {
      return res.json([]);
    }
    
    res.json([{ 
      id: comp.id, 
      name: comp.name, 
      ruc: comp.ruc, 
      subdomain: comp.subdomain,
      currencySymbol: comp.currencySymbol,
      timezone: comp.timezone
    }]);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving company' });
  }
});

router.post('/', async (req: any, res) => {
  try {
    const { name, ruc, subdomain, apiToken, timezone, currencySymbol } = req.body;
    const { encrypted, iv, tag } = encrypt(apiToken);
    
    const [company] = await db.insert(companies).values({
      name, ruc, subdomain,
      apiTokenEncrypted: encrypted,
      apiTokenIv: iv,
      apiTokenTag: tag,
      timezone: timezone || 'America/Lima',
      currencySymbol: currencySymbol || 'S/.'
    }).returning();
    
    res.status(201).json({ id: company.id, name, ruc, subdomain });
  } catch (error) {
    res.status(500).json({ message: 'Error creating company' });
  }
});

router.put('/:id', async (req: any, res) => {
  try {
    if (req.params.id !== req.user.companyId) {
      return res.status(403).json({ message: 'Forbidden: Cannot modify other companies' });
    }
    
    const { subdomain, apiToken } = req.body;
    const updateData: any = {};
    if (subdomain) updateData.subdomain = subdomain;
    
    if (apiToken) {
      const { encrypted, iv, tag } = encrypt(apiToken);
      updateData.apiTokenEncrypted = encrypted;
      updateData.apiTokenIv = iv;
      updateData.apiTokenTag = tag;
    }
    
    // Si cambió el subdomain o el apiToken, re-consultar el perfil para actualizar RUC/Razón Social
    if (subdomain || apiToken) {
      const company = await db.query.companies.findFirst({ where: eq(companies.id, req.user.companyId) });
      if (company) {
        const activeSubdomain = subdomain || company.subdomain;
        let activeToken = apiToken;
        if (!activeToken) {
          activeToken = decrypt(company.apiTokenEncrypted, company.apiTokenIv, company.apiTokenTag);
        }
        
        try {
          const client = createBillingClient(activeSubdomain, activeToken);
          const profileRes = await client.get('/company');
          const companyData = profileRes.data?.company || profileRes.data?.data || profileRes.data;
          if (companyData) {
            updateData.name = companyData.name || company.name;
            updateData.ruc = companyData.number || company.ruc;
          }
        } catch (profileError) {
          console.warn(`[Warning] No se pudo actualizar perfil de empresa en PUT`);
        }
      }
    }
    
    updateData.updatedAt = new Date();
    
    await db.update(companies).set(updateData).where(eq(companies.id, req.params.id));
    res.json({ message: 'Company updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating company' });
  }
});

router.delete('/:id', async (req: any, res) => {
  try {
    if (req.params.id !== req.user.companyId) {
      return res.status(403).json({ message: 'Forbidden: Cannot modify other companies' });
    }
    
    await db.update(companies).set({ 
      isActive: false,
      apiTokenEncrypted: '',
      apiTokenIv: '',
      apiTokenTag: ''
    }).where(eq(companies.id, req.params.id));
    
    res.json({ message: 'Company deactivated and disconnected' });
  } catch (error) {
    res.status(500).json({ message: 'Error deactivating company' });
  }
});

router.post('/:id/test', async (req: any, res) => {
  try {
    if (req.params.id !== req.user.companyId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const { apiToken } = req.body;
    const company = await db.query.companies.findFirst({ where: eq(companies.id, req.params.id) });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    
    let tokenToUse = apiToken;
    if (!tokenToUse) {
      tokenToUse = decrypt(company.apiTokenEncrypted, company.apiTokenIv, company.apiTokenTag);
    }
    
    const success = await testConnection(company.subdomain, tokenToUse);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ message: 'Error testing connection' });
  }
});

router.get('/:id/debug-sync', async (req: any, res) => {
  try {
    if (req.params.id !== req.user.companyId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const company = await db.query.companies.findFirst({ where: eq(companies.id, req.params.id) });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    
    const decryptedToken = decrypt(company.apiTokenEncrypted, company.apiTokenIv, company.apiTokenTag);
    const client = createBillingClient(company.subdomain, decryptedToken);
    
    const dateEnd = new Date();
    const dateStart = new Date();
    dateStart.setDate(dateStart.getDate() - 30); // 30 days
    
    const startDateStr = dateStart.toISOString().split('T')[0];
    const endDateStr = dateEnd.toISOString().split('T')[0];
    
    const debugInfo: any = {
      subdomain: company.subdomain,
      dateStart: startDateStr,
      dateEnd: endDateStr,
      companyUrl: client.defaults.baseURL
    };

    try {
      const response = await client.get('/documents/lists', {
        params: { date_start: startDateStr, date_end: endDateStr }
      });
      debugInfo.listsResponse = response.data;
    } catch (e: any) {
      debugInfo.listsError = {
        message: e.message,
        status: e.response?.status,
        data: e.response?.data
      };
    }

    try {
      const response = await client.get('/company');
      debugInfo.companyResponse = response.data;
    } catch (e: any) {
      debugInfo.companyError = {
        message: e.message,
        status: e.response?.status,
        data: e.response?.data
      };
    }

    res.json(debugInfo);
  } catch (error: any) {
    res.status(500).json({ message: 'Error in debug-sync', error: error.message });
  }
});

router.get('/:id/debug-trend', async (req: any, res) => {
  try {
    if (req.params.id !== req.user.companyId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { dateStart, dateEnd } = req.query;
    const granularity = (req.query.granularity || 'day') as any;
    
    const result = await getSalesTrend(req.params.id, dateStart || '2026-08-01', dateEnd || '2026-08-15', granularity);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

router.post('/:id/sync', async (req: any, res) => {
  try {
    const targetCompanyId = req.params.id === 'all' || !req.params.id ? req.user.companyId : req.params.id;
    if (req.user.companyId && targetCompanyId !== req.user.companyId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const days = req.body?.days ? parseInt(req.body.days, 10) : 90;
    const dateStart = req.body?.dateStart;
    const dateEnd = req.body?.dateEnd;
    const result = await syncCompany(targetCompanyId, days, dateStart, dateEnd);
    res.json(result);
  } catch (error: any) {
    console.error(`[Companies Route] Error syncing:`, error.message);
    res.status(500).json({ message: 'Error syncing company data', error: error.message });
  }
});

router.get('/:id/sellers', async (req: any, res) => {
  try {
    const targetCompanyId = req.params.id === 'all' || !req.params.id ? req.user.companyId : req.params.id;
    if (req.user.companyId && targetCompanyId !== req.user.companyId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const branch = req.query.branch as string;
    let seriesFilter: string[] | null = null;

    if (branch && targetCompanyId) {
      seriesFilter = await resolveBranchSeries(targetCompanyId, branch);
    }

    const hasSeriesFilter = seriesFilter !== null && seriesFilter.length > 0;
    const seriesArray = seriesFilter || [];
    const hasCompanyFilter = Boolean(targetCompanyId);
    const cId = targetCompanyId || '';

    const result = await sqlClient`
      SELECT DISTINCT seller_name as "name"
      FROM sales
      WHERE seller_name IS NOT NULL AND seller_name != ''
        AND (${!hasCompanyFilter} OR company_id = ${cId})
        AND (${!hasSeriesFilter} OR series = ANY(${seriesArray}))
      ORDER BY seller_name ASC
    `;
    
    res.json(result.map(r => r.name));
  } catch (error: any) {
    res.status(500).json({ message: 'Error listing company sellers', error: error.message });
  }
});

router.get('/:id/branches', async (req: any, res) => {
  try {
    const targetCompanyId = req.params.id === 'all' || !req.params.id ? req.user.companyId : req.params.id;
    if (req.user.companyId && targetCompanyId !== req.user.companyId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    if (!targetCompanyId) {
      return res.json([{ id: 'all', name: 'Todas las Sedes' }]);
    }

    const branches = await getCompanyBranches(targetCompanyId);
    const branchesList = branches.map(b => ({
      id: b.id,
      name: b.name
    }));

    res.json(branchesList);
  } catch (error: any) {
    res.status(500).json({ message: 'Error listing company branches', error: error.message });
  }
});

export default router;
