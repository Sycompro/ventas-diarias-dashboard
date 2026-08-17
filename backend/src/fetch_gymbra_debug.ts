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

    console.log("2. Querying temp-debug-gymbra endpoint...");
    const res = await axios.get(`${backendUrl}/api/sales/temp-debug-gymbra`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log("--- GYMBRA DEBUG INFO ---");
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}

main();
