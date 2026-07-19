import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  show: (message: string, type?: ToastType, action?: Toast['action']) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const iconMap: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const colorMap: Record<ToastType, string> = {
  success: 'text-green-400',
  error: 'text-red-400',
  info: 'text-blue-400',
};

const borderMap: Record<ToastType, string> = {
  success: 'border-green-950',
  error: 'border-red-950',
  info: 'border-slate-700',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const show = useCallback(
    (message: string, type: ToastType = 'success', action?: Toast['action']) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, type, action }]);
      const duration = action ? 5000 : 3000;
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timersRef.current.delete(id);
      }, duration);
      timersRef.current.set(id, timer);
    },
    [],
  );

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className="fixed bottom-4 left-4 right-4 z-[60] flex flex-col gap-2 sm:left-auto sm:max-w-sm"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast) => {
          const Icon = iconMap[toast.type];
          return (
            <div
              key={toast.id}
              className={`animate-toast-in flex min-w-0 items-center gap-3 border-2 bg-white px-4 py-3 shadow-artistic motion-reduce:animate-none ${borderMap[toast.type]}`}
              role={toast.type === 'error' ? 'alert' : 'status'}
            >
              <Icon aria-hidden="true" size={18} className={`shrink-0 ${colorMap[toast.type]}`} />
              <span className="min-w-0 flex-1 break-words text-sm text-slate-200">
                {toast.message}
              </span>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    dismiss(toast.id);
                  }}
                  className="control-focus min-h-11 shrink-0 rounded-md px-2 text-xs font-semibold text-blue-400 hover:text-blue-300"
                >
                  {toast.action.label}
                </button>
              )}
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismiss(toast.id)}
                className="control-focus flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
