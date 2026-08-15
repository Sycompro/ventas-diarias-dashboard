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

  const endpoints = [
    '/products',
    '/services',
    '/catalog/items',
    '/catalog/products',
    '/catalog/services',
    '/items/lists',
    '/items/records'
  ];

  for (const ep of endpoints) {
    try {
      console.log(`Testing GET ${ep}...`);
      const res = await client.get(ep);
      console.log(`  🟢 Success: ${ep}. Keys:`, Object.keys(res.data?.data || res.data || {}));
    } catch (e: any) {
      console.log(`  🔴 Failed: ${ep} -> ${e.response?.status || e.message}`);
    }
  }
}

main();
