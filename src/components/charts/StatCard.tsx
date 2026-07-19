import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
}

export function StatCard({ label, value, subtitle, icon }: StatCardProps) {
  return (
    <div className="group relative h-full overflow-hidden border-2 border-slate-50 bg-white p-5 shadow-artistic transition-all duration-200 hover:-translate-y-1 after:pointer-events-none after:absolute after:right-0 after:top-0 after:z-0 after:h-12 after:w-12 after:bg-purple-500">
      <div className="relative z-10 mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>
        {icon && (
          <span className="text-blue-400/70 transition-colors group-hover:text-blue-400">
            {icon}
          </span>
        )}
      </div>
      <div className="relative z-10 font-display text-3xl tracking-tight text-slate-50">
        {value}
      </div>
      {subtitle && <div className="relative z-10 mt-1 text-sm text-slate-400">{subtitle}</div>}
    </div>
  );
}
