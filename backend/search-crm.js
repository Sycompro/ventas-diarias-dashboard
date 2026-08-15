import fs from 'fs';
const file = 'c:/Users/Administrador/Desktop/Dashboard Syscom/frontend/src/hooks/useSalesMetrics.ts';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('companyId')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
