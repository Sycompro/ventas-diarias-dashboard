import React, { useState, useEffect, useMemo } from 'react';
import { Target, Plus, X, Calendar, DollarSign, User, Trash2, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsService } from '../services/api';
import { useFilters } from '../hooks/useFilters';
import { useCompanySellers } from '../hooks/useCompany';
import { Skeleton } from '../components/ui/Skeleton';
import { CustomDatePicker } from '../components/ui/CustomDatePicker';
import { useHeaderStore } from '../hooks/useHeader';
import { formatCurrency } from '../utils/formatters';

export const GoalsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { companyId } = useFilters();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const setHeader = useHeaderStore((state: any) => state.setHeader);
  const clearHeader = useHeaderStore((state: any) => state.clearHeader);

  // Form State
  const [targetValue, setTargetValue] = useState('');
  const [periodType, setPeriodType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().split('T')[0]);
  const [periodEnd, setPeriodEnd] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [sellerName, setSellerName] = useState('');

  // Local Filter States
  const [filterSeller, setFilterSeller] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch Goals Progress
  const { data: goalsProgress = [], isLoading } = useQuery({
    queryKey: ['goals-progress', companyId],
    queryFn: () => goalsService.getProgress(),
    enabled: !!companyId
  });

  // Fetch official company sellers list for the dropdown
  const { data: companySellers = [] } = useCompanySellers();

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

  // Mutation to delete a goal
  const deleteMutation = useMutation({
    mutationFn: (id: string) => goalsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals-progress'] });
    }
  });

  useEffect(() => {
    setHeader(
      'Metas y Objetivos',
      'Seguimiento de cumplimiento de metas empresariales y de ventas.',
      <button 
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900"
      >
        <Plus className="w-4 h-4" />
        Nueva Meta
      </button>
    );
    return () => clearHeader();
  }, [companyId]);

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

  const handleDelete = (id: string, name: string | null) => {
    const label = name ? `para ${name}` : 'general';
    if (window.confirm(`¿Estás seguro de que deseas eliminar la meta ${label}?`)) {
      deleteMutation.mutate(id);
    }
  };

  // Extract unique sellers that have goals configured for the filter options
  const configuredSellers = useMemo(() => {
    const names = Array.from(new Set(goalsProgress.map((g: any) => g.sellerName).filter(Boolean)));
    return names;
  }, [goalsProgress]);

  // Client-side filtering logic
  const filteredGoals = useMemo(() => {
    return goalsProgress.filter((goal: any) => {
      // 1. Seller Filter
      if (filterSeller !== 'all') {
        if (filterSeller === 'general') {
          if (goal.sellerName !== null) return false;
        } else {
          if (goal.sellerName !== filterSeller) return false;
        }
      }
      
      // 2. Period Filter
      if (filterPeriod !== 'all') {
        if (goal.periodType !== filterPeriod) return false;
      }
      
      // 3. Status Filter
      if (filterStatus !== 'all') {
        if (goal.status !== filterStatus) return false;
      }
      
      return true;
    });
  }, [goalsProgress, filterSeller, filterPeriod, filterStatus]);

  // KPI calculations
  const stats = useMemo(() => {
    const total = filteredGoals.length;
    const achieved = filteredGoals.filter((g: any) => g.status === 'achieved').length;
    const avgProgress = total > 0 
      ? Math.round((filteredGoals.reduce((sum: number, g: any) => sum + Math.min(g.percentage, 100), 0) / total) * 10) / 10
      : 0;

    return { total, achieved, avgProgress };
  }, [filteredGoals]);

  return (
    <div className="space-y-6">
      {/* ─── Compact Filter Bar ─── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full">
          {/* Seller Filter */}
          <div className="flex flex-col gap-1 min-w-[150px]">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Filtrar por Vendedor</span>
            <select
              value={filterSeller}
              onChange={(e) => setFilterSeller(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none transition-colors"
            >
              <option value="all">Todos los vendedores</option>
              <option value="general">Metas Generales</option>
              {configuredSellers.map((name: any) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Period Filter */}
          <div className="flex flex-col gap-1 min-w-[120px]">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Período</span>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none transition-colors"
            >
              <option value="all">Todos</option>
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
              <option value="yearly">Anual</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-1 min-w-[120px]">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Estado de Meta</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none transition-colors"
            >
              <option value="all">Todos los estados</option>
              <option value="achieved">Cumplida (100%)</option>
              <option value="on_track">En camino (80%+)</option>
              <option value="at_risk">En riesgo (50%+)</option>
              <option value="behind">Atrasado (&lt;50%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── KPI Cards ─── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Target size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metas Configuradas</span>
              <span className="text-xl font-black text-slate-800 block mt-0.5">{stats.total}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metas Cumplidas</span>
              <span className="text-xl font-black text-slate-800 block mt-0.5">{stats.achieved}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <TrendingUp size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progreso Promedio</span>
              <span className="text-xl font-black text-slate-800 block mt-0.5">{stats.avgProgress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Goals Progress Grid ─── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 max-w-xl mx-auto shadow-sm">
          <Target className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-slate-600 font-bold text-center text-sm">No hay metas configuradas para estos filtros.</p>
          <p className="text-xs text-slate-400 mt-1 text-center">Haz clic en "Nueva Meta" arriba a la derecha para registrar un nuevo objetivo de ventas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {filteredGoals.map((goal: any) => {
            const isGeneral = goal.sellerName === null;
            const percentage = Math.min(goal.percentage, 100);
            
            // Status styling
            let statusBadge = { text: 'En Progreso', colors: 'bg-blue-50 text-blue-700 border-blue-100' };
            let barColor = 'bg-blue-500';
            if (goal.status === 'achieved') {
              statusBadge = { text: 'Lograda 🎉', colors: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
              barColor = 'bg-emerald-500';
            } else if (goal.status === 'on_track') {
              statusBadge = { text: 'En Camino', colors: 'bg-amber-50 text-amber-700 border-amber-100' };
              barColor = 'bg-amber-500';
            } else if (goal.status === 'at_risk') {
              statusBadge = { text: 'En Riesgo', colors: 'bg-orange-50 text-orange-700 border-orange-100' };
              barColor = 'bg-orange-500';
            } else if (goal.status === 'behind') {
              statusBadge = { text: 'Atrasado', colors: 'bg-rose-50 text-rose-700 border-rose-100' };
              barColor = 'bg-rose-500';
            }

            const periodLabel = goal.periodType === 'daily' ? 'Diario'
                              : goal.periodType === 'weekly' ? 'Semanal'
                              : goal.periodType === 'monthly' ? 'Mensual'
                              : 'Anual';

            return (
              <div 
                key={goal.goalId} 
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-slate-300 transition-colors flex flex-col justify-between"
              >
                {/* Header card info */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isGeneral ? (
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">
                          Global
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-violet-50 text-violet-700 border border-violet-100 uppercase">
                          Vendedor
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border uppercase ${statusBadge.colors}`}>
                        {statusBadge.text}
                      </span>
                    </div>

                    {/* Delete action button */}
                    <button
                      onClick={() => handleDelete(goal.goalId, goal.sellerName)}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-all"
                      title="Eliminar Meta"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <h4 className="text-slate-800 font-bold text-xs leading-snug">
                    {isGeneral ? 'Meta de Ventas Generales' : `Vendedor: ${goal.sellerName}`}
                  </h4>

                  {/* Dates description */}
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                    <Calendar size={11} />
                    <span>{goal.periodStart} a {goal.periodEnd} ({periodLabel})</span>
                  </div>
                </div>

                {/* Progress bar and details */}
                <div className="mt-5">
                  <div className="flex items-end justify-between mb-1.5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-800 tabular-nums">{goal.percentage}%</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Completado</span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-[6px] overflow-hidden flex">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${percentage}%` }} />
                  </div>

                  {/* Values info footer */}
                  <div className="flex justify-between items-center text-[10px] font-semibold mt-2">
                    <span className="text-slate-700 tabular-nums">
                      {formatCurrency(goal.currentValue)} / {formatCurrency(goal.targetValue)}
                    </span>
                    {goal.currentValue >= goal.targetValue ? (
                      <span className="text-emerald-600 font-bold">¡Meta lograda!</span>
                    ) : (
                      <span className="text-slate-400 tabular-nums">
                        Faltan: {formatCurrency(goal.remaining)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── NEW GOAL MODAL ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-blue-600" /> Registrar Nueva Meta
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Target value input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Selection selects */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Período
                  </label>
                  <select
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-600 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                  >
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Vendedor (Opcional)
                  </label>
                  <select
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-600 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                  >
                    <option value="">Meta General (Todos)</option>
                    {companySellers.map((s: any) => (
                      <option key={s.id || s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date pickers */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Período de la Meta
                </label>
                <CustomDatePicker
                  dateStart={periodStart}
                  dateEnd={periodEnd}
                  onChange={(start, end) => {
                    setPeriodStart(start);
                    setPeriodEnd(end);
                  }}
                  className="w-full font-semibold"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-200"
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
