import axios from 'axios';

async function main() {
  const backendUrl = 'https://backend-production-73c83.up.railway.app';
  
  // 1. Iniciar sesión
  const loginRes = await axios.post(`${backendUrl}/api/auth/login`, {
    subdomain: 'gymbra',
    apiToken: 'cqDCgshoLx8trC68n66XutHUGl6yKmu4HTUAiLemjfThNwZqEJ'
  });
  
  const token = loginRes.data?.accessToken;

  // 2. Query /api/sales/metrics for today
  console.log('--- Consultando /api/sales/metrics para hoy ---');
  const res1 = await axios.get(`${backendUrl}/api/sales/metrics`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { dateStart: '2026-08-17', dateEnd: '2026-08-17' }
  });
  console.log('Metrics:', JSON.stringify(res1.data, null, 2));

  // 3. Query /api/sales/documents to see document type details for today
  console.log('\n--- Consultando /api/sales/documents para hoy ---');
  const res2 = await axios.get(`${backendUrl}/api/sales/documents`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { dateStart: '2026-08-17', dateEnd: '2026-08-17', limit: 20 }
  });
  console.log('Documents:', JSON.stringify(res2.data.map((d: any) => ({
    series: d.series,
    number: d.number,
    total: d.total,
    documentTypeId: d.documentTypeId
  })), null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
