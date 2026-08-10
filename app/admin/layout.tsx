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
      <aside className="w-72 bg-gradient-to-b from-brand-blue to-[#0A2636] text-white flex flex-col fixed inset-y-0 left-0 z-50 shadow-2xl overflow-hidden relative">
        
        {/* Patrón de fondo sutil */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

        <div className="p-8 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-4 group cursor-default">
            <div className="bg-white p-2.5 rounded-2xl shadow-lg transform group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
              <Image src="/logo.png" alt="JRS Cargo" width={48} height={48} className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight leading-none group-hover:text-brand-yellow transition-colors duration-300">JRS CARGO</h1>
              <p className="text-brand-yellow/80 text-[11px] font-bold uppercase tracking-[0.2em] mt-1.5">Admin WMS</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-5 space-y-3 overflow-y-auto relative z-10">
          <Link 
            href="/admin/bodega" 
            className={`group relative flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all duration-300 overflow-hidden ${
              pathname === '/admin/bodega' 
                ? 'bg-white/10 text-white shadow-lg border border-white/10' 
                : 'text-white/60 hover:bg-white/5 hover:text-white hover:translate-x-1'
            }`}
          >
            {pathname === '/admin/bodega' && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-yellow rounded-l-2xl shadow-[0_0_10px_rgba(255,204,0,0.5)]"></div>
            )}
            <div className={`p-2 rounded-xl transition-colors duration-300 ${pathname === '/admin/bodega' ? 'bg-brand-yellow/20 text-brand-yellow' : 'bg-black/20 group-hover:bg-black/40'}`}>
              <ScanBarcode size={20} className={pathname === '/admin/bodega' ? 'text-brand-yellow' : 'group-hover:scale-110 transition-transform duration-300'} />
            </div>
            Escanear Bodega
          </Link>

          <Link 
            href="/admin/inventario" 
            className={`group relative flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all duration-300 overflow-hidden ${
              pathname === '/admin/inventario' 
                ? 'bg-white/10 text-white shadow-lg border border-white/10' 
                : 'text-white/60 hover:bg-white/5 hover:text-white hover:translate-x-1'
            }`}
          >
            {pathname === '/admin/inventario' && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-yellow rounded-l-2xl shadow-[0_0_10px_rgba(255,204,0,0.5)]"></div>
            )}
            <div className={`p-2 rounded-xl transition-colors duration-300 ${pathname === '/admin/inventario' ? 'bg-brand-yellow/20 text-brand-yellow' : 'bg-black/20 group-hover:bg-black/40'}`}>
              <Package size={20} className={pathname === '/admin/inventario' ? 'text-brand-yellow' : 'group-hover:scale-110 transition-transform duration-300'} />
            </div>
            Inventario CR
          </Link>
        </nav>

        <div className="p-5 border-t border-white/5 relative z-10">
          <button onClick={handleLogout} className="group flex items-center gap-3 px-4 py-3 rounded-2xl text-brand-red font-bold hover:bg-brand-red/10 transition-all duration-300 w-full text-left">
            <div className="p-2 rounded-xl bg-brand-red/10 group-hover:bg-brand-red/20 transition-colors">
              <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            </div>
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
