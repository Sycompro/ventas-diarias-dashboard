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
    if (!doc) {
      console.log("No documents found");
      return;
    }
    const uuid = doc.external_id;
    const xmlUrl = doc.download_xml;
    console.log(`Downloading XML from absolute URL: ${xmlUrl}...`);
    
    // Download xml from absolute url
    const resXml = await axios.get(xmlUrl, {
      responseType: 'text'
    });
    
    console.log("XML response type:", typeof resXml.data);
    console.log("XML response length:", resXml.data?.length);
    console.log("First 500 chars of XML response:");
    console.log(resXml.data?.substring(0, 500));
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}

main();
