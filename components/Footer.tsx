'use client'

import Link from 'next/link'
import { Package, MessageCircle, Mail, ArrowRight } from 'lucide-react'
import { FaInstagram } from 'react-icons/fa'
import { WHATSAPP_NUMBER, EMAIL, INSTAGRAM_URL, PORTAL_LOGIN_URL, PORTAL_REGISTER_URL } from '@/data/rates'

const footerLinks = {
  services: [
    { label: 'Aéreo EE.UU.', href: '#tarifas' },
    { label: 'Marítimo EE.UU.', href: '#tarifas' },
    { label: 'Aéreo España', href: '#tarifas' },
    { label: 'Aéreo China', href: '#tarifas' },
  ],
  clients: [
    { label: 'Crear casillero', href: PORTAL_REGISTER_URL, external: true },
    { label: 'Iniciar sesión', href: PORTAL_LOGIN_URL, external: true },
    { label: 'Tracking', href: '#tracking', external: false },
  ],
}

export default function Footer() {
  const handleInternalLink = (href: string) => {
    if (href.startsWith('#')) {
      const el = document.getElementById(href.slice(1))
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <footer
      className="pt-16 pb-8 px-4 sm:px-6"
      style={{ background: '#0B2D4E' }}
      role="contentinfo"
    >
      <div className="max-w-6xl mx-auto">
        {/* Main grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-brand-yellow rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-brand-navy" strokeWidth={2.5} />
              </div>
              <div>
                <span className="text-white font-bold text-lg leading-tight">
                  JRS <span className="text-brand-yellow">CARGO</span>
                </span>
                <p className="text-white/40 text-[10px] tracking-widest uppercase">Costa Rica</p>
              </div>
            </div>
            <p className="text-white/50 text-sm leading-relaxed mb-4">
              Conectamos Costa Rica con el mundo. Envíos aéreos y marítimos desde EE.UU., España y China.
            </p>
            <div className="flex gap-3">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/10 hover:bg-green-500 rounded-lg flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-400"
                aria-label="WhatsApp de JRS CARGO"
              >
                <MessageCircle className="w-4 h-4 text-white" />
              </a>
              <a
                href={`mailto:${EMAIL}`}
                className="w-9 h-9 bg-white/10 hover:bg-blue-500 rounded-lg flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-label="Correo de JRS CARGO"
              >
                <Mail className="w-4 h-4 text-white" />
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/10 hover:bg-pink-500 rounded-lg flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-pink-400"
                aria-label="Instagram de JRS CARGO"
              >
                <FaInstagram className="w-4 h-4 text-white" />
              </a>
            </div>
          </div>

          {/* Services column */}
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-wide mb-4">Servicios</h3>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => handleInternalLink(link.href)}
                    className="text-white/50 hover:text-white text-sm transition-colors duration-200 text-left focus:outline-none focus:underline"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Clients column */}
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-wide mb-4">Clientes</h3>
            <ul className="space-y-2">
              {footerLinks.clients.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/50 hover:text-white text-sm transition-colors duration-200 inline-flex items-center gap-1 focus:outline-none focus:underline"
                    >
                      {link.label}
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                    </a>
                  ) : (
                    <button
                      onClick={() => handleInternalLink(link.href)}
                      className="text-white/50 hover:text-white text-sm transition-colors duration-200 text-left focus:outline-none focus:underline"
                    >
                      {link.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact column */}
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-wide mb-4">Contacto</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/50 hover:text-white text-sm transition-colors duration-200 flex items-center gap-2 focus:outline-none focus:underline"
                >
                  <MessageCircle className="w-4 h-4 flex-shrink-0" />
                  +506 7260 1238
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${EMAIL}`}
                  className="text-white/50 hover:text-white text-sm transition-colors duration-200 flex items-center gap-2 focus:outline-none focus:underline"
                >
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  {EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/50 hover:text-white text-sm transition-colors duration-200 flex items-center gap-2 focus:outline-none focus:underline"
                >
                  <FaInstagram className="w-4 h-4 flex-shrink-0" />
                  @jrscargocr
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-white/40 text-xs">
            JRS CARGO CR © 2026. Todos los derechos reservados.
          </p>
          <div className="flex gap-4">
            <Link
              href="/privacy"
              className="text-white/40 hover:text-white/70 text-xs transition-colors duration-200 focus:outline-none focus:underline"
            >
              Política de privacidad
            </Link>
            <Link
              href="/terms"
              className="text-white/40 hover:text-white/70 text-xs transition-colors duration-200 focus:outline-none focus:underline"
            >
              Términos y condiciones
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
