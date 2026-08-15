import { db } from './src/config/database.js';
import { users, companies } from './src/db/schema.js';

async function check() {
  try {
    console.log("--- COMPANIES IN DATABASE ---");
    const comps = await db.select().from(companies);
    console.log(comps.map(c => ({ id: c.id, name: c.name, ruc: c.ruc, subdomain: c.subdomain, isActive: c.isActive })));

    console.log("\n--- USERS IN DATABASE ---");
    const u = await db.select().from(users);
    console.log(u.map(usr => ({ id: usr.id, email: usr.email, name: usr.name, role: usr.role, isActive: usr.isActive })));
  } catch (err) {
    console.error("DB Query error:", err.message);
  } finally {
    process.exit(0);
  }
}

check();
