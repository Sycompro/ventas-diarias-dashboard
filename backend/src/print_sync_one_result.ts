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
    
    console.log("2. Querying debug-sync-one endpoint...");
    const res = await axios.get(`${backendUrl}/api/sales/debug-sync-one`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    console.log("--- DEBUG-SYNC-ONE RESPONSE ---");
    console.log(JSON.stringify(res.data, null, 2));

    const httpUrl = res.data.xmlUrl?.replace('https://', 'http://');
    if (httpUrl) {
      console.log(`Testing HTTP download direct: ${httpUrl}...`);
      try {
        const httpRes = await axios.get(httpUrl, {
          responseType: 'text',
          timeout: 5000
        });
        console.log(`  🟢 HTTP Success! Length: ${httpRes.data?.length}`);
      } catch (err: any) {
        console.log(`  🔴 HTTP Failed: ${err.message} ${err.response?.data?.substring(0, 100) || ''}`);
      }
    }
    
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}

main();
