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
    '/reports/sales/excel',
    '/reports/documents/excel',
    '/reports/sales/pdf',
    '/reports/documents/pdf',
    '/reports/sales/records',
    '/reports/documents/records'
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
      console.log(`  🟢 Success: ${ep}. Response data type: ${typeof res.data}. Data keys/length:`, Array.isArray(res.data) ? res.data.length : Object.keys(res.data || {}).length);
    } catch (e: any) {
      console.log(`  🔴 Failed: ${ep} -> ${e.response?.status || e.message}`);
    }
  }
}

main();
