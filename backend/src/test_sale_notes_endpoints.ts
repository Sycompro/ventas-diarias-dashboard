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
    const res = await client.get('/sale-note/lists');
    console.log("Response keys:", Object.keys(res.data));
    console.log("Data sample 0:", JSON.stringify(res.data.data[0], null, 2));
    if (res.data.meta || res.data.links) {
      console.log("Meta/Links:", JSON.stringify({ meta: res.data.meta, links: res.data.links }, null, 2));
    }
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}

main();
