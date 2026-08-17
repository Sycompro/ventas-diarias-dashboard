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

  const res = await client.get('/sale-note/lists');
  console.log("Top level keys:", Object.keys(res.data));
  console.log("meta:", res.data.meta);
  console.log("links:", res.data.links);
}

main();
