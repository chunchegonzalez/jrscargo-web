'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogOut, Settings, Menu, X, ChevronDown, ChevronRight, Briefcase, Calculator, Building2, Home } from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ModalProvider } from '../components/ModalProvider';
import GlobalSearch from '../components/GlobalSearch';

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
    return <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">{children}</div>;
  }


  return (
    <ModalProvider>
      <div className="min-h-screen bg-[#FAFAFA] print:bg-white print:h-auto print:min-h-0 print:block flex text-gray-900 selection:bg-brand-accent selection:text-white">
        {/* Mobile overlay */}
        {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 lg:hidden print:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-[#0B1D2B] flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${!isDesktopSidebarOpen ? 'lg:hidden' : ''} print:hidden`}>
        
        {/* Sidebar Header */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-1.5 rounded-lg flex items-center justify-center">
              <Image src="/logo.png" alt="JRS Cargo Logo" width={28} height={28} className="object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-white text-sm tracking-tight leading-none mb-0.5">JRS CARGO</span>
              <span className="text-[9px] font-bold text-brand-yellow uppercase tracking-[0.2em] leading-none">Panel Admin</span>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
          
          {/* Vista General */}
          <Link href="/admin" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all ${
            pathname === '/admin' 
              ? 'bg-brand-yellow/15 text-brand-yellow font-bold shadow-[0_0_12px_-3px_rgba(245,166,35,0.3)]' 
              : 'text-gray-400 hover:text-white hover:bg-white/5 font-medium'
          }`}>
            <Home size={17} className={pathname === '/admin' ? 'text-brand-yellow' : ''} />
            Vista General
          </Link>

          {/* Separador */}
          <div className="pt-3 pb-1 px-3">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">Operaciones</p>
          </div>

          <button 
            onClick={() => toggleSection('operaciones')}
            className="w-full flex items-center justify-between px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-[13px] font-medium"
          >
            <div className="flex items-center gap-3">
              <Briefcase size={17} className={openSections.operaciones ? 'text-brand-yellow' : ''} />
              <span>Bodega</span>
            </div>
            {openSections.operaciones ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ${openSections.operaciones ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="flex flex-col gap-0.5 ml-7 pl-3 border-l border-white/10">
              {[
                { href: '/admin/bodega', label: 'Escanear Individual', exact: true },
                { href: '/admin/bodega/masivo', label: 'Recepción Masiva' },
                { href: '/admin/entregas/masivo', label: 'Entrega Masiva' },
                { href: '/admin/inventario', label: 'Inventario CR' },
                { href: '/admin/tracking', label: 'Tracking de Paquetes' },
              ].map(link => {
                const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
                return (
                  <Link key={link.href} href={link.href} className={`block py-2 px-3 rounded-md text-[12px] transition-all ${
                    isActive ? 'text-brand-yellow font-bold bg-brand-yellow/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}>
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* CONTABILIDAD */}
          {currentUser?.role === 'admin' && (
            <>
              <div className="pt-4 pb-1 px-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">Finanzas</p>
              </div>

              <button 
                onClick={() => toggleSection('contabilidad')}
                className="w-full flex items-center justify-between px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-[13px] font-medium"
              >
                <div className="flex items-center gap-3">
                  <Calculator size={17} className={openSections.contabilidad ? 'text-brand-yellow' : ''} />
                  <span>Contabilidad</span>
                </div>
                {openSections.contabilidad ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ${openSections.contabilidad ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="flex flex-col gap-0.5 ml-7 pl-3 border-l border-white/10">
                  {[
                    { href: '/admin/facturacion', label: 'Facturas a Clientes', exact: true },
                    { href: '/admin/cuentas-por-cobrar', label: 'Cuentas por cobrar' },
                    { href: '/admin/gastos', label: 'Gastos y Compras' },
                    { href: '/admin/contabilidad/pagos', label: 'Historial de Pagos' },
                  ].map(link => {
                    const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
                    return (
                      <Link key={link.href} href={link.href} className={`block py-2 px-3 rounded-md text-[12px] transition-all ${
                        isActive ? 'text-brand-yellow font-bold bg-brand-yellow/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                      }`}>
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* CLIENTES */}
              <div className="pt-4 pb-1 px-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">Gestión</p>
              </div>

              <Link href="/admin/clientes" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all ${
                pathname.startsWith('/admin/clientes')
                  ? 'bg-brand-yellow/15 text-brand-yellow font-bold shadow-[0_0_12px_-3px_rgba(245,166,35,0.3)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 font-medium'
              }`}>
                <Building2 size={17} className={pathname.startsWith('/admin/clientes') ? 'text-brand-yellow' : ''} />
                Clientes
              </Link>

              {/* ADMIN */}
              <button 
                onClick={() => toggleSection('ajustes')}
                className="w-full flex items-center justify-between px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-[13px] font-medium"
              >
                <div className="flex items-center gap-3">
                  <Settings size={17} className={openSections.ajustes ? 'text-brand-yellow' : ''} />
                  <span>Configuración</span>
                </div>
                {openSections.ajustes ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ${openSections.ajustes ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="flex flex-col gap-0.5 ml-7 pl-3 border-l border-white/10">
                  {[
                    { href: '/admin/ajustes', label: 'Ajustes de Sistema' },
                    { href: '/admin/servicios', label: 'Servicios y Tarifas' },
                  ].map(link => {
                    const isActive = pathname.startsWith(link.href);
                    return (
                      <Link key={link.href} href={link.href} className={`block py-2 px-3 rounded-md text-[12px] transition-all ${
                        isActive ? 'text-brand-yellow font-bold bg-brand-yellow/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                      }`}>
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          )}

        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-white/5">
          <button 
            onClick={() => toggleSection('perfil')}
            className="w-full flex items-center justify-between p-2.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-tr from-brand-yellow to-brand-yellow/60 flex items-center justify-center text-[#0B1D2B] font-black text-[10px]">
                {currentUser?.username ? currentUser.username.substring(0, 2).toUpperCase() : 'US'}
              </div>
              <div className="text-left truncate">
                <p className="text-[12px] font-bold text-white truncate leading-tight">{currentUser?.username || 'Mi Perfil'}</p>
                <p className="text-[10px] text-gray-500 truncate">{currentUser?.role === 'admin' ? 'Administrador' : 'Operador'}</p>
              </div>
            </div>
            {openSections.perfil ? <ChevronDown size={13} className="shrink-0" /> : <ChevronRight size={13} className="shrink-0" />}
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ${openSections.perfil ? 'max-h-20 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
            <button onClick={handleLogout} className="w-full text-left py-2 px-3 rounded-lg text-[12px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2">
              <LogOut size={14} /> Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 w-full flex flex-col min-h-screen transition-all duration-300 ${
        isDesktopSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
      } print:ml-0 print:block print:h-auto print:min-h-0 relative`}>
        
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 h-20 flex items-center px-4 md:px-8 justify-between gap-4 sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-4 shrink-0">
            {/* Mobile Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-brand-blue hover:bg-brand-blue/10 rounded-xl transition-colors"
            >
              <Menu size={24} />
            </button>
            {/* Desktop Toggle */}
            <button 
              onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
              className="hidden lg:flex items-center justify-center p-2.5 text-gray-500 hover:text-brand-blue hover:bg-brand-blue/10 rounded-xl transition-all border border-transparent hover:border-brand-blue/20"
              title="Alternar Menú"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-xl font-black text-gray-800 tracking-tight hidden lg:block">Sistema de Gestión</h2>
          </div>
          
          <div className="flex-1 max-w-2xl px-2 sm:px-4">
            <GlobalSearch role={currentUser?.role} />
          </div>
          
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right hidden sm:flex flex-col justify-center">
              <p className="text-[13px] font-black text-gray-900 uppercase tracking-wide leading-tight">{currentUser?.username || 'Cargando...'}</p>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{currentUser?.role === 'admin' ? 'Administrador' : 'Operador'}</p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-blue to-[#0A2636] shadow-sm flex items-center justify-center text-white font-black text-sm border border-brand-blue/20">
              {currentUser?.username ? currentUser.username.substring(0, 2).toUpperCase() : 'AD'}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 overflow-x-hidden print:p-0 print:overflow-visible">
          {children}
        </div>
      </main>
    </div>
    </ModalProvider>
  );
}
