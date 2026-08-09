'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, Package } from 'lucide-react'
import { PORTAL_LOGIN_URL, PORTAL_REGISTER_URL } from '@/data/rates'

const navLinks = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Tarifas', href: '#tarifas' },
  { label: 'Cotizador', href: '#cotizador' },
  { label: 'Tracking', href: '#tracking' },
  { label: '¿Cómo funciona?', href: '#como-funciona' },
  { label: 'Mi casillero', href: '#casillero' },
  { label: 'Contacto', href: '#contacto' },
]

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (href: string) => {
    setIsOpen(false)
    if (href.startsWith('#')) {
      const el = document.getElementById(href.slice(1))
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-brand-navy/98 backdrop-blur-md shadow-lg'
          : 'bg-brand-navy'
      }`}
      role="banner"
    >
      <div className="container-max">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-brand-yellow rounded-lg"
            aria-label="JRS CARGO CR - Ir al inicio"
          >
            <div className="flex items-center gap-2">
              {/* Logo placeholder - reemplazar con <Image src="/logo.png" ... /> cuando esté disponible */}
              <div className="w-9 h-9 bg-brand-yellow rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <Package className="w-5 h-5 text-brand-navy" strokeWidth={2.5} />
              </div>
              <div>
                <span className="text-white font-bold text-lg leading-tight tracking-tight">
                  JRS <span className="text-brand-yellow">CARGO</span>
                </span>
                <span className="hidden sm:block text-white/50 text-[10px] leading-tight tracking-widest uppercase">
                  Costa Rica
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1" role="navigation" aria-label="Navegación principal">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="text-white/80 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-2">
            <a
              href={PORTAL_LOGIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/90 hover:text-white border border-white/30 hover:border-white/60 hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow"
              id="header-login-btn"
            >
              Iniciar sesión
            </a>
            <a
              href={PORTAL_REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-accent text-sm px-4 py-2"
              id="header-register-btn"
            >
              Crear mi casillero
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow"
            aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
            id="hamburger-btn"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        id="mobile-menu"
        className={`lg:hidden transition-all duration-300 overflow-hidden ${
          isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="bg-brand-navy border-t border-white/10 px-4 py-4 space-y-1">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => handleNavClick(link.href)}
              className="block w-full text-left text-white/80 hover:text-white hover:bg-white/10 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-yellow"
            >
              {link.label}
            </button>
          ))}
          <div className="pt-3 border-t border-white/10 space-y-2">
            <a
              href={PORTAL_LOGIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center text-white border border-white/30 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all duration-200"
              id="mobile-login-btn"
            >
              Iniciar sesión
            </a>
            <a
              href={PORTAL_REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-accent block w-full text-center"
              id="mobile-register-btn"
            >
              Crear mi casillero
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}
