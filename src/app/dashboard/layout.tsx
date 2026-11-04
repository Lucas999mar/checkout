'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Optimistic restore from sessionStorage
    const cached = typeof window !== 'undefined' ? sessionStorage.getItem('admin_user') : null;
    if (cached) {
      try {
        setUser(JSON.parse(cached));
        setLoading(false);
      } catch {}
    }

    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) throw new Error();
        const data = await res.json();
        setUser(data.user);
        sessionStorage.setItem('admin_user', JSON.stringify(data.user));
      } catch {
        sessionStorage.removeItem('admin_user');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []); // Run only once on mount

  const handleLogout = async () => {
    sessionStorage.removeItem('admin_user');
    await fetch('/api/auth/logout', { method: 'POST' });
    toast.success('Logout realizado');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
          <p className="text-surface-500">Carregando...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/dashboard', label: 'Visão Geral', icon: '📊', exact: true },
    { href: '/dashboard/payments', label: 'Pagamentos', icon: '💰', exact: false },
    { href: '/dashboard/products', label: 'Produtos', icon: '📦', exact: false },
    { href: '/dashboard/payment-links', label: 'Links de Pagamento', icon: '🔗', exact: false },
    { href: '/dashboard/subscriptions', label: 'Assinaturas', icon: '🔄', exact: false },
    { href: '/dashboard/customers', label: 'Clientes', icon: '👥', exact: false },
    { href: '/dashboard/banks', label: 'Bancos & PIX', icon: '🏦', exact: false },
    { href: '/dashboard/webhooks', label: 'Webhooks Log', icon: '📡', exact: false },
  ];

  return (
    <div className="min-h-screen bg-surface-50 flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-72' : 'w-20'
        } bg-white border-r border-surface-100 flex flex-col transition-all duration-300 fixed h-full z-30`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-lg shadow-md">
              C
            </div>
            {sidebarOpen && (
              <div className="animate-fade-in">
                <h1 className="font-bold text-surface-800">Checkout Pro</h1>
                <p className="text-xs text-surface-400">Painel Admin</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                title={item.label}
              >
                <span className="text-xl">{item.icon}</span>
                {sidebarOpen && <span className="animate-fade-in">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User area */}
        <div className="p-4 border-t border-surface-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.name?.charAt(0) || 'A'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <p className="font-medium text-surface-800 text-sm truncate">{user?.name}</p>
                <p className="text-xs text-surface-400 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`mt-3 w-full flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors ${
              !sidebarOpen ? 'justify-center' : ''
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            {sidebarOpen && 'Sair'}
          </button>
        </div>

        {/* Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-surface-200 shadow-sm flex items-center justify-center text-surface-400 hover:text-surface-600 transition-colors"
        >
          <svg
            className={`w-3 h-3 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-72' : 'ml-20'
        }`}
      >
        {/* Top bar */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-surface-100 px-8 py-4 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-surface-800">
                {navItems.find(
                  (item) =>
                    item.exact ? pathname === item.href : pathname.startsWith(item.href)
                )?.label || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/pay/plano-starter"
                target="_blank"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Ver Checkout
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
