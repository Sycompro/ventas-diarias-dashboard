import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from './env.js';
import * as schema from '../db/schema.js';

const isLocal = env.DATABASE_URL.includes('localhost') || env.DATABASE_URL.includes('127.0.0.1');

// Cliente raw para queries directas
export const sqlClient = postgres(env.DATABASE_URL, { 
  max: 10,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

// Drizzle ORM instance
export const db = drizzle(sqlClient, { schema });

