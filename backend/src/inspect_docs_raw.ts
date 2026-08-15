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

    console.log("Fetching documents...");
    const res = await client.get('/documents/lists?page=1');
    const docs = res.data.data;
    console.log(`Found ${docs?.length} docs.`);
    if (docs && docs.length > 0) {
      const doc = docs[0];
      console.log("Document sample keys:", Object.keys(doc));
      console.log("Document items present?", Array.isArray(doc.items), doc.items?.length);
      if (doc.items && doc.items.length > 0) {
        console.log("First item:", doc.items[0]);
      }
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

main();
