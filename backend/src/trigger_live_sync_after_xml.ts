import axios from 'axios';

async function main() {
  const backendUrl = 'https://backend-production-73c83.up.railway.app';
  
  try {
    console.log("1. Logging in...");
    const loginRes = await axios.post(`${backendUrl}/api/auth/login`, {
      subdomain: 'autefsaceirl',
      apiToken: 'MB8NwXxYh938o7iaCqZvcWGh9sv3gyy0BbvVCf9YIrdX8Kti1k'
    });
    
    const { accessToken } = loginRes.data;
    console.log("Logged in successfully.");
    
    console.log("2. Fetching company details to get UUID...");
    const companyRes = await axios.get(`${backendUrl}/api/companies`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    const company = companyRes.data[0];
    if (!company) {
      console.error("No company found!");
      return;
    }
    
    const companyId = company.id;
    console.log(`Using Company ID: ${companyId}`);
    
    console.log("3. Triggering sync to download XMLs and populate categories...");
    const syncRes = await axios.post(`${backendUrl}/api/companies/${companyId}/sync`, {}, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    console.log("Sync trigger response:", syncRes.data);
    
    console.log("4. Fetching debug-categories to check results...");
    const catRes = await axios.get(`${backendUrl}/api/sales/debug-categories`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    console.log("--- DISTINCT CATEGORIES RESULT ---");
    console.log(JSON.stringify(catRes.data, null, 2));
    
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}

main();
