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
    const resList = await client.get('/documents/lists?page=1');
    const doc = resList.data.data?.[0];
    if (!doc) return;
    
    console.log(`Querying /documents/record/${doc.external_id}...`);
    const res = await client.get(`/documents/record/${doc.external_id}`);
    
    console.log("Response keys:", Object.keys(res.data || {}));
    console.log("Response data keys:", res.data?.data ? Object.keys(res.data.data) : 'No data wrap');
    const docData = res.data?.data || res.data;
    console.log("pdf_a4_data type:", typeof docData?.pdf_a4_data);
    if (docData?.pdf_a4_data) {
      console.log("pdf_a4_data keys:", Object.keys(docData.pdf_a4_data));
      console.log("pdf_a4_data content (first 300 chars or keys):", JSON.stringify(docData.pdf_a4_data).substring(0, 300));
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

main();
