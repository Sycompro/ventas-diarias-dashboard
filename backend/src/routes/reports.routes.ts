import { Router } from 'express';
import { generateCSV, generateExcelBuffer } from '../services/reports.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { sqlClient } from '../config/database.js';

const router = Router();
router.use(authenticate);

router.get('/csv', async (req: any, res) => {
  try {
    const companyId = req.user.companyId;
    const dateStart = (req.query.dateStart as string) || new Date().toISOString().split('T')[0];
    const dateEnd = (req.query.dateEnd as string) || new Date().toISOString().split('T')[0];

    const salesData = await sqlClient`
      SELECT 
        series as "Serie", 
        number as "Número", 
        CASE 
          WHEN document_type_id = '01' THEN 'Factura'
          WHEN document_type_id = '03' THEN 'Boleta'
          WHEN document_type_id = '07' THEN 'Nota de Crédito'
          ELSE 'Otro'
        END as "Tipo Documento",
        customer_name as "Cliente",
        CASE 
          WHEN document_type_id = '07' THEN -(total::numeric)
          ELSE total::numeric
        END as "Monto",
        currency as "Moneda",
        seller_name as "Vendedor",
        TO_CHAR(issued_at, 'YYYY-MM-DD HH24:MI:SS') as "Fecha Emisión"
      FROM sales
      WHERE company_id = ${companyId} AND status = 'active'
        AND issued_at::date >= ${dateStart}::date AND issued_at::date <= ${dateEnd}::date
      ORDER BY issued_at DESC
    `;

    const csv = generateCSV(salesData as any, ["Serie", "Número", "Tipo Documento", "Cliente", "Monto", "Moneda", "Vendedor", "Fecha Emisión"]);
    
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(`reporte_ventas_${dateStart}_a_${dateEnd}.csv`);
    res.send(csv);
  } catch (err: any) {
    console.error('Error generating CSV report:', err.message);
    res.status(500).json({ message: 'Error generating CSV' });
  }
});

router.get('/excel', async (req: any, res) => {
  try {
    const companyId = req.user.companyId;
    const dateStart = (req.query.dateStart as string) || new Date().toISOString().split('T')[0];
    const dateEnd = (req.query.dateEnd as string) || new Date().toISOString().split('T')[0];

    const salesData = await sqlClient`
      SELECT 
        series as "Serie", 
        number as "Número", 
        CASE 
          WHEN document_type_id = '01' THEN 'Factura'
          WHEN document_type_id = '03' THEN 'Boleta'
          WHEN document_type_id = '07' THEN 'Nota de Crédito'
          ELSE 'Otro'
        END as "Tipo Documento",
        customer_name as "Cliente",
        CASE 
          WHEN document_type_id = '07' THEN -(total::numeric)
          ELSE total::numeric
        END as "Monto",
        currency as "Moneda",
        seller_name as "Vendedor",
        TO_CHAR(issued_at, 'YYYY-MM-DD HH24:MI:SS') as "Fecha Emisión"
      FROM sales
      WHERE company_id = ${companyId} AND status = 'active'
        AND issued_at::date >= ${dateStart}::date AND issued_at::date <= ${dateEnd}::date
      ORDER BY issued_at DESC
    `;

    const buffer = await generateExcelBuffer(salesData as any, 'Ventas');
    
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment(`reporte_ventas_${dateStart}_a_${dateEnd}.xlsx`);
    res.send(buffer);
  } catch (err: any) {
    console.error('Error generating Excel report:', err.message);
    res.status(500).json({ message: 'Error generating Excel' });
  }
});

export default router;
