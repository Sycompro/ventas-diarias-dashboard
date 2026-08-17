import React, { useState, useEffect } from 'react';
import { Building2, Plus, RefreshCw, Trash2, Edit, Check, ShieldCheck, Globe, Key, Link2, Clock, Coins, Copy, CheckCircle2, X, Zap, Settings } from 'lucide-react';
import { useCompanies } from '../hooks/useCompany';
import { useAuthStore } from '../hooks/useAuth';
import { companyService } from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
import { ToastContainer } from '../components/ui/Toast';
import { useHeaderStore } from '../hooks/useHeader';

export const CompaniesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: companies, isLoading } = useCompanies();

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

  const getWebhookUrl = (companyId: string) => {
    const apiEnvUrl = import.meta.env.VITE_API_URL;
    if (apiEnvUrl) {
      const cleanUrl = apiEnvUrl.endsWith('/') ? apiEnvUrl.slice(0, -1) : apiEnvUrl;
      return `${cleanUrl}/api/webhooks/billing/${companyId}`;
    }
    return `${window.location.origin}/api/webhooks/billing/${companyId}`;
  };

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
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);

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

  const copyWebhookUrl = (companyId: string) => {
    const url = getWebhookUrl(companyId);
    navigator.clipboard.writeText(url);
    setCopiedWebhook(companyId);
    setTimeout(() => setCopiedWebhook(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <ToastContainer toasts={toasts} />

      {/* Loader */}
      {isLoading ? (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-56 bg-white rounded-2xl border border-slate-200/80 animate-pulse"></div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-5">
          {companies?.map((company: any) => (
            <div 
              key={company.id}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm"
            >
              {/* Company Header */}
              <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">{company.name}</h3>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">RUC: {company.ruc}</p>
                    </div>
                  </div>
                  
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Conectado
                  </span>
                </div>
              </div>

              {/* Info Grid */}
              <div className="p-5 space-y-3">
                {/* API Endpoint */}
                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Globe size={12} className="text-slate-400" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Punto de Integración (API)</span>
                  </div>
                  <code className="text-[11px] text-slate-700 break-all select-all font-mono font-medium leading-relaxed">
                    https://{company.subdomain}.syscomecosistemadigital.com/api
                  </code>
                </div>

                {/* Webhook URL */}
                <div className="bg-blue-50/40 rounded-xl p-3.5 border border-blue-100/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Zap size={12} className="text-blue-500" />
                      <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Webhook de Tiempo Real</span>
                    </div>
                    <button
                      onClick={() => copyWebhookUrl(company.id)}
                      className="flex items-center gap-1 text-[10px] font-semibold text-blue-500 hover:text-blue-700 transition-colors cursor-pointer"
                    >
                      {copiedWebhook === company.id ? (
                        <><CheckCircle2 size={11} /> Copiado</>
                      ) : (
                        <><Copy size={11} /> Copiar</>
                      )}
                    </button>
                  </div>
                  <code className="text-[11px] text-blue-700 break-all select-all font-mono font-bold leading-relaxed block">
                    {getWebhookUrl(company.id)}
                  </code>
                  <p className="text-[9px] text-slate-400 mt-2 leading-snug">
                    Registra esta URL en tu Facturador Pro → Configuración → Webhooks para recibir ventas en tiempo real.
                  </p>
                </div>

                {/* Metadata Row */}
                <div className="flex items-center gap-4 px-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Coins size={12} className="text-slate-400" />
                    <span>Moneda: <strong className="text-slate-700">{company.currencySymbol || 'S/.'}</strong></span>
                  </div>
                  <div className="w-px h-3.5 bg-slate-200"></div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Clock size={12} className="text-slate-400" />
                    <span>Zona: <strong className="text-slate-700">{company.timezone || 'America/Lima'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleTestConnection(company.id, company.name)}
                    disabled={testingId === company.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <Check size={13} className={testingId === company.id ? 'animate-spin' : ''} />
                    {testingId === company.id ? 'Probando...' : 'Probar API'}
                  </button>
                  <button 
                    onClick={() => handleForceSync(company.id, company.name)}
                    disabled={syncingId === company.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <RefreshCw size={13} className={syncingId === company.id ? 'animate-spin' : ''} />
                    {syncingId === company.id ? 'Sincronizando...' : 'Sincronizar'}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => openEditModal(company)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-all cursor-pointer"
                    title="Editar credenciales"
                  >
                    <Settings size={15} />
                  </button>
                  <button 
                    onClick={() => handleDelete(company.id, company.name)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                    title="Desconectar integración"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {(!companies || companies.length === 0) && (
            <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-slate-200 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-7 h-7 text-slate-400" />
              </div>
              <h4 className="text-base font-bold text-slate-700">Ninguna empresa configurada</h4>
              <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                Registra las credenciales y subdominios de tus facturadores para comenzar a compilar ventas en tu dashboard unificado.
              </p>
              <button 
                onClick={openAddModal}
                className="mt-5 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors text-xs font-bold cursor-pointer shadow-sm"
              >
                Conectar Primera Empresa
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── CRUD / Integration Modal ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-xl">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingCompany ? 'Editar Credenciales' : 'Conectar Facturador'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                    Vincula tu cuenta del ecosistema digital para sincronizar comprobantes.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Subdomain */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Globe size={11} /> Subdominio de la empresa
                </label>
                <div className="flex items-stretch bg-slate-50 border border-slate-200 rounded-xl focus-within:border-slate-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-100 transition-all overflow-hidden">
                  <input 
                    type="text" 
                    value={subdomain} 
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/\s+/g, ''))} 
                    placeholder="miempresa" 
                    className="flex-1 px-3.5 py-2.5 bg-transparent border-0 outline-none text-slate-800 placeholder-slate-400 text-sm font-medium"
                    required
                  />
                  <span className="px-3 text-slate-400 text-[10px] font-semibold border-l border-slate-200 bg-slate-100/60 flex items-center shrink-0 select-none">
                    .syscomecosistemadigital.com
                  </span>
                </div>
              </div>

              {/* API Token */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Key size={11} /> Token de la API
                </label>
                <input 
                  type="password" 
                  value={apiToken} 
                  onChange={(e) => setApiToken(e.target.value)} 
                  placeholder={editingCompany ? '••••••••••••••••' : 'Pega tu API Token aquí'} 
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100 outline-none transition-all text-sm text-slate-800 placeholder-slate-400 font-medium"
                  required={!editingCompany}
                />
                {editingCompany && (
                  <p className="text-[9px] text-slate-400 leading-snug">
                    Deja vacío para conservar el token actual. Solo rellena si deseas actualizarlo.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-2">
                <button 
                  type="button"
                  onClick={() => handleTestConnection(editingCompany?.id || '', name)}
                  disabled={testingId !== null || !subdomain}
                  className="flex-1 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-all disabled:opacity-40 cursor-pointer text-center shadow-sm"
                >
                  {testingId ? 'Probando...' : 'Probar Conexión'}
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs transition-all disabled:opacity-50 cursor-pointer text-center shadow-sm"
                >
                  {saving ? 'Guardando...' : 'Guardar Conexión'}
                </button>
              </div>

              {/* Disconnect option for edit mode */}
              {editingCompany && (
                <div className="pt-3 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => {
                      handleDelete(editingCompany.id, editingCompany.name);
                    }}
                    className="w-full px-4 py-2.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl font-semibold text-xs transition-all cursor-pointer text-center"
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
