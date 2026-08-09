'use client';

import React from 'react';
import Link from 'next/link';
import { Package, ScanBarcode, LogOut } from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  if (isLoginPage) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-brand-blue text-white flex flex-col fixed inset-y-0 left-0 z-50">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl">
              <Image src="/logo.png" alt="JRS Cargo" width={40} height={40} className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">JRS CARGO</h1>
              <p className="text-brand-yellow text-xs font-semibold uppercase tracking-wider mt-1">Admin WMS</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link 
            href="/admin/bodega" 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
              pathname === '/admin/bodega' 
                ? 'bg-white/10 text-white' 
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <ScanBarcode size={20} className={pathname === '/admin/bodega' ? 'text-brand-yellow' : ''} />
            Escanear Bodega
          </Link>
          <Link 
            href="/admin/inventario" 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
              pathname === '/admin/inventario' 
                ? 'bg-white/10 text-white' 
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Package size={20} className={pathname === '/admin/inventario' ? 'text-brand-yellow' : ''} />
            Inventario CR
          </Link>
        </nav>

        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-brand-red font-medium hover:bg-white/10 transition-colors w-full text-left">
            <LogOut size={20} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72">
        <header className="bg-white border-b border-gray-200 h-20 flex items-center px-8 justify-between sticky top-0 z-40">
          <h2 className="text-xl font-bold text-brand-blue">Sistema de Gestión</h2>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-brand-blue">Operador Bodega</p>
              <p className="text-xs text-gray-500">Bodega Principal CR</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-brand-yellow/20 border-2 border-brand-yellow flex items-center justify-center text-brand-blue font-bold">
              OP
            </div>
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
