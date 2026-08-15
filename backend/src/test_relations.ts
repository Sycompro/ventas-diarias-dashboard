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

  const queryParams = [
    { name: 'with[]=items', params: { 'with': ['items'] } },
    { name: 'relations[]=items', params: { 'relations': ['items'] } },
    { name: 'include=items', params: { 'include': 'items' } },
    { name: 'with_items=1', params: { 'with_items': 1 } },
    { name: 'items=1', params: { 'items': 1 } },
    { name: 'detail=1', params: { 'detail': 1 } }
  ];

  for (const q of queryParams) {
    try {
      console.log(`Testing /documents/lists with ${q.name}...`);
      const res = await client.get('/documents/lists', { params: q.params });
      const docs = res.data?.data;
      if (docs && docs.length > 0) {
        const doc = docs[0];
        console.log(`  Success! Items key present?`, 'items' in doc, Array.isArray(doc.items), doc.items?.length);
      }
    } catch (e: any) {
      console.log(`  Failed: ${q.name} -> ${e.message}`);
    }
  }

  for (const q of queryParams) {
    try {
      console.log(`Testing /reports/documents with ${q.name}...`);
      const res = await client.get('/reports/documents', { params: q.params });
      const docs = res.data;
      if (docs && docs.length > 0) {
        const doc = docs[0];
        console.log(`  Success! Items key present?`, 'items' in doc, Array.isArray(doc.items), doc.items?.length);
      }
    } catch (e: any) {
      console.log(`  Failed: ${q.name} -> ${e.message}`);
    }
  }
}

main();
