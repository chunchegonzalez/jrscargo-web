'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogOut, Settings, Menu, X, ChevronDown, ChevronRight, Briefcase, Calculator, Building2, Home } from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';
  
  const [currentUser, setCurrentUser] = useState<{username: string, role: string} | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  
  const [openSections, setOpenSections] = useState({
    operaciones: true,
    contabilidad: true,
    clientes: true,
    ajustes: false,
    perfil: false
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isLoginPage) {
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
          if (data.authenticated) {
            setCurrentUser(data.user);
          }
        })
        .catch(console.error);
    }
  }, [isLoginPage]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  if (isLoginPage) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-72 bg-gradient-to-b from-brand-blue to-[#0A2636] text-white flex flex-col fixed inset-y-0 left-0 z-50 shadow-2xl overflow-hidden transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } ${
        isDesktopSidebarOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'
      }`}>
        
        {/* Patrón de fondo sutil */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

        <div className="p-8 border-b border-white/5 relative z-10 flex justify-between items-center">
          <div className="flex items-center gap-4 group cursor-default">
            <div className="bg-white p-2.5 rounded-2xl shadow-lg transform group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
              <Image src="/logo.png" alt="JRS Cargo" width={48} height={48} className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight leading-none group-hover:text-brand-yellow transition-colors duration-300">JRS CARGO</h1>
              <p className="text-brand-yellow/80 text-[11px] font-bold uppercase tracking-[0.2em] mt-1.5">Admin WMS</p>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden text-white/50 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-hide relative z-10">
          
          {/* DASHBOARD DIRECT LINK */}
          <Link 
            href="/admin" 
            className={`w-full flex items-center p-2 rounded-lg transition-colors group ${pathname === '/admin' ? 'bg-white/10 text-white font-bold' : 'text-white/80 hover:text-white hover:bg-white/5'}`}
          >
            <div className="flex items-center gap-3">
              <Home size={20} className={pathname === '/admin' ? 'text-brand-yellow' : 'text-white/80 group-hover:text-brand-yellow transition-colors'} />
              <span className="font-bold text-sm tracking-wide">Página principal</span>
            </div>
          </Link>

          {/* SECCIÓN OPERACIONES */}
          <div>
            <button 
              onClick={() => toggleSection('operaciones')}
              className="w-full flex items-center justify-between p-2 text-white/80 hover:text-white transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Briefcase size={20} className="text-brand-yellow" />
                <span className="font-bold text-sm tracking-wide">Operaciones</span>
              </div>
              {openSections.operaciones ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 ${openSections.operaciones ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col gap-1 pl-10 border-l border-white/10 ml-5">
                <Link 
                  href="/admin/bodega" 
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${pathname === '/admin/bodega' ? 'bg-white/10 text-white font-bold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  Escanear Individual
                </Link>
                <Link 
                  href="/admin/bodega/masivo" 
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${pathname === '/admin/bodega/masivo' ? 'bg-white/10 text-white font-bold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  Recepción Masiva
                </Link>
                <Link 
                  href="/admin/entregas/masivo" 
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${pathname === '/admin/entregas/masivo' ? 'bg-white/10 text-white font-bold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  Entrega Masiva
                </Link>
                <Link 
                  href="/admin/inventario" 
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${pathname === '/admin/inventario' ? 'bg-white/10 text-white font-bold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  Inventario CR
                </Link>
              </div>
            </div>
          </div>

          {/* SECCIÓN CONTABILIDAD */}
          <div>
            <button 
              onClick={() => toggleSection('contabilidad')}
              className="w-full flex items-center justify-between p-2 text-white/80 hover:text-white transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Calculator size={20} className="text-brand-yellow" />
                <span className="font-bold text-sm tracking-wide">Contabilidad</span>
              </div>
              {openSections.contabilidad ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 ${openSections.contabilidad ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col gap-1 pl-10 border-l border-white/10 ml-5">
                <Link 
                  href="/admin/facturacion" 
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${(pathname === '/admin/facturacion' || pathname.startsWith('/admin/facturacion/')) ? 'bg-white/10 text-white font-bold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  Facturas a Clientes
                </Link>
                <Link 
                  href="/admin/gastos" 
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${pathname === '/admin/gastos' ? 'bg-white/10 text-white font-bold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  Gastos y Compras
                </Link>
              </div>
            </div>
          </div>

          {/* SECCIÓN CLIENTES */}
          <div>
            <button 
              onClick={() => toggleSection('clientes')}
              className="w-full flex items-center justify-between p-2 text-white/80 hover:text-white transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Building2 size={20} className="text-brand-yellow" />
                <span className="font-bold text-sm tracking-wide">Centro de clientes</span>
              </div>
              {openSections.clientes ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 ${openSections.clientes ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col gap-1 pl-10 border-l border-white/10 ml-5">
                <Link 
                  href="/admin/clientes" 
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${pathname === '/admin/clientes' ? 'bg-white/10 text-white font-bold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  Directorio de clientes
                </Link>
              </div>
            </div>
          </div>

          {/* SECCIÓN AJUSTES */}
          {currentUser?.role === 'admin' && (
            <div>
              <button 
                onClick={() => toggleSection('ajustes')}
                className="w-full flex items-center justify-between p-2 text-white/80 hover:text-white transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Settings size={20} className="text-brand-yellow" />
                  <span className="font-bold text-sm tracking-wide">Administración</span>
                </div>
                {openSections.ajustes ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ${openSections.ajustes ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                <div className="flex flex-col gap-1 pl-10 border-l border-white/10 ml-5">
                  <Link 
                    href="/admin/ajustes" 
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${pathname === '/admin/ajustes' ? 'bg-white/10 text-white font-bold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                  >
                    Ajustes de Sistema
                  </Link>
                  <Link 
                    href="/admin/servicios" 
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${pathname === '/admin/servicios' ? 'bg-white/10 text-white font-bold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                  >
                    Servicios y Tarifas
                  </Link>
                </div>
              </div>
            </div>
          )}

        </nav>

        <div className="p-4 border-t border-white/5 relative z-10">
          <button 
            onClick={() => toggleSection('perfil')}
            className="w-full flex items-center justify-between p-2 text-white/80 hover:text-white transition-colors group"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 shrink-0 rounded-full bg-brand-yellow/20 text-brand-yellow flex items-center justify-center font-bold text-xs border border-brand-yellow/30">
                {currentUser?.username ? currentUser.username.substring(0, 2).toUpperCase() : 'US'}
              </div>
              <span className="font-bold text-sm tracking-wide truncate">{currentUser?.username || 'Mi Perfil'}</span>
            </div>
            {openSections.perfil ? <ChevronDown size={16} className="shrink-0" /> : <ChevronRight size={16} className="shrink-0" />}
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ${openSections.perfil ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
            <div className="flex flex-col gap-1 pl-12 border-l border-white/10 ml-6">
              <button onClick={handleLogout} className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors flex items-center gap-2">
                <LogOut size={16} /> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 w-full flex flex-col min-h-screen transition-all duration-300 ${
        isDesktopSidebarOpen ? 'lg:ml-72' : 'lg:ml-0'
      }`}>
        <header className="bg-white border-b border-gray-200 h-20 flex items-center px-4 md:px-8 justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            {/* Desktop Toggle */}
            <button 
              onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
              className="hidden lg:block p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg md:text-xl font-bold text-brand-blue truncate">Sistema de Gestión</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[13px] font-black text-brand-blue uppercase tracking-wide">{currentUser?.username || 'Cargando...'}</p>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{currentUser?.role === 'admin' ? 'Administrador Principal' : 'Usuario Operador'}</p>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-blue to-[#0A2636] shadow-[0_2px_10px_-2px_rgba(18,67,94,0.4)] flex items-center justify-center text-brand-yellow font-black text-lg border border-brand-blue/20">
              {currentUser?.username ? currentUser.username.substring(0, 2).toUpperCase() : 'AD'}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
