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
    
    console.log("2. Querying debug-categories endpoint...");
    const catRes = await axios.get(`${backendUrl}/api/sales/debug-categories`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    console.log("--- DISTINCT CATEGORIES IN PROD ---");
    console.log(JSON.stringify(catRes.data, null, 2));
    
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}

main();
