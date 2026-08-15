import postgres from 'postgres';

async function check() {
  const dbUrl = "postgresql://postgres:pUqSpxfQyJdPRjYgGExrEGBDqKjBqFwN@junction.proxy.rlwy.net:21182/railway";
  const sql = postgres(dbUrl, { ssl: { rejectUnauthorized: false } });

  try {
    console.log("CONNECTED TO PRODUCTION DB");

    const users = await sql`SELECT id, email, name, role, is_active FROM users`;
    console.log("\n--- USERS ---");
    console.log(users);

    const companies = await sql`SELECT id, name, ruc, subdomain, is_active FROM companies`;
    console.log("\n--- COMPANIES ---");
    console.log(companies);
  } catch (err) {
    console.error("DB Query error:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

check();
