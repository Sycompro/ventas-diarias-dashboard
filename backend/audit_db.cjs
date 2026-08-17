const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

// Load .env from backend
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) envVars[m[1].trim()] = m[2].trim();
});

const sql = postgres(envVars.DATABASE_URL, { max: 1, ssl: { rejectUnauthorized: false }, idle_timeout: 30, connect_timeout: 30 });

async function audit() {
  console.log('=== 1. TODAS LAS COMBINACIONES SERIES + VENDEDOR ===');
  const combos = await sql`
    SELECT series, seller_name, COUNT(*)::int as cnt, SUM(total::numeric)::numeric as total
    FROM sales
    WHERE status = 'active' AND series IS NOT NULL AND series != ''
    GROUP BY series, seller_name
    ORDER BY series, seller_name
  `;
  combos.forEach(r => console.log(`Serie: ${r.series} | Vendedor: ${r.seller_name} | Docs: ${r.cnt} | Total: ${r.total}`));
  
  console.log('\n=== 2. RESUMEN POR SERIE ===');
  const seriesSummary = await sql`
    SELECT series, COUNT(*)::int as cnt, SUM(total::numeric)::numeric as total
    FROM sales
    WHERE status = 'active' AND series IS NOT NULL AND series != ''
    GROUP BY series
    ORDER BY series
  `;
  seriesSummary.forEach(r => console.log(`Serie: ${r.series} | Docs: ${r.cnt} | Total: S/. ${r.total}`));

  console.log('\n=== 3. RESUMEN POR VENDEDOR (GLOBAL) ===');
  const sellersSummary = await sql`
    SELECT COALESCE(seller_name, 'Sin Vendedor') as seller_name, COUNT(*)::int as cnt, SUM(total::numeric)::numeric as total
    FROM sales
    WHERE status = 'active'
    GROUP BY seller_name
    ORDER BY total DESC
  `;
  sellersSummary.forEach(r => console.log(`Vendedor: ${r.seller_name} | Docs: ${r.cnt} | Total: S/. ${r.total}`));

  console.log('\n=== 4. SERIES POR VENDEDOR (Para detectar cross-contamination) ===');
  const crossCheck = await sql`
    SELECT seller_name, array_agg(DISTINCT series ORDER BY series) as series_list
    FROM sales
    WHERE status = 'active' AND series IS NOT NULL AND series != ''
    GROUP BY seller_name
    ORDER BY seller_name
  `;
  crossCheck.forEach(r => console.log(`Vendedor: ${r.seller_name} => Series: [${r.series_list.join(', ')}]`));

  console.log('\n=== 5. AGOSTO 2026 - Ventas por Serie + Vendedor ===');
  const agostoCombos = await sql`
    SELECT series, seller_name, COUNT(*)::int as cnt, SUM(total::numeric)::numeric as total
    FROM sales
    WHERE status = 'active' AND series IS NOT NULL AND series != ''
      AND (issued_at AT TIME ZONE 'America/Lima')::date >= '2026-08-01'::date
      AND (issued_at AT TIME ZONE 'America/Lima')::date <= '2026-08-31'::date
    GROUP BY series, seller_name
    ORDER BY series, seller_name
  `;
  agostoCombos.forEach(r => console.log(`Serie: ${r.series} | Vendedor: ${r.seller_name} | Docs: ${r.cnt} | Total: S/. ${r.total}`));

  await sql.end();
}

audit().catch(e => { console.error(e); process.exit(1); });
