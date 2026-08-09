'use client'

import { ShoppingBag, Package, Plane, MapPin, ArrowRight } from 'lucide-react'
import { PORTAL_REGISTER_URL } from '@/data/rates'

const steps = [
  {
    number: '01',
    icon: MapPin,
    title: 'Abre tu casillero',
    description:
      'Regístrate y obtén tu dirección única de casillero para utilizarla en tus compras.',
    cta: { label: 'Crear casillero', href: PORTAL_REGISTER_URL },
    color: 'from-blue-500 to-blue-700',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
  },
  {
    number: '02',
    icon: ShoppingBag,
    title: 'Haz tus compras',
    description:
      'Compra en tus tiendas favoritas en línea y usa tu dirección de casillero como dirección de entrega.',
    color: 'from-purple-500 to-purple-700',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
  },
  {
    number: '03',
    icon: Package,
    title: 'Nosotros recibimos tu paquete',
    description:
      'Cuando tu paquete llegue a nuestra bodega, JRS CARGO lo procesará de acuerdo con el servicio seleccionado. Podrás consultar la información desde tu cuenta.',
    color: 'from-orange-500 to-orange-700',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
  },
  {
    number: '04',
    icon: Plane,
    title: 'Tu paquete llega a Costa Rica',
    description:
      'Cuando tu paquete llegue a Costa Rica recibirás la información correspondiente y podrás continuar con el proceso de entrega definido por JRS CARGO.',
    color: 'from-green-500 to-green-700',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
  },
]

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="section-padding bg-brand-bg-section">
      <div className="container-max">
        {/* Heading */}
        <div className="text-center mb-14">
          <span className="badge bg-brand-navy/10 text-brand-navy mb-4">¿Cómo funciona?</span>
          <h2 className="section-title">Comprar afuera nunca fue tan sencillo</h2>
          <p className="section-subtitle max-w-lg mx-auto">
            Cuatro pasos simples para traer tus compras internacionales a Costa Rica.
          </p>
        </div>

        {/* Visual route bar */}
        <div className="flex items-center justify-center gap-2 mb-12 flex-wrap">
          {['🛒 Compra', '📦 Casillero', '✈️ Transporte', '🇨🇷 Costa Rica'].map((item, idx, arr) => (
            <div key={item} className="flex items-center gap-2">
              <span className="bg-white border border-gray-200 rounded-full px-4 py-1.5 text-sm font-semibold text-brand-navy shadow-sm whitespace-nowrap">
                {item}
              </span>
              {idx < arr.length - 1 && (
                <ArrowRight className="w-4 h-4 text-brand-text-light" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => {
            const Icon = step.icon
            return (
              <div key={step.number} className="relative">
                {/* Connector line (desktop only) */}
                {idx < steps.length - 1 && (
                  <div
                    className="hidden lg:block absolute top-10 left-full w-6 h-0.5 bg-gradient-to-r from-gray-200 to-transparent z-10"
                    aria-hidden="true"
                  />
                )}

                <div className="card p-6 h-full flex flex-col gap-4">
                  {/* Number + Icon */}
                  <div className="flex items-start justify-between">
                    <div
                      className={`w-12 h-12 bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="w-6 h-6 text-white" aria-hidden="true" />
                    </div>
                    <span
                      className={`text-4xl font-black ${step.bgColor.replace('bg-', 'text-').replace('50', '200')} select-none`}
                      style={{ opacity: 0.5 }}
                    >
                      {step.number}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="font-bold text-brand-navy text-base mb-2">{step.title}</h3>
                    <p className="text-brand-text-gray text-sm leading-relaxed">{step.description}</p>
                  </div>

                  {/* Optional CTA */}
                  {step.cta && (
                    <a
                      href={step.cta.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-sm px-4 py-2.5"
                      id={`how-step-${step.number}-cta`}
                    >
                      {step.cta.label}
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
