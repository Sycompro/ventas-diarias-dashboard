import React from 'react';
import { create } from 'zustand';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-success" size={20} />;
      case 'error': return <AlertCircle className="text-danger" size={20} />;
      case 'warning': return <AlertTriangle className="text-warning" size={20} />;
      case 'info': return <Info className="text-info" size={20} />;
    }
  };

  const getBgColor = (type: ToastType) => {
    switch (type) {
      case 'success': return 'bg-success-light border-success/20';
      case 'error': return 'bg-danger-light border-danger/20';
      case 'warning': return 'bg-warning-light border-warning/20';
      case 'info': return 'bg-info-light border-info/20';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg w-80 transform transition-all duration-300 translate-x-0 ${getBgColor(toast.type)}`}
        >
          <div className="shrink-0 mt-0.5">{getIcon(toast.type)}</div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-neutral-900">{toast.title}</h4>
            {toast.message && <p className="text-xs text-neutral-600 mt-1">{toast.message}</p>}
          </div>
          <button onClick={() => removeToast(toast.id)} className="shrink-0 text-neutral-400 hover:text-neutral-600">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
