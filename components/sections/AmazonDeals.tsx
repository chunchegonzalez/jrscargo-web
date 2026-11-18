'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Laptop,
  Smartphone,
  Shirt,
  ShieldCheck,
  Zap,
  Tag,
  Calendar,
  Clock,
  Sparkles,
  Package,
} from 'lucide-react';
import { FaAmazon } from 'react-icons/fa';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLanguage } from '@/context/LanguageContext';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

type CountdownState = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  phase: 'pre' | 'early' | 'main' | 'cyber' | 'ended';
  isBlackFridayActive: boolean;
};

function getCostaRicaNow(): Date {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica' })
  );
}

/**
 * Temporada Black Friday activa hasta el 1 de diciembre inclusive (hora Costa Rica).
 * A partir del 2 de diciembre (después del 1 de diciembre), vuelve automáticamente
 * al diseño original de Promociones Exclusivas sin temática de Black Friday.
 */
function checkIsBlackFridaySeason(now: Date): boolean {
  const month = now.getMonth(); // 10 = Noviembre, 11 = Diciembre
  const day = now.getDate();
  return (month === 10 && day >= 10) || (month === 11 && day <= 1);
}

function computeBlackFridayCountdown(): CountdownState {
  const now = getCostaRicaNow();
  const isBlackFridayActive = checkIsBlackFridaySeason(now);
  const year = now.getFullYear();

  // Inicio ofertas anticipadas: 19 de noviembre 00:00:00 CR
  const earlyStart = new Date(year, 10, 19, 0, 0, 0);
  // Evento principal: 27 de noviembre 00:00:00 CR
  const mainEventStart = new Date(year, 10, 27, 0, 0, 0);
  // Fin del evento principal: 27 de noviembre 23:59:59 CR
  const mainEventEnd = new Date(year, 10, 27, 23, 59, 59);
  // Cierre Semana de Ofertas / Cyber Monday: 30 de noviembre 23:59:59 CR
  const cyberEnd = new Date(year, 10, 30, 23, 59, 59);

  let target = mainEventStart;
  let phase: CountdownState['phase'] = 'early';

  if (now < earlyStart) {
    phase = 'pre';
    target = earlyStart;
  } else if (now < mainEventStart) {
    phase = 'early';
    target = mainEventStart;
  } else if (now <= mainEventEnd) {
    phase = 'main';
    target = cyberEnd;
  } else if (now <= cyberEnd) {
    phase = 'cyber';
    target = cyberEnd;
  } else {
    phase = 'ended';
    target = cyberEnd;
  }

  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    days: pad(days),
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds),
    phase,
    isBlackFridayActive,
  };
}

