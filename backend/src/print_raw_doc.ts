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
    const res = await client.get('/documents/lists?page=1');
    const docs = res.data.data;
    if (docs && docs.length > 0) {
      console.log("--- RAW DOCUMENT ---");
      console.log(JSON.stringify(docs[0], null, 2));
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

main();
