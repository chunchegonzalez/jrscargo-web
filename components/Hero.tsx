'use client'

import { Plane, Ship, ArrowRight, MessageCircle, Package } from 'lucide-react'
import { PORTAL_REGISTER_URL, WHATSAPP_NUMBER } from '@/data/rates'

export default function Hero() {
  const scrollToCotizador = () => {
    const el = document.getElementById('cotizador')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0B2D4E 0%, #1A4A7A 40%, #0B2D4E 100%)',
      }}
      aria-label="Sección principal JRS CARGO CR"
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large circle */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #F39C12, transparent)' }}
        />
        {/* Bottom left circle */}
        <div
          className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #C0392B, transparent)' }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Floating icons */}
        <div className="absolute top-24 right-12 text-white/10 animate-float" style={{ animationDelay: '0s' }}>
          <Plane className="w-20 h-20" />
        </div>
        <div className="absolute top-1/2 right-8 text-white/8 animate-float" style={{ animationDelay: '1.5s' }}>
          <Ship className="w-16 h-16" />
        </div>
        <div className="absolute bottom-24 right-24 text-brand-yellow/20 animate-float" style={{ animationDelay: '0.8s' }}>
          <Plane className="w-12 h-12 rotate-45" />
        </div>
      </div>

      {/* Content */}
      <div className="container-max w-full px-4 sm:px-6 pt-24 pb-16">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-8">
            <div className="w-2 h-2 bg-brand-yellow rounded-full animate-pulse" />
            <span className="text-white/90 text-sm font-medium">
              EE.UU. · España · China → Costa Rica
            </span>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-6 text-balance">
            Tus compras del mundo,{' '}
            <span className="relative">
              <span className="text-brand-yellow">más cerca</span>
              <span className="absolute -bottom-1 left-0 right-0 h-1 bg-brand-yellow/40 rounded-full" />
            </span>{' '}
            de Costa Rica.
          </h1>

          {/* Subtitle */}
          <p className="text-white/75 text-lg sm:text-xl leading-relaxed mb-10 max-w-xl">
            Compra en Estados Unidos, España o China y nosotros nos encargamos
            de traer tus paquetes a Costa Rica de forma sencilla.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <a
              href={PORTAL_REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-accent text-base px-8 py-4 text-center"
              id="hero-register-btn"
            >
              <Package className="w-5 h-5" />
              Crear mi casillero
            </a>
            <button
              onClick={scrollToCotizador}
              className="btn-white text-base px-8 py-4"
              id="hero-quote-btn"
            >
              Cotizar mi envío
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* WhatsApp link */}
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hola%20JRS%20CARGO%2C%20necesito%20informaci%C3%B3n%20sobre%20un%20env%C3%ADo`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium group"
            id="hero-whatsapp-btn"
          >
            <MessageCircle className="w-4 h-4 text-green-400 group-hover:scale-110 transition-transform duration-200" />
            Hablar por WhatsApp
          </a>

          {/* Stats row */}
          <div className="mt-12 pt-8 border-t border-white/10 grid grid-cols-3 gap-6 max-w-sm">
            <div>
              <p className="text-white font-bold text-2xl">🇺🇸</p>
              <p className="text-white/60 text-xs mt-1">Estados Unidos</p>
            </div>
            <div>
              <p className="text-white font-bold text-2xl">🇪🇸</p>
              <p className="text-white/60 text-xs mt-1">España</p>
            </div>
            <div>
              <p className="text-white font-bold text-2xl">🇨🇳</p>
              <p className="text-white/60 text-xs mt-1">China</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full"
          preserveAspectRatio="none"
        >
          <path
            d="M0 80L48 69.3C96 59 192 37 288 29.3C384 21 480 27 576 37.3C672 48 768 64 864 64C960 64 1056 48 1152 40C1248 32 1344 32 1392 32L1440 32V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0Z"
            fill="#F8FAFC"
          />
        </svg>
      </div>
    </section>
  )
}
