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

  const urls = [
    '/sale-note/lists',
    '/sale-note/lists?page=1',
    '/sale-note/lists?d_start=2026-08-01&d_end=2026-08-16',
    '/sale-note/lists/2026-08-01/2026-08-16',
    '/sale-notes/lists'
  ];

  for (const u of urls) {
    try {
      const res = await client.get(u);
      console.log(`[OK 200] ${u} -> count: ${res.data?.data?.length || 0}`);
    } catch (err: any) {
      console.log(`[ERR ${err.response?.status}] ${u}`);
    }
  }
}

main();
