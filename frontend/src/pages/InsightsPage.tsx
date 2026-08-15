import React from 'react';
import { Lightbulb } from 'lucide-react';
import { InsightCard } from '../components/ui/InsightCard';

export const InsightsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Lightbulb className="text-primary" /> Insights Inteligentes
        </h2>
        <p className="text-sm text-neutral-500 mt-1">Descubrimientos automáticos basados en el análisis de sus datos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <InsightCard 
          type="positive"
          dataLabel="Ventas Cruzadas"
          title="Oportunidad de Upsell detectada"
          description="El 65% de los clientes que compran el producto 'Laptop Pro X' terminan comprando 'Mouse Inalámbrico' en menos de 30 días. Sugerimos crear un combo promocional."
          dataPoint="+ S/. 15,000 pot."
        />
        <InsightCard 
          type="neutral"
          dataLabel="Rendimiento"
          title="Tendencia Positiva en Tarjetas"
          description="Los pagos con tarjeta de crédito han aumentado consistentemente durante los últimos 3 meses, representando ahora el 45% del total."
          dataPoint="+ 15% vs ant."
        />
        <InsightCard 
          type="negative"
          dataLabel="Horarios"
          title="Baja afluencia matutina"
          description="Las ventas entre las 09:00 y 11:00 am están un 20% por debajo de su promedio histórico para este mes."
          dataPoint="- 20% flujo"
        />
      </div>
    </div>
  );
};
