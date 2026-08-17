import axios from 'axios';
import https from 'https';

async function main() {
  const token = 'cqDCgshoLx8trC68n66XutHUGl6yKmu4HTUAiLemjfThNwZqEJ';
  const baseURL = 'https://gymbra.syscomecosistemadigital.com/api';
  
  const client = axios.create({
    baseURL,
    timeout: 45000,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'Mozilla/5.0'
    }
  });

  console.log('=== INVESTIGACIÓN PROFUNDA: LAS BRISAS (JUNIO 2026) ===\n');

  // 1. Fetch all documents for June 2026
  let allDocs: any[] = [];
  let page = 1;
  while (true) {
    const res = await client.get(`/documents/lists/2026-06-01/2026-06-30?page=${page}`);
    const docs = res.data?.data || [];
    if (docs.length === 0) break;
    allDocs.push(...docs);
    const lastPage = res.data?.meta?.last_page || 1;
    if (page >= lastPage) break;
    page++;
  }

  console.log(`Total documentos en Junio 2026: ${allDocs.length}`);

  // Group by series
  const bySeries: Record<string, { total: number, activeTotal: number, count: number, sellers: Record<string, number> }> = {};
  // Group by seller
  const bySeller: Record<string, { total: number, count: number, series: Record<string, number> }> = {};

  allDocs.forEach((d: any) => {
    const s = d.number?.split('-')?.[0] || d.series || 'SIN_SERIE';
    const seller = d.user_name || 'Desconocido';
    const total = parseFloat(d.total || 0);
    const isActive = !['09', '11', '13'].includes(String(d.state_type_id));

    if (!bySeries[s]) bySeries[s] = { total: 0, activeTotal: 0, count: 0, sellers: {} };
    bySeries[s].total += total;
    if (isActive) bySeries[s].activeTotal += total;
    bySeries[s].count++;
    if (!bySeries[s].sellers[seller]) bySeries[s].sellers[seller] = 0;
    if (isActive) bySeries[s].sellers[seller] += total;

    if (!bySeller[seller]) bySeller[seller] = { total: 0, count: 0, series: {} };
    if (isActive) bySeller[seller].total += total;
    bySeller[seller].count++;
    if (!bySeller[seller].series[s]) bySeller[seller].series[s] = 0;
    if (isActive) bySeller[seller].series[s] += total;
  });

  console.log('\n📊 VENTAS ACTIVAS POR SERIE:');
  console.log('='.repeat(80));
  for (const [s, data] of Object.entries(bySeries).sort((a,b) => b[1].activeTotal - a[1].activeTotal)) {
    console.log(`\nSerie "${s}": Total Activo = S/. ${data.activeTotal.toFixed(2)} (${data.count} docs)`);
    for (const [seller, amt] of Object.entries(data.sellers)) {
      console.log(`   - 👤 ${seller}: S/. ${amt.toFixed(2)}`);
    }
  }

  console.log('\n\n📊 VENTAS ACTIVAS POR VENDEDOR:');
  console.log('='.repeat(80));
  for (const [seller, data] of Object.entries(bySeller).sort((a,b) => b[1].total - a[1].total)) {
    console.log(`\n👤 "${seller}": Total = S/. ${data.total.toFixed(2)} (${data.count} docs)`);
    for (const [s, amt] of Object.entries(data.series)) {
      console.log(`   - Serie ${s}: S/. ${amt.toFixed(2)}`);
    }
  }

  // Combinaciones para llegar a S/ 19,343.50
  console.log('\n\n🔍 ANÁLISIS DE COMBINACIONES PARA LLEGAR A S/. 19,343.50:');
  console.log('='.repeat(80));
  const seriesTotals = Object.fromEntries(Object.entries(bySeries).map(([s, d]) => [s, d.activeTotal]));
  console.log('Totales por serie:', seriesTotals);
  
  // Check B006 + B009: 13,180.00 + 3,684.50 = 16,864.50
  // Check B006 + B008: 13,180.00 + 3,996.00 = 17,176.00
  // Check B006 + ?
  // What is 19,343.50 - 13,180.00 = 6,163.50?
  // What is 27,895.50 - 19,343.50 = 8,552.00?
}

main().catch(console.error);
