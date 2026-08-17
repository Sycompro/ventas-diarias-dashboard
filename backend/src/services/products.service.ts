import { sqlClient } from '../config/database.js';
import { resolveBranchSeries } from './branch-resolver.service.js';
import { redis } from '../config/redis.js';

export async function getProductAnalytics(
  companyId: string,
  dateStart: string,
  dateEnd: string,
  branch?: string | null,
  seller?: string | null
) {
  const branchKey = branch || 'all';
  const sellerKey = seller || 'all';
  const cacheKey = `products_v1:${companyId}:${dateStart}:${dateEnd}:${branchKey}:${sellerKey}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const hasCompanyFilter = !!companyId;
    const cId = companyId;
    
    let seriesArray: string[] = [];
    if (branch) {
      seriesArray = await resolveBranchSeries(companyId, branch);
    }
    const hasSeriesFilter = seriesArray.length > 0;
    
    const hasSellerFilter = !!seller;
    const sellerName = seller || '';

    const queryResults = await sqlClient`
      SELECT 
        LOWER(TRIM(si.description)) as product_name,
        SUM(CASE WHEN s.document_type_id = '07' THEN -si.quantity::numeric ELSE si.quantity::numeric END) as total_qty,
        SUM(CASE WHEN s.document_type_id = '07' THEN -si.total::numeric ELSE si.total::numeric END) as total_revenue,
        COUNT(DISTINCT s.id) as transaction_count,
        AVG(si.unit_price::numeric) as avg_price,
        MAX(s.issued_at) as last_sold_at,
        MIN(s.issued_at) as first_sold_at
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status = 'active'
        AND si.category = '01'
        AND (${!hasCompanyFilter} OR s.company_id = ${cId})
        AND (${!hasSeriesFilter} OR s.series = ANY(${seriesArray}))
        AND (${!hasSellerFilter} OR s.seller_name = ${sellerName})
        AND (s.issued_at AT TIME ZONE 'America/Lima')::date >= ${dateStart}::date 
        AND (s.issued_at AT TIME ZONE 'America/Lima')::date <= ${dateEnd}::date
      GROUP BY LOWER(TRIM(si.description))
      HAVING SUM(CASE WHEN s.document_type_id = '07' THEN -si.quantity::numeric ELSE si.quantity::numeric END) > 0
      ORDER BY total_qty DESC
    `;

    const start = new Date(dateStart).getTime();
    const end = new Date(dateEnd).getTime();
    const daysInPeriod = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

    let totalUniqueProducts = 0;
    let totalUnitsSold = 0;
    let totalOverallRevenue = 0;

    const processedProducts = queryResults.map((p: any) => {
      const totalQty = Number(p.total_qty);
      const totalRevenue = Number(p.total_revenue);
      const lastSoldDate = new Date(p.last_sold_at);
      const now = new Date();
      const daysSinceLastSale = Math.max(0, Math.floor((now.getTime() - lastSoldDate.getTime()) / (1000 * 60 * 60 * 24)));

      totalUniqueProducts++;
      totalUnitsSold += totalQty;
      totalOverallRevenue += totalRevenue;

      return {
        name: p.product_name,
        totalQty,
        totalRevenue,
        transactionCount: Number(p.transaction_count),
        avgPrice: Number(p.avg_price),
        dailyRotation: totalQty / daysInPeriod,
        daysSinceLastSale,
        abcClass: ''
      };
    });

    // ABC Classification
    const revenueSorted = [...processedProducts].sort((a, b) => b.totalRevenue - a.totalRevenue);
    
    let cumulativeRevenue = 0;
    let classACount = 0;
    let classBCount = 0;
    let classCCount = 0;

    revenueSorted.forEach(p => {
      cumulativeRevenue += p.totalRevenue;
      const pct = (cumulativeRevenue / totalOverallRevenue) * 100;
      
      let abcClass = 'C';
      if (pct <= 80) {
        abcClass = 'A';
        classACount++;
      } else if (pct <= 95) {
        abcClass = 'B';
        classBCount++;
      } else {
        abcClass = 'C';
        classCCount++;
      }

      // Update original object
      const orig = processedProducts.find(origP => origP.name === p.name);
      if (orig) orig.abcClass = abcClass;
    });

    const topRotation = processedProducts.slice(0, 15);
    const lowRotation = [...processedProducts].sort((a, b) => a.totalQty - b.totalQty).slice(0, 15);

    // Median rotation for A-class products
    const classAProducts = processedProducts.filter(p => p.abcClass === 'A');
    const sortedDailyRotation = processedProducts.map(p => p.dailyRotation).sort((a, b) => a - b);
    const medianRotation = sortedDailyRotation.length > 0 
      ? (sortedDailyRotation.length % 2 !== 0 
        ? sortedDailyRotation[Math.floor(sortedDailyRotation.length / 2)] 
        : (sortedDailyRotation[Math.floor((sortedDailyRotation.length - 1) / 2)] + sortedDailyRotation[Math.floor(sortedDailyRotation.length / 2)]) / 2)
      : 0;

    const priceOpportunities = classAProducts.filter(p => p.dailyRotation > medianRotation);
    
    const classCProducts = processedProducts.filter(p => p.abcClass === 'C');
    const discountCandidates = classCProducts.filter(p => p.daysSinceLastSale > 14);

    const staleProducts = [...processedProducts]
      .filter(p => p.daysSinceLastSale > 0)
      .sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale)
      .slice(0, 15);

    const avgRotationPerDay = totalUnitsSold / daysInPeriod;

    const result = {
      topRotation,
      lowRotation,
      abcClassification: processedProducts,
      priceOpportunities,
      discountCandidates,
      staleProducts,
      summary: {
        totalUniqueProducts,
        totalUnitsSold,
        avgRotationPerDay,
        classACount,
        classBCount,
        classCCount
      }
    };

    await redis.setex(cacheKey, 300, JSON.stringify(result));

    return result;

  } catch (error) {
    console.error('Error in getProductAnalytics:', error);
    throw error;
  }
}
