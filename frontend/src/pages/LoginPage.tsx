import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Shield, BarChart3, Zap, Loader2, Building2 } from 'lucide-react';
import { useAuthStore } from '../hooks/useAuth';

export const LoginPage: React.FC = () => {
  const [subdomain, setSubdomain] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const login = useAuthStore((state: any) => state.login);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (!subdomain || !apiToken) {
        setError('Por favor, ingresa el subdominio y el Token de la API.');
        setIsLoading(false);
        return;
      }
      
      await login({ 
        subdomain: subdomain.trim(),
        apiToken: apiToken.trim()
      });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas o error de conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 animate-fade-in font-sans">
      {/* Left Panel - Premium Brand Showcase */}
      <div className="hidden md:flex flex-col justify-between w-1/2 lg:w-[55%] bg-gradient-to-br from-slate-900 via-slate-800 to-primary-950 p-12 lg:p-20 relative overflow-hidden text-white">
        {/* Decorative background elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-600/20 blur-[120px] mix-blend-overlay"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/20 blur-[100px] mix-blend-overlay"></div>
        
        {/* Grid Pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50 z-0"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-glow-primary">
              <span className="text-white font-bold text-2xl leading-none">S</span>
            </div>
            <span className="text-3xl font-bold tracking-tight">
              Syscom<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-primary-200">Pro</span>
            </span>
          </div>

          <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight mb-6 tracking-tight">
            Inteligencia para<br/>tu negocio,<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-violet-300">en tiempo real.</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-md leading-relaxed">
            Plataforma empresarial diseñada para analizar, monitorear y optimizar tus ventas con precisión milimétrica.
          </p>
        </div>

        <div className="relative z-10 space-y-6 mt-12">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm max-w-sm hover:bg-white/10 transition-colors">
            <div className="p-3 bg-primary-500/20 rounded-xl text-primary-300">
              <BarChart3 size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-white">Análisis Profundo</h3>
              <p className="text-sm text-slate-400">Datos comparativos y métricas en vivo</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm max-w-sm hover:bg-white/10 transition-colors ml-8">
            <div className="p-3 bg-success-500/20 rounded-xl text-success-400">
              <Zap size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-white">Rendimiento Ultra Rápido</h3>
              <p className="text-sm text-slate-400">Toma de decisiones sin latencia</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm max-w-sm hover:bg-white/10 transition-colors">
            <div className="p-3 bg-violet-500/20 rounded-xl text-violet-300">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-white">Seguridad Empresarial</h3>
              <p className="text-sm text-slate-400">Tus datos encriptados y protegidos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="md:hidden flex items-center justify-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-glow-primary">
              <span className="text-white font-bold text-lg leading-none">S</span>
            </div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              Syscom<span className="text-primary-600">Pro</span>
            </span>
          </div>

          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Bienvenido</h2>
            <p className="text-slate-500">Conéctate al facturador para acceder al panel</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-danger-50 text-danger-700 text-sm flex items-start gap-3 animate-slide-up">
              <div className="p-1 bg-danger-100 rounded-full shrink-0">
                <Shield size={14} className="text-danger-600" />
              </div>
              <p className="mt-0.5">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className={`space-y-5 ${error ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 tracking-wider">SUBDOMINIO DE LA EMPRESA</label>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:border-slate-400 focus-within:bg-white transition-all overflow-hidden">
                <div className="pl-3.5 text-slate-400 shrink-0">
                  <Building2 size={18} />
                </div>
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  className="w-full pl-3 pr-2 py-2.5 bg-transparent border-0 outline-none text-slate-800 placeholder-slate-400 text-sm"
                  placeholder="ej: restauranteestrellamarina"
                  required
                />
                <span className="pr-3.5 text-slate-500 text-xs font-medium border-l border-slate-200 pl-3 bg-slate-100/50 py-2.5 shrink-0 select-none">
                  .syscomecosistemadigital.com
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 tracking-wider">TOKEN DE LA API (API TOKEN)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-slate-400 focus:bg-white outline-none transition-all text-sm text-slate-800 placeholder-slate-400"
                  placeholder="Ingresa tu API Token"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary py-3 text-base rounded-xl mt-4 relative overflow-hidden"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Conectando y sincronizando...</span>
                </div>
              ) : (
                'Iniciar Sesión / Conectar'
              )}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
};
