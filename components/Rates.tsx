'use client'

import { Plane, Ship, ArrowRight, Info } from 'lucide-react'
import { RATES } from '@/data/rates'

interface RateCardProps {
  rateKey: keyof typeof RATES
  onCalculate: (rateId: string) => void
}

function RateCard({ rateKey, onCalculate }: RateCardProps) {
  const rate = RATES[rateKey]
  const isShip = rateKey === 'USA_SEA'

  const flagEmoji =
    rate.origin === 'Estados Unidos'
      ? '🇺🇸'
      : rate.origin === 'España'
      ? '🇪🇸'
      : '🇨🇳'

  const gradients: Record<string, string> = {
    'usa-air':   'from-sky-500 to-blue-700',
    'usa-sea':   'from-teal-500 to-cyan-700',
    'spain-air': 'from-red-500 to-rose-700',
    'china-air': 'from-orange-500 to-red-600',
  }

  return (
    <div className="card p-6 flex flex-col gap-4 group">
      {/* Header */}
      <div className={`bg-gradient-to-br ${gradients[rate.id]} rounded-xl p-4 flex items-center justify-between`}>
        <div>
          <span className="text-2xl" aria-hidden="true">{flagEmoji}</span>
          <p className="text-white font-bold text-sm mt-1">{rate.origin}</p>
          <p className="text-white/80 text-xs">{rate.service}</p>
        </div>
        <div className="text-white/80">
          {isShip ? (
            <Ship className="w-10 h-10" aria-hidden="true" />
          ) : (
            <Plane className="w-10 h-10" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-1">
        <span className="text-brand-text-gray text-sm font-medium">desde</span>
        <span className="text-3xl font-black text-brand-navy">
          ${rate.price}
        </span>
        <span className="text-brand-text-gray text-sm font-medium">
          / {rate.unit}
        </span>
      </div>

      {/* Description */}
      <p className="text-brand-text-light text-sm leading-relaxed">{rate.description}</p>

      {/* Note for sea */}
      {rate.id === 'usa-sea' && 'note' in rate && (
        <div className="flex items-start gap-2 bg-sky-50 rounded-lg p-3">
          <Info className="w-4 h-4 text-sky-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sky-700 text-xs">{(rate as typeof RATES.USA_SEA).note}</p>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => onCalculate(rate.id)}
        className="btn-primary w-full mt-auto"
        id={`rate-calc-${rate.id}`}
        aria-label={`Calcular envío para ${rate.label}`}
      >
        Calcular envío
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  )
}

interface RatesProps {
  onCalculate: (rateId: string) => void
}

export default function Rates({ onCalculate }: RatesProps) {
  return (
    <section id="tarifas" className="section-padding bg-brand-bg-section">
      <div className="container-max">
        {/* Heading */}
        <div className="text-center mb-12">
          <span className="badge bg-brand-navy/10 text-brand-navy mb-4">
            Tarifas
          </span>
          <h2 className="section-title">
            Tarifas simples y transparentes
          </h2>
          <p className="section-subtitle max-w-lg mx-auto">
            Conoce el costo de traer tus paquetes antes de comprar. Sin sorpresas.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(Object.keys(RATES) as Array<keyof typeof RATES>).map((key) => (
            <RateCard key={key} rateKey={key} onCalculate={onCalculate} />
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-center text-brand-text-light text-sm mt-8 max-w-2xl mx-auto">
          <Info className="inline w-4 h-4 mr-1 mb-0.5" aria-hidden="true" />
          Las cotizaciones mostradas son estimaciones basadas en las tarifas publicadas.
          Para mercancía especial o condiciones particulares, consulta con un asesor.
        </p>
      </div>
    </section>
  )
}
