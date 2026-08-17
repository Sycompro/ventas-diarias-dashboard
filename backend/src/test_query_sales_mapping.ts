import axios from 'axios';

async function main() {
  const backendUrl = 'https://backend-production-73c83.up.railway.app';
  
  // 1. Iniciar sesión
  const loginRes = await axios.post(`${backendUrl}/api/auth/login`, {
    subdomain: 'gymbra',
    apiToken: 'cqDCgshoLx8trC68n66XutHUGl6yKmu4HTUAiLemjfThNwZqEJ'
  });
  
  const token = loginRes.data?.accessToken;

  // 2. Query /api/sales/pivot for different branches to see if totals change
  console.log('--- Consultando Pivot para branch=1 (LA PRADERA) ---');
  const res1 = await axios.get(`${backendUrl}/api/sales/pivot`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { dateStart: '2026-06-01', dateEnd: '2026-06-30', branch: '1' }
  });
  console.log(`Ventas de LA PRADERA (id: 1) según pivot: S/. ${res1.data?.pivotData?.find((p: any) => p.sede === 'LA PRADERA')?.total}`);
  console.log('Todas las sedes devueltas:', res1.data?.pivotData?.map((p: any) => `${p.sede}: S/. ${p.total}`));

  console.log('\n--- Consultando Pivot para branch=2 (LAS BRISAS) ---');
  const res2 = await axios.get(`${backendUrl}/api/sales/pivot`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { dateStart: '2026-06-01', dateEnd: '2026-06-30', branch: '2' }
  });
  console.log(`Ventas de LAS BRISAS (id: 2) según pivot: S/. ${res2.data?.pivotData?.find((p: any) => p.sede === 'LAS BRISAS')?.total}`);
  console.log('Todas las sedes devueltas:', res2.data?.pivotData?.map((p: any) => `${p.sede}: S/. ${p.total}`));
}

main().catch(console.error).finally(() => process.exit(0));
