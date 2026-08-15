import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from './env.js';
import * as schema from '../db/schema.js';

// Cliente raw para queries directas
export const sqlClient = postgres(env.DATABASE_URL, { max: 10 });

// Drizzle ORM instance
export const db = drizzle(sqlClient, { schema });
