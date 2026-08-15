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
  const id = doc.id;
  console.log(`Testing download endpoint with UUID: ${uuid}, ID: ${id}`);

  const paths = [
    `/documents/download/${uuid}`,
    `/documents/download/${id}`,
    `/documents/download-file/${uuid}`,
    `/documents/download-file/${id}`
  ];

  for (const p of paths) {
    try {
      console.log(`Testing GET ${p}...`);
      const res = await client.get(p);
      console.log(`  🟢 Success! Status: ${res.status}. Keys:`, Object.keys(res.data || {}));
    } catch (e: any) {
      console.log(`  🔴 Failed: ${p} -> ${e.response?.status || e.message}`);
    }
  }
}

main();
