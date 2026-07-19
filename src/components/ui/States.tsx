export function LoadingCard() {
  return (
    <div className="border-2 border-slate-50 bg-white p-5 shadow-artistic-sm" aria-hidden="true">
      <div className="skeleton-shimmer mb-3 h-4 w-2/3 rounded" />
      <div className="skeleton-shimmer mb-2 h-3 w-1/3 rounded" />
      <div className="skeleton-shimmer h-3 w-1/2 rounded" />
    </div>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-50 bg-white px-6 py-16 text-center shadow-artistic">
      <div className="mb-1 rotate-2 border-2 border-slate-50 bg-blue-500 p-3 text-white shadow-artistic-sm">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
      <p className="max-w-sm text-sm text-slate-400">{description}</p>
      {action}
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border border-red-950 bg-red-950/10 px-6 py-16 text-center"
    >
      <div className="text-red-400">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-200">Something went wrong</h3>
      <p className="max-w-md text-sm text-slate-400">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="control-focus min-h-11 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
