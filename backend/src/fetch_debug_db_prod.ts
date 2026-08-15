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
    console.log("Logged in successfully.");
    
    console.log("2. Querying debug-db endpoint...");
    const dbRes = await axios.get(`${backendUrl}/api/sales/debug-db`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    console.log("--- DEBUG-DB RESPONSE ---");
    console.log(JSON.stringify(dbRes.data, null, 2));
    
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}

main();
