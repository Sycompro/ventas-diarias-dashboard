import React, { useState } from 'react';
import { Target, Plus, X, Calendar, DollarSign, User } from 'lucide-react';
import { GoalProgress } from '../components/ui/GoalProgress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsService } from '../services/api';
import { useFilters } from '../hooks/useFilters';
import { Skeleton } from '../components/ui/Skeleton';
import { CustomDatePicker } from '../components/ui/CustomDatePicker';

export const GoalsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { companyId } = useFilters();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [targetValue, setTargetValue] = useState('');
  const [periodType, setPeriodType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().split('T')[0]);
  const [periodEnd, setPeriodEnd] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [sellerName, setSellerName] = useState('');

  // Fetch Goals Progress
  const { data: goalsProgress = [], isLoading } = useQuery({
    queryKey: ['goals-progress', companyId],
    queryFn: () => goalsService.getProgress(),
    enabled: !!companyId
  });

  // Mutation to create a goal
  const createMutation = useMutation({
    mutationFn: (newGoal: any) => goalsService.create(newGoal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals-progress'] });
      setIsModalOpen(false);
      // Reset form
      setTargetValue('');
      setSellerName('');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValue || !periodStart || !periodEnd) return;

    createMutation.mutate({
      companyId,
      goalType: 'sales_amount',
      targetValue: parseFloat(targetValue),
      periodType,
      periodStart,
      periodEnd,
      sellerName: sellerName.trim() || null,
      isActive: true
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <Target className="text-primary" /> Metas y Objetivos
          </h2>
          <p className="text-sm text-neutral-500 mt-1">Seguimiento de cumplimiento de metas empresariales y de ventas.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-lg shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Meta
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[180px]" />
          <Skeleton className="h-[180px]" />
          <Skeleton className="h-[180px]" />
        </div>
      ) : goalsProgress.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-slate-100 max-w-xl mx-auto">
          <Target className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium text-center">No hay metas configuradas para este período.</p>
          <p className="text-xs text-slate-400 mt-1 text-center">Haz clic en "Nueva Meta" para registrar un objetivo mensual de ventas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {goalsProgress.map((goal: any) => {
            const title = goal.sellerName 
              ? `Meta Vendedor: ${goal.sellerName}`
              : `Ventas Mensuales (Global)`;
            return (
              <GoalProgress 
                key={goal.goalId}
                title={title} 
                target={goal.targetValue} 
                current={goal.currentValue} 
              />
            );
          })}
        </div>
      )}

      {/* NEW GOAL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-blue-600" /> Registrar Nueva Meta
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Monto Objetivo (S/.)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    placeholder="Ej. 15000"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Período
                  </label>
                  <select
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Vendedor (Opcional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Ej. Ana García"
                      value={sellerName}
                      onChange={(e) => setSellerName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" /> Período de la Meta
                </label>
                <CustomDatePicker
                  dateStart={periodStart}
                  dateEnd={periodEnd}
                  onChange={(start, end) => {
                    setPeriodStart(start);
                    setPeriodEnd(end);
                  }}
                  className="w-full"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending ? 'Guardando...' : 'Crear Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
