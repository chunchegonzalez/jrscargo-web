'use client';

import { useState, useEffect, useRef } from 'react';
import { rates } from '@/data/rates';
import { Plane, Ship, Calculator, ArrowRight, Info, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

type FilterType = 'all' | 'air' | 'sea';

export default function Rates() {
  const { t, language } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  const ratesData = [
    {
      id: 'usa-air',
      origin: t.rates.usaAirTitle,
      shortOrigin: language === 'en' ? 'USA' : 'EE. UU.',
      service: language === 'en' ? 'AÉREO' : 'AÉREO',
      serviceType: 'air' as const,
      price: rates.usaAir,
      unit: t.rates.perLb,
      icon: Plane,
      flagUrl: 'https://flagcdn.com/us.svg',
      flagAlt: 'Bandera de Estados Unidos',
      note: t.rates.usaAirNote,
      calcOrigin: 'USA' as const,
      calcService: 'Air' as const,
      isHighlighted: true,
    },
    {
      id: 'usa-sea',
      origin: t.rates.usaSeaTitle,
      shortOrigin: language === 'en' ? 'USA' : 'EE. UU.',
      service: language === 'en' ? 'MARÍTIMO' : 'MARÍTIMO',
      serviceType: 'sea' as const,
      price: rates.usaSea,
      unit: t.rates.perFt3,
      icon: Ship,
      flagUrl: 'https://flagcdn.com/us.svg',
      flagAlt: 'Bandera de Estados Unidos',
      note: t.rates.usaSeaNotes,
      calcOrigin: 'USA' as const,
      calcService: 'Sea' as const,
      isHighlighted: false,
    },
    {
      id: 'spain-air',
      origin: t.rates.spainAirTitle,
      shortOrigin: language === 'en' ? 'SPAIN' : 'ESPAÑA',
      service: language === 'en' ? 'AÉREO' : 'AÉREO',
      serviceType: 'air' as const,
      price: rates.spainAir,
      unit: t.rates.perLb,
      icon: Plane,
      flagUrl: 'https://flagcdn.com/es.svg',
      flagAlt: 'Bandera de España',
      note: t.rates.spainAirNote,
      calcOrigin: 'Spain' as const,
      calcService: 'Air' as const,
      isHighlighted: false,
    },
    {
      id: 'china-air',
      origin: t.rates.chinaAirTitle,
      shortOrigin: 'CHINA',
      service: language === 'en' ? 'AÉREO' : 'AÉREO',
      serviceType: 'air' as const,
      price: rates.chinaAir,
      unit: t.rates.perLb,
      icon: Plane,
      flagUrl: 'https://flagcdn.com/cn.svg',
      flagAlt: 'Bandera de China',
      note: t.rates.chinaAirNote,
      calcOrigin: 'China' as const,
      calcService: 'Air' as const,
      isHighlighted: false,
    },
  ];

  const filteredRates = ratesData.filter((rate) => {
    if (activeFilter === 'air') return rate.serviceType === 'air';
    if (activeFilter === 'sea') return rate.serviceType === 'sea';
    return true;
  });

  const handleSelectRate = (calcOrigin: 'USA' | 'Spain' | 'China', calcService: 'Air' | 'Sea') => {
    window.dispatchEvent(
      new CustomEvent('setQuoteCalculator', {
        detail: {
          origin: calcOrigin,
          service: calcService,
        },
      })
    );
    document.getElementById('cotizador')?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (cardsContainerRef.current) {
        const items = cardsContainerRef.current.querySelectorAll('[data-rate-card]');
        gsap.fromTo(
          items,
          { y: 16, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.45,
            stagger: 0.07,
            ease: 'power2.out',
            clearProps: 'transform',
            scrollTrigger: {
              trigger: cardsContainerRef.current,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
          }
        );
      }
    });

    mm.add('(prefers-reduced-motion: reduce)', () => {
      if (cardsContainerRef.current) {
        const items = cardsContainerRef.current.querySelectorAll('[data-rate-card]');
        gsap.set(items, { clearProps: 'all', opacity: 1, y: 0 });
      }
    });

    return () => {
      mm.revert();
    };
  }, [activeFilter]);

  return (
    <section id="tarifas" className="py-14 lg:py-20 bg-white relative overflow-hidden">
      <div className="container-max px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Encabezado */}
        <div data-parallax-header className="text-center mb-8 sm:mb-10 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-[#0B2737] tracking-tight">
            {t.rates.title}
          </h2>
          <p className="text-sm sm:text-[15px] text-slate-600 mt-2 leading-relaxed">
            {t.rates.subtitle}
          </p>
        </div>

        {/* Filtros: Todos | Aéreo | Marítimo */}
        <div className="flex justify-center mb-10 sm:mb-12">
          <div className="inline-flex items-center p-1 sm:p-1.5 rounded-full bg-white border border-slate-200/90 shadow-2xs">
            {/* Todos */}
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-brand-red text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0B2737]'
              }`}
            >
              {language === 'en' ? 'All' : 'Todos'}
            </button>

            <span className="h-4 w-px bg-slate-200 mx-1" aria-hidden="true" />

            {/* Aéreo */}
            <button
              type="button"
              onClick={() => setActiveFilter('air')}
              className={`inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeFilter === 'air'
                  ? 'bg-brand-red text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0B2737]'
              }`}
            >
              <Plane size={14} className="shrink-0" />
              <span>{language === 'en' ? 'Air' : 'Aéreo'}</span>
            </button>

            <span className="h-4 w-px bg-slate-200 mx-1" aria-hidden="true" />

            {/* Marítimo */}
            <button
              type="button"
              onClick={() => setActiveFilter('sea')}
              className={`inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeFilter === 'sea'
                  ? 'bg-brand-red text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0B2737]'
              }`}
            >
              <Ship size={14} className="shrink-0" />
              <span>{language === 'en' ? 'Ocean' : 'Marítimo'}</span>
            </button>
          </div>
        </div>

        {/* Contenedor relativo de las tarjetas con conectores */}
        <div className="relative">
          {/* Línea horizontal de conexión con nodos en escritorio cuando se muestran todas las tarifas */}
          {activeFilter === 'all' && (
            <div
              aria-hidden="true"
              className="hidden lg:block absolute top-[110px] left-[10%] right-[10%] pointer-events-none z-0"
            >
              <div className="relative w-full border-t border-slate-200/90">
                {/* Nodos circulares conectores entre tarjetas */}
                <span className="absolute left-[28.5%] top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-300" />
                <span className="absolute left-[50%] top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-300" />
                <span className="absolute left-[71.5%] top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-300" />
              </div>
            </div>
          )}

          {/* Grilla de tarjetas */}
          <div
            ref={cardsContainerRef}
            className={`relative z-10 ${
              activeFilter === 'all'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6'
                : activeFilter === 'air'
                ? 'grid grid-cols-1 sm:grid-cols-3 max-w-5xl mx-auto gap-5 sm:gap-6'
                : 'max-w-md mx-auto'
            }`}
          >
            {filteredRates.map((rate) => {
              const Icon = rate.icon;
              return (
                <div
                  key={rate.id}
                  data-rate-card
                  onClick={() => handleSelectRate(rate.calcOrigin, rate.calcService)}
                  className={`bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col justify-between relative cursor-pointer transition-all duration-200 group shadow-xs hover:shadow-lg hover:-translate-y-1 ${
                    rate.isHighlighted
                      ? 'border-2 border-brand-red shadow-[0_4px_16px_rgba(253,78,100,0.1)]'
                      : 'border border-slate-200/90 hover:border-brand-red/60'
                  }`}
                >
                  <div>
                    {/* Encabezado de la tarjeta: Bandera + País/Servicio */}
                    <div className="flex items-center gap-2 mb-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={rate.flagUrl}
                        alt={rate.flagAlt}
                        className="w-6 h-4 object-cover rounded-[3px] border border-slate-200/80 shadow-2xs shrink-0"
                      />
                      <h3 className="text-xs sm:text-sm font-extrabold text-[#0B2737] tracking-wider uppercase">
                        {rate.shortOrigin} &ndash; {rate.service}
                      </h3>
                    </div>

                    {/* Fila de Icono e Importe */}
                    <div className="flex items-center gap-4 mb-4">
                      {/* Contenedor del icono */}
                      <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-[#12435e] group-hover:bg-blue-50/60 group-hover:text-brand-blue group-hover:border-blue-200 transition-colors shrink-0">
                        <Icon size={24} strokeWidth={2.2} />
                      </div>

                      {/* Bloque de precio y unidad */}
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base sm:text-lg font-bold text-[#0B2737]">US$</span>
                          <span className="text-4xl sm:text-[44px] font-black text-[#0B2737] tracking-tight leading-none">
                            {rate.price}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          {rate.unit}
                        </p>
                      </div>
                    </div>

                    {/* Descripción / Notas */}
                    <div className="text-xs sm:text-[13px] text-slate-600 leading-relaxed min-h-[70px] sm:min-h-[82px] mb-3">
                      {Array.isArray(rate.note) ? (
                        <ul className="space-y-1.5">
                          {rate.note.map((n, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-slate-400 mt-0.5">•</span>
                              <span>{n}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>{rate.note}</p>
                      )}
                    </div>
                  </div>

                  {/* Flecha discreta coral inferior */}
                  <div className="flex justify-end pt-1">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-brand-red group-hover:translate-x-1 transition-transform">
                      <ChevronRight size={18} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Botón principal "Calcular mi envío" */}
        <div className="mt-10 sm:mt-12 text-center">
          <button
            type="button"
            onClick={() => {
              document.getElementById('cotizador')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn-accent inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-bold text-white shadow-[0_8px_20px_rgba(253,78,100,0.35)] hover:shadow-[0_10px_25px_rgba(253,78,100,0.45)] hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer text-sm sm:text-base"
          >
            <Calculator size={19} className="shrink-0" />
            <span>{t.rates.calculateNow}</span>
            <ArrowRight size={17} className="shrink-0" />
          </button>
        </div>

        {/* Caja de aviso y condiciones */}
        <div className="mt-8 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:px-6 max-w-4xl mx-auto flex items-start gap-3 text-left">
          <Info size={20} className="text-slate-500 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {language === 'en'
              ? 'Quotes displayed are estimates based on published rates. Branch pickup or home delivery available (home delivery has an additional cost). For special cargo or specific terms, please consult with an advisor.'
              : 'Las cotizaciones mostradas son estimaciones basadas en las tarifas publicadas. Contamos con retiro en sucursal o entrega a domicilio (la entrega a domicilio tiene un costo adicional). Para mercancía especial o condiciones particulares, consulta con un asesor.'}
          </p>
        </div>
      </div>
    </section>
  );
}
