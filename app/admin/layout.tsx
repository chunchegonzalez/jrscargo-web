'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { LogOut, Settings, Menu, X, ChevronDown, ChevronRight, Briefcase, Calculator, Building2, Home, Activity, ShieldCheck, Package, Users } from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ModalProvider } from '../components/ModalProvider';
import GlobalSearch from '../components/GlobalSearch';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';
  
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<{username: string, role: string} | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('sidebar_open');
    if (saved !== null) {
      setIsDesktopSidebarOpen(saved === 'true');
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('sidebar_open', String(isDesktopSidebarOpen));
    }
  }, [isDesktopSidebarOpen, mounted]);
  
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
    setIsProfileDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsProfileDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden print:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-[#0B1D2B] flex flex-col z-50 transform transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } ${isDesktopSidebarOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'} print:hidden`}>
        
        {/* Sidebar Header */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-1.5 rounded-lg flex items-center justify-center">
              <Image src="/logo.png" alt="JRS Cargo Logo" width={28} height={28} className="object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-white text-sm tracking-tight leading-none mb-0.5">JRS CARGO</span>
              <span className="text-[9px] font-bold text-brand-yellow uppercase tracking-[0.2em] leading-none">Panel Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Desktop collapse button */}
            <button 
              onClick={() => setIsDesktopSidebarOpen(false)}
              className="hidden lg:flex w-8 h-8 items-center justify-center text-gray-400 hover:text-brand-yellow hover:bg-white/10 rounded-lg transition-all duration-200 group"
              title="Ocultar menú lateral"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
                <path d="M11 17l-5-5 5-5" />
                <path d="M18 17l-5-5 5-5" />
              </svg>
            </button>
            {/* Mobile close button */}
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
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
                { href: '/admin/bodega/masivo', label: 'Acción Masiva' },
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

          {/* CONTABILIDAD - visible to all, but some links admin-only */}
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
                    { href: '/admin/facturacion', label: 'Facturas a Clientes', exact: true, adminOnly: false },
                    { href: '/admin/cuentas-por-cobrar', label: 'Cuentas por cobrar', exact: false, adminOnly: false },
                    { href: '/admin/gastos', label: 'Gastos y Compras', exact: false, adminOnly: true },
                    { href: '/admin/contabilidad/pagos', label: 'Historial de Pagos', exact: false, adminOnly: false },
                  ].filter(link => !link.adminOnly || currentUser?.role === 'admin').map(link => {
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

              {/* CLIENTES & WHATSAPP - visible to all */}
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

              <a 
                href="https://jrs.gaelabscr.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all text-gray-400 hover:text-white hover:bg-white/5 font-medium"
              >
                <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" className="shrink-0">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto opacity-50">
                  <path d="M7 17L17 7M17 7H7M17 7V17"/>
                </svg>
              </a>

              {/* ADMIN-ONLY sections */}
              {currentUser?.role === 'admin' && (
                <>
                  <Link href="/admin/monitor" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all ${
                    pathname.startsWith('/admin/monitor')
                      ? 'bg-brand-yellow/15 text-brand-yellow font-bold shadow-[0_0_12px_-3px_rgba(245,166,35,0.3)]'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 font-medium'
                  }`}>
                    <Activity size={17} className={pathname.startsWith('/admin/monitor') ? 'text-brand-yellow' : ''} />
                    Monitoreo Web
                  </Link>

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
      </aside>

      {/* Main Content */}
      <main className={`flex-1 min-w-0 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
        isDesktopSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
      } print:ml-0 print:block print:h-auto print:min-h-0`}>
        
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 h-20 flex items-center px-4 md:px-8 justify-between gap-4 sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-3 shrink-0">
            {/* Sidebar Toggle (Mobile & Desktop) */}
            <button 
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
                  setIsDesktopSidebarOpen(prev => !prev);
                } else {
                  setIsMobileMenuOpen(true);
                }
              }}
              className="p-2 text-gray-600 hover:text-brand-blue hover:bg-brand-blue/10 rounded-xl transition-colors flex items-center justify-center"
              title={isDesktopSidebarOpen ? "Ocultar menú lateral" : "Mostrar menú lateral"}
            >
              <Menu size={22} />
            </button>
            <h2 className="text-xl font-black text-gray-800 tracking-tight hidden sm:block">Sistema de Gestión</h2>
          </div>
          
          <div className="flex-1 max-w-2xl px-2 sm:px-4">
            <GlobalSearch role={currentUser?.role} />
          </div>
          
          {/* User Profile Capsule with Interactive Dropdown */}
          <div ref={profileDropdownRef} className="relative shrink-0">
            <button
              onClick={() => setIsProfileDropdownOpen(prev => !prev)}
              className={`group flex items-center gap-3 p-1.5 sm:pl-3.5 sm:pr-2 sm:py-1.5 rounded-2xl transition-all duration-200 border cursor-pointer select-none ${
                isProfileDropdownOpen 
                  ? 'bg-brand-blue/5 border-brand-blue/30 shadow-md ring-4 ring-brand-blue/10' 
                  : 'bg-white hover:bg-gray-50/80 border-gray-200/80 hover:border-brand-blue/30 shadow-sm hover:shadow'
              }`}
            >
              <div className="text-right hidden sm:flex flex-col justify-center">
                <p className="text-[13px] font-black text-gray-900 uppercase tracking-wide leading-tight group-hover:text-brand-blue transition-colors">
                  {currentUser?.username || 'Cargando...'}
                </p>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {currentUser?.role === 'admin' ? 'Administrador' : 'Operador'}
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0B1D2B] via-brand-blue to-[#1B5E86] shadow-md shadow-brand-blue/20 flex items-center justify-center text-white font-black text-xs border-2 border-white tracking-wider transition-transform duration-200 group-hover:scale-105">
                  {currentUser?.username ? currentUser.username.substring(0, 2).toUpperCase() : 'AD'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
              </div>

              <ChevronDown 
                size={14} 
                className={`text-gray-400 hidden sm:block transition-transform duration-200 ${
                  isProfileDropdownOpen ? 'rotate-180 text-brand-blue font-bold' : 'group-hover:text-gray-600'
                }`} 
              />
            </button>

            {/* Dropdown Menu */}
            {isProfileDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Header inside dropdown */}
                <div className="p-3 border-b border-gray-100 bg-gray-50/70 rounded-xl mb-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0B1D2B] to-brand-blue text-white font-black flex items-center justify-center text-xs shadow-sm shrink-0">
                      {currentUser?.username ? currentUser.username.substring(0, 2).toUpperCase() : 'AD'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-gray-900 text-sm truncate uppercase tracking-tight">
                        {currentUser?.username || 'Usuario'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <ShieldCheck size={12} className="text-brand-blue shrink-0" />
                        <span className="text-[11px] font-bold text-gray-500">
                          {currentUser?.role === 'admin' ? 'Administrador Principal' : 'Operador de Bodega'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="space-y-0.5 py-1">
                  {currentUser?.role === 'admin' && (
                    <Link
                      href="/admin/ajustes"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-colors"
                    >
                      <Settings size={15} className="text-gray-400" />
                      <span>Ajustes del Sistema</span>
                    </Link>
                  )}
                  <Link
                    href="/admin/inventario"
                    onClick={() => setIsProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-colors"
                  >
                    <Package size={15} className="text-gray-400" />
                    <span>Inventario Costa Rica</span>
                  </Link>
                  {currentUser?.role === 'admin' && (
                    <Link
                      href="/admin/clientes"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-colors"
                    >
                      <Users size={15} className="text-gray-400" />
                      <span>Directorio de Clientes</span>
                    </Link>
                  )}
                </div>

                {/* Logout Button */}
                <div className="border-t border-gray-100 pt-1 mt-1">
                  <button
                    onClick={() => { setIsProfileDropdownOpen(false); handleLogout(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut size={15} />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="p-4 md:p-8 min-w-0 print:p-0 print:overflow-visible">
          {children}
        </div>
      </main>
    </div>
    </ModalProvider>
  );
}
