'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, UserCircle, PackageOpen } from 'lucide-react';

const navLinks = [
  { name: 'Inicio', href: '/' },
  { name: 'Tarifas', href: '#tarifas' },
  { name: 'Cotizador', href: '#cotizador' },
  { name: 'Tracking', href: '#tracking' },
  { name: '¿Cómo funciona?', href: '#como-funciona' },
  { name: 'Contacto', href: '#contacto' },
];

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed left-0 right-0 z-50 transition-all duration-300 ease-out ${
        isScrolled && !isMobileMenuOpen
          ? 'top-4 px-0 pointer-events-none' 
          : 'top-0 px-0'
      }`}
    >
      <div 
        className={`mx-auto transition-all duration-300 ease-out pointer-events-auto flex items-center justify-between ${
          isScrolled && !isMobileMenuOpen
            ? 'w-[calc(100%-2rem)] max-w-6xl bg-white/90 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full py-2 px-6 sm:px-8 border border-white/60' 
            : 'w-full max-w-full bg-white/95 backdrop-blur-sm rounded-none py-4 px-4 sm:px-6 lg:px-8 border border-transparent'
        }`}
      >
        {/* Logo */}
        <Link href="/" className="flex-shrink-0" onClick={() => setIsMobileMenuOpen(false)}>
          <Image 
            src="/logo.png" 
            alt="JRS CARGO" 
            width={240} 
            height={96} 
            className={`w-auto object-contain origin-left transition-all duration-300 ease-out ${
              isScrolled && !isMobileMenuOpen 
                ? 'h-10 sm:h-12 scale-100' 
                : 'h-14 sm:h-20 lg:h-[90px] scale-110'
            }`}
            priority
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden xl:flex items-center space-x-6">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.href}
              className="text-sm font-medium text-brand-text-gray hover:text-brand-blue transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center space-x-4">
          <a 
            href="https://worldboxcr.com/jrscargo/login" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm font-semibold text-brand-blue hover:text-brand-red transition-colors flex items-center gap-2"
          >
            <UserCircle size={18} />
            Iniciar sesión
          </a>
          <a 
            href="https://worldboxcr.com/jrscargo/register" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-primary text-sm py-2.5 px-5"
          >
            <PackageOpen size={18} />
            Crear mi casillero
          </a>
        </div>

        {/* Mobile menu button */}
        <button 
          className="xl:hidden p-2 text-brand-blue hover:bg-gray-100 rounded-lg transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="xl:hidden absolute top-full left-0 right-0 bg-white shadow-lg border-t border-gray-100 animate-slide-up">
          <div className="px-4 pt-2 pb-6 space-y-1 sm:px-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="block px-3 py-3 text-base font-medium text-brand-text-gray hover:text-brand-blue hover:bg-gray-50 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            
            <div className="mt-6 pt-6 border-t border-gray-100 grid gap-4">
              <a 
                href="https://worldboxcr.com/jrscargo/login" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full btn-outline py-3"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <UserCircle size={20} />
                Iniciar sesión
              </a>
              <a 
                href="https://worldboxcr.com/jrscargo/register" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full btn-primary py-3"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <PackageOpen size={20} />
                Crear mi casillero
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
