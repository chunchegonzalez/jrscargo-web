'use client'

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { Calculator, MessageCircle, ChevronDown, RefreshCw, Package } from 'lucide-react'
import {
  RATES,
  WHATSAPP_NUMBER,
  kgToLb,
  cmToCubicFeet,
  calculateWeightCost,
  calculateSeaCost,
} from '@/data/rates'

type Origin = 'usa' | 'spain' | 'china'
type Service = 'air' | 'sea'
type WeightUnit = 'lb' | 'kg'
type SeaCalcMode = 'direct' | 'dimensions'

export interface QuoteCalculatorRef {
  selectRate: (rateId: string) => void
}

const QuoteCalculator = forwardRef<QuoteCalculatorRef>((_, ref) => {
  const [origin, setOrigin] = useState<Origin>('usa')
  const [service, setService] = useState<Service>('air')
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lb')
  const [weight, setWeight] = useState('')
  const [seaMode, setSeaMode] = useState<SeaCalcMode>('direct')
  const [cubicFeet, setCubicFeet] = useState('')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [result, setResult] = useState<null | {
    total: number
    weightLb?: number
    cubicFt?: number
    rateLabel: string
    origin: string
    service: string
    pricePerUnit: number
    unit: string
  }>(null)
  const [error, setError] = useState('')

  // Expose selectRate method to parent
  useImperativeHandle(ref, () => ({
    selectRate: (rateId: string) => {
      if (rateId === 'usa-air') { setOrigin('usa'); setService('air') }
      else if (rateId === 'usa-sea') { setOrigin('usa'); setService('sea') }
      else if (rateId === 'spain-air') { setOrigin('spain'); setService('air') }
      else if (rateId === 'china-air') { setOrigin('china'); setService('air') }
      setResult(null)
      setError('')
    },
  }))

  // Reset service when origin changes (spain & china only have air)
  useEffect(() => {
    if (origin !== 'usa') setService('air')
    setResult(null)
    setError('')
  }, [origin])

  useEffect(() => {
    setResult(null)
    setError('')
  }, [service, weightUnit, seaMode])

  function calculate() {
    setError('')
    setResult(null)

    if (service === 'air') {
      const raw = parseFloat(weight)
      if (isNaN(raw) || raw <= 0) {
        setError('Ingresa un peso válido mayor a 0.')
        return
      }
      const lb = weightUnit === 'kg' ? kgToLb(raw) : raw
      const rateKey: 'USA_AIR' | 'SPAIN_AIR' | 'CHINA_AIR' =
        origin === 'spain' ? 'SPAIN_AIR' : origin === 'china' ? 'CHINA_AIR' : 'USA_AIR'
      const total = calculateWeightCost(rateKey, lb)
      setResult({
        total,
        weightLb: lb,
        rateLabel: RATES[rateKey].label,
        origin: RATES[rateKey].origin,
        service: 'Aéreo',
        pricePerUnit: RATES[rateKey].price,
        unit: 'lb',
      })
    } else {
      // Marítimo USA
      let ft3: number
      if (seaMode === 'direct') {
        ft3 = parseFloat(cubicFeet)
        if (isNaN(ft3) || ft3 <= 0) {
          setError('Ingresa pies cúbicos válidos mayor a 0.')
          return
        }
      } else {
        const l = parseFloat(length)
        const w = parseFloat(width)
        const h = parseFloat(height)
        if (isNaN(l) || isNaN(w) || isNaN(h) || l <= 0 || w <= 0 || h <= 0) {
          setError('Ingresa dimensiones válidas (largo, ancho, alto) mayores a 0.')
          return
        }
        ft3 = cmToCubicFeet(l, w, h)
      }
      const total = calculateSeaCost(ft3)
      setResult({
        total,
        cubicFt: ft3,
        rateLabel: RATES.USA_SEA.label,
        origin: 'Estados Unidos',
        service: 'Marítimo',
        pricePerUnit: RATES.USA_SEA.price,
        unit: 'ft³',
      })
    }
  }

  function reset() {
    setWeight('')
    setCubicFeet('')
    setLength('')
    setWidth('')
    setHeight('')
    setResult(null)
    setError('')
  }

  function buildWhatsAppMessage(): string {
    if (!result) return ''
    let msg = `Hola JRS CARGO 👋\nQuiero confirmar una cotización.\n\n`
    msg += `Origen: ${result.origin}\n`
    msg += `Servicio: ${result.service}\n`
    if (result.weightLb !== undefined) {
      msg += `Peso: ${result.weightLb.toFixed(2)} lb\n`
    }
    if (result.cubicFt !== undefined) {
      msg += `Volumen: ${result.cubicFt.toFixed(3)} ft³\n`
    }
    msg += `Tarifa: US$${result.pricePerUnit}/${result.unit}\n`
    msg += `Estimado web: US$${result.total.toFixed(2)}\n\n`
    msg += `¿Me pueden ayudar a confirmar el envío?`
    return encodeURIComponent(msg)
  }

  const originOptions: { value: Origin; label: string; flag: string }[] = [
    { value: 'usa', label: 'Estados Unidos', flag: '🇺🇸' },
    { value: 'spain', label: 'España', flag: '🇪🇸' },
    { value: 'china', label: 'China', flag: '🇨🇳' },
  ]

  return (
    <section id="cotizador" className="section-padding bg-white">
      <div className="container-max">
        {/* Heading */}
        <div className="text-center mb-10">
          <span className="badge bg-brand-red/10 text-brand-red mb-4">
            Cotizador
          </span>
          <h2 className="section-title">¿Cuánto cuesta traer mi paquete?</h2>
          <p className="section-subtitle">Obtén una estimación en segundos.</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="card p-6 sm:p-8 space-y-6">
            {/* Step 1: Origen */}
            <div>
              <label className="block text-sm font-bold text-brand-navy mb-3 uppercase tracking-wide">
                Paso 1 — Origen
              </label>
              <div className="grid grid-cols-3 gap-3">
                {originOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setOrigin(opt.value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 font-semibold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-blue ${
                      origin === opt.value
                        ? 'border-brand-blue bg-brand-blue text-white'
                        : 'border-gray-200 text-brand-navy hover:border-brand-blue/50 hover:bg-brand-bg-light'
                    }`}
                    id={`origin-${opt.value}`}
                    aria-pressed={origin === opt.value}
                  >
                    <span className="text-2xl" aria-hidden="true">{opt.flag}</span>
                    <span className="text-xs leading-tight text-center">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Tipo de envío (solo USA tiene marítimo) */}
            {origin === 'usa' && (
              <div>
                <label className="block text-sm font-bold text-brand-navy mb-3 uppercase tracking-wide">
                  Paso 2 — Tipo de envío
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['air', 'sea'].map((svc) => (
                    <button
                      key={svc}
                      onClick={() => setService(svc as Service)}
                      className={`p-3 rounded-xl border-2 font-semibold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-blue ${
                        service === svc
                          ? 'border-brand-blue bg-brand-blue text-white'
                          : 'border-gray-200 text-brand-navy hover:border-brand-blue/50 hover:bg-brand-bg-light'
                      }`}
                      id={`service-${svc}`}
                      aria-pressed={service === svc}
                    >
                      {svc === 'air' ? '✈️ Aéreo' : '🚢 Marítimo'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Peso o dimensiones */}
            <div>
              <label className="block text-sm font-bold text-brand-navy mb-3 uppercase tracking-wide">
                {origin !== 'usa' || service === 'air' ? 'Paso 3 — Peso del paquete' : 'Paso 3 — Volumen del paquete'}
              </label>

              {/* Air: peso */}
              {(origin !== 'usa' || service === 'air') && (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="Ej: 5"
                        className="input-field"
                        id="weight-input"
                        aria-label="Peso del paquete"
                      />
                    </div>
                    <div className="relative">
                      <select
                        value={weightUnit}
                        onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
                        className="select-field pr-8 h-full min-w-[80px]"
                        id="weight-unit"
                        aria-label="Unidad de peso"
                      >
                        <option value="lb">lb</option>
                        <option value="kg">kg</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  {weight && weightUnit === 'kg' && parseFloat(weight) > 0 && (
                    <p className="text-sm text-brand-text-light bg-blue-50 rounded-lg px-3 py-2">
                      ≈ <strong>{kgToLb(parseFloat(weight)).toFixed(2)} lb</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Sea: dimensiones o pies cúbicos */}
              {origin === 'usa' && service === 'sea' && (
                <div className="space-y-4">
                  {/* Mode toggle */}
                  <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                    <button
                      onClick={() => setSeaMode('direct')}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none ${
                        seaMode === 'direct'
                          ? 'bg-white text-brand-navy shadow-sm'
                          : 'text-brand-text-gray hover:text-brand-navy'
                      }`}
                      id="sea-mode-direct"
                    >
                      Pies cúbicos
                    </button>
                    <button
                      onClick={() => setSeaMode('dimensions')}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none ${
                        seaMode === 'dimensions'
                          ? 'bg-white text-brand-navy shadow-sm'
                          : 'text-brand-text-gray hover:text-brand-navy'
                      }`}
                      id="sea-mode-dimensions"
                    >
                      Dimensiones (cm)
                    </button>
                  </div>

                  {seaMode === 'direct' ? (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cubicFeet}
                      onChange={(e) => setCubicFeet(e.target.value)}
                      placeholder="Ej: 1.5 ft³"
                      className="input-field"
                      id="cubic-feet-input"
                      aria-label="Pies cúbicos"
                    />
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-brand-text-gray mb-1 block">Largo (cm)</label>
                          <input
                            type="number"
                            min="0"
                            value={length}
                            onChange={(e) => setLength(e.target.value)}
                            placeholder="30"
                            className="input-field"
                            id="dim-length"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-brand-text-gray mb-1 block">Ancho (cm)</label>
                          <input
                            type="number"
                            min="0"
                            value={width}
                            onChange={(e) => setWidth(e.target.value)}
                            placeholder="30"
                            className="input-field"
                            id="dim-width"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-brand-text-gray mb-1 block">Alto (cm)</label>
                          <input
                            type="number"
                            min="0"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            placeholder="30"
                            className="input-field"
                            id="dim-height"
                          />
                        </div>
                      </div>
                      {length && width && height &&
                        parseFloat(length) > 0 && parseFloat(width) > 0 && parseFloat(height) > 0 && (
                        <p className="text-sm text-brand-text-light bg-blue-50 rounded-lg px-3 py-2">
                          Volumen calculado:{' '}
                          <strong>
                            {cmToCubicFeet(parseFloat(length), parseFloat(width), parseFloat(height)).toFixed(3)} ft³
                          </strong>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium" role="alert">
                {error}
              </div>
            )}

            {/* Calculate button */}
            <button
              onClick={calculate}
              className="btn-primary w-full text-base py-4"
              id="calculate-btn"
            >
              <Calculator className="w-5 h-5" />
              Calcular mi envío
            </button>

            {/* Result */}
            {result && (
              <div className="border-2 border-brand-blue/20 rounded-2xl overflow-hidden animate-slide-up">
                <div
                  className="px-6 py-4 flex items-center gap-3"
                  style={{ background: 'linear-gradient(135deg, #0B2D4E, #1A4A7A)' }}
                >
                  <Package className="w-5 h-5 text-brand-yellow" />
                  <h3 className="text-white font-bold">Tu envío estimado</h3>
                </div>
                <div className="p-6 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-brand-text-light">Origen</p>
                      <p className="font-semibold text-brand-navy">{result.origin}</p>
                    </div>
                    <div>
                      <p className="text-brand-text-light">Servicio</p>
                      <p className="font-semibold text-brand-navy">{result.service}</p>
                    </div>
                    {result.weightLb !== undefined && (
                      <div>
                        <p className="text-brand-text-light">Peso</p>
                        <p className="font-semibold text-brand-navy">{result.weightLb.toFixed(2)} lb</p>
                      </div>
                    )}
                    {result.cubicFt !== undefined && (
                      <div>
                        <p className="text-brand-text-light">Volumen</p>
                        <p className="font-semibold text-brand-navy">{result.cubicFt.toFixed(3)} ft³</p>
                      </div>
                    )}
                    <div>
                      <p className="text-brand-text-light">Tarifa</p>
                      <p className="font-semibold text-brand-navy">
                        US${result.pricePerUnit}/{result.unit}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-brand-text-light text-sm">TOTAL ESTIMADO</p>
                    <p className="text-4xl font-black text-brand-navy">
                      US${result.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-brand-text-light mt-1">
                      Estimación basada en las tarifas publicadas. Sujeto a confirmación.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <a
                      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${buildWhatsAppMessage()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-whatsapp flex-1 text-center"
                      id="quote-whatsapp-btn"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Confirmar por WhatsApp
                    </a>
                    <button
                      onClick={reset}
                      className="btn-outline flex items-center justify-center gap-2 px-4 py-3"
                      id="quote-reset-btn"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Nueva cotización
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
})

QuoteCalculator.displayName = 'QuoteCalculator'
export default QuoteCalculator
