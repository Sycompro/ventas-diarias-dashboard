import axios, { AxiosInstance } from 'axios';

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
}

export function createBillingClient(subdomain: string, decryptedToken: string): AxiosInstance {
  const baseURL = subdomain.includes('.') 
    ? `https://${subdomain}/api` 
    : `https://${subdomain}.uio.la/api`;
    
  return axios.create({
    baseURL,
    timeout: 12000,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${decryptedToken}`
    }
  });
}

export async function fetchDocuments(client: AxiosInstance, dateStart: string, dateEnd: string): Promise<BillingDocument[]> {
  const allDocuments: BillingDocument[] = [];
  let currentPage = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const response = await client.post(`/documents/lists?page=${currentPage}`, {
      date_start: dateStart,
      date_end: dateEnd
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
    const today = new Date().toISOString().split('T')[0];
    await client.post('/documents/lists', {
      date_start: today,
      date_end: today
    });
    return true;
  } catch (error) {
    return false;
  }
}
