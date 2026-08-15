import Redis from 'ioredis';
import { env } from './env.js';

let redisClient: Redis | null = null;

if (env.REDIS_URL) {
  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });

  redisClient.on('error', (err) => {
    console.warn('⚠️ Error de conexión a Redis:', err.message);
  });
} else {
  console.warn('⚠️ REDIS_URL no está definido, utilizando un mock de Redis. Las funciones de caché no tendrán efecto real.');
}

// Mock de Redis por si no hay conexión para evitar que la aplicación falle
const mockRedis = {
  get: async () => null,
  set: async () => 'OK',
  setex: async () => 'OK',
  del: async () => 1,
  flushall: async () => 'OK',
} as unknown as Redis;

export const redis = redisClient || mockRedis;
