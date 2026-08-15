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

    console.log("Fetching /reports/documents...");
    const res = await client.get('/reports/documents', {
      params: {
        date_start: '2026-08-01',
        date_end: '2026-08-15'
      }
    });
    
    const records = res.data;
    console.log("Records length:", records?.length);
    if (records && records.length > 0) {
      const rec = records[0];
      console.log("Record sample keys:", Object.keys(rec));
      console.log("Record items array present?", Array.isArray(rec.items), rec.items?.length);
      if (rec.items && rec.items.length > 0) {
        console.log("First item sample:", rec.items[0]);
      }
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

main();
