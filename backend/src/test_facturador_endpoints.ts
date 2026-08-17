import axios from 'axios';
import https from 'https';

async function main() {
  const token = 'cqDCgshoLx8trC68n66XutHUGl6yKmu4HTUAiLemjfThNwZqEJ';
  const baseURL = 'https://gymbra.syscomecosistemadigital.com/api';
  
  const client = axios.create({
    baseURL,
    timeout: 10000,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  try {
    const res = await client.get('/document/search-items');
    const items = res.data?.data?.items || res.data?.data || [];
    console.log(`Found items:`, Array.isArray(items) ? items.length : typeof items);
    if (Array.isArray(items) && items.length > 0) {
      console.log(JSON.stringify(items[0], null, 2));
    }
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}

main();
