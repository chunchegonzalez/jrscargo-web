'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, UserCircle, PackageOpen, Globe } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPatriotic, setIsPatriotic] = useState(false);
  const { language, toggleLanguage, setLanguage, t } = useLanguage();

  const navLinks = [
    { name: t.nav.home, href: '/' },
    { name: t.nav.tracking, href: '/#tracking' },
    { name: t.nav.rates, href: '/#tarifas' },
    { name: t.nav.calculator, href: '/#cotizador' },
    { name: t.nav.howItWorks, href: '/#como-funciona' },
    { name: t.nav.contact, href: '/#contacto' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

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
          ? 'top-3 sm:top-4 px-4 sm:px-6 pointer-events-none' 
          : 'top-0 px-0 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs'
      }`}
    >
      <div 
        className={`mx-auto transition-all duration-300 ease-out flex items-center justify-between gap-4 lg:gap-8 ${
          isScrolled && !isMobileMenuOpen
            ? 'w-full max-w-7xl bg-white/95 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-full py-2 px-6 sm:px-8 border border-slate-200/70 pointer-events-auto' 
            : 'w-full max-w-7xl py-3 px-4 sm:px-6 lg:px-8 pointer-events-auto'
        }`}
      >
        {/* Left: Brand Logo */}
        <Link href="/" className="flex-shrink-0 group flex items-center" onClick={() => setIsMobileMenuOpen(false)}>
          <Image 
            src={isPatriotic ? "/logo-patrio-clean.png" : "/logo.png"} 
            alt={isPatriotic ? "JRS CARGO - Mes de la Patria" : "JRS CARGO"} 
            width={isPatriotic ? 200 : 240} 
            height={isPatriotic ? 68 : 96} 
            className={`w-auto object-contain transition-all duration-300 ease-out ${
              isPatriotic 
                ? (isScrolled && !isMobileMenuOpen ? 'h-8 sm:h-9 lg:h-10 group-hover:scale-105' : 'h-9 sm:h-10 lg:h-11 group-hover:scale-105')
                : (isScrolled && !isMobileMenuOpen ? 'h-10 sm:h-12 lg:h-[48px]' : 'h-12 sm:h-14 lg:h-[58px]')
            }`}
            priority
          />
        </Link>

        {/* Center: Desktop Nav */}
        <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.href}
              className="text-[13px] xl:text-[14px] font-semibold text-slate-600 hover:text-brand-blue hover:bg-slate-100/70 px-3.5 py-1.5 rounded-full transition-all"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Right: Desktop Actions */}
        <div className="hidden lg:flex items-center space-x-2.5 xl:space-x-3 shrink-0">
          
          {/* Segmented Language Switcher */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-full border border-slate-200/80 text-xs font-bold shadow-inner">
            <button
              onClick={() => setLanguage('es')}
              className={`px-2.5 py-1 rounded-full transition-all duration-200 flex items-center gap-1.5 text-xs ${
                language === 'es'
                  ? 'bg-white text-brand-blue shadow-sm font-black scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Cambiar a Español"
            >
              <span className="text-xs leading-none">🇨🇷</span> <span>ES</span>
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-full transition-all duration-200 flex items-center gap-1.5 text-xs ${
                language === 'en'
                  ? 'bg-brand-blue text-white shadow-sm font-black scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Switch to English"
            >
              <span className="text-xs leading-none">🇺🇸</span> <span>EN</span>
            </button>
          </div>

          {/* Iniciar sesión (Ghost Button) */}
          <a 
            href="https://worldboxcr.com/jrscargo/login" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs sm:text-sm font-bold text-slate-700 hover:text-brand-blue hover:bg-slate-100/80 px-3.5 py-2 rounded-full transition-all flex items-center gap-1.5"
          >
            <UserCircle size={18} className="text-slate-500" />
            <span>{t.nav.login}</span>
          </a>

          {/* CTA: Crear mi casillero */}
          <a 
            href="https://worldboxcr.com/jrscargo/register" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-brand-blue hover:bg-[#0A2636] text-white font-bold text-xs sm:text-sm py-2.5 px-5 rounded-full shadow-md shadow-brand-blue/20 hover:shadow-lg hover:shadow-brand-blue/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            <PackageOpen size={17} className="text-brand-yellow" />
            <span>{t.nav.register}</span>
          </a>
        </div>

        {/* Mobile Controls (Language + Hamburger Button) */}
        <div className="lg:hidden flex items-center gap-2">
          {/* Mobile Language Button */}
          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-black text-brand-blue flex items-center gap-1 transition-colors"
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
        <div className="lg:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-md shadow-xl border-t border-slate-100 animate-slide-up">
          <div className="px-4 pt-3 pb-6 space-y-1 sm:px-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="block px-3.5 py-3 text-base font-semibold text-slate-700 hover:text-brand-blue hover:bg-slate-50 rounded-xl transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
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
                className="flex items-center justify-center gap-2 w-full py-3 text-sm font-bold text-white bg-brand-blue hover:bg-[#0A2636] rounded-xl shadow-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <PackageOpen size={20} />
                {t.nav.register}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
