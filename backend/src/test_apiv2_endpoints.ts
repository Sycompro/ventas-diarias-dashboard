import axios from 'axios';

async function main() {
  const subdomain = 'autefsaceirl';
  const token = 'MB8NwXxYh938o7iaCqZvcWGh9sv3gyy0BbvVCf9YIrdX8Kti1k';
  
  // Try with /api/v2
  const baseURLv2 = `https://${subdomain}.syscomecosistemadigital.com/api/v2`;
  const clientV2 = axios.create({
    baseURL: baseURLv2,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  const endpoints = [
    '/documents',
    '/documents/lists',
    '/reports/documents',
    '/items'
  ];

  console.log("--- Testing API v2 paths ---");
  for (const ep of endpoints) {
    try {
      const res = await clientV2.get(ep);
      console.log(`🟢 Success V2: ${ep}`);
      console.log(`   Keys:`, Object.keys(res.data?.data || res.data || {}));
    } catch (e: any) {
      console.log(`🔴 Failed V2: ${ep} -> ${e.response?.status || e.message}`);
    }
  }
}

main();
