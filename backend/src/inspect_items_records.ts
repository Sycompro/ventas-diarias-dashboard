import axios from 'axios';

async function main() {
  const subdomain = 'autefsaceirl';
  const token = 'MB8NwXxYh938o7iaCqZvcWGh9sv3gyy0BbvVCf9YIrdX8Kti1k';
  const baseURL = `https://${subdomain}.syscomecosistemadigital.com/api`;
  const client = axios.create({
    baseURL,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  try {
    console.log("Fetching /items/records...");
    const res = await client.get('/items/records');
    console.log("Response type:", typeof res.data);
    console.log("Response keys:", Object.keys(res.data || {}));
    console.log("Response data (sample keys 0):", res.data?.data ? Object.keys(res.data.data) : 'No data wrap');
    const firstKey = Object.keys(res.data || {})[0];
    console.log("First item value:", JSON.stringify((res.data || {})[firstKey], null, 2));
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

main();
