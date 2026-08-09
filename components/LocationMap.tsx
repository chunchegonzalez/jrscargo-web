'use client'

import { MapPin, ExternalLink } from 'lucide-react'
import { MAPS_URL } from '@/data/rates'

export default function LocationMap() {
  // Google Maps embed para Heredia, Costa Rica
  // Cuando se proporcionen coordenadas exactas, actualizar el src del iframe
  const embedUrl =
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d125503.73217960948!2d-84.17368!3d10.0000!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8fa0e343b7d9af85%3A0xcf4e3e3e56a7f5f7!2sHeredia%2C%20Costa%20Rica!5e0!3m2!1ses!2scr!4v1'

  return (
    <section id="ubicacion" className="section-padding bg-white">
      <div className="container-max">
        <div className="text-center mb-10">
          <span className="badge bg-brand-navy/10 text-brand-navy mb-4">Ubicación</span>
          <h2 className="section-title">Encuéntranos</h2>
          <p className="section-subtitle">
            <MapPin className="inline w-4 h-4 mr-1 mb-0.5" aria-hidden="true" />
            Heredia, Costa Rica
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Map iframe */}
          <div className="card overflow-hidden rounded-2xl">
            <iframe
              src={embedUrl}
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicación de JRS CARGO CR en Heredia, Costa Rica"
              aria-label="Mapa de ubicación de JRS CARGO CR"
            />
          </div>

          {/* Open in Maps button */}
          <div className="text-center mt-6">
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex"
              id="open-maps-btn"
              aria-label="Abrir ubicación en Google Maps"
            >
              <MapPin className="w-4 h-4" aria-hidden="true" />
              Abrir en Google Maps
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
            <p className="text-brand-text-light text-xs mt-3">
              La dirección exacta será proporcionada al confirmar tu envío.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
