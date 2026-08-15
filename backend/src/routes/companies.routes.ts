import { Router } from 'express';
import { db } from '../config/database.js';
import { companies, userCompanies } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { encrypt } from '../services/crypto.service.js';
import { testConnection } from '../services/billing-api.service.js';
import { syncCompany } from '../services/sync.service.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req: any, res) => {
  try {
    const userComps = await db.query.userCompanies.findMany({
      where: eq(userCompanies.userId, req.user.id),
      with: { company: true }
    });
    const comps = userComps.map(uc => uc.company).filter(c => c.isActive);
    res.json(comps.map(c => ({ id: c.id, name: c.name, ruc: c.ruc, subdomain: c.subdomain })));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving companies' });
  }
});

router.post('/', async (req, res) => {
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
    
    // Asignar al usuario actual si es necesario
    await db.insert(userCompanies).values({
      userId: (req as any).user.id,
      companyId: company.id
    });
    
    res.status(201).json({ id: company.id, name, ruc, subdomain });
  } catch (error) {
    res.status(500).json({ message: 'Error creating company' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, subdomain, apiToken } = req.body;
    const updateData: any = { name, subdomain };
    
    if (apiToken) {
      const { encrypted, iv, tag } = encrypt(apiToken);
      updateData.apiTokenEncrypted = encrypted;
      updateData.apiTokenIv = iv;
      updateData.apiTokenTag = tag;
    }
    
    updateData.updatedAt = new Date();
    
    await db.update(companies).set(updateData).where(eq(companies.id, req.params.id));
    res.json({ message: 'Company updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating company' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.update(companies).set({ isActive: false }).where(eq(companies.id, req.params.id));
    res.json({ message: 'Company deactivated' });
  } catch (error) {
    res.status(500).json({ message: 'Error deactivating company' });
  }
});

router.post('/:id/test', async (req, res) => {
  try {
    const { apiToken } = req.body;
    const company = await db.query.companies.findFirst({ where: eq(companies.id, req.params.id) });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    
    const success = await testConnection(company.subdomain, apiToken);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ message: 'Error testing connection' });
  }
});

router.post('/:id/sync', async (req, res) => {
  try {
    const result = await syncCompany(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error syncing company data' });
  }
});

export default router;
