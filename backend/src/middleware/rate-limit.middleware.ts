import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 2000, // Limite de 2000 peticiones
  message: 'Demasiadas peticiones, intente de nuevo más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Demasiados intentos de autenticación, intente de nuevo más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});
