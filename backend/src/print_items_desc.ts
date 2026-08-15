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
    
    // We can also query all items in the database by making a temporary endpoint or writing a database query
    console.log("Categories stats:", res.data);
    
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

main();
