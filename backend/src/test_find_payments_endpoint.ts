import axios from 'axios';
import https from 'https';

async function main() {
  const token = 'cqDCgshoLx8trC68n66XutHUGl6yKmu4HTUAiLemjfThNwZqEJ';
  const baseURL = 'https://gymbra.syscomecosistemadigital.com/api';
  
  const client = axios.create({
    baseURL,
    timeout: 30000,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'Mozilla/5.0'
    }
  });

  console.log('Testing how to get real payments and items for documents...');

  // Get a sample document ID from /documents/lists
  const listRes = await client.get('/documents/lists/2026-06-01/2026-06-05');
  const sampleDoc = listRes.data?.data?.[0];
  const docId = sampleDoc?.id;
  const docExtId = sampleDoc?.external_id;

  console.log(`Sample Doc: ID=${docId}, Number=${sampleDoc?.number}, ExternalID=${docExtId}`);

  // Test endpoints to fetch document detail:
  const endpoints = [
    `/documents/record/${docId}`,
    `/document/record/${docId}`,
    `/documents/record/${docExtId}`,
    `/document/record/${docExtId}`,
    `/documents/${docId}`,
    `/document/${docId}`,
    `/reports/sales/payments`,
    `/reports/payments`,
    `/reports/cash`,
    `/cash/report`,
    `/cash/current-cash`,
    `/cash/records`
  ];

  for (const ep of endpoints) {
    try {
      const res = await client.get(ep);
      console.log(`✅ ${ep}: Status ${res.status}`);
      if (res.data) {
        console.log('   Keys:', Object.keys(res.data?.data || res.data));
        const d = res.data?.data || res.data;
        if (d.payments) console.log('   👉 payments found:', d.payments);
        if (d.items) console.log('   👉 items found:', d.items.length);
      }
    } catch (e: any) {
      console.log(`❌ ${ep}: ${e.response?.status || e.message}`);
    }
  }
}

main().catch(console.error);
