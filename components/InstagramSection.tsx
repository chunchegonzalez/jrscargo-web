'use client'

import { Instagram, ExternalLink, Grid } from 'lucide-react'
import { INSTAGRAM_URL } from '@/data/rates'

export default function InstagramSection() {
  return (
    <section id="instagram" className="section-padding bg-brand-bg-section">
      <div className="container-max">
        <div className="text-center mb-10">
          {/* Instagram gradient badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-4 text-white text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}
          >
            <Instagram className="w-4 h-4" aria-hidden="true" />
            Instagram
          </div>
          <h2 className="section-title">Síguenos en Instagram</h2>
          <p className="section-subtitle">
            Mantente al tanto de novedades, ofertas y actualizaciones de JRS CARGO.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Instagram card */}
          <div className="card p-8 text-center">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}
            >
              <Instagram className="w-10 h-10 text-white" aria-hidden="true" />
            </div>
            <h3 className="font-bold text-brand-navy text-xl">@jrscargocr</h3>
            <p className="text-brand-text-gray text-sm mt-2 mb-6">
              Noticias, actualizaciones y más desde JRS CARGO Costa Rica
            </p>

            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-pink-300 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}
              id="instagram-follow-btn"
              aria-label="Seguir a JRS CARGO en Instagram"
            >
              <Instagram className="w-5 h-5" aria-hidden="true" />
              Seguir a JRS CARGO
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>

            {/* Placeholder for future Instagram feed */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2 text-brand-text-light text-xs mb-3">
                <Grid className="w-4 h-4" aria-hidden="true" />
                Publicaciones recientes
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <Instagram className="w-6 h-6 text-gray-300" />
                  </div>
                ))}
              </div>
              {/* 
                INTEGRACIÓN FUTURA:
                Para mostrar publicaciones reales de Instagram, utiliza la
                Instagram Basic Display API o una herramienta de embed como
                EmbedSocial, SnapWidget o similar.
                NO exponer tokens de Instagram directamente en el frontend.
                Configurar un endpoint del servidor para obtener las publicaciones
                y pasarlas al componente como props.
              */}
              <p className="text-brand-text-light text-xs mt-3">
                Visita nuestro perfil para ver las publicaciones más recientes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
