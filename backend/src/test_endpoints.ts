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

  const resList = await client.get('/documents/lists?page=1');
  const doc = resList.data.data?.[0];
  if (!doc) {
    console.log("No documents found.");
    return;
  }
  
  const id = doc.id;
  const uuid = doc.external_id;
  console.log(`Testing endpoints with ID: ${id}, UUID: ${uuid}`);

  const endpoints = [
    `/documents/record/${id}`,
    `/documents/record/${uuid}`,
    `/documents/record-items/${uuid}`,
    `/documents/record-items/${id}`,
    `/documents/${uuid}/items`,
    `/documents/${id}/items`,
    `/reports/sales`,
    `/reports/items`,
    `/items`,
    `/documents`,
    `/invoices/${uuid}`,
    `/invoices/${id}`
  ];

  for (const ep of endpoints) {
    try {
      const res = await client.get(ep);
      console.log(`🟢 Success: ${ep}`);
      console.log(`   Keys:`, Object.keys(res.data?.data || res.data || {}));
      if (Array.isArray(res.data?.data?.items) || Array.isArray(res.data?.items)) {
        console.log(`   👉 FOUND ITEMS! Count:`, (res.data?.data?.items || res.data?.items).length);
      }
    } catch (e: any) {
      console.log(`🔴 Failed: ${ep} -> ${e.response?.status || e.message}`);
    }
  }
}

main();
