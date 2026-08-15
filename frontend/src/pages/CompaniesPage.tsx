import React, { useState } from 'react';
import { Building2, Plus, RefreshCw, Trash2, Edit, Check, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import { useCompanies } from '../hooks/useCompany';
import { companyService } from '../services/api';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { ToastContainer } from '../components/ui/Toast';

export const CompaniesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: companies, isLoading, isRefetching } = useCompanies();

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
    if (!name || !ruc || !subdomain) {
      addToast('error', 'Por favor, completa los campos requeridos.');
      return;
    }
    if (ruc.length !== 11 || isNaN(Number(ruc))) {
      addToast('error', 'El RUC debe tener exactamente 11 dígitos numéricos.');
      return;
    }
    if (!editingCompany && !apiToken) {
      addToast('error', 'Debes ingresar el token de API para configurar una nueva empresa.');
      return;
    }

    setSaving(true);
    try {
      if (editingCompany) {
        // Edit mode
        await companyService.update(editingCompany.id, {
          name,
          subdomain,
          apiToken: apiToken || undefined, // Overwrite if provided
        });
        addToast('success', `Empresa "${name}" actualizada correctamente.`);
      } else {
        // Create mode
        await companyService.create({
          name,
          ruc,
          subdomain,
          apiToken,
          timezone,
          currencySymbol,
        });
        addToast('success', `Empresa "${name}" configurada e integrada.`);
      }
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsModalOpen(false);
    } catch (err: any) {
      addToast('error', `Error al guardar: ${err.response?.data?.message || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, companyName: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas desactivar la integración de "${companyName}"? Se detendrán los despliegues de sincronización.`)) {
      return;
    }

    try {
      await companyService.delete(id);
      addToast('success', `Integración con "${companyName}" desactivada exitosamente.`);
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    } catch (err: any) {
      addToast('error', `Error al eliminar: ${err.message}`);
    }
  };

  const handleTestConnection = async (id: string, companyName: string) => {
    setTestingId(id);
    try {
      const res = await companyService.testConnection(id, ''); // Backend decrypts DB credentials automatically
      if (res.success) {
        addToast('success', `¡Conexión Exitosa con "${companyName}"! El facturador respondió correctamente.`);
      } else {
        addToast('error', `Fallo de autenticación: El token de la empresa "${companyName}" no fue aceptado.`);
      }
    } catch (err: any) {
      addToast('error', `Fallo de conexión con "${companyName}": RUC/subdominio incorrectos o sin internet.`);
    } finally {
      setTestingId(null);
    }
  };

  const handleForceSync = async (id: string, companyName: string) => {
    setSyncingId(id);
    try {
      const res = await companyService.sync(id);
      addToast('success', `¡Sincronización Completada! Se importaron ${res.documentsSynced || 0} documentos nuevos para "${companyName}".`);
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
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="text-primary-600" /> Integración de Empresas y Sedes
          </h2>
          <p className="text-sm text-slate-500 mt-1">Conecta múltiples sucursales a la API de facturación electrónica SUNAT.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all font-medium flex items-center gap-2 shadow-sm shadow-primary-600/10 hover:shadow-primary-600/20 active:scale-95 cursor-pointer text-sm"
        >
          <Plus size={16} /> Configurar Nueva Sede
        </button>
      </div>

      {/* Loader */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-white rounded-xl shadow-sm animate-pulse"></div>
          <div className="h-48 bg-white rounded-xl shadow-sm animate-pulse"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {companies?.map((company: any) => (
            <div 
              key={company.id}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-6 flex flex-col justify-between relative overflow-hidden"
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
                    title="Descargar y sincronizar comprobantes del día"
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
                    title="Desactivar integración"
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
              <h4 className="text-lg font-semibold text-slate-700">Ninguna sede configurada</h4>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Registra las credenciales y subdominios de tus facturadores para comenzar a compilar ventas en tu dashboard unificado.
              </p>
              <button 
                onClick={openAddModal}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                Configurar Primera Empresa
              </button>
            </div>
          )}
        </div>
      )}

      {/* CRUD / Integration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 size={20} className="text-primary-600" />
                {editingCompany ? 'Editar Configuración de Sede' : 'Conectar Nueva Sede'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Razón Social / Nombre Comercial *</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Ej. Comercializadora San José" 
                  className="w-full px-3 py-2 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all shadow-inner text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">RUC de la Empresa *</label>
                  <input 
                    type="text" 
                    value={ruc} 
                    onChange={(e) => setRuc(e.target.value)} 
                    placeholder="11 dígitos" 
                    maxLength={11}
                    className="w-full px-3 py-2 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all shadow-inner text-sm disabled:opacity-60"
                    disabled={!!editingCompany} // Block RUC modification to maintain database integrity
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Subdominio Facturador *</label>
                  <div className="relative flex items-center">
                    <input 
                      type="text" 
                      value={subdomain} 
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/\s+/g, ''))} 
                      placeholder="ej. miempresa" 
                      className="w-full px-3 py-2 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all shadow-inner text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* API Connection Information box */}
              {subdomain && (
                <div className="p-3 bg-primary-50/50 rounded-lg text-xs text-primary-800 flex items-start gap-2">
                  <HelpCircle size={16} className="shrink-0 mt-0.5 text-primary-600" />
                  <p>
                    Se establecerá comunicación con:<br />
                    <strong className="font-mono break-all text-primary-900">
                      https://{subdomain}.syscomecosistemadigital.com/api
                    </strong>
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">
                  Token de Autorización API (Bearer Token) *
                </label>
                <input 
                  type="password" 
                  value={apiToken} 
                  onChange={(e) => setApiToken(e.target.value)} 
                  placeholder={editingCompany ? '•••••••••••••••• (Guardado - Dejar vacío para no cambiar)' : 'Ingresa el token de seguridad provisto por el facturador'} 
                  className="w-full px-3 py-2 bg-slate-50 border-0 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all shadow-inner text-sm"
                  required={!editingCompany}
                />
              </div>

              {!editingCompany && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Moneda por Defecto</label>
                    <select 
                      value={currencySymbol} 
                      onChange={(e) => setCurrencySymbol(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border-0 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all shadow-inner text-sm"
                    >
                      <option value="S/.">Soles (S/.)</option>
                      <option value="$">Dólares ($)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Zona Horaria</label>
                    <select 
                      value={timezone} 
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border-0 rounded-lg text-slate-800 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all shadow-inner text-sm"
                    >
                      <option value="America/Lima">America/Lima (UTC-5)</option>
                      <option value="America/Santiago">America/Santiago</option>
                      <option value="America/Bogota">America/Bogota</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 flex gap-3 justify-end border-t border-slate-100 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium text-xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all font-medium text-xs cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : 'Guardar Sede'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
