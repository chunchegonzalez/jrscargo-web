'use client'

import { useState } from 'react'
import { Search, Package, MessageCircle, Clock, CheckCircle, Circle, AlertCircle } from 'lucide-react'
import { WHATSAPP_NUMBER } from '@/data/rates'
import type { TrackingResult, TrackingEvent } from '@/lib/tracking'

function TrackingTimeline({ events }: { events: TrackingEvent[] }) {
  return (
    <ol className="space-y-4" aria-label="Historial de eventos del paquete">
      {events.map((event, idx) => (
        <li key={idx} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                event.status === 'completed'
                  ? 'bg-green-100 text-green-600'
                  : event.status === 'current'
                  ? 'bg-brand-blue text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {event.status === 'completed' ? (
                <CheckCircle className="w-4 h-4" />
              ) : event.status === 'current' ? (
                <Package className="w-4 h-4 animate-pulse-soft" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </div>
            {idx < events.length - 1 && (
              <div
                className={`w-0.5 flex-1 mt-1 ${
                  event.status === 'completed' ? 'bg-green-200' : 'bg-gray-100'
                }`}
              />
            )}
          </div>
          <div className="pb-4">
            <p
              className={`font-semibold text-sm ${
                event.status === 'pending' ? 'text-brand-text-light' : 'text-brand-navy'
              }`}
            >
              {event.description}
            </p>
            {event.location && (
              <p className="text-xs text-brand-text-light mt-0.5">{event.location}</p>
            )}
            {event.date && (
              <p className="text-xs text-brand-text-light mt-0.5">{event.date}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

function TrackingResultCard({ data }: { data: TrackingResult }) {
  return (
    <div className="card p-6 space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-brand-text-light text-sm">Número de tracking</p>
          <p className="font-bold text-brand-navy text-lg font-mono">{data.trackingNumber}</p>
        </div>
        <span className="badge bg-green-100 text-green-700 text-sm">
          <CheckCircle className="w-4 h-4 mr-1" />
          {data.status}
        </span>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        {data.carrier && (
          <div>
            <p className="text-brand-text-light">Transportista</p>
            <p className="font-semibold text-brand-navy">{data.carrier}</p>
          </div>
        )}
        {data.lastUpdate && (
          <div>
            <p className="text-brand-text-light">Última actualización</p>
            <p className="font-semibold text-brand-navy">{data.lastUpdate}</p>
          </div>
        )}
        {data.origin && (
          <div>
            <p className="text-brand-text-light">Origen</p>
            <p className="font-semibold text-brand-navy">{data.origin}</p>
          </div>
        )}
        {data.destination && (
          <div>
            <p className="text-brand-text-light">Destino</p>
            <p className="font-semibold text-brand-navy">{data.destination}</p>
          </div>
        )}
        {data.currentLocation && (
          <div className="col-span-2">
            <p className="text-brand-text-light">Ubicación actual</p>
            <p className="font-semibold text-brand-navy">{data.currentLocation}</p>
          </div>
        )}
        {data.estimatedDelivery && (
          <div className="col-span-2">
            <p className="text-brand-text-light">Entrega estimada</p>
            <p className="font-semibold text-brand-navy">{data.estimatedDelivery}</p>
          </div>
        )}
      </div>

      {/* Timeline */}
      {data.events.length > 0 && (
        <div>
          <p className="font-bold text-brand-navy mb-4 text-sm uppercase tracking-wide">Historial</p>
          <TrackingTimeline events={data.events} />
        </div>
      )}
    </div>
  )
}

export default function TrackingSearch() {
  const [trackingNumber, setTrackingNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TrackingResult | null>(null)
  const [pendingIntegration, setPendingIntegration] = useState(false)
  const [error, setError] = useState('')

  async function handleTrack() {
    if (!trackingNumber.trim()) {
      setError('Ingresa un número de tracking.')
      return
    }
    setError('')
    setResult(null)
    setPendingIntegration(false)
    setLoading(true)

    try {
      const res = await fetch(`/api/tracking?number=${encodeURIComponent(trackingNumber.trim())}`)
      const data = await res.json()

      if (data.pendingIntegration) {
        setPendingIntegration(true)
      } else if (data.success && data.data) {
        setResult(data.data)
      } else {
        setError(data.error || 'No se encontró información para este número de tracking.')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="tracking" className="section-padding bg-brand-bg-section">
      <div className="container-max">
        {/* Heading */}
        <div className="text-center mb-10">
          <span className="badge bg-brand-yellow/20 text-brand-yellow-light mb-4" style={{ color: '#B7770D' }}>
            Tracking
          </span>
          <h2 className="section-title">¿Dónde está mi paquete?</h2>
          <p className="section-subtitle">Consulta el estado de tu envío en segundos.</p>
        </div>

        <div className="max-w-xl mx-auto space-y-6">
          {/* Search input */}
          <div className="card p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                  placeholder="Número de tracking"
                  className="input-field pl-10"
                  id="tracking-input"
                  aria-label="Número de tracking"
                  autoComplete="off"
                />
              </div>
              <button
                onClick={handleTrack}
                disabled={loading}
                className="btn-primary px-6 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                id="tracking-search-btn"
                aria-label="Rastrear paquete"
              >
                {loading ? (
                  <Clock className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                {loading ? 'Buscando...' : 'Rastrear paquete'}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm" role="alert">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Pending integration notice */}
          {pendingIntegration && (
            <div className="card p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-brand-bg-light rounded-2xl flex items-center justify-center mx-auto">
                <Clock className="w-7 h-7 text-brand-blue" />
              </div>
              <div>
                <h3 className="font-bold text-brand-navy text-lg">Servicio próximamente disponible</h3>
                <p className="text-brand-text-gray text-sm mt-2">
                  El servicio de tracking se encuentra pendiente de integración.
                  <br />
                  Por ahora, consulta el estado de tu paquete directamente con nosotros.
                </p>
              </div>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hola%20JRS%20CARGO%2C%20quiero%20consultar%20el%20estado%20de%20mi%20paquete%20con%20tracking%3A%20${encodeURIComponent(trackingNumber)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp inline-flex"
                id="tracking-whatsapp-btn"
              >
                <MessageCircle className="w-5 h-5" />
                Consultar por WhatsApp
              </a>
            </div>
          )}

          {/* Result */}
          {result && <TrackingResultCard data={result} />}
        </div>
      </div>
    </section>
  )
}
