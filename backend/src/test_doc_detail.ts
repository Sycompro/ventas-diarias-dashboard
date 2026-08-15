import axios from 'axios';

async function main() {
  const subdomain = 'autefsaceirl';
  const token = 'MB8NwXxYh938o7iaCqZvcWGh9sv3gyy0BbvVCf9YIrdX8Kti1k';
  
  try {
    const baseURL = `https://${subdomain}.syscomecosistemadigital.com/api`;
    const client = axios.create({
      baseURL,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log("1. Fetching list to get external_id...");
    const resList = await client.get('/documents/lists?page=1');
    const docs = resList.data.data;
    if (!docs || docs.length === 0) {
      console.log("No documents found");
      return;
    }

    const doc = docs[0];
    const numericId = doc.id;
    const uuid = doc.external_id;
    console.log(`First doc numeric id: ${numericId}, uuid: ${uuid}`);

    // Try GET /documents/{id}
    try {
      console.log("2. Querying GET /documents/:id...");
      const resId = await client.get(`/documents/${numericId}`);
      console.log("/documents/:id success! Keys:", Object.keys(resId.data?.data || resId.data || {}));
      if (resId.data?.data?.items || resId.data?.items) {
        console.log("Found items array! Length:", (resId.data?.data?.items || resId.data?.items).length);
      }
    } catch (e: any) {
      console.log("/documents/:id failed:", e.message);
    }

    // Try GET /documents/{uuid}
    try {
      console.log("3. Querying GET /documents/:uuid...");
      const resUuid = await client.get(`/documents/${uuid}`);
      console.log("/documents/:uuid success! Keys:", Object.keys(resUuid.data?.data || resUuid.data || {}));
      if (resUuid.data?.data?.items || resUuid.data?.items) {
        console.log("Found items array in uuid! Length:", (resUuid.data?.data?.items || resUuid.data?.items).length);
      }
    } catch (e: any) {
      console.log("/documents/:uuid failed:", e.message);
    }
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}

main();
