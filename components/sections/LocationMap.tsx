'use client';

import { ExternalLink, MapPin } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function LocationMap() {
  const { t, language } = useLanguage();
  const isEn = language === 'en';

  // Coordenadas exactas de JRS CARGO CR (2W23+2P4, Heredia, San Pablo)
  // Usando ll= sin q= evitamos que Google Maps abra una ventana emergente por defecto
  const mapUrl =
    'https://maps.google.com/maps?ll=9.9999905,-84.0956542&z=16&t=m&hl=es&ie=UTF8&output=embed';

  const googleMapsPlaceUrl =
    'https://www.google.com/maps/place/JRS+CARGO+CR/@9.9999918,-84.0962979,253m/data=!3m2!1e3!4b1!4m6!3m5!1s0x8fa0e50070b2b9c3:0x57e9993aae41eab2!8m2!3d9.9999905!4d-84.0956542!16s%2Fg%2F11zd7mddck?entry=ttu&g_ep=EgoyMDI2MDgwNS4xIKXMDSoASAFQAw%3D%3D';

  return (
    <section className="py-12 lg:py-16 bg-white relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Encabezado compacto */}
        <div data-parallax-header className="text-center mb-8 sm:mb-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white shadow-2xs border border-slate-200/90 text-brand-blue font-bold text-xs sm:text-sm mb-4">
            <MapPin size={15} className="text-brand-red" />
            <span>{isEn ? 'Location' : 'Ubicación'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#0B2737] tracking-tight mb-2">
            {isEn ? (
              <>Find Us in <span className="text-brand-red">Heredia</span></>
            ) : (
              <>Encuéntranos en <span className="text-brand-red">Heredia</span></>
            )}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
            {isEn
              ? 'Strategically located to expedite your parcel processing and dispatch.'
              : 'Ubicados estratégicamente para facilitar el procesamiento de tus envíos.'}
          </p>
        </div>

        {/* Diseño de dos columnas equilibradas: primero dirección en móvil, luego mapa */}
        <div
          data-parallax-content
          className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
        >
          {/* Columna izquierda: Tarjeta de Oficina Central */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-[0_2px_10px_rgba(15,23,42,0.04)] flex flex-col justify-between">
            <div>
              {/* Icono de ubicación con colores de marca (azul marino y coral) */}
              <div className="w-12 h-12 rounded-full bg-brand-red/10 flex items-center justify-center mb-4">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M12 21C16 16.8 19 13.1764 19 9.5C19 5.63401 15.866 2.5 12 2.5C8.13401 2.5 5 5.63401 5 9.5C5 13.1764 8 16.8 12 21Z"
                    stroke="#0B2737"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="9.5" r="3" fill="#EF4444" />
                </svg>
              </div>

              <h3 className="text-xl sm:text-[22px] font-extrabold text-[#0B2737] leading-snug mb-2.5">
                {t.location.officeCR}
              </h3>

              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                2W23+2P4, Heredia, San Pablo
                <br />
                Urb. Nueva Jerusalén
              </p>
            </div>

            <a
              href={googleMapsPlaceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-[1.5px] border-[#0B2737] text-[#0B2737] hover:bg-[#0B2737] hover:text-white font-bold text-sm transition-colors duration-200"
            >
              <span>{t.location.viewOnGoogleMaps}</span>
              <ExternalLink size={16} strokeWidth={2.2} />
            </a>
          </div>

          {/* Columna derecha: Mapa interactivo alineado y con marcador claro */}
          <div className="lg:col-span-8 min-h-[250px] sm:min-h-[280px] rounded-2xl overflow-hidden border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.04)] relative bg-slate-100">
            <iframe
              src={mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 w-full h-full grayscale-[15%] contrast-[1.04]"
              title="Ubicación JRS CARGO en Heredia"
            />

            {/* Marcador claro de ubicación en el centro exacto de las coordenadas (sin bloquear interacción) */}
            <div
              className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10 flex flex-col items-center"
              aria-hidden="true"
            >
              <svg
                width="38"
                height="44"
                viewBox="0 0 38 44"
                fill="none"
                className="drop-shadow-[0_4px_8px_rgba(11,39,55,0.28)]"
              >
                <path
                  d="M19 42C19 42 35 27.6 35 16C35 7.16344 27.8366 0 19 0C10.1634 0 3 7.16344 3 16C3 27.6 19 42 19 42Z"
                  fill="#0B2737"
                />
                <circle cx="19" cy="16" r="6.5" fill="#EF4444" />
              </svg>
              <span className="w-2.5 h-1 rounded-full bg-[#0B2737]/35 -mt-0.5" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
