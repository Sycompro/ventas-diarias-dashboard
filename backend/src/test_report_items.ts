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
    '/reports/documents/items',
    '/reports/sales/items',
    '/reports/sales-notes/items',
    '/reports/sales-note/items',
    '/reports/items',
    '/reports/products',
    '/reports/sales-by-product',
    '/reports/sales-by-item'
  ];

  for (const ep of endpoints) {
    try {
      console.log(`Testing GET ${ep}...`);
      const res = await client.get(ep, {
        params: {
          date_start: '2026-08-01',
          date_end: '2026-08-15'
        }
      });
      console.log(`  🟢 Success: ${ep}. Length:`, Array.isArray(res.data) ? res.data.length : Object.keys(res.data || {}).length);
      if (res.data && (Array.isArray(res.data) || res.data.data)) {
        const sample = Array.isArray(res.data) ? res.data[0] : res.data.data?.[0];
        console.log(`   Sample keys:`, Object.keys(sample || {}));
      }
    } catch (e: any) {
      console.log(`  🔴 Failed: ${ep} -> ${e.response?.status || e.message}`);
    }
  }
}

main();
