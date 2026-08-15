import ExcelJS from 'exceljs';

export function generateCSV(data: Record<string, unknown>[], columns: string[]): string {
  if (data.length === 0) return columns.join(',') + '\n';
  
  const header = columns.join(',');
  const rows = data.map(row => {
    return columns.map(col => {
      let val = row[col];
      if (val === null || val === undefined) val = '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(',');
  });
  
  return [header, ...rows].join('\n');
}

export async function generateExcelBuffer(data: Record<string, unknown>[], sheetName: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  
  if (data.length > 0) {
    const columns = Object.keys(data[0]);
    sheet.columns = columns.map(col => ({ header: col, key: col, width: 18 }));
    
    // Estilo del encabezado
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    data.forEach(item => {
      sheet.addRow(item);
    });
  }
  
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as unknown as Buffer;
}
