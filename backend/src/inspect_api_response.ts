import axios from 'axios';
import https from 'https';

async function main() {
  const backendUrl = 'https://backend-production-73c83.up.railway.app';
  const gymbraId = '51089e80-446d-461c-ae37-1518381eb051';
  
  try {
    console.log("1. Logging in...");
    const loginRes = await axios.post(`${backendUrl}/api/auth/login`, {
      subdomain: 'gymbra',
      apiToken: 'cqDCgshoLx8trC68n66XutHUGl6yKmu4HTUAiLemjfThNwZqEJ'
    });
    
    const { accessToken } = loginRes.data;
    console.log("Logged in successfully.");
    
    const url = 'https://gymbra.syscomecosistemadigital.com/api/documents/lists/2026-06-01/2026-06-10';
    console.log("2. Fetching directly from GYMBRA API:", url);
    
    const res = await axios.get(url, {
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      headers: {
        Authorization: `Bearer cqDCgshoLx8trC68n66XutHUGl6yKmu4HTUAiLemjfThNwZqEJ`
      }
    });
    
    console.log("Success! Status:", res.status);
    const documents = res.data?.data || [];
    console.log(`Documents count in range: ${documents.length}`);
    
    if (documents.length > 0) {
      const doc = documents[0];
      console.log("\n--- Keys in document ---");
      console.log(Object.keys(doc));
      
      console.log("\n--- Full raw document sample ---");
      console.log(JSON.stringify(doc, null, 2));
    } else {
      console.log("No documents returned in this range.");
    }
    
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}

main();
