import axios from 'axios';

async function main() {
  const backendUrl = 'https://backend-production-73c83.up.railway.app';
  try {
    const res = await axios.get(`${backendUrl}/api/sales/debug-sync-check-june`);
    console.log("--- DEBUG SYNC CHECK JUNE ---");
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.error("Error:", err.response?.data || err.message);
  }
}

main();
