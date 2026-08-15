import { db } from './config/database.js';
import { syncLogs } from './db/schema.js';
import { desc } from 'drizzle-orm';

async function main() {
  try {
    console.log("Fetching sync logs from DB...");
    const logs = await db.select()
      .from(syncLogs)
      .orderBy(desc(syncLogs.startedAt))
      .limit(5);
    
    console.log("Sync Logs:");
    console.log(JSON.stringify(logs, null, 2));
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

main();
