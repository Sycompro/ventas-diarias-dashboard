import axios from 'axios';

async function main() {
  const backendUrl = 'https://backend-production-73c83.up.railway.app';
  
  // 1. Iniciar sesión
  const loginRes = await axios.post(`${backendUrl}/api/auth/login`, {
    subdomain: 'gymbra',
    apiToken: 'cqDCgshoLx8trC68n66XutHUGl6yKmu4HTUAiLemjfThNwZqEJ'
  });
  
  const token = loginRes.data?.accessToken;

  // 2. Query /api/sales/metrics for branch=1 (LA PRADERA)
  console.log('--- Consultando Metrics para branch=1 (LA PRADERA) ---');
  const res1 = await axios.get(`${backendUrl}/api/sales/metrics`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { dateStart: '2026-06-01', dateEnd: '2026-06-30', branch: '1' }
  });
  console.log(`Total Sales: S/. ${res1.data?.totalSales}`);
}

main().catch(console.error).finally(() => process.exit(0));
