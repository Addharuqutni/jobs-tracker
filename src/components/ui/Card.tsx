import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`border-2 border-slate-50 bg-white p-4 shadow-artistic transition-transform duration-200 hover:-translate-y-0.5 sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}
