import axios from 'axios';

function parseXmlItems(xmlText: string): any[] {
  const items: any[] = [];
  let startIdx = 0;
  
  while (true) {
    const startNode = xmlText.indexOf('<cac:InvoiceLine>', startIdx);
    if (startNode === -1) break;
    const endNode = xmlText.indexOf('</cac:InvoiceLine>', startNode);
    if (endNode === -1) break;
    
    const lineText = xmlText.substring(startNode, endNode + '</cac:InvoiceLine>'.length);
    startIdx = endNode + '</cac:InvoiceLine>'.length;
    
    // Extract description
    let description = '';
    const descMatch = lineText.match(/<cbc:Description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/cbc:Description>/);
    if (descMatch) {
      description = descMatch[1].trim();
    }
    
    // Extract quantity and unitCode
    let quantity = '1';
    let unitCode = '';
    const qtyMatch = lineText.match(/<cbc:InvoicedQuantity\s+unitCode="([^"]+)">([^<]+)<\/cbc:InvoicedQuantity>/);
    if (qtyMatch) {
      unitCode = qtyMatch[1];
      quantity = qtyMatch[2].trim();
    }
    
    // Extract price including tax (AlternativeConditionPrice)
    let unitPrice = '0';
    const priceMatch = lineText.match(/<cac:AlternativeConditionPrice>[\s\S]*?<cbc:PriceAmount[^>]*>([^<]+)<\/cbc:PriceAmount>/);
    if (priceMatch) {
      unitPrice = priceMatch[1].trim();
    } else {
      // Fallback to base price
      const basePriceMatch = lineText.match(/<cac:Price>[\s\S]*?<cbc:PriceAmount[^>]*>([^<]+)<\/cbc:PriceAmount>/);
      if (basePriceMatch) {
        unitPrice = basePriceMatch[1].trim();
      }
    }
    
    const qtyVal = parseFloat(quantity) || 0;
    const priceVal = parseFloat(unitPrice) || 0;
    const total = (qtyVal * priceVal).toFixed(2);
    
    const category = unitCode === 'ZZ' ? '02' : '01';
    
    items.push({
      description,
      quantity,
      unitPrice,
      total,
      category,
      unitCode
    });
  }
  
  return items;
}

async function main() {
  const url = 'https://autefsaceirl.syscomecosistemadigital.com/downloads/document/xml/24a4b232-461b-45e8-b0b7-98b30dbba45b';
  
  try {
    console.log(`Downloading XML from: ${url}...`);
    const res = await axios.get(url, { responseType: 'text' });
    
    console.log("Parsing items...");
    const items = parseXmlItems(res.data);
    console.log("Parsed items result:");
    console.log(JSON.stringify(items, null, 2));
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

main();
