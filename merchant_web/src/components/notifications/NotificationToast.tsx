// src/components/notifications/NotificationToast.tsx

import React, { useEffect } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import { useNotificationStore, type ToastItem, type NotificationType } from '../../stores/notificationStore';

function getToastTheme(type: NotificationType) {
  switch (type) {
    case 'new_order':
      return {
        icon: Package,
        iconBg: 'bg-amber-500 text-white',
        border: 'border-amber-500/40',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        accentBar: 'bg-amber-500',
      };
    case 'assigned':
      return {
        icon: Truck,
        iconBg: 'bg-violet-500 text-white',
        border: 'border-violet-500/40',
        badge: 'bg-violet-50 text-violet-700 border-violet-200',
        accentBar: 'bg-violet-500',
      };
    case 'delivered':
      return {
        icon: CheckCircle2,
        iconBg: 'bg-emerald-500 text-white',
        border: 'border-emerald-500/40',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        accentBar: 'bg-emerald-500',
      };
    case 'cancelled':
      return {
        icon: XCircle,
        iconBg: 'bg-rose-500 text-white',
        border: 'border-rose-500/40',
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        accentBar: 'bg-rose-500',
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        iconBg: 'bg-amber-600 text-white',
        border: 'border-amber-600/40',
        badge: 'bg-amber-50 text-amber-800 border-amber-300',
        accentBar: 'bg-amber-600',
      };
    default:
      return {
        icon: Info,
        iconBg: 'bg-teal-500 text-white',
        border: 'border-teal-500/40',
        badge: 'bg-teal-50 text-teal-700 border-teal-200',
        accentBar: 'bg-teal-500',
      };
  }
}

interface SingleToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const SingleToast: React.FC<SingleToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const theme = getToastTheme(toast.type);
  const Icon = theme.icon;

  return (
    <div
      role="alert"
      className={`relative overflow-hidden bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border ${theme.border} p-4 w-84 sm:w-96 transition-all duration-300 transform animate-in slide-in-from-top-4 fade-in hover:shadow-2xl`}
    >
      {/* Sol Vurgu Çizgisi */}
      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${theme.accentBar}`} />

      <div className="flex items-start space-x-3">
        {/* İkon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${theme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Metin İçeriği */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-sm font-black text-slate-900 truncate">
              {toast.title}
            </h4>
            {toast.orderCode && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-md shrink-0">
                #{toast.orderCode}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-snug">
            {toast.message}
          </p>
        </div>

        {/* Kapat Butonu */}
        <button
          onClick={() => onDismiss(toast.id)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* İlerleme Animasyon Çizgisi */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100 overflow-hidden">
        <div
          className={`h-full ${theme.accentBar}`}
          style={{
            animation: 'toast-progress 5s linear forwards',
          }}
        />
      </div>
    </div>
  );
};

export const NotificationToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotificationStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2.5 pointer-events-auto">
      {toasts.map((toast) => (
        <SingleToast
          key={toast.id}
          toast={toast}
          onDismiss={removeToast}
        />
      ))}
    </div>
  );
};
