'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, UserCircle, PackageOpen, ChevronRight, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPatriotic, setIsPatriotic] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const navLinks = [
    { id: 'inicio', name: t.nav.home, href: '/' },
    { id: 'tracking', name: t.nav.tracking, href: '/#tracking' },
    { id: 'tarifas', name: t.nav.rates, href: '/#tarifas' },
    { id: 'cotizador', name: t.nav.calculator, href: '/#cotizador' },
    { id: 'como-funciona', name: t.nav.howItWorks, href: '/#como-funciona' },
    { id: 'contacto', name: t.nav.contact, href: '/#contacto' },
  ];

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 20);

      // Section scroll spy
      const sections = ['contacto', 'como-funciona', 'cotizador', 'tarifas', 'tracking'];
      let found = '';
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 220 && rect.bottom >= 100) {
            found = id;
            break;
          }
        }
      }
      if (!found && scrollY < 250) {
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

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setIsMobileMenuOpen(false);

    if (href === '/') {
      if (window.location.pathname === '/') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        history.pushState(null, '', '/');
        setActiveSection('inicio');
      }
      return;
    }

    if (href.startsWith('/#')) {
      const targetId = href.replace('/#', '');
      const element = document.getElementById(targetId);
      if (element) {
        e.preventDefault();
        const headerOffset = 90;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        history.pushState(null, '', href);
        setActiveSection(targetId);
      }
    }
  };

  return (
    <>
      <header
        className={`fixed left-0 right-0 z-50 transition-all duration-300 ease-out ${
          isScrolled && !isMobileMenuOpen
            ? 'top-2 sm:top-4 px-3 sm:px-6 pointer-events-none'
            : 'top-0 px-0 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs pointer-events-auto'
        }`}
      >
        <div
          className={`mx-auto transition-all duration-300 ease-out flex items-center justify-between gap-4 pointer-events-auto ${
            isScrolled && !isMobileMenuOpen
              ? 'w-full max-w-7xl bg-white/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(18,67,94,0.12)] rounded-full py-2 px-5 sm:px-7 border border-slate-200/90'
              : 'w-full max-w-7xl py-3 px-4 sm:px-6 lg:px-8'
          }`}
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex-shrink-0 flex items-center transition-transform duration-200 hover:scale-[1.02]"
            onClick={(e) => handleNavClick(e, '/')}
          >
            <Image
              src={isPatriotic ? "/logo-patrio-clean.png" : "/logo.png"}
              alt={isPatriotic ? "JRS CARGO - Mes de la Patria" : "JRS CARGO"}
              width={isPatriotic ? 240 : 260}
              height={isPatriotic ? 80 : 100}
              className={`w-auto object-contain transition-all duration-300 ${
                isScrolled && !isMobileMenuOpen
                  ? 'h-10 sm:h-12 lg:h-[48px]'
                  : 'h-12 sm:h-14 lg:h-[56px]'
              }`}
              priority
            />
          </Link>

          {/* Center: Desktop Navigation with clean active indicator */}
          <nav className="hidden lg:flex items-center space-x-1 xl:space-x-1.5">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={`relative px-3.5 py-2 text-[14px] xl:text-[15px] font-semibold transition-colors duration-150 rounded-full ${
                    isActive
                      ? 'text-brand-blue font-bold bg-slate-100/60'
                      : 'text-slate-700 hover:text-brand-blue hover:bg-slate-50'
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-[2.5px] bg-brand-blue rounded-full" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Right: Desktop Actions */}
          <div className="hidden lg:flex items-center space-x-3 xl:space-x-4 shrink-0">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100/90 rounded-full p-1 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setLanguage('es')}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  language === 'es'
                    ? 'bg-white text-brand-blue shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 font-semibold'
                }`}
                title="Español"
              >
                <span>🇨🇷</span>
                <span>ES</span>
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  language === 'en'
                    ? 'bg-white text-brand-blue shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 font-semibold'
                }`}
                title="English"
              >
                <span>🇺🇸</span>
                <span>EN</span>
              </button>
            </div>

            {/* Iniciar sesión */}
            <a
              href="https://worldboxcr.com/jrscargo/login"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-[14px] font-bold text-slate-700 hover:text-brand-blue rounded-full hover:bg-slate-100/70 transition-colors"
            >
              <UserCircle size={19} className="text-slate-500" />
              <span>{t.nav.login}</span>
            </a>

            {/* Crear mi casillero */}
            <a
              href="https://worldboxcr.com/jrscargo/register"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-brand-blue hover:bg-[#0c2f42] text-white font-bold text-[14px] px-5 py-2.5 rounded-full shadow-sm hover:shadow transition-all"
            >
              <PackageOpen size={18} className="text-brand-yellow" />
              <span>{t.nav.register}</span>
            </a>
          </div>

          {/* Mobile Right Controls */}
          <div className="lg:hidden flex items-center gap-2">
            {/* Quick Mobile Language Toggle */}
            <div className="flex items-center bg-slate-100 rounded-full p-0.5 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setLanguage('es')}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  language === 'es'
                    ? 'bg-white text-brand-blue shadow-2xs font-bold'
                    : 'text-slate-600 font-medium'
                }`}
              >
                🇨🇷 ES
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-full transition-all ${
                  language === 'en'
                    ? 'bg-white text-brand-blue shadow-2xs font-bold'
                    : 'text-slate-600 font-medium'
                }`}
              >
                🇺🇸 EN
              </button>
            </div>

            {/* Hamburger Button */}
            <button
              type="button"
              className="p-2 text-slate-700 hover:text-brand-blue hover:bg-slate-100 rounded-xl transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown from Header */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white/98 backdrop-blur-xl border-t border-slate-100 shadow-2xl max-h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain">
            <div className="px-4 py-4 space-y-1">
              {/* Navigation Links */}
              {navLinks.map((link) => {
                const isActive = activeSection === link.id;
                return (
                  <a
                    key={link.id}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-base font-semibold transition-colors ${
                      isActive
                        ? 'text-brand-blue bg-slate-100 font-bold'
                        : 'text-slate-700 hover:text-brand-blue hover:bg-slate-50'
                    }`}
                  >
                    <span>{link.name}</span>
                    <ChevronRight size={18} className="text-slate-400" />
                  </a>
                );
              })}

              {/* Language Selector Row inside Drawer */}
              <div className="pt-3 pb-2 px-3 flex items-center justify-between border-t border-slate-100 mt-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {language === 'es' ? 'Idioma' : 'Language'}
                </span>
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-full">
                  <button
                    type="button"
                    onClick={() => setLanguage('es')}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                      language === 'es'
                        ? 'bg-white text-brand-blue shadow-2xs font-bold'
                        : 'text-slate-600 font-medium'
                    }`}
                  >
                    🇨🇷 Español
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                      language === 'en'
                        ? 'bg-white text-brand-blue shadow-2xs font-bold'
                        : 'text-slate-600 font-medium'
                    }`}
                  >
                    🇺🇸 English
                  </button>
                </div>
              </div>

              {/* Action Buttons in Mobile Drawer */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <a
                  href="https://worldboxcr.com/jrscargo/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <UserCircle size={19} className="text-slate-600" />
                  <span>{t.nav.login}</span>
                </a>

                <a
                  href="https://worldboxcr.com/jrscargo/register"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3.5 px-4 text-sm font-bold text-white bg-brand-blue hover:bg-[#0c2f42] rounded-xl shadow-md transition-colors"
                >
                  <PackageOpen size={19} className="text-brand-yellow" />
                  <span>{t.nav.register}</span>
                </a>

                {/* Direct WhatsApp help link */}
                <a
                  href="https://wa.me/50672601238"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors mt-2"
                >
                  <MessageCircle size={16} className="text-emerald-600" />
                  <span>{language === 'es' ? 'Atención por WhatsApp: +506 7260 1238' : 'WhatsApp Support: +506 7260 1238'}</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Backdrop for mobile menu when open */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
