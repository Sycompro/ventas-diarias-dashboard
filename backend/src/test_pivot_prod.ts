import axios from 'axios';

async function main() {
  const backendUrl = 'https://backend-production-73c83.up.railway.app';
  
  try {
    console.log("1. Logging in...");
    const loginRes = await axios.post(`${backendUrl}/api/auth/login`, {
      subdomain: 'autefsaceirl',
      apiToken: 'MB8NwXxYh938o7iaCqZvcWGh9sv3gyy0BbvVCf9YIrdX8Kti1k'
    });
    
    const { accessToken } = loginRes.data;
    console.log("Logged in successfully. Token length:", accessToken.length);
    
    console.log("2. Querying branches endpoint...");
    const branchesRes = await axios.get(`${backendUrl}/api/companies/all/branches`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log("Branches:", JSON.stringify(branchesRes.data, null, 2));

    console.log("3. Querying pivot endpoint for June 2026...");
    const pivotRes = await axios.get(`${backendUrl}/api/sales/pivot`, {
      params: {
        dateStart: '2026-06-01',
        dateEnd: '2026-06-30'
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    console.log("--- PIVOT RESPONSE JUNE 2026 ---");
    console.log(JSON.stringify(pivotRes.data, null, 2));
    
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}

main();
