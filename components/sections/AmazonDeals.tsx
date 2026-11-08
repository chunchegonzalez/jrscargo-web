'use client';

import { useEffect, useRef } from 'react';
import { ArrowRight, Laptop, Smartphone, Shirt, ShieldCheck, Zap, Tag } from 'lucide-react';
import { FaAmazon } from 'react-icons/fa';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLanguage } from '@/context/LanguageContext';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function AmazonDeals() {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { y: 16, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            ease: 'power2.out',
            clearProps: 'transform',
            scrollTrigger: {
              trigger: headerRef.current,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
          }
        );
      }

      if (cardsGridRef.current) {
        const cards = cardsGridRef.current.querySelectorAll<HTMLElement>('[data-amazon-card]');
        if (cards.length) {
          gsap.fromTo(
            cards,
            { y: 18, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.5,
              stagger: 0.08,
              ease: 'power2.out',
              clearProps: 'transform',
              scrollTrigger: {
                trigger: cardsGridRef.current,
                start: 'top 88%',
                toggleActions: 'play none none none',
              },
            }
          );
        }
      }
    });

    mm.add('(prefers-reduced-motion: reduce)', () => {
      if (headerRef.current) {
        gsap.set(headerRef.current, { clearProps: 'all', opacity: 1, y: 0 });
      }
      if (cardsGridRef.current) {
        const cards = cardsGridRef.current.querySelectorAll<HTMLElement>('[data-amazon-card]');
        gsap.set(cards, { clearProps: 'all', opacity: 1, y: 0 });
      }
    });

    return () => {
      mm.revert();
    };
  }, []);

  const deals = [
    {
      title: isEn ? 'Deals of the Day' : 'Ofertas del día',
      discount: isEn ? 'Up to 50% discount' : 'Hasta 50% de descuento',
      icon: Zap,
      link: 'https://www.amazon.com/deals',
    },
    {
      title: isEn ? 'Electronics' : 'Electrónica',
      discount: isEn ? 'Top trending tech' : 'Lo más buscado',
      icon: Laptop,
      link: 'https://www.amazon.com/b?node=16225009011',
    },
    {
      title: isEn ? 'Smartphones' : 'Celulares',
      discount: isEn ? 'Accessories & gadgets' : 'Accesorios y más',
      icon: Smartphone,
      link: 'https://www.amazon.com/b?node=2335752011',
    },
    {
      title: isEn ? 'Fashion & Apparel' : 'Moda y ropa',
      discount: isEn ? 'Seasonal collections' : 'Tendencias actuales',
      icon: Shirt,
      link: 'https://www.amazon.com/b?node=7141123011',
    },
  ];

  const tickerItems = [
    {
      icon: ShieldCheck,
      text: isEn ? '100% GUARANTEED SHIPMENTS' : 'ENVÍOS 100% GARANTIZADOS',
      highlight: false,
    },
    {
      icon: FaAmazon,
      text: 'AMAZON BUSINESS PARTNER',
      highlight: true,
    },
    {
      icon: ShieldCheck,
      text: isEn ? 'PRIORITY DISPATCH IN MIAMI' : 'DESPACHOS PRIORITARIOS EN MIAMI',
      highlight: false,
    },
    {
      icon: Tag,
      text: isEn ? 'EXCLUSIVE IMPORT RATES' : 'TARIFAS EXCLUSIVAS',
      highlight: false,
    },
    {
      icon: Zap,
      text: isEn ? 'DIRECT CONNECTION TO COSTA RICA' : 'CONEXIÓN DIRECTA A COSTA RICA',
      highlight: false,
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="pb-14 sm:pb-16 bg-[#071724] relative overflow-hidden"
    >
      {/* Franja superior delgada con movimiento dinámico estilo banner */}
      <div className="relative w-full border-y border-white/10 bg-[#05111B] py-2.5 mb-10 sm:mb-12 overflow-hidden z-20">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-[#05111B] to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-[#05111B] to-transparent z-10" />

        <div className="flex select-none">
          <div className="flex items-center whitespace-nowrap shrink-0 animate-gpu-ticker">
            {[...tickerItems, ...tickerItems, ...tickerItems, ...tickerItems].map(
              (item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex items-center">
                    <div className="flex items-center gap-2 px-5 sm:px-7">
                      <Icon
                        size={item.highlight ? 15 : 14}
                        className="text-[#F5B027] shrink-0"
                      />
                      <span
                        className={`text-[11px] sm:text-xs tracking-[0.08em] uppercase ${
                          item.highlight
                            ? 'text-[#F5B027] font-extrabold'
                            : 'text-slate-200 font-semibold'
                        }`}
                      >
                        {item.text}
                      </span>
                    </div>
                    <span className="h-3.5 w-px bg-white/15 shrink-0" aria-hidden="true" />
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Encabezado limpio: distintivo discreto arriba + título/texto y botón en la misma fila */}
        <div ref={headerRef} className="mb-8 sm:mb-10">
          {/* Distintivo discreto de Socio Oficial Amazon Business Partner */}
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
              <FaAmazon size={24} className="text-[#0B1D2B]" />
            </div>
            <span className="h-5 w-px bg-white/20" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-bold text-[#F5B027] tracking-wide">
              {isEn
                ? 'Official Amazon Business Partner'
                : 'Socio Oficial Amazon Business Partner'}
            </span>
          </div>

          {/* Fila con título y descripción a la izquierda, y botón principal dorado a la derecha */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-2">
                {isEn ? 'Exclusive promotions' : 'Promociones exclusivas'}
              </h2>
              <p className="text-slate-300 text-sm sm:text-[15px] max-w-xl leading-relaxed">
                {isEn
                  ? 'Take advantage of daily Amazon savings and ship your purchases directly to Costa Rica quickly and securely with JRS Cargo.'
                  : 'Aprovecha los mejores descuentos de Amazon y trae tus compras a Costa Rica de forma rápida y segura con JRS Cargo.'}
              </p>
            </div>

            <a
              href="https://www.amazon.com/deals"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-2 bg-[#F5B027] hover:bg-[#FF9900] text-[#071724] px-5 py-3 rounded-xl font-extrabold text-sm transition-all duration-200 shadow-sm hover:-translate-y-0.5 shrink-0 self-start md:self-center"
            >
              <span>{isEn ? 'View all deals' : 'Ver todas las ofertas'}</span>
              <ArrowRight
                size={16}
                strokeWidth={2.4}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </a>
          </div>
        </div>

        {/* Cuatro tarjetas del mismo tamaño con fondos azul marino sutiles, bordes finos e iconos coral pequeños */}
        <div
          ref={cardsGridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {deals.map((deal, index) => {
            const Icon = deal.icon;
            return (
              <a
                key={index}
                data-amazon-card
                href={deal.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-[#0D2132]/90 hover:bg-[#122B40] p-5 sm:p-6 rounded-2xl border border-slate-700/75 hover:border-[#F5B027]/50 flex flex-col justify-between min-h-[140px] transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="mb-4 text-[#EF4444] group-hover:scale-105 transition-transform duration-200 origin-left">
                  <Icon size={24} strokeWidth={1.85} />
                </div>

                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white mb-0.5 group-hover:text-[#F5B027] transition-colors">
                    {deal.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300/90 font-medium">
                    {deal.discount}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
