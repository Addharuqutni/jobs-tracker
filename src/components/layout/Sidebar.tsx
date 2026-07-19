import { NavLink } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { LayoutDashboard, Briefcase, KanbanSquare, BarChart3, X, Sparkles } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/feed', label: 'Job Feed', icon: Briefcase },
  { to: '/tracker', label: 'Tracker', icon: KanbanSquare },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/cv-review', label: 'CV Review', icon: Sparkles },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const drawerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    if (desktopQuery.matches) {
      onClose();
      return;
    }
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>('a, button');
    focusable?.[0]?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab' && focusable?.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    desktopQuery.addEventListener('change', closeOnDesktop);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      desktopQuery.removeEventListener('change', closeOnDesktop);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-50/55 backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        ref={drawerRef}
        role={open ? 'dialog' : undefined}
        aria-modal={open ? true : undefined}
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-40 flex h-dvh w-64 flex-col border-r-2 border-slate-50 bg-white shadow-2xl shadow-black/20 transition-transform motion-reduce:transition-none lg:visible lg:static lg:translate-x-0 lg:shadow-none ${open ? 'visible translate-x-0' : 'invisible -translate-x-full'}`}
      >
        <div className="flex h-16 items-center gap-3 border-b-2 border-slate-50 px-5">
          <span className="flex h-9 w-9 rotate-2 items-center justify-center border-2 border-slate-50 bg-blue-500 text-white shadow-artistic-sm">
            <Briefcase size={19} aria-hidden="true" />
          </span>
          <span>
            <span className="block font-display text-base tracking-tight text-slate-50">
              Job Tracker
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Personal workspace
            </span>
          </span>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="control-focus ml-auto flex min-h-11 min-w-11 items-center justify-center border border-slate-700 text-slate-400 hover:bg-slate-950 hover:text-slate-50 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1.5 p-3 pt-5">
          <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Overview
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `control-focus relative flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? 'translate-x-1 border-2 border-slate-50 bg-blue-500 text-white shadow-artistic-sm [&>svg]:text-white'
                      : 'border-2 border-transparent text-slate-300 hover:translate-x-1 hover:border-slate-50 hover:bg-slate-950 hover:text-slate-50'
                  }`
                }
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="m-3 border-2 border-slate-50 bg-purple-500 p-3 text-slate-50 shadow-artistic-sm">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-50">
            <Sparkles size={14} className="text-slate-50" aria-hidden="true" /> Stay focused
          </div>
          <p className="text-[11px] font-medium leading-relaxed text-slate-50">
            Discover, track, improve. One workspace for every application.
          </p>
        </div>
      </aside>
    </>
  );
}
