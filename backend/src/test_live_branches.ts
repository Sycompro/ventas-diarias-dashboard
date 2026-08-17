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
    
    console.log("2. Querying /api/companies/:id/branches...");
    const branchesRes = await axios.get(`${backendUrl}/api/companies/${gymbraId}/branches`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    console.log("\n--- LIVE BRANCHES RESPONSE ---");
    console.log(JSON.stringify(branchesRes.data, null, 2));

    console.log("\n3. Querying /api/companies/:id/sellers for each branch...");
    for (const b of branchesRes.data) {
      const sellersRes = await axios.get(`${backendUrl}/api/companies/${gymbraId}/sellers?branch=${b.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      console.log(`Branch: ${b.name} (ID: ${b.id}, Series: [${b.series.join(', ')}])`);
      console.log(`  -> Sellers:`, sellersRes.data);
    }
    
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}

main();
