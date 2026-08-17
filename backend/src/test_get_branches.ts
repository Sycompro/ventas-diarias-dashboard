import { getCompanyBranches } from './services/branch-resolver.service';

async function main() {
  const gymbraId = '51089e80-446d-461c-ae37-1518381eb051';
  console.log("Calling getCompanyBranches for GYMBRA...");
  try {
    const branches = await getCompanyBranches(gymbraId);
    console.log("\n--- RESULT OF getCompanyBranches ---");
    console.log(JSON.stringify(branches, null, 2));
  } catch (err: any) {
    console.error("Error:", err.message);
  }
  process.exit(0);
}

main();
