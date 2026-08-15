import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../config/database.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    
    const accessToken = jwt.sign(tokenPayload, env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(tokenPayload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    
    res.json({ accessToken, refreshToken, user: tokenPayload });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
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
