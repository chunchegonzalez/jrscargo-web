'use client'

import { ArrowRight } from 'lucide-react'
import { PORTAL_REGISTER_URL } from '@/data/rates'

export default function CreateMailbox() {
  return (
    <section
      id="casillero"
      className="section-padding relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0B2D4E 0%, #1A4A7A 100%)' }}
    >
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #F39C12, transparent)' }}
        />
        <div
          className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #C0392B, transparent)' }}
        />
      </div>

      <div className="container-max relative z-10">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white/80 text-sm font-medium mb-6">
            🏠 Casillero Internacional
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 text-balance">
            Tu casillero internacional{' '}
            <span className="text-brand-yellow">comienza aquí</span>
          </h2>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            Regístrate con JRS CARGO, obtén tu dirección de casillero y comienza a comprar
            en tus tiendas favoritas.
          </p>
        </div>

        {/* Route visual */}
        <div className="flex items-center justify-center gap-3 mb-12 flex-wrap">
          {[
            { flag: '🇺🇸', label: 'EE.UU.' },
            { flag: '🇪🇸', label: 'España' },
            { flag: '🇨🇳', label: 'China' },
          ].map((country, idx) => (
            <div key={country.label} className="flex items-center gap-3">
              <div className="text-center card-glass px-5 py-3">
                <span className="text-3xl" aria-hidden="true">{country.flag}</span>
                <p className="text-white/80 text-xs mt-1">{country.label}</p>
              </div>
              {idx < 2 && (
                <ArrowRight className="w-5 h-5 text-white/30" aria-hidden="true" />
              )}
            </div>
          ))}

          <ArrowRight className="w-6 h-6 text-brand-yellow" aria-hidden="true" />

          {/* JRS CARGO hub */}
          <div className="text-center card-glass px-6 py-3 border-brand-yellow/40">
            <div className="flex items-center gap-2 justify-center">
              <div className="w-8 h-8 bg-brand-yellow rounded-lg flex items-center justify-center">
                <span className="text-brand-navy font-black text-xs">JRS</span>
              </div>
              <p className="text-white font-bold text-sm">CARGO</p>
            </div>
          </div>

          <ArrowRight className="w-6 h-6 text-brand-yellow" aria-hidden="true" />

          {/* Costa Rica */}
          <div className="text-center card-glass px-5 py-3">
            <span className="text-3xl" aria-hidden="true">🇨🇷</span>
            <p className="text-white/80 text-xs mt-1">Costa Rica</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href={PORTAL_REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-accent text-base px-10 py-4 inline-flex"
            id="mailbox-create-btn"
          >
            Crear mi casillero
            <ArrowRight className="w-5 h-5" />
          </a>
          <p className="text-white/50 text-sm mt-4">
            Es gratis registrarse. Empieza a comprar hoy.
          </p>
        </div>
      </div>
    </section>
  )
}
