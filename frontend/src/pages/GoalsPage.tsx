import React from 'react';
import { Target } from 'lucide-react';
import { GoalProgress } from '../components/ui/GoalProgress';

export const GoalsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <Target className="text-primary" /> Metas y Objetivos
          </h2>
          <p className="text-sm text-neutral-500 mt-1">Seguimiento de cumplimiento de metas empresariales y de ventas.</p>
        </div>
        <button className="btn-primary">
          Nueva Meta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <GoalProgress 
          title="Ventas Mensuales (Global)" 
          target={150000} 
          current={125000} 
        />
        <GoalProgress 
          title="Meta Ana García (Agosto)" 
          target={50000} 
          current={25000} 
        />
        <GoalProgress 
          title="Meta Carlos López (Agosto)" 
          target={45000} 
          current={42000} 
        />
        <GoalProgress 
          title="Nuevos Clientes" 
          target={100} 
          current={115} 
          format="number"
        />
      </div>
    </div>
  );
};
