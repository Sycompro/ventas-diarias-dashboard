import { getCompanyBranches, resolveBranchSeries } from './services/branch-resolver.service.js';

async function main() {
  const companyId = '51089e80-446d-461c-ae37-1518381eb051'; // GYMBRA
  console.log('--- Consultando getCompanyBranches ---');
  const branches = await getCompanyBranches(companyId);
  console.log(JSON.stringify(branches, null, 2));

  console.log('\n--- Resolviendo series para cada sucursal ---');
  for (const b of branches) {
    const series = await resolveBranchSeries(companyId, b.id);
    console.log(`Sucursal: ${b.name} (id: ${b.id}) -> Series:`, series);
  }
}

main().catch(console.error).finally(() => process.exit(0));
