import axios from 'axios';
import https from 'https';

const subdomain = 'autefsaceirl';
const token = 'MB8NwXxYh938o7iaCqZvcWGh9sv3gyy0BbvVCf9YIrdX8Kti1k';
const baseURL = `https://${subdomain}.syscomecosistemadigital.com/api`;

const agent = new https.Agent({ rejectUnauthorized: false });

const headers = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function run() {
  try {
    const res = await axios.get(`${baseURL}/documents/lists?page=1`, {
      headers,
      httpsAgent: agent,
      timeout: 10000
    });
    
    const docs = res.data.data;
    console.log(`Checking record details for ${docs.length} documents...`);
    
    for (const doc of docs) {
      const recordRes = await axios.get(`${baseURL}/documents/record/${doc.id}`, {
        headers,
        httpsAgent: agent,
        timeout: 5000
      });
      const data = recordRes.data.data;
      const hasPayments = data.payments !== undefined;
      const hasItems = data.items !== undefined;
      console.log(`Doc ${doc.number} (ID: ${doc.id}) -> hasPayments: ${hasPayments}, hasItems: ${hasItems}`);
      if (hasPayments || hasItems) {
        console.log(`Found payments/items on Doc ${doc.number}!`);
        console.log("Keys found:", Object.keys(data));
        break;
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
