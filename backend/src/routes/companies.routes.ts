import { Router } from 'express';
import { db } from '../config/database.js';
import { companies } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from '../services/crypto.service.js';
import { testConnection, createBillingClient } from '../services/billing-api.service.js';
import { syncCompany } from '../services/sync.service.js';
import { authenticate } from '../middleware/auth.middleware.js';

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
          if (profileRes.data && profileRes.data.data) {
            updateData.name = profileRes.data.data.name || company.name;
            updateData.ruc = profileRes.data.data.number || company.ruc;
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

router.post('/:id/sync', async (req: any, res) => {
  try {
    if (req.params.id !== req.user.companyId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const result = await syncCompany(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error syncing company data' });
  }
});

export default router;
