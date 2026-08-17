import axios from 'axios';
import https from 'https';

async function main() {
  const token = 'cqDCgshoLx8trC68n66XutHUGl6yKmu4HTUAiLemjfThNwZqEJ';
  const baseURL = 'https://gymbra.syscomecosistemadigital.com/api';
  
  const client = axios.create({
    baseURL,
    timeout: 30000,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'Mozilla/5.0'
    }
  });

  console.log('=== TESTEANDO ENDPOINTS DE NOTAS DE VENTA CON FILTRO DE FECHAS ===\n');

  // Test 1: /sale-note/lists/{start}/{end}
  const testUrls = [
    '/sale-note/lists/2026-06-01/2026-06-30',
    '/sale-notes/lists/2026-06-01/2026-06-30',
    '/sale-note/lists?date_start=2026-06-01&date_end=2026-06-30',
    '/sale-note/lists?d_start=2026-06-01&d_end=2026-06-30',
    '/sale-note/lists?start_date=2026-06-01&end_date=2026-06-30',
    '/sale-notes/lists',
    '/sale-note/records/2026-06-01/2026-06-30',
  ];

  for (const url of testUrls) {
    try {
      const res = await client.get(url);
      console.log(`✅ ${url}: Status ${res.status}`);
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) {
        console.log(`   Devolvió ${data.length} notas! Primeras 3:`);
        data.slice(0, 3).forEach((n: any) => {
          console.log(`     - ${n.series}-${n.number} | Fecha: ${n.date_of_issue} | Total: ${n.total}`);
        });
      }
    } catch (e: any) {
      console.log(`❌ ${url}: ${e.response?.status || e.message}`);
    }
  }

  // Test 2: Search NV05 in /sale-note/lists by iterating through all pages
  console.log('\nBuscando NV05-2014 en las páginas de /sale-note/lists:');
  let page = 1;
  let found = 0;
  while (page <= 60) {
    try {
      const res = await client.get(`/sale-note/lists?page=${page}`);
      const data = res.data?.data || [];
      if (data.length === 0) break;
      const nv05 = data.filter((n: any) => n.series === 'NV05' || n.number?.startsWith('NV05'));
      if (nv05.length > 0) {
        found += nv05.length;
        console.log(`  Page ${page}: Encontradas ${nv05.length} notas NV05 (ej: ${nv05[0].number}, fecha: ${nv05[0].date_of_issue || nv05[0].created_at})`);
      }
      const meta = res.data?.meta;
      if (meta?.last_page && page >= meta.last_page) break;
      page++;
    } catch (e: any) {
      console.log(`  Error on page ${page}:`, e.message);
      break;
    }
  }
  console.log(`Total NV05 encontradas en ${page} páginas: ${found}`);
}

main().catch(console.error);