export default function AmazonDeals() {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsGridRef = useRef<HTMLDivElement>(null);

  const [countdown, setCountdown] = useState<CountdownState>(() => ({
    days: '--',
    hours: '--',
    minutes: '--',
    seconds: '--',
    phase: 'pre',
    isBlackFridayActive: checkIsBlackFridaySeason(getCostaRicaNow()),
  }));
  const [selectedStage, setSelectedStage] = useState<number>(0);

  // Actualización en vivo del contador y verificación automática de fecha (hora Costa Rica)
  useEffect(() => {
    const initial = computeBlackFridayCountdown();
    setCountdown(initial);
    if (initial.phase === 'main') setSelectedStage(1);
    else if (initial.phase === 'cyber') setSelectedStage(2);
    else setSelectedStage(0);

    const interval = setInterval(() => {
      setCountdown(computeBlackFridayCountdown());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
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
          if (cards.length) {
            gsap.set(cards, { clearProps: 'all', opacity: 1, y: 0 });
          }
        }
      });

      return () => {
        mm.revert();
      };
    } catch (err) {
      console.warn('GSAP AmazonDeals animation bypassed:', err);
    }
  }, [countdown.isBlackFridayActive]);

  // =========================================================================
  // MODO NORMAL (Automático después del 1 de diciembre — diseño original)
  // =========================================================================
  if (!countdown.isBlackFridayActive) {
    const classicDeals = [
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

    const classicTickerItems = [
      {
        icon: ShieldCheck,
        text: isEn ? '100% GUARANTEED SHIPMENTS' : 'ENVÍOS 100% GARANTIZADOS',
      },
      {
        icon: ShieldCheck,
        text: isEn ? 'PRIORITY DISPATCH IN MIAMI' : 'DESPACHOS PRIORITARIOS EN MIAMI',
      },
      {
        icon: Tag,
        text: isEn ? 'EXCLUSIVE IMPORT RATES' : 'TARIFAS EXCLUSIVAS DE IMPORTACIÓN',
      },
      {
        icon: Zap,
        text: isEn ? 'DIRECT CONNECTION TO COSTA RICA' : 'CONEXIÓN DIRECTA A COSTA RICA',
      },
    ];

    return (
      <section
        ref={sectionRef}
        className="pb-12 lg:pb-16 bg-[#071724] relative overflow-hidden"
      >
        <div className="relative w-full border-y border-white/10 bg-[#05111B] py-2.5 mb-8 sm:mb-10 overflow-hidden z-20">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-[#05111B] to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-[#05111B] to-transparent z-10" />

          <div className="flex select-none overflow-hidden">
            <div className="flex items-center whitespace-nowrap shrink-0 animate-gpu-ticker hover:[animation-play-state:paused]">
              {[
                ...classicTickerItems,
                ...classicTickerItems,
                ...classicTickerItems,
                ...classicTickerItems,
                ...classicTickerItems,
                ...classicTickerItems,
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex items-center">
                    <div className="flex items-center gap-2 px-5 sm:px-8">
                      <Icon size={14} className="text-[#F5B027] shrink-0" />
                      <span className="text-[11px] sm:text-xs tracking-[0.08em] uppercase text-slate-200 font-bold">
                        {item.text}
                      </span>
                    </div>
                    <span className="h-3.5 w-px bg-white/20 shrink-0" aria-hidden="true" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div ref={headerRef} className="mb-8 sm:mb-10">
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

          <div
            ref={cardsGridRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {classicDeals.map((deal, index) => {
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

  // =========================================================================
  // MODO BLACK FRIDAY AMAZON (Del 19 al 30 de noviembre · se apaga > 1 Dic)
  // =========================================================================
  const stages = [
    {
      id: 'early',
      dates: isEn ? 'Nov 19 – 26' : '19 – 26 de Nov',
      title: isEn ? 'Black Friday Week Starts' : 'Inicio Semana Black Friday',
      badge:
        countdown.phase === 'pre'
          ? isEn
            ? 'STARTS NOV 19'
            : 'INICIA 19 NOV'
          : isEn
          ? 'LIVE NOW'
          : 'EN VIVO',
      tip: isEn
        ? 'Amazon Black Friday Week kicks off on November 19 with daily discounts. Ship directly to your JRS Miami locker with fast flights to Costa Rica.'
        : 'La Semana de Black Friday comienza el 19 de noviembre con descuentos diarios. Envía a tu casillero JRS en Miami con despachos rápidos hacia Costa Rica.',
      isActive: countdown.phase === 'pre' || countdown.phase === 'early',
    },
    {
      id: 'main',
      dates: isEn ? 'Nov 27' : '27 de Noviembre',
      title: isEn ? 'Black Friday Main Event' : 'Evento Principal Black Friday',
      badge: isEn ? 'MAIN EVENT' : 'EVENTO PRINCIPAL',
      tip: isEn
        ? 'The biggest savings day of the year on Amazon: tech, smartphones, fashion, and home essentials with exclusive JRS Cargo shipping rates.'
        : 'El evento principal del año en Amazon: tecnología, celulares, hogar y moda con las mejores rebajas y envío seguro con JRS Cargo.',
      isActive: countdown.phase === 'main',
    },
    {
      id: 'cyber',
      dates: isEn ? 'Nov 28 – 30' : '28 – 30 de Nov',
      title: isEn ? 'Closing Deals & Cyber Monday' : 'Cierre en Cyber Monday',
      badge: 'CYBER MONDAY',
      tip: isEn
        ? 'Promotions wrap up on November 30 with Cyber Monday flash drops. Track every package live from Miami to Costa Rica.'
        : 'Las promociones cierran el 30 de noviembre en Cyber Monday. Rastrea cada paquete en tiempo real hasta tu puerta en Costa Rica.',
      isActive: countdown.phase === 'cyber',
    },
  ];

  const deals = [
    {
      title: isEn ? 'Black Friday Deals' : 'Ofertas Black Friday',
      discount: isEn ? 'Up to 60% off Epic Deals' : 'Hasta 60% en Epic Deals',
      badge: 'EPIC DEALS',
      icon: Zap,
      link: 'https://www.amazon.com/deals',
    },
    {
      title: isEn ? 'Electronics & Tech' : 'Electrónica',
      discount: isEn ? 'Laptops, TVs & audio' : 'Laptops, pantallas y audio',
      badge: isEn ? 'TOP PICKS' : 'LO MÁS BUSCADO',
      icon: Laptop,
      link: 'https://www.amazon.com/b?node=16225009011',
    },
    {
      title: isEn ? 'Smartphones & Gear' : 'Celulares',
      discount: isEn ? 'Accessories & gadgets' : 'Accesorios y gadgets',
      badge: isEn ? 'FLASH DROPS' : 'OFERTAS FLASH',
      icon: Smartphone,
      link: 'https://www.amazon.com/b?node=2335752011',
    },
    {
      title: isEn ? 'Fashion & Apparel' : 'Moda y ropa',
      discount: isEn ? 'Black Friday collections' : 'Marcas con súper rebaja',
      badge: 'CYBER MONDAY',
      icon: Shirt,
      link: 'https://www.amazon.com/b?node=7141123011',
    },
  ];

  const tapeSegments = Array.from({ length: 12 });

  const countdownLabel =
    countdown.phase === 'pre'
      ? isEn
        ? 'Black Friday Week starts Nov 19 in:'
        : 'La Semana de Black Friday inicia (19 Nov) en:'
      : countdown.phase === 'early'
      ? isEn
        ? 'Countdown to Black Friday Main Event (Nov 27)'
        : 'Cuenta regresiva al Evento Principal (27 Nov)'
      : countdown.phase === 'main'
      ? isEn
        ? 'Black Friday LIVE · Cyber Monday ends in:'
        : '¡Black Friday EN VIVO! · Cierra Cyber Monday en:'
      : countdown.phase === 'cyber'
      ? isEn
        ? 'Cyber Monday promotions close in:'
        : 'Las promociones cierran en Cyber Monday en:'
      : isEn
      ? 'Final Cyber Monday Deals'
      : 'Últimas horas de Cyber Monday';

  return (
    <section
      ref={sectionRef}
      className="pb-14 lg:pb-20 bg-[#071724] relative overflow-hidden"
    >
      {/* Brillo ambiental sutil naranja Black Friday */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-16 right-[-8%] w-[420px] h-[420px] rounded-full bg-[#FF5500]/15 blur-[110px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-[-6%] w-[320px] h-[320px] rounded-full bg-[#F5B027]/10 blur-[100px]"
      />

      {/* ===================================================================== */}
      {/* BANNER SUPERIOR ESTILO CINTA AMAZON BLACK FRIDAY (Inspirado Imagen 2) */}
      {/* ===================================================================== */}
      <a
        href="https://www.amazon.com/deals"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={isEn ? 'Explore Amazon Black Friday Deals' : 'Ver ofertas de Black Friday en Amazon'}
        className="group relative block w-full overflow-hidden border-y border-black/30 mb-9 sm:mb-12 z-20 cursor-pointer select-none"
      >
        <div className="relative w-full h-[68px] sm:h-[78px] bg-[#FF4D00] overflow-hidden flex items-center">
          {/* Mitad derecha con textura de cartón kraft en ángulo */}
          <div
            aria-hidden="true"
            className="bf-kraft-bg absolute inset-y-0 right-0 w-[56%] sm:w-[52%] shadow-[-12px_0_24px_rgba(0,0,0,0.18)]"
            style={{ clipPath: 'polygon(14% 0, 100% 0, 100% 100%, 0% 100%)' }}
          />

          {/* Cinta blanca cruzada inclinada con "Epic deals" */}
          <div
            aria-hidden="true"
            className="hidden sm:flex flex-col items-center justify-center absolute left-[43%] md:left-[46%] -top-6 -bottom-6 w-20 bg-[#FAF7F2] shadow-md transform -rotate-[16deg] border-x border-black/5 z-10 pointer-events-none"
          >
            <span className="text-[11px] font-black leading-none text-[#131921] tracking-tight">
              Epic
            </span>
            <span className="text-[11px] font-black leading-none text-[#FF4D00] tracking-tight mb-2">
              deals
            </span>
            <span className="text-[11px] font-black leading-none text-[#131921] tracking-tight">
              Epic
            </span>
            <span className="text-[11px] font-black leading-none text-[#FF4D00] tracking-tight">
              deals
            </span>
          </div>

          <div
            aria-hidden="true"
            className="hidden lg:flex flex-col items-center justify-center absolute right-[14%] -top-6 -bottom-6 w-20 bg-[#FAF7F2]/95 shadow-md transform -rotate-[16deg] border-x border-black/5 z-10 pointer-events-none"
          >
            <span className="text-[11px] font-black leading-none text-[#131921] tracking-tight">
              Epic
            </span>
            <span className="text-[11px] font-black leading-none text-[#FF4D00] tracking-tight mb-2">
              deals
            </span>
            <span className="text-[11px] font-black leading-none text-[#131921] tracking-tight">
              Epic
            </span>
            <span className="text-[11px] font-black leading-none text-[#FF4D00] tracking-tight">
              deals
            </span>
          </div>

          {/* Cinta oscura principal con texto "Black Friday" en movimiento continuo */}
          <div className="relative z-20 w-[108%] -ml-[4%] bg-[#16202A] py-2.5 sm:py-3 shadow-[0_6px_22px_rgba(0,0,0,0.35)] border-y border-white/10 transform -rotate-[1.1deg] group-hover:bg-[#101820] transition-colors">
            <div className="flex overflow-hidden">
              <div className="flex items-center whitespace-nowrap shrink-0 animate-bf-tape group-hover:[animation-play-state:paused]">
                {tapeSegments.map((_, idx) => (
                  <div key={idx} className="flex items-center">
                    <span className="text-base sm:text-xl font-black tracking-tight text-white px-4 sm:px-6">
                      Black Friday
                    </span>
                    <span className="inline-flex items-center gap-1 bg-white text-[#131921] text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider">
                      Epic <span className="text-[#FF4D00]">deals</span>
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold tracking-wide text-[#FACC15] px-4 sm:px-6 uppercase">
                      {idx % 2 === 0
                        ? isEn
                          ? 'NOV 19 – 30 · MAIN EVENT NOV 27'
                          : '19 – 30 NOV · EVENTO PRINCIPAL 27 NOV'
                        : isEn
                        ? 'CLOSING ON CYBER MONDAY · NOV 30'
                        : 'CIERRE EN CYBER MONDAY · 30 NOV'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </a>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Encabezado principal + Contador en vivo */}
        <div ref={headerRef} className="mb-8 sm:mb-10">
          {/* Fila superior: Socio Oficial + Pill en vivo Black Friday */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="inline-flex items-center gap-3">
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

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF4D00]/20 border border-[#FF5500]/50 text-[#FFB380] text-[11px] font-extrabold uppercase tracking-wider relative">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5500] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF5500]" />
              </span>
              <span>{isEn ? 'Black Friday · Nov 19 – 30' : 'Black Friday · 19 al 30 Nov'}</span>
            </span>
          </div>

          {/* Grid encabezado: Título/descripción a la izquierda + Contador a la derecha */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mb-2.5 leading-tight">
                {isEn ? (
                  <>
                    Amazon{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6200] via-[#FF9900] to-[#FACC15]">
                      Black Friday
                    </span>{' '}
                    &amp; Cyber Monday
                  </>
                ) : (
                  <>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6200] via-[#FF9900] to-[#FACC15]">
                      Black Friday
                    </span>{' '}
                    y Cyber Monday en Amazon
                  </>
                )}
              </h2>
              <p className="text-slate-300 text-sm sm:text-[15px] max-w-xl leading-relaxed mb-5">
                {isEn
                  ? 'From November 19 to 30, enjoy Amazon deals. The main event will be on November 27, and promotions close on Cyber Monday. Ship your purchases to Costa Rica fast and safely with JRS Cargo.'
                  : 'Del 19 al 30 de noviembre, disfruta las ofertas de Amazon. El evento principal será el 27 de noviembre, y las promociones cerrarán en Cyber Monday. Trae tus compras a Costa Rica rápido y seguro con JRS Cargo.'}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="https://www.amazon.com/deals"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF5500] to-[#FF9900] hover:from-[#FF6A1A] hover:to-[#FFAA1D] text-white px-5 py-3 rounded-xl font-extrabold text-sm transition-all duration-200 shadow-lg shadow-[#FF5500]/25 hover:-translate-y-0.5"
                >
                  <Sparkles size={16} className="shrink-0" />
                  <span>{isEn ? 'Shop Black Friday Deals' : 'Ver ofertas Black Friday'}</span>
                  <ArrowRight
                    size={16}
                    strokeWidth={2.4}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </a>

                <a
                  href="https://worldboxcr.com/jrscargo/register"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/15 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200"
                >
                  <Package size={16} className="text-[#F5B027] shrink-0" />
                  <span>{isEn ? 'Free Miami Locker' : 'Abrir casillero gratis'}</span>
                </a>
              </div>
            </div>

            {/* Tarjeta de Cuenta Regresiva Dinámica */}
            <div className="lg:col-span-5">
              <div className="bg-[#0D2132]/95 border border-[#FF5500]/35 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
                <div
                  aria-hidden="true"
                  className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF4D00] via-[#FF9900] to-[#FACC15]"
                />
                <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-[#FFB380] uppercase tracking-wider mb-3">
                  <Clock size={14} className="text-[#FF6200] shrink-0" />
                  <span>{countdownLabel}</span>
                </div>

                {countdown.phase !== 'ended' ? (
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { val: countdown.days, lbl: isEn ? 'Days' : 'Días' },
                      { val: countdown.hours, lbl: isEn ? 'Hrs' : 'Hrs' },
                      { val: countdown.minutes, lbl: isEn ? 'Min' : 'Min' },
                      { val: countdown.seconds, lbl: isEn ? 'Sec' : 'Seg' },
                    ].map((unit, i) => (
                      <div
                        key={i}
                        className="bg-[#071724] border border-white/10 rounded-xl py-2.5 px-1"
                      >
                        <div className="text-xl sm:text-2xl font-black text-white tabular-nums leading-none">
                          {unit.val}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                          {unit.lbl}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-bold text-white">
                    {isEn
                      ? 'Last hours of Cyber Monday deals on Amazon!'
                      : '¡Últimas horas de ofertas de Cyber Monday en Amazon!'}
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <Calendar size={13} className="text-[#F5B027]" />
                    {isEn ? 'Nov 19 – Nov 30' : '19 Nov – 30 Nov'}
                  </span>
                  <span className="font-bold text-[#F5B027]">
                    {isEn ? 'Main Event: Nov 27' : 'Principal: 27 Nov'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* =============================================================== */}
          {/* LÍNEA DE TIEMPO INTERACTIVA (3 FASES DEL BLACK FRIDAY AMAZON)   */}
          {/* =============================================================== */}
          <div className="mt-7 bg-[#0A1C2B]/90 border border-slate-700/60 rounded-2xl p-3 sm:p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {stages.map((stage, idx) => {
                const isSelected = selectedStage === idx;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setSelectedStage(idx)}
                    className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#122B40] border-[#FF6200]/70 shadow-md'
                        : 'bg-[#071724]/60 border-white/5 hover:border-white/15 hover:bg-[#0D2132]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-extrabold text-[#F5B027]">
                        {stage.dates}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          stage.isActive
                            ? 'bg-[#FF5500] text-white'
                            : isSelected
                            ? 'bg-[#F5B027]/20 text-[#F5B027]'
                            : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {stage.badge}
                      </span>
                    </div>
                    <p className="text-sm font-extrabold text-white leading-snug">
                      {stage.title}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 px-2 flex items-start gap-2 text-xs sm:text-[13px] text-slate-300 leading-relaxed">
              <Tag size={14} className="text-[#FF6200] shrink-0 mt-0.5" />
              <span>{stages[selectedStage]?.tip}</span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* CUATRO TARJETAS DE CATEGORÍAS AMAZON BLACK FRIDAY                 */}
        {/* ================================================================= */}
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
                className="group relative bg-[#0D2132]/90 hover:bg-[#122B40] p-5 sm:p-6 rounded-2xl border border-slate-700/75 hover:border-[#FF6200]/70 flex flex-col justify-between min-h-[152px] transition-all duration-200 hover:-translate-y-1 overflow-hidden"
              >
                <div
                  aria-hidden="true"
                  className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#FF5500]/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                />
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#FF5500]/15 border border-[#FF5500]/30 text-[#FF6200] flex items-center justify-center group-hover:bg-[#FF5500] group-hover:text-white transition-colors duration-200">
                    <Icon size={20} strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-[#F5B027] group-hover:bg-[#FF5500]/20 group-hover:text-[#FFB380] transition-colors">
                    {deal.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white mb-0.5 group-hover:text-[#F5B027] transition-colors flex items-center justify-between gap-1">
                    <span>{deal.title}</span>
                    <ArrowRight
                      size={15}
                      className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 text-[#FF9900] transition-all shrink-0"
                    />
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
