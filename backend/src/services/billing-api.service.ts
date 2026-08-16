import axios, { AxiosInstance } from 'axios';
import https from 'https';

export interface BillingItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  item_type_id?: string;
}

export interface BillingPayment {
  payment_method_type_id: string;
  amount: number;
  reference?: string;
}

export interface BillingDocument {
  id: number;
  external_id: string;
  document_type_id: string;
  series: string;
  number: string;
  date_of_issue: string;
  time_of_issue: string;
  customer_name: string;
  total: number;
  state_type_id: string;
  user_name: string;
  items: BillingItem[];
  payments: BillingPayment[];
  download_xml?: string;
}

export function createBillingClient(subdomain: string, decryptedToken: string): AxiosInstance {
  const baseURL = subdomain.includes('.') 
    ? `https://${subdomain}/api` 
    : `https://${subdomain}.syscomecosistemadigital.com/api`;
    
  return axios.create({
    baseURL,
    timeout: 45000,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }), // Bypass certificate issues
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${decryptedToken}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
}

export async function fetchDocuments(client: AxiosInstance, dateStart: string, dateEnd: string): Promise<BillingDocument[]> {
  const allDocuments: BillingDocument[] = [];
  let currentPage = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const response = await client.get(`/documents/lists?page=${currentPage}`, {
      params: {
        date_start: dateStart,
        date_end: dateEnd
      }
    });
    
    const { data, meta } = response.data;
    if (data && Array.isArray(data)) {
      allDocuments.push(...data);
    }
    
    if (meta && meta.last_page > currentPage) {
      currentPage++;
    } else {
      hasMorePages = false;
    }
  }

  return allDocuments;
}

export async function testConnection(subdomain: string, token: string): Promise<boolean> {
  try {
    const client = createBillingClient(subdomain, token);
    await client.get('/company');
    return true;
  } catch (error: any) {
    console.error(`❌ [Test Connection Error] para ${subdomain}:`, error.message);
    if (error.response) {
      console.error(`Status de Respuesta: ${error.response.status}`);
      console.error(`Datos de Respuesta:`, JSON.stringify(error.response.data));
    }
    return false;
  }
}

export async function fetchReportDocuments(client: AxiosInstance, dateStart: string, dateEnd: string): Promise<any[]> {
  try {
    const response = await client.get('/reports/documents', {
      params: {
        date_start: dateStart,
        date_end: dateEnd
      }
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    console.error('❌ [Billing API Service] Error fetching report documents:', error.message);
    return [];
  }
}

export async function fetchSaleNotes(client: AxiosInstance, dateStart: string, dateEnd: string): Promise<any[]> {
  const allSaleNotes: any[] = [];
  let currentPage = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    try {
      const response = await client.get(`/sale-note/lists?page=${currentPage}`, {
        params: {
          date_start: dateStart,
          date_end: dateEnd
        }
      });
      
      const { data, meta } = response.data;
      if (data && Array.isArray(data)) {
        allSaleNotes.push(...data);
      }
      
      if (meta && meta.last_page > currentPage) {
        currentPage++;
      } else {
        hasMorePages = false;
      }
    } catch (error: any) {
      console.error(`[Billing API Service] Error fetching sale notes on page ${currentPage}:`, error.message);
      hasMorePages = false;
    }
  }

  return allSaleNotes;
}

export async function fetchSaleNoteDetail(client: AxiosInstance, externalId: string): Promise<any | null> {
  try {
    const response = await client.get(`/sale-note/record/${externalId}`);
    return response.data?.data || null;
  } catch (error: any) {
    return null;
  }
}
