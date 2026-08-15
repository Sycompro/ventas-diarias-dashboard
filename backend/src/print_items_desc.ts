import axios from 'axios';

async function main() {
  const backendUrl = 'https://backend-production-73c83.up.railway.app';
  
  try {
    const loginRes = await axios.post(`${backendUrl}/api/auth/login`, {
      subdomain: 'autefsaceirl',
      apiToken: 'MB8NwXxYh938o7iaCqZvcWGh9sv3gyy0BbvVCf9YIrdX8Kti1k'
    });
    
    const { accessToken } = loginRes.data;
    
    const res = await axios.get(`${backendUrl}/api/sales/debug-categories`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    console.log("Categories stats:", res.data?.categories);
    console.log("Sample items (first 30):");
    console.log(JSON.stringify(res.data?.sampleItems, null, 2));
    
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

main();
