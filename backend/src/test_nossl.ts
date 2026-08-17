import postgres from 'postgres';
import { env } from './config/env.js';

async function main() {
  console.log("Connecting without SSL to:", env.DATABASE_URL);
  const sql = postgres(env.DATABASE_URL, {
    ssl: false
  });
  
  try {
    const res = await sql`SELECT 1 + 1 as result`;
    console.log("Success! Result:", res[0].result);
  } catch (err: any) {
    console.error("Failed:", err.message);
  } finally {
    await sql.end();
  }
}

main();
