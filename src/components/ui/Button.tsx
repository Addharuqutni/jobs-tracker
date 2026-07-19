import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'border-2 border-slate-50 bg-blue-500 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 text-white shadow-artistic-sm',
  secondary:
    'border-2 border-slate-50 bg-white hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 text-slate-50 shadow-artistic-sm',
  danger:
    'border-2 border-slate-50 bg-red-600 hover:-translate-y-0.5 text-white shadow-artistic-sm',
  ghost:
    'border-2 border-transparent hover:border-slate-50 hover:bg-white text-slate-300 hover:text-slate-50',
};

const sizeClasses: Record<Size, string> = {
  sm: 'min-h-11 px-3 py-2 text-xs',
  md: 'min-h-11 px-4 py-2 text-sm',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`control-focus inline-flex items-center justify-center gap-2 rounded-none font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
