'use client';

import { rates } from '@/data/rates';
import { Plane, Ship } from 'lucide-react';

const ratesData = [
  {
    id: 'usa-air',
    origin: 'Estados Unidos',
    shortOrigin: 'EE. UU.',
    service: 'Aéreo',
    price: rates.usaAir,
    unit: 'libra',
    icon: Plane,
    flagUrl: 'https://flagcdn.com/us.svg',
    note: 'Vuelos diarios desde Miami. Entregas de 3 a 5 días hábiles. Ideal para paquetería rápida.',
  },
  {
    id: 'usa-sea',
    origin: 'Estados Unidos',
    shortOrigin: 'EE. UU.',
    service: 'Marítimo',
    price: rates.usaSea,
    unit: 'pie cúbico',
    icon: Ship,
    flagUrl: 'https://flagcdn.com/us.svg',
    note: [
      'Importante: No se pueden enviar cargamentos que requieran permisos especiales.',
      'Se debe adjuntar la factura de cada producto enviado marítimo para la declaración de aduanas.'
    ],
  },
  {
    id: 'spain-air',
    origin: 'España',
    shortOrigin: 'ESPAÑA',
    service: 'Aéreo',
    price: rates.spainAir,
    unit: 'libra',
    icon: Plane,
    flagUrl: 'https://flagcdn.com/es.svg',
    note: 'Tu puerta de entrada a Europa. Consolidamos tus compras europeas con salidas semanales.',
  },
  {
    id: 'china-air',
    origin: 'China',
    shortOrigin: 'CHINA',
    service: 'Aéreo',
    price: rates.chinaAir,
    unit: 'libra',
    icon: Plane,
    flagUrl: 'https://flagcdn.com/cn.svg',
    note: 'Ideal para Shein, AliExpress y tecnología. Tránsito estimado de 12 a 15 días hábiles.',
  },
];

export default function Rates() {
  return (
    <section id="tarifas" className="section-padding bg-white relative">
      <div className="container-max text-center mb-16">
        <h2 className="section-title">Tarifas simples y transparentes</h2>
        <p className="section-subtitle max-w-2xl mx-auto">
          Sin costos ocultos ni sorpresas. Conoce exactamente cuánto pagarás por traer tus compras al país.
        </p>
      </div>

      <div className="container-max">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ratesData.map((rate) => {
            const Icon = rate.icon;
            return (
              <div 
                key={rate.id} 
                className="bg-white rounded-2xl shadow-card hover:shadow-lg border border-gray-50 border-b-4 border-b-brand-blue p-6 flex flex-col group cursor-pointer transition-all hover:-translate-y-1"
                onClick={() => {
                  const originMap: Record<string, string> = { 'Estados Unidos': 'USA', 'España': 'Spain', 'China': 'China' };
                  const serviceMap: Record<string, string> = { 'Aéreo': 'Air', 'Marítimo': 'Sea' };
                  window.dispatchEvent(new CustomEvent('setQuoteCalculator', {
                    detail: { 
                      origin: originMap[rate.origin], 
                      service: serviceMap[rate.service] 
                    }
                  }));
                  document.getElementById('cotizador')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <div className="flex gap-5">
                  {/* Left Column */}
                  <div className="flex flex-col items-center justify-between shrink-0">
                    <div className="w-14 h-14 rounded-full overflow-hidden shadow-sm border-2 border-white ring-1 ring-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={rate.flagUrl} 
                        alt={`Bandera de ${rate.origin}`} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="mt-6 text-brand-blue group-hover:scale-110 transition-transform">
                      <Icon size={24} strokeWidth={2.5} />
                    </div>
                  </div>
                  
                  {/* Right Column */}
                  <div className="flex flex-col">
                    <p className="text-[11px] sm:text-xs font-bold text-brand-blue tracking-wide uppercase mb-2">
                      {rate.shortOrigin} &ndash; {rate.service}
                    </p>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-lg sm:text-xl font-bold text-brand-blue">US$</span>
                      <span className="text-4xl sm:text-5xl font-black text-brand-blue tracking-tight leading-none">
                        {rate.price}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-brand-text-gray/80 font-medium">
                      por {rate.unit}
                    </p>
                  </div>
                </div>

                {rate.note && (
                  <div className="mt-4 pt-4 border-t border-gray-100 text-[11px] text-brand-text-gray/70 leading-relaxed">
                    {Array.isArray(rate.note) ? (
                      <ul className="list-disc pl-3 space-y-1">
                        {rate.note.map((n, i) => (
                          <li key={i}>{n}</li>
                        ))}
                      </ul>
                    ) : (
                      rate.note
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-sm text-brand-text-light bg-brand-bg-light inline-block px-6 py-3 rounded-xl">
            Las cotizaciones mostradas son estimaciones basadas en las tarifas publicadas. Para mercancía especial o condiciones particulares, consulta con un asesor.
          </p>
        </div>
      </div>
    </section>
  );
}
