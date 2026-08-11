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
    return <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">{children}</div>;
  }

  const activeLinkClass = "bg-white shadow-sm border border-gray-200 text-brand-blue font-bold";
  const inactiveLinkClass = "text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-transparent";
  const getLinkClass = (path: string) => {
    return `block py-2 px-3 rounded-xl text-sm transition-all duration-200 ${
      (pathname === path || pathname.startsWith(path + '/')) ? activeLinkClass : inactiveLinkClass
    }`;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] print:bg-white flex text-gray-900 selection:bg-brand-accent selection:text-white">
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 lg:hidden print:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-[#F9FAFB] border-r border-gray-200 flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${!isDesktopSidebarOpen ? 'lg:hidden' : ''} print:hidden`}>
        
        {/* Sidebar Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-200 bg-white/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-center">
              <Image src="/logo.png" alt="JRS Cargo Logo" width={32} height={32} className="object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-brand-blue text-sm tracking-tight leading-none mb-0.5">JRS CARGO</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Admin Space</span>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
          
          <Link href="/admin" className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${pathname === '/admin' ? 'bg-white shadow-sm border border-gray-200 text-brand-blue font-bold' : 'text-gray-600 hover:bg-gray-100 font-medium'}`}>
            <Home size={18} className={pathname === '/admin' ? 'text-brand-accent' : 'text-gray-400'} />
            <span className="text-sm">Vista General</span>
          </Link>

          {/* SECCIÓN OPERACIONES */}
          <div>
            <button 
              onClick={() => toggleSection('operaciones')}
              className="w-full flex items-center justify-between px-2 py-1.5 text-gray-400 hover:text-gray-900 transition-colors group mb-1"
            >
              <div className="flex items-center gap-2">
                <Briefcase size={16} className={openSections.operaciones ? "text-brand-accent" : "text-gray-400"} />
                <span className="font-bold text-xs uppercase tracking-wider">Operaciones</span>
              </div>
              {openSections.operaciones ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 ${openSections.operaciones ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col gap-1 pl-4 ml-2 border-l-2 border-gray-100">
                <Link href="/admin/bodega" className={getLinkClass('/admin/bodega')}>
                  Escanear Individual
                </Link>
                <Link href="/admin/bodega/masivo" className={getLinkClass('/admin/bodega/masivo')}>
                  Recepción Masiva
                </Link>
                <Link href="/admin/entregas/masivo" className={getLinkClass('/admin/entregas/masivo')}>
                  Entrega Masiva
                </Link>
                <Link href="/admin/inventario" className={getLinkClass('/admin/inventario')}>
                  Inventario CR
                </Link>
              </div>
            </div>
          </div>

          {/* SECCIÓN CONTABILIDAD */}
          <div>
            <button 
              onClick={() => toggleSection('contabilidad')}
              className="w-full flex items-center justify-between px-2 py-1.5 text-gray-400 hover:text-gray-900 transition-colors group mb-1"
            >
              <div className="flex items-center gap-2">
                <Calculator size={16} className={openSections.contabilidad ? "text-brand-accent" : "text-gray-400"} />
                <span className="font-bold text-xs uppercase tracking-wider">Contabilidad</span>
              </div>
              {openSections.contabilidad ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 ${openSections.contabilidad ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col gap-1 pl-4 ml-2 border-l-2 border-gray-100">
                <Link href="/admin/facturacion" className={getLinkClass('/admin/facturacion')}>
                  Facturas a Clientes
                </Link>
                <Link href="/admin/gastos" className={getLinkClass('/admin/gastos')}>
                  Gastos y Compras
                </Link>
              </div>
            </div>
          </div>

          {/* SECCIÓN CLIENTES */}
          <div>
            <button 
              onClick={() => toggleSection('clientes')}
              className="w-full flex items-center justify-between px-2 py-1.5 text-gray-400 hover:text-gray-900 transition-colors group mb-1"
            >
              <div className="flex items-center gap-2">
                <Building2 size={16} className={openSections.clientes ? "text-brand-accent" : "text-gray-400"} />
                <span className="font-bold text-xs uppercase tracking-wider">Clientes</span>
              </div>
              {openSections.clientes ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 ${openSections.clientes ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col gap-1 pl-4 ml-2 border-l-2 border-gray-100">
                <Link href="/admin/clientes" className={getLinkClass('/admin/clientes')}>
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
                className="w-full flex items-center justify-between px-2 py-1.5 text-gray-400 hover:text-gray-900 transition-colors group mb-1"
              >
                <div className="flex items-center gap-2">
                  <Settings size={16} className={openSections.ajustes ? "text-brand-accent" : "text-gray-400"} />
                  <span className="font-bold text-xs uppercase tracking-wider">Administración</span>
                </div>
                {openSections.ajustes ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ${openSections.ajustes ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                <div className="flex flex-col gap-1 pl-4 ml-2 border-l-2 border-gray-100">
                  <Link href="/admin/ajustes" className={getLinkClass('/admin/ajustes')}>
                    Ajustes de Sistema
                  </Link>
                  <Link href="/admin/servicios" className={getLinkClass('/admin/servicios')}>
                    Servicios y Tarifas
                  </Link>
                </div>
              </div>
            </div>
          )}

        </nav>

        {/* User Profile / Logout Section */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <button 
            onClick={() => toggleSection('perfil')}
            className="w-full flex items-center justify-between p-2 text-gray-600 hover:text-brand-blue transition-colors group rounded-xl hover:bg-gray-50"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 shrink-0 rounded-full bg-brand-blue/5 text-brand-blue flex items-center justify-center font-black text-xs border border-brand-blue/10">
                {currentUser?.username ? currentUser.username.substring(0, 2).toUpperCase() : 'US'}
              </div>
              <span className="font-bold text-sm tracking-wide truncate">{currentUser?.username || 'Mi Perfil'}</span>
            </div>
            {openSections.perfil ? <ChevronDown size={14} className="shrink-0 text-gray-400" /> : <ChevronRight size={14} className="shrink-0 text-gray-400" />}
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ${openSections.perfil ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
            <div className="flex flex-col gap-1 px-2">
              <button onClick={handleLogout} className="w-full text-left py-2 px-3 rounded-lg text-sm font-bold text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
                <LogOut size={16} /> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 w-full flex flex-col min-h-screen transition-all duration-300 ${
        isDesktopSidebarOpen ? 'lg:ml-72' : 'lg:ml-0'
      } print:ml-0 print:block relative`}>
        
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 h-20 flex items-center px-4 md:px-8 justify-between sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-3">
            {/* Mobile Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Menu size={22} />
            </button>
            {/* Desktop Toggle */}
            <button 
              onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
              className="hidden lg:block p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Menu size={22} />
            </button>
            <h2 className="text-lg md:text-xl font-bold text-brand-blue truncate ml-2 tracking-tight">Sistema de Gestión</h2>
          </div>
          
          <div className="flex items-center gap-4">
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
  );
}
