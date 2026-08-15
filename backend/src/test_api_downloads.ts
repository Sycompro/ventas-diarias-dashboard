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
  console.log(`Testing API download routes with UUID: ${uuid}, ID: ${id}`);

  const paths = [
    `/documents/download/xml/${uuid}`,
    `/documents/download/xml/${id}`,
    `/documents/xml/${uuid}`,
    `/documents/xml/${id}`,
    `/documents/download/${uuid}/xml`,
    `/documents/download/${id}/xml`,
    `/documents/download-file/${uuid}/xml`,
    `/documents/download-file/${id}/xml`
  ];

  for (const p of paths) {
    try {
      console.log(`Testing GET ${p}...`);
      const res = await client.get(p, { responseType: 'text' });
      console.log(`  🟢 Success! Status: ${res.status}. Length: ${res.data?.length}`);
      if (res.data?.substring(0, 100).includes('<?xml')) {
        console.log("  👉 SUCCESS! THIS IS THE XML!");
      }
    } catch (e: any) {
      console.log(`  🔴 Failed: ${p} -> ${e.response?.status || e.message}`);
    }
  }
}

main();
