import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { db } from '../config/database.js';
import { users, companies } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password, subdomain } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'El correo y la contraseña son obligatorios' });
    }
    
    // 1. Caso de Administrador Maestro / Local (Bypass de subdominio)
    const localUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim())
    });
    
    if (localUser && (!subdomain || localUser.role === 'admin')) {
      const isValid = await bcrypt.compare(password, localUser.passwordHash);
      if (isValid && localUser.isActive) {
        const tokenPayload = {
          id: localUser.id,
          email: localUser.email,
          name: localUser.name,
          role: localUser.role,
          companyId: null // Acceso consolidado de administrador maestro
        };
        
        // 8 horas de duración para la sesión de consulta
        const accessToken = jwt.sign(tokenPayload, env.JWT_SECRET, { expiresIn: '8h' });
        const refreshToken = jwt.sign(tokenPayload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
        
        return res.json({ accessToken, refreshToken, user: tokenPayload });
      }
    }
    
    // 2. Caso de Usuario de Empresa / Facturador
    if (!subdomain) {
      return res.status(400).json({ message: 'El subdominio de la empresa es requerido para ingresar' });
    }
    
    // Buscar si la empresa existe en el dashboard
    const company = await db.query.companies.findFirst({
      where: eq(companies.subdomain, subdomain.toLowerCase().trim())
    });
    
    if (!company || !company.isActive) {
      return res.status(404).json({ message: 'La empresa especificada no está registrada en el Dashboard' });
    }
    
    // Intentar loguear contra la API del Facturador de la empresa
    const targetUrl = `https://${company.subdomain}.syscomecosistemadigital.com/api/login`;
    
    try {
      const response = await axios.post(targetUrl, {
        email,
        password
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });
      
      if (response.data && response.data.success) {
        const tokenPayload = {
          id: `fact_${email}`,
          email: email.toLowerCase().trim(),
          name: response.data.user?.name || email.split('@')[0],
          role: 'viewer', // Rol de consulta
          companyId: company.id,
          companySubdomain: company.subdomain
        };
        
        const accessToken = jwt.sign(tokenPayload, env.JWT_SECRET, { expiresIn: '8h' });
        const refreshToken = jwt.sign(tokenPayload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
        
        return res.json({ accessToken, refreshToken, user: tokenPayload });
      } else {
        return res.status(401).json({ message: 'Las credenciales de facturador son incorrectas' });
      }
    } catch (apiError: any) {
      console.warn(`[Login Error] para ${email} en facturador ${subdomain}:`, apiError.message);
      const status = apiError.response?.status;
      if (status === 401 || status === 422) {
        return res.status(401).json({ message: 'Correo o contraseña incorrectos en el Facturador' });
      }
      return res.status(502).json({ 
        message: `No se pudo conectar al servidor de facturación (${subdomain}). Verifica la conexión o el subdominio.` 
      });
    }
  } catch (error) {
    console.error(error);
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
      email: decoded.email,
      role: decoded.role
    };
    
    const newAccessToken = jwt.sign(tokenPayload, env.JWT_SECRET, { expiresIn: '15m' });
    
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

export default router;
