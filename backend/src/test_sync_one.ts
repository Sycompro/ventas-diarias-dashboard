import axios from 'axios';
import https from 'https';

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
    if (!docs || docs.length === 0) return;
    
    const doc = docs[0];
    console.log(`Document Number: ${doc.number}`);
    console.log(`download_xml: ${doc.download_xml}`);
    
    if (doc.download_xml) {
      try {
        console.log("Downloading XML...");
        const xmlRes = await axios.get(doc.download_xml, { 
          responseType: 'text', 
          timeout: 5000,
          httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });
        const xmlText = xmlRes.data;
        console.log(`XML downloaded successfully. Length: ${xmlText.length}`);
        
        let startIdx = 0;
        let count = 0;
        while (true) {
          const startNode = xmlText.indexOf('<cac:InvoiceLine>', startIdx);
          if (startNode === -1) break;
          const endNode = xmlText.indexOf('</cac:InvoiceLine>', startNode);
          if (endNode === -1) break;
          
          count++;
          startIdx = endNode + '</cac:InvoiceLine>'.length;
        }
        console.log(`Found ${count} cac:InvoiceLine nodes.`);
      } catch (err: any) {
        console.log("Error inside download_xml:", err.message);
      }
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

main();
