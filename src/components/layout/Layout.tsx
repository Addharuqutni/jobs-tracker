import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen h-dvh overflow-hidden bg-transparent">
      <a
        href="#main-content"
        className="control-focus fixed left-3 top-3 z-[70] -translate-y-20 border-2 border-slate-50 bg-blue-500 px-4 py-2 text-sm font-bold text-white shadow-artistic-sm transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuOpen={() => setSidebarOpen(true)} />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto scroll-smooth p-4 outline-none sm:p-6 lg:p-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
