import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/database.js';
import { companies } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { createBillingClient, testConnection } from '../services/billing-api.service.js';
import { encrypt } from '../services/crypto.service.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { subdomain, apiToken } = req.body;
    
    if (!subdomain || !apiToken) {
      return res.status(400).json({ message: 'El subdominio y el Token de la API son obligatorios' });
    }

    const cleanSubdomain = subdomain.toLowerCase().trim().replace(/\s+/g, '');
    const cleanToken = apiToken.trim();

    // 1. Probar conexión en vivo con el Facturador
    const isConnected = await testConnection(cleanSubdomain, cleanToken);
    if (!isConnected) {
      return res.status(401).json({ message: 'Conexión fallida: El subdominio o el Token de la API son incorrectos.' });
    }

    // 2. Intentar obtener el perfil de la empresa desde el Facturador para registrar RUC y Razón Social reales
    let companyName = cleanSubdomain.toUpperCase();
    let companyRuc = '00000000000';

    try {
      const client = createBillingClient(cleanSubdomain, cleanToken);
      const profileRes = await client.get('/company');
      const companyData = profileRes.data?.company || profileRes.data?.data || profileRes.data;
      if (companyData) {
        companyName = companyData.name || companyName;
        companyRuc = companyData.number || companyRuc;
      }
    } catch (profileError) {
      console.warn(`[Warning] No se pudo obtener perfil de empresa (/company) para ${cleanSubdomain}. Se usará fallback.`);
    }

    // 3. Cifrar el token para almacenarlo
    const { encrypted, iv, tag } = encrypt(cleanToken);

    // 4. Buscar si la empresa existe en el Dashboard
    let company = await db.query.companies.findFirst({
      where: eq(companies.subdomain, cleanSubdomain)
    });

    if (!company) {
      // Registrar nueva empresa
      const [newCompany] = await db.insert(companies).values({
        name: companyName,
        ruc: companyRuc,
        subdomain: cleanSubdomain,
        apiTokenEncrypted: encrypted,
        apiTokenIv: iv,
        apiTokenTag: tag,
        timezone: 'America/Lima',
        currencySymbol: 'S/.',
        isActive: true
      }).returning();
      
      company = newCompany;
      console.log(`🚀 Nueva empresa registrada automáticamente: ${companyName} (${cleanSubdomain})`);
    } else {
      // Actualizar token si existe pero ha cambiado
      await db.update(companies).set({
        apiTokenEncrypted: encrypted,
        apiTokenIv: iv,
        apiTokenTag: tag,
        name: companyName,
        ruc: companyRuc,
        isActive: true,
        updatedAt: new Date()
      }).where(eq(companies.id, company.id));
      
      company = {
        ...company,
        apiTokenEncrypted: encrypted,
        apiTokenIv: iv,
        apiTokenTag: tag,
        name: companyName,
        ruc: companyRuc,
        isActive: true
      };
    }

    // 5. Generar JWT para la sesión
    const tokenPayload = {
      id: company.id,
      companyId: company.id,
      subdomain: company.subdomain,
      name: company.name,
      role: 'manager' // Todos los clientes entran como manager de su propia sede
    };

    const accessToken = jwt.sign(tokenPayload, env.JWT_SECRET, { expiresIn: '8h' });
    const refreshToken = jwt.sign(tokenPayload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    return res.json({ 
      accessToken, 
      refreshToken, 
      user: {
        id: company.id,
        name: company.name,
        email: `${cleanSubdomain}@syscomecosistemadigital.com`, // Email virtual para compatibilidad del front
        role: 'manager',
        companyId: company.id,
        companySubdomain: company.subdomain
      } 
    });

  } catch (error) {
    console.error('[Login Error]:', error);
    res.status(500).json({ message: 'Error interno en el servidor de autenticación' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }
    
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as any;
    
    const tokenPayload = {
      id: decoded.id,
      companyId: decoded.companyId,
      subdomain: decoded.subdomain,
      name: decoded.name,
      role: decoded.role
    };
    
    const newAccessToken = jwt.sign(tokenPayload, env.JWT_SECRET, { expiresIn: '8h' });
    
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

export default router;
