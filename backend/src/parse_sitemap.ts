import axios from 'axios';
import https from 'https';

async function parseSitemap() {
  const res = await axios.get('https://manual.pro8.uio.la/sitemap.xml', {
    httpsAgent: new https.Agent({ rejectUnauthorized: false })
  });
  
  const urls: string[] = [];
  const regex = /<loc>(https:\/\/[^<]+)<\/loc>/g;
  let match;
  while ((match = regex.exec(res.data)) !== null) {
    urls.push(match[1]);
  }
  
  console.log(`Total URLs en sitemap: ${urls.length}\n`);
  
  // URLs relacionadas con tenant, api, sucursales, series, establecimientos
  console.log('=== URLs DE TENANT / API / CONFIGURACION ===');
  urls.filter(u => 
    u.includes('tenant') || 
    u.includes('api') || 
    u.includes('sucursal') || 
    u.includes('establecimiento') || 
    u.includes('serie') || 
    u.includes('usuario') ||
    u.includes('admin') ||
    u.includes('devs')
  ).forEach(u => console.log(u));

  console.log('\n=== TODAS LAS URLs DE MANUAL PRO8 ===');
  urls.forEach(u => console.log(u));
}

parseSitemap().catch(console.error);
