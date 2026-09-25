'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, UserCircle, PackageOpen, Globe, Sparkles } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState('inicio');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPatriotic, setIsPatriotic] = useState(false);
  const { language, toggleLanguage, setLanguage, t } = useLanguage();

  const navLinks = [
    { id: 'inicio', name: t.nav.home, href: '/' },
    { id: 'tracking', name: t.nav.tracking, href: '/#tracking', isLive: true },
    { id: 'tarifas', name: t.nav.rates, href: '/#tarifas' },
    { id: 'cotizador', name: t.nav.calculator, href: '/#cotizador' },
    { id: 'como-funciona', name: t.nav.howItWorks, href: '/#como-funciona' },
    { id: 'contacto', name: t.nav.contact, href: '/#contacto' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 20);

      // Dynamic scroll progress bar
      const winHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (winHeight > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (scrollY / winHeight) * 100)));
      }

      // Active Section Spy
      const sections = ['contacto', 'como-funciona', 'cotizador', 'tarifas', 'tracking'];
      let found = '';
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 240 && rect.bottom >= 150) {
            found = id;
            break;
          }
        }
      }
      if (!found && scrollY < 300) {
        found = 'inicio';
      }
      if (found) {
        setActiveSection(found);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // Mes patrio activo hasta el 20 de septiembre inclusive (mes 8 = Septiembre)
    const now = new Date();
    if (now.getMonth() === 8 && now.getDate() <= 20) {
      setIsPatriotic(true);
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed left-0 right-0 z-50 transition-all duration-300 ease-out ${
        isScrolled && !isMobileMenuOpen
          ? 'top-3 sm:top-4 px-3 sm:px-6 pointer-events-none' 
          : 'top-0 px-0 bg-white/95 backdrop-blur-md border-b border-slate-100/90 shadow-2xs'
      }`}
    >
      {/* Top dynamic scroll progress line */}
      <div 
        className="absolute top-0 left-0 h-[2.5px] bg-gradient-to-r from-brand-blue via-brand-yellow to-brand-blue transition-all duration-150 z-50 opacity-90"
        style={{ width: `${scrollProgress}%` }}
      />

      <div 
        className={`mx-auto transition-all duration-300 ease-out flex items-center justify-between gap-4 lg:gap-8 ${
          isScrolled && !isMobileMenuOpen
            ? 'w-full max-w-7xl bg-white/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(18,67,94,0.12)] rounded-full py-2 px-5 sm:px-7 border border-slate-200/80 pointer-events-auto' 
            : 'w-full max-w-7xl py-3 px-4 sm:px-6 lg:px-8 pointer-events-auto'
        }`}
      >
        {/* Left: Brand Logo with interactive hover */}
        <Link 
          href="/" 
          className="flex-shrink-0 group flex items-center transition-transform duration-200 hover:scale-[1.02]" 
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <Image 
            src={isPatriotic ? "/logo-patrio-clean.png" : "/logo.png"} 
            alt={isPatriotic ? "JRS CARGO - Mes de la Patria" : "JRS CARGO"} 
            width={isPatriotic ? 200 : 240} 
            height={isPatriotic ? 68 : 96} 
            className={`w-auto object-contain transition-all duration-300 ease-out ${
              isPatriotic 
                ? (isScrolled && !isMobileMenuOpen ? 'h-8 sm:h-9 lg:h-10' : 'h-9 sm:h-10 lg:h-11')
                : (isScrolled && !isMobileMenuOpen ? 'h-10 sm:h-12 lg:h-[46px]' : 'h-12 sm:h-14 lg:h-[56px]')
            }`}
            priority
          />
        </Link>

        {/* Center: Dynamic Desktop Navigation with active spy and pill hover */}
        <nav className="hidden lg:flex items-center space-x-1 xl:space-x-1.5 bg-slate-50/70 p-1 rounded-full border border-slate-200/50">
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <Link 
                key={link.id} 
                href={link.href}
                className={`relative inline-flex items-center text-[13px] xl:text-[14px] font-semibold px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                  isActive 
                    ? 'text-brand-blue bg-white shadow-xs font-bold' 
                    : 'text-slate-600 hover:text-brand-blue hover:bg-white/80'
                }`}
              >
                {link.isLive && (
                  <span className="relative flex h-2 w-2 mr-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
                <span>{link.name}</span>
                {isActive && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-brand-blue rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Desktop Actions with Pro micro-interactions */}
        <div className="hidden lg:flex items-center space-x-2.5 xl:space-x-3 shrink-0">
          
          {/* Pro Sliding Language Switcher (Segmented Control) */}
          <div className="relative flex items-center bg-slate-100/90 p-1 rounded-full border border-slate-200/80 shadow-inner">
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-300 ease-out shadow-xs pointer-events-none ${
                language === 'es' 
                  ? 'left-1 bg-white' 
                  : 'left-[calc(50%+2px)] bg-brand-blue'
              }`}
            />
            <button
              onClick={() => setLanguage('es')}
              className={`relative z-10 px-3 py-1 text-xs font-black transition-colors duration-200 flex items-center gap-1.5 ${
                language === 'es' ? 'text-brand-blue' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Cambiar a Español"
            >
              <span className="text-xs leading-none">🇨🇷</span> <span>ES</span>
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`relative z-10 px-3 py-1 text-xs font-black transition-colors duration-200 flex items-center gap-1.5 ${
                language === 'en' ? 'text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Switch to English"
            >
              <span className="text-xs leading-none">🇺🇸</span> <span>EN</span>
            </button>
          </div>

          {/* Iniciar sesión (Interactive Ghost Badge) */}
          <a 
            href="https://worldboxcr.com/jrscargo/login" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-brand-blue bg-white hover:bg-brand-blue/5 border border-slate-200 hover:border-brand-blue/30 rounded-full shadow-2xs hover:shadow-xs transition-all duration-200"
          >
            <UserCircle size={18} className="text-slate-400 group-hover:text-brand-blue group-hover:scale-110 transition-all duration-200" />
            <span>{t.nav.login}</span>
          </a>

          {/* CTA: Crear mi casillero with Dynamic Light Sweep & Shimmer */}
          <a 
            href="https://worldboxcr.com/jrscargo/register" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group relative overflow-hidden inline-flex items-center gap-2 bg-gradient-to-r from-brand-blue via-[#12435E] to-[#0A2636] hover:from-[#0A2636] hover:to-brand-blue text-white font-black text-xs sm:text-sm py-2.5 px-5 rounded-full shadow-md shadow-brand-blue/25 hover:shadow-xl hover:shadow-brand-blue/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
          >
            {/* Shimmer Light Reflection Sweep */}
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

            <PackageOpen size={17} className="text-brand-yellow group-hover:rotate-12 transition-transform duration-300" />
            <span>{t.nav.register}</span>

            {/* Micro Badge */}
            <span className="hidden xl:inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-brand-yellow text-brand-blue rounded-full shadow-2xs">
              <Sparkles size={10} className="fill-brand-blue" />
              100% Gratis
            </span>
          </a>
        </div>

        {/* Mobile Controls (Language + Hamburger Button) */}
        <div className="lg:hidden flex items-center gap-2">
          {/* Mobile Language Button */}
          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-black text-brand-blue flex items-center gap-1 transition-colors"
            title="Cambiar Idioma / Switch Language"
          >
            <span>{language === 'es' ? '🇨🇷 ES' : '🇺🇸 EN'}</span>
          </button>

          <button 
            className="p-2 text-brand-blue hover:bg-slate-100 rounded-xl transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-white/98 backdrop-blur-xl shadow-2xl border-t border-slate-100 animate-slide-up">
          <div className="px-4 pt-3 pb-6 space-y-1 sm:px-6">
            {navLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className="flex items-center justify-between px-3.5 py-3 text-base font-semibold text-slate-700 hover:text-brand-blue hover:bg-slate-50 rounded-xl transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="flex items-center gap-2">
                  {link.isLive && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                  {link.name}
                </span>
                {activeSection === link.id && (
                  <span className="text-xs font-bold text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-md">
                    Actual
                  </span>
                )}
              </Link>
            ))}

            {/* Mobile Language Switch Options */}
            <div className="pt-3 pb-2 px-3 flex items-center justify-between border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Globe size={14} /> Idioma / Language
              </span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setLanguage('es')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    language === 'es' ? 'bg-white text-brand-blue shadow-sm font-black' : 'text-slate-500'
                  }`}
                >
                  🇨🇷 Español
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    language === 'en' ? 'bg-brand-blue text-white shadow-sm font-black' : 'text-slate-500'
                  }`}
                >
                  🇺🇸 English
                </button>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100 grid gap-3">
              <a 
                href="https://worldboxcr.com/jrscargo/login" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <UserCircle size={20} />
                {t.nav.login}
              </a>
              <a 
                href="https://worldboxcr.com/jrscargo/register" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-brand-blue to-[#0A2636] hover:bg-[#0A2636] rounded-xl shadow-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <PackageOpen size={20} className="text-brand-yellow" />
                {t.nav.register}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
