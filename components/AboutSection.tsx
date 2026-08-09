'use client'

import { ArrowRight, MessageCircle } from 'lucide-react'
import { WHATSAPP_NUMBER } from '@/data/rates'

export default function AboutSection() {
  const scrollToCotizador = () => {
    const el = document.getElementById('cotizador')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="nosotros" className="section-padding bg-white">
      <div className="container-max">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Visual side */}
          <div className="relative order-2 lg:order-1">
            <div
              className="rounded-3xl overflow-hidden relative h-72 lg:h-96 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0B2D4E, #1A4A7A)' }}
            >
              {/* Decorative elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div
                  className="absolute top-6 right-6 w-32 h-32 rounded-full opacity-20"
                  style={{ background: 'radial-gradient(circle, #F39C12, transparent)' }}
                />
                <div
                  className="absolute bottom-6 left-6 w-24 h-24 rounded-full opacity-20"
                  style={{ background: 'radial-gradient(circle, #C0392B, transparent)' }}
                />
              </div>

              <div className="relative z-10 text-center p-8">
                <div className="text-7xl mb-4" aria-hidden="true">🌎</div>
                <p className="text-white font-bold text-xl">Conectamos Costa Rica</p>
                <p className="text-white/70 text-sm mt-2">con el mundo</p>

                <div className="flex justify-center gap-4 mt-6">
                  {['🇺🇸', '🇪🇸', '🇨🇳', '🇨🇷'].map((flag, idx, arr) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-2xl" aria-hidden="true">{flag}</span>
                      {idx < arr.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-white/30" aria-hidden="true" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating stat card */}
            <div className="absolute -bottom-4 -right-4 card px-5 py-4 max-w-[200px]">
              <p className="text-xs text-brand-text-light">Servicios disponibles</p>
              <p className="font-bold text-brand-navy text-lg mt-1">
                Aéreo & Marítimo
              </p>
              <p className="text-xs text-brand-text-light mt-1">EE.UU. · España · China</p>
            </div>
          </div>

          {/* Text side */}
          <div className="order-1 lg:order-2">
            <span className="badge bg-brand-navy/10 text-brand-navy mb-4">
              Sobre JRS CARGO
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-brand-navy mb-6 leading-tight">
              Llevamos el mundo a Costa Rica
            </h2>
            <div className="space-y-4 text-brand-text-gray leading-relaxed">
              <p>
                En JRS CARGO conectamos Costa Rica con Estados Unidos, España y China mediante
                soluciones de transporte aéreo y marítimo diseñadas para hacer tus compras
                internacionales más simples.
              </p>
              <p>
                Ya sea que estés comprando para uso personal o para tu negocio, queremos
                que tengas una experiencia clara, sencilla y acompañada durante todo el proceso.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                onClick={scrollToCotizador}
                className="btn-primary"
                id="about-quote-btn"
              >
                Cotizar un envío
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hola%20JRS%20CARGO%2C%20quiero%20hablar%20con%20un%20asesor`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp"
                id="about-whatsapp-btn"
              >
                <MessageCircle className="w-4 h-4" />
                Hablar con un asesor
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
