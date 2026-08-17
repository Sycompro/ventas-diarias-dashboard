import axios from 'axios';
import https from 'https';

async function auditBranchResolution() {
  const token = 'cqDCgshoLx8trC68n66XutHUGl6yKmu4HTUAiLemjfThNwZqEJ';
  const client = axios.create({
    baseURL: 'https://gymbra.syscomecosistemadigital.com/api',
    timeout: 30000,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/json'
    }
  });

  console.log('====================================================');
  console.log('AUDITORÍA DE ASIGNACIÓN EXACTA DE SERIES A SUCURSALES');
  console.log('====================================================\n');

  // 1. Consultar /company
  const compRes = await client.get('/company');
  console.log('Establishments en /company:', compRes.data?.establishments);
  console.log('Series en /company:', compRes.data?.series);

  // 2. Consultar /items/records para almacenes
  const itemsRes = await client.get('/items/records', { params: { limit: 50 } });
  const items = itemsRes.data?.data || [];
  const warehousesMap = new Map<number, string>();
  items.forEach((it: any) => {
    it.warehouses?.forEach((w: any) => {
      warehousesMap.set(w.warehouse_id || w.id, w.warehouse_description || w.description);
    });
  });
  console.log('\nAlmacenes (Sucursales) en Items:', [...warehousesMap.entries()]);

  // 3. Consultar documentos de Junio y agrupar por serie exacta y vendedor
  const docsRes = await client.get('/reports/documents', {
    params: { date_start: '2026-06-01', date_end: '2026-06-30' }
  });
  const docs = Array.isArray(docsRes.data) ? docsRes.data : [];

  const seriesBreakdown: Record<string, { count: number; total: number; sellers: Record<string, number> }> = {};

  docs.forEach((d: any) => {
    const s = d.number?.split('-')[0] || 'SIN_SERIE';
    const seller = d.user || 'Sin Vendedor';
    const tot = parseFloat(d.total || 0);

    if (!seriesBreakdown[s]) {
      seriesBreakdown[s] = { count: 0, total: 0, sellers: {} };
    }
    seriesBreakdown[s].count++;
    seriesBreakdown[s].total += tot;
    seriesBreakdown[s].sellers[seller] = (seriesBreakdown[s].sellers[seller] || 0) + tot;
  });

  console.log('\n📊 Desglose de Ventas de Junio 2026 por Serie Exacta:');
  for (const [serie, data] of Object.entries(seriesBreakdown)) {
    console.log(`\nSerie: [${serie}] -> ${data.count} docs, Total: S/. ${data.total.toFixed(2)}`);
    for (const [seller, sellerTot] of Object.entries(data.sellers)) {
      console.log(`   👤 ${seller}: S/. ${sellerTot.toFixed(2)}`);
    }
  }

  process.exit(0);
}

auditBranchResolution().catch(console.error);
