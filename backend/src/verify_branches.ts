import { sqlClient } from './config/database.js';

async function main() {
  try {
    console.log('=== 1. VERIFICACIÓN DE ESTABLECIMIENTO EN RAW_JSON ===');
    const salesSample = await sqlClient`
      SELECT 
        series, 
        number, 
        seller_name, 
        total,
        COALESCE(
          (raw_json->>'establishment_id')::int,
          (raw_json->'establishment'->>'id')::int,
          (raw_json->>'establishmentId')::int
        ) as est_id
      FROM sales
      WHERE series IS NOT NULL
      ORDER BY id DESC
      LIMIT 10
    `;
    salesSample.forEach((r: any) => {
      console.log(`Comprobante: ${r.series}-${r.number} | Vendedor: ${r.seller_name} | Total: S/. ${r.total} | Establishment ID en JSON: ${r.est_id}`);
    });

    console.log('\n=== 2. DISTRIBUCIÓN TOTAL DE SERIES Y ESTABLECIMIENTOS ===');
    const branchDistribution = await sqlClient`
      SELECT 
        series,
        COALESCE(
          (raw_json->>'establishment_id')::int,
          (raw_json->'establishment'->>'id')::int,
          (raw_json->>'establishmentId')::int
        ) as est_id,
        COUNT(*)::int as count_sales,
        SUM(total::numeric)::numeric as total_amount
      FROM sales
      WHERE series IS NOT NULL AND status = 'active'
      GROUP BY series, est_id
      ORDER BY est_id, series
    `;
    branchDistribution.forEach((r: any) => {
      console.log(`Est. ID: ${r.est_id} | Serie: ${r.series} | Ventas: ${r.count_sales} | Total: S/. ${r.total_amount}`);
    });

    console.log('\n=== 3. VENDEDORES POR ESTABLECIMIENTO (Para validar cruce) ===');
    const sellerDist = await sqlClient`
      SELECT 
        COALESCE(
          (raw_json->>'establishment_id')::int,
          (raw_json->'establishment'->>'id')::int,
          (raw_json->>'establishmentId')::int
        ) as est_id,
        seller_name,
        COUNT(*)::int as count_sales
      FROM sales
      WHERE series IS NOT NULL AND status = 'active'
      GROUP BY est_id, seller_name
      ORDER BY est_id, count_sales DESC
    `;
    sellerDist.forEach((r: any) => {
      console.log(`Est. ID: ${r.est_id} | Vendedor: ${r.seller_name} | Cantidad Ventas: ${r.count_sales}`);
    });

  } catch (err: any) {
    console.error('Error running verification:', err.message);
  } finally {
    await sqlClient.end();
  }
}

main();
