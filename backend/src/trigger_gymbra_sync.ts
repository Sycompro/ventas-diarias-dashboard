import axios from 'axios';

async function main() {
  const backendUrl = 'https://backend-production-73c83.up.railway.app';
  const gymbraId = '51089e80-446d-461c-ae37-1518381eb051';
  
  try {
    console.log("1. Logging in...");
    const loginRes = await axios.post(`${backendUrl}/api/auth/login`, {
      subdomain: 'gymbra',
      apiToken: 'cqDCgshoLx8trC68n66XutHUGl6yKmu4HTUAiLemjfThNwZqEJ'
    });
    
    const { accessToken } = loginRes.data;
    console.log("Logged in successfully.");
    
    console.log("2. Triggering sync for GYMBRA...");
    try {
      const syncRes = await axios.post(`${backendUrl}/api/companies/${gymbraId}/sync`, { days: 120 }, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      console.log("Sync trigger response:", syncRes.data);
    } catch (syncErr: any) {
      console.error("Sync failed:", syncErr.response?.data || syncErr.message);
    }
    
    console.log("3. Querying verify-distribution endpoint for GYMBRA...");
    const res = await axios.get(`${backendUrl}/api/sales/verify-distribution`, {
      params: {
        companyId: gymbraId
      },
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    console.log("\n--- GYMBRA VERIFY DISTRIBUTION RESPONSE ---");
    console.log(JSON.stringify(res.data, null, 2));
    
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}

main();
