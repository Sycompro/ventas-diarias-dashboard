import axios from 'axios';

async function main() {
  const backendUrl = 'https://backend-production-73c83.up.railway.app';
  
  // 1. Iniciar sesión
  const loginRes = await axios.post(`${backendUrl}/api/auth/login`, {
    subdomain: 'gymbra',
    apiToken: 'cqDCgshoLx8trC68n66XutHUGl6yKmu4HTUAiLemjfThNwZqEJ'
  });
  
  const token = loginRes.data?.accessToken;
  const companyId = loginRes.data?.user?.companyId;

  console.log(`Logueado en empresa ID: ${companyId}`);

  // 2. Consultar /api/companies/:id/branches
  const branchesRes = await axios.get(`${backendUrl}/api/companies/${companyId}/branches`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('\nSucursales devueltas por la API en Producción:');
  console.log(JSON.stringify(branchesRes.data, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
