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
    console.log("No documents found");
    return;
  }
  const uuid = doc.external_id;

  const queryParams = [
    { name: 'with[]=items', params: { 'with': ['items'] } },
    { name: 'relations[]=items', params: { 'relations': ['items'] } },
    { name: 'include=items', params: { 'include': 'items' } },
    { name: 'items=1', params: { 'items': 1 } }
  ];

  for (const q of queryParams) {
    try {
      console.log(`Testing /documents/record/${uuid} with ${q.name}...`);
      const res = await client.get(`/documents/record/${uuid}`, { params: q.params });
      const data = res.data?.data;
      console.log(`  Success! Keys:`, Object.keys(data || {}));
      console.log(`  Items key present?`, 'items' in (data || {}), Array.isArray(data?.items));
    } catch (e: any) {
      console.log(`  Failed: ${q.name} -> ${e.message}`);
    }
  }
}

main();
