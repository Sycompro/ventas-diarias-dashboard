import dotenv from 'dotenv';
dotenv.config();
import { sqlClient } from './config/database.js';

async function run() {
  try {
    const res = await sqlClient`
      SELECT category, count(*)::int as count, sum(total::numeric) as total
      FROM sale_items
      GROUP BY category
    `;
    console.log('Sale items categories list:');
    console.log(res);

    const resUnitTypes = await sqlClient`
      SELECT unit_type, count(*)::int as count
      FROM sale_items
      GROUP BY unit_type
    `;
    console.log('\nUnit types list:');
    console.log(resUnitTypes);
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

run();
