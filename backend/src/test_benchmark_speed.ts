import axios from 'axios';

async function main() {
  const backendUrl = 'https://backend-production-73c83.up.railway.app';
  
  const loginRes = await axios.post(`${backendUrl}/api/auth/login`, {
    subdomain: 'gymbra',
    apiToken: 'cqDCgshoLx8trC68n66XutHUGl6yKmu4HTUAiLemjfThNwZqEJ'
  });
  
  const token = loginRes.data?.accessToken;

  console.log('Midiendo tiempo de respuesta de los endpoints en Producción:');

  // Test 1: /metrics
  let t0 = Date.now();
  await axios.get(`${backendUrl}/api/sales/metrics`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { dateStart: '2026-08-17', dateEnd: '2026-08-17' }
  });
  console.log(`⚡ /api/sales/metrics: ${Date.now() - t0} ms`);

  // Test 2: /pivot
  t0 = Date.now();
  await axios.get(`${backendUrl}/api/sales/pivot`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { dateStart: '2026-08-17', dateEnd: '2026-08-17' }
  });
  console.log(`⚡ /api/sales/pivot: ${Date.now() - t0} ms`);

  // Test 3: /documents
  t0 = Date.now();
  await axios.get(`${backendUrl}/api/sales/documents`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { dateStart: '2026-08-17', dateEnd: '2026-08-17', limit: 20 }
  });
  console.log(`⚡ /api/sales/documents: ${Date.now() - t0} ms`);
}

main().catch(console.error).finally(() => process.exit(0));
