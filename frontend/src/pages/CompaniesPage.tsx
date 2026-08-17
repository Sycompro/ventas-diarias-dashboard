import React, { useState, useEffect } from 'react';
import { Building2, Plus, RefreshCw, Trash2, Edit, Check, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import { useCompanies } from '../hooks/useCompany';
import { useAuthStore } from '../hooks/useAuth';
import { companyService } from '../services/api';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { ToastContainer } from '../components/ui/Toast';
import { useHeaderStore } from '../hooks/useHeader';

export const CompaniesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: companies, isLoading, isRefetching } = useCompanies();

  const setHeader = useHeaderStore((state: any) => state.setHeader);
  const clearHeader = useHeaderStore((state: any) => state.clearHeader);

  useEffect(() => {
    setHeader(
      'Integración del Facturador',
      'Conecta y gestiona la sincronización con la API de tu facturador electrónico.',
      (!companies || companies.length === 0) ? (
        <button 
          onClick={openAddModal}
          className="px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all font-semibold flex items-center gap-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <Plus size={14} /> Conectar Nueva Empresa
        </button>
      ) : undefined
    );
    return () => clearHeader();
  }, [companies]);

  // State for Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [ruc, setRuc] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [timezone, setTimezone] = useState('America/Lima');
  const [currencySymbol, setCurrencySymbol] = useState('S/.');

  // Loading actions states
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Custom Toast State
  const [toasts, setToasts] = useState<any[]>([]);
  const addToast = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, type, message, onClose: removeToast }]);
  };
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const openAddModal = () => {
    setEditingCompany(null);
    setName('');
    setRuc('');
    setSubdomain('');
    setApiToken('');
    setTimezone('America/Lima');
    setCurrencySymbol('S/.');
    setIsModalOpen(true);
  };

  const openEditModal = (company: any) => {
    setEditingCompany(company);
    setName(company.name);
    setRuc(company.ruc);
    setSubdomain(company.subdomain);
    setApiToken(''); // Leave empty, indicate it is saved
    setTimezone(company.timezone || 'America/Lima');
    setCurrencySymbol(company.currencySymbol || 'S/.');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subdomain) {
      addToast('error', 'Por favor, completa el subdominio de la empresa.');
      return;
    }
    if (!editingCompany && !apiToken) {
      addToast('error', 'Debes ingresar el token de API para configurar la empresa.');
      return;
    }

    setSaving(true);
    try {
      if (editingCompany) {
        // Edit mode
        await companyService.update(editingCompany.id, {
          subdomain,
          apiToken: apiToken || undefined, // Overwrite if provided
        });
        addToast('success', `Facturador actualizado correctamente.`);
      } else {
        // Create mode
        await companyService.create({
          name: subdomain.toUpperCase(),
          ruc: '00000000000',
          subdomain,
          apiToken,
          timezone,
          currencySymbol,
        });
        addToast('success', `Facturador configurado e integrado.`);
      }
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsModalOpen(false);
    } catch (err: any) {
      addToast('error', `Error al guardar: ${err.response?.data?.message || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const logout = useAuthStore((state: any) => state.logout);

  const handleDelete = async (id: string, companyName: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas desconectar el facturador de "${companyName}"? Se detendrán las sincronizaciones automáticas y se cerrará tu sesión.`)) {
      return;
    }

    try {
      await companyService.delete(id);
      addToast('success', `Facturador "${companyName}" desconectado correctamente.`);
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setTimeout(() => {
        logout();
        window.location.href = '/login';
      }, 1500);
    } catch (err: any) {
      addToast('error', `Error al desconectar: ${err.message}`);
    }
  };

  const handleTestConnection = async (id: string, companyName: string) => {
    setTestingId(id || 'new');
    try {
      const res = await companyService.testConnection(id, apiToken);
      if (res.success) {
        addToast('success', `¡Conexión Exitosa! El facturador respondió correctamente.`);
      } else {
        addToast('error', `Fallo de autenticación: El token de la empresa no fue aceptado.`);
      }
    } catch (err: any) {
      addToast('error', `Fallo de conexión: Verifica el subdominio o el token.`);
    } finally {
      setTestingId(null);
    }
  };

  const handleForceSync = async (id: string, companyName: string) => {
    setSyncingId(id);
    try {
      const res = await companyService.sync(id);
      addToast('success', `¡Sincronización Completada! Se importaron ${res.documentsSynced || 0} comprobantes nuevos para "${companyName}".`);
      queryClient.invalidateQueries({ queryKey: ['sales-metrics'] });
    } catch (err: any) {
      addToast('error', `Error al sincronizar datos de "${companyName}": ${err.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <ToastContainer toasts={toasts} />

      {/* Loader */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-white rounded-xl border border-slate-200/80 animate-pulse"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {companies?.map((company: any) => (
            <div 
              key={company.id}
              className="bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/20 transition-all duration-300 p-6 flex flex-col justify-between relative overflow-hidden"
            >
              {/* Card visual accent */}
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary-500 to-violet-500"></div>

              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{company.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">RUC: {company.ruc}</p>
                  </div>
                  
                  {/* Status Indicator */}
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                    <ShieldCheck size={14} /> Activo
                  </span>
                </div>

                <div className="mt-5 space-y-2">
                  <div className="flex flex-col bg-slate-50 rounded-lg p-3">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Punto de Integración (API URL)</span>
                    <code className="text-xs text-slate-700 break-all select-all font-mono mt-1">
                      https://{company.subdomain}.syscomecosistemadigital.com/api
                    </code>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1 mt-2">
                    <span>Moneda: <strong className="text-slate-800">{company.currencySymbol || 'S/.'}</strong></span>
                    <span>Zona horaria: <strong className="text-slate-800">{company.timezone || 'America/Lima'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Actions Section */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-2 justify-between items-center">
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleTestConnection(company.id, company.name)}
                    disabled={testingId === company.id}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                    title="Verificar conexión en vivo con la API del Facturador"
                  >
                    <Check size={14} className={testingId === company.id ? 'animate-spin' : ''} />
                    {testingId === company.id ? 'Probando...' : 'Probar API'}
                  </button>
                  <button 
                    onClick={() => handleForceSync(company.id, company.name)}
                    disabled={syncingId === company.id}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                    title="Descargar y sincronizar comprobantes"
                  >
                    <RefreshCw size={14} className={syncingId === company.id ? 'animate-spin' : ''} />
                    {syncingId === company.id ? 'Sincronizando...' : 'Sincronizar'}
                  </button>
                </div>

                <div className="flex gap-1.5">
                  <button 
                    onClick={() => openEditModal(company)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    title="Editar parámetros"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(company.id, company.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Desconectar integración"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Setup tutorial card if list is empty */}
          {(!companies || companies.length === 0) && (
            <div className="col-span-2 bg-slate-50 rounded-xl p-8 text-center border border-dashed border-slate-200">
              <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h4 className="text-lg font-semibold text-slate-700">Ninguna empresa configurada</h4>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Registra las credenciales y subdominios de tus facturadores para comenzar a compilar ventas en tu dashboard unificado.
              </p>
              <button 
                onClick={openAddModal}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                Conectar Primera Empresa
              </button>
            </div>
          )}
        </div>
      )}

      {/* CRUD / Integration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6 relative">
            {/* Close button */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors text-xl font-bold"
            >
              &times;
            </button>

            {/* Modal Header */}
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                <Building2 size={22} className="text-slate-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Configurar Facturador Electrónico
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Vincula tu cuenta del facturador del ecosistema digital para cargar tus comprobantes y analizarlos en tiempo real.
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 tracking-wider">SUBDOMINIO DE LA EMPRESA</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:border-slate-400 focus-within:bg-white transition-all overflow-hidden">
                  <input 
                    type="text" 
                    value={subdomain} 
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/\s+/g, ''))} 
                    placeholder="restauranteestrellamarina" 
                    className="w-full px-3 py-2.5 bg-transparent border-0 outline-none text-slate-800 placeholder-slate-400 text-sm"
                    required
                  />
                  <span className="pr-3 text-slate-500 text-xs font-semibold border-l border-slate-200 pl-3 bg-slate-100/50 py-2.5 shrink-0 select-none">
                    .syscomecosistemadigital.com
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 tracking-wider">TOKEN DE LA API (API TOKEN)</label>
                <input 
                  type="password" 
                  value={apiToken} 
                  onChange={(e) => setApiToken(e.target.value)} 
                  placeholder={editingCompany ? '••••••••••••••••' : 'bJ7A••••••••kHEw'} 
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-400 focus:bg-white outline-none transition-all text-sm text-slate-800 placeholder-slate-400"
                  required={!editingCompany}
                />
              </div>

              {/* Main Actions Row */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => handleTestConnection(editingCompany?.id || '', name)}
                  disabled={testingId !== null}
                  className="px-4 py-2.5 bg-slate-105 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer text-center"
                >
                  {testingId ? 'Probando...' : 'Probar Conexión'}
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer text-center"
                >
                  {saving ? 'Guardando...' : 'Guardar Conexión'}
                </button>
              </div>

              {/* Disconnect Action */}
              {editingCompany && (
                <div className="pt-3 border-t border-slate-100 mt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      handleDelete(editingCompany.id, editingCompany.name);
                    }}
                    className="w-full px-4 py-2.5 border border-red-250 hover:bg-red-50 text-red-600 rounded-xl font-semibold text-sm transition-colors cursor-pointer text-center"
                  >
                    Desconectar Facturador
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
