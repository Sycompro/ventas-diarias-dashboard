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
    const resList = await client.get('/documents/lists?page=1');
    const doc = resList.data.data?.[0];
    if (!doc) return;
    
    console.log(`Downloading XML from: ${doc.download_xml}...`);
    const resXml = await axios.get(doc.download_xml, { responseType: 'text' });
    
    // Find cac:InvoiceLine nodes
    const lines: string[] = [];
    let startIdx = 0;
    while (true) {
      const startNode = resXml.data.indexOf('<cac:InvoiceLine>', startIdx);
      if (startNode === -1) break;
      const endNode = resXml.data.indexOf('</cac:InvoiceLine>', startNode);
      if (endNode === -1) break;
      
      lines.push(resXml.data.substring(startNode, endNode + '</cac:InvoiceLine>'.length));
      startIdx = endNode + '</cac:InvoiceLine>'.length;
    }
    
    console.log(`Found ${lines.length} invoice lines in XML.`);
    lines.forEach((line, idx) => {
      console.log(`\n--- LINE ${idx + 1} ---`);
      console.log(line);
    });
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

main();
