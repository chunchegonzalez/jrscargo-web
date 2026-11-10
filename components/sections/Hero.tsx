'use client';

import { useEffect, useRef } from 'react';
import { ArrowRight, Calculator, Plane, Container, Ship } from 'lucide-react';
import { FaStar, FaWhatsapp } from 'react-icons/fa';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLanguage } from '@/context/LanguageContext';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}
import { useHalloween } from '@/components/ui/HalloweenProvider';
import { HalloweenHeroBackground } from '@/components/ui/HalloweenHeroDecorations';
import {
  HalloweenMiniPumpkin,
  HalloweenWitchHat,
  HalloweenAnimatedSkull,
  HalloweenSkeletonHand,
  HalloweenDancingSkeleton,
  HalloweenFloatingBone,
} from '@/components/ui/HalloweenIcons';

function SpookyAnimatedWords({
  text,
  baseDelay = 0,
  isGradient = false,
}: {
  text: string;
  baseDelay?: number;
  isGradient?: boolean;
}) {
  const words = text.split(' ');
  let charIndex = 0;

  return (
    <span className="inline">
      {words.map((word, wIdx) => (
        <span key={wIdx} className="inline-block whitespace-nowrap mr-[0.26em] last:mr-0">
          {Array.from(word).map((ch, cIdx) => {
            const idx = charIndex++;
            const delaySec = (baseDelay + idx * 0.09).toFixed(2);
            return (
              <span
                key={cIdx}
                style={{
                  animationDelay: `${delaySec}s`,
                  textShadow: isGradient ? undefined : '0 3px 0 rgba(147, 51, 234, 0.14)',
                }}
                className={`spooky-letter ${
                  idx % 2 === 0 ? 'spooky-letter-even' : 'spooky-letter-odd'
                } cursor-default ${
                  isGradient
                    ? 'text-transparent bg-clip-text bg-gradient-to-b from-[#FF5500] via-[#E11D48] to-[#7E22CE]'
                    : 'text-brand-blue'
                }`}
              >
                {ch}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}

export default function Hero() {
  const { t } = useLanguage();
  const { isHalloween } = useHalloween();

  const heroRef = useRef<HTMLElement>(null);
  const bgLayerRef = useRef<HTMLDivElement>(null);
  const midLayerRef = useRef<HTMLDivElement>(null);
  const fgLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      gsap.registerPlugin(ScrollTrigger);

      const mm = gsap.matchMedia();

      // Escritorio: Parallax multicapa sutil (Fondo/Mapa -> Avión y Ruta -> Paquete/Hub en Primer Plano)
      mm.add(
        '(min-width: 1024px) and (prefers-reduced-motion: no-preference)',
        () => {
          if (!heroRef.current) return;

          // Capa 1 (Fondo / Mapa y Anillos Radar): velocidad mayor hacia abajo para sensación de profundidad
          if (bgLayerRef.current) {
            gsap.to(bgLayerRef.current, {
              y: 68,
              scale: 1.03,
              ease: 'none',
              force3D: true,
              scrollTrigger: {
                trigger: heroRef.current,
                start: 'top top',
                end: 'bottom top',
                scrub: 0.85,
              },
            });
          }

          // Capa 2 (Aviones y Rutas Aéreas / Marítimas): velocidad intermedia con leve desplazamiento diagonal
          if (midLayerRef.current) {
            gsap.to(midLayerRef.current, {
              y: -48,
              x: 12,
              ease: 'none',
              force3D: true,
              scrollTrigger: {
                trigger: heroRef.current,
                start: 'top top',
                end: 'bottom top',
                scrub: 0.65,
              },
            });
          }

          // Capa 3 (Primer plano: Hub Central, Paquete Prioritario y Tarjetas de Servicio): movimiento más lento y estable
          if (fgLayerRef.current) {
            gsap.to(fgLayerRef.current, {
              y: -22,
              ease: 'none',
              force3D: true,
              scrollTrigger: {
                trigger: heroRef.current,
                start: 'top top',
                end: 'bottom top',
                scrub: 0.5,
              },
            });
          }
        }
      );

      // Móvil y preferencia de reducir movimiento: mantener todo completamente estable
      mm.add('(max-width: 1023px), (prefers-reduced-motion: reduce)', () => {
        const targets = [bgLayerRef.current, midLayerRef.current, fgLayerRef.current].filter(
          (el): el is HTMLDivElement => el !== null
        );
        if (targets.length) {
          gsap.set(targets, {
            clearProps: 'all',
          });
        }
      });

      return () => {
        mm.revert();
      };
    } catch (err) {
      console.warn('GSAP Hero animation bypassed:', err);
    }
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative pt-20 pb-20 lg:pt-32 lg:pb-28 overflow-hidden bg-white"
    >
      {/* Halloween Dynamic Background Layer */}
      <HalloweenHeroBackground />

      <div className="container-max relative z-10 px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* Content */}
          <div className="max-w-2xl">
            {isHalloween && (
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#1E1B4B] via-[#311042] to-[#1E1B4B] text-white text-xs sm:text-sm font-extrabold mb-5 shadow-[0_8px_25px_-4px_rgba(249,115,22,0.4)] border border-orange-400/40">
                <HalloweenMiniPumpkin size={18} className="animate-bounce" />
                <span className="bg-gradient-to-r from-amber-200 via-orange-300 to-amber-200 bg-clip-text text-transparent">
                  Halloween Edition • Tus envíos llegan volando sin sustos
                </span>
              </div>
            )}

            {isHalloween ? (
              <div className="relative mb-7 pt-3">
                {/* 1. Crawling Skeleton Hand gripping top of "Tus compras" */}
                <div
                  className="absolute -top-6 left-[34%] sm:left-[40%] z-20 pointer-events-none"
                  style={{
                    willChange: 'transform',
                    animation: 'gpu-hand-crawl 4.2s ease-in-out infinite',
                  }}
                >
                  <HalloweenSkeletonHand size={50} />
                </div>

                {/* 2. Floating Bone spinning near top-right of headline */}
                <div
                  className="hidden sm:block absolute top-1 -right-2 lg:right-4 z-20 pointer-events-none"
                  style={{
                    willChange: 'transform',
                    animation: 'gpu-bone-spin 3.8s ease-in-out infinite',
                  }}
                >
                  <HalloweenFloatingBone size={32} />
                </div>

                {/* 3. Chattering Animated Skull perched on "más cerca de" */}
                <div
                  className="absolute top-[46%] -left-4 sm:-left-7 z-20 pointer-events-none"
                  style={{
                    willChange: 'transform',
                    animation: 'gpu-skull-bob 2.8s ease-in-out infinite',
                  }}
                >
                  <HalloweenAnimatedSkull size={42} />
                </div>

                {/* 4. Full Articulated Dancing Skeleton swinging next to "Costa Rica." */}
                <div
                  className="absolute -bottom-3 right-2 sm:right-10 lg:right-14 z-20 pointer-events-none"
                  style={{
                    willChange: 'transform',
                    animation: 'gpu-skeleton-dance 2.6s ease-in-out infinite',
                  }}
                >
                  <HalloweenDancingSkeleton size={58} />
                </div>

                <h1 className="text-[2.5rem] sm:text-5xl lg:text-[4.5rem] font-black leading-[1.12] tracking-tight relative z-10 select-none">
                  <SpookyAnimatedWords text={t.hero.titleLine1} baseDelay={0} />
                  <br className="hidden lg:block" />{' '}
                  <span className="relative inline-block">
                    <SpookyAnimatedWords text={t.hero.titleHighlight} baseDelay={0.6} isGradient />
                    {/* Animated Spooky Melting Drips under "más cerca de" */}
                    <svg
                      viewBox="0 0 320 22"
                      fill="none"
                      className="w-full h-3.5 sm:h-4 -mt-1.5 pointer-events-none opacity-85"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M4 0 H316 C310 4, 304 16, 300 16 C296 16, 292 3, 280 3 C265 3, 262 19, 257 19 C252 19, 249 3, 230 3 C212 3, 208 13, 204 13 C200 13, 196 3, 175 3 C158 3, 154 21, 149 21 C144 21, 140 3, 118 3 C102 3, 98 15, 93 15 C88 15, 84 3, 62 3 C45 3, 41 18, 36 18 C31 18, 27 3, 12 3 Z"
                        fill="url(#spookyDripGrad)"
                      />
                      <defs>
                        <linearGradient
                          id="spookyDripGrad"
                          x1="0"
                          y1="0"
                          x2="320"
                          y2="0"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop offset="0%" stopColor="#FF5500" />
                          <stop offset="50%" stopColor="#E11D48" />
                          <stop offset="100%" stopColor="#7E22CE" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </span>{' '}
                  <br className="hidden lg:block" />
                  <SpookyAnimatedWords text={t.hero.titleLine2} baseDelay={1.2} />
                </h1>
              </div>
            ) : (
              <h1 className="text-[2.5rem] sm:text-5xl lg:text-[4.5rem] font-black text-brand-blue leading-[1.1] mb-6 text-balance tracking-tight">
                {t.hero.titleLine1} <br className="hidden lg:block" />
                <span className="text-brand-red">{t.hero.titleHighlight}</span>{' '}
                <br className="hidden lg:block" />
                {t.hero.titleLine2}
              </h1>
            )}

            <div className="flex items-center gap-2 mb-6">
              <div className="flex text-brand-red">
                {[...Array(5)].map((_, i) => (
                  <FaStar key={i} size={20} />
                ))}
              </div>
              <span className="text-sm font-semibold text-brand-text-gray ml-2">
                {t.hero.deliveries}
              </span>
            </div>

            <p className="text-lg sm:text-xl text-brand-text-gray mb-10 text-balance leading-relaxed">
              {t.hero.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <a
                href="https://worldboxcr.com/jrscargo/register"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary py-4 px-8 text-base shadow-xl shadow-brand-blue/20"
              >
                {t.hero.openLocker}
                <ArrowRight size={20} />
              </a>
              <a
                href="#cotizador"
                className="btn-white border-2 border-gray-200 py-4 px-8 text-base hover:border-brand-blue/30"
              >
                <Calculator size={20} className="text-brand-blue" />
                {t.hero.quoteShipment}
              </a>
            </div>

            {/* Brands */}
            <div className="flex flex-wrap items-center gap-6 sm:gap-10 mb-10 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
              <span className="font-bold text-2xl tracking-tight">Amazon</span>
              <span className="font-bold text-2xl tracking-tight">eBay</span>
              <span className="font-bold text-xl">AliExpress</span>
              <span className="font-black text-2xl tracking-widest uppercase">SHEIN</span>
            </div>

            <div className="flex items-center flex-wrap gap-2 text-sm font-bold text-brand-text-gray">
              <span>{t.hero.doubts}</span>
              <a
                href="https://wa.me/50672601238"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-text-gray hover:text-[#25D366] flex items-center gap-2 transition-colors group bg-white/60 px-4 py-2 rounded-full border border-gray-200 shadow-sm"
              >
                <FaWhatsapp
                  size={20}
                  className="text-[#25D366] group-hover:scale-110 transition-transform"
                />
                {t.hero.whatsappBtn}
              </a>
            </div>
          </div>

          {/* Visual/Image (3-Layer GSAP ScrollTrigger Parallax + GPU-Composited Animations) */}
          <div className="relative lg:h-[600px] hidden lg:block">
            <div className="absolute inset-0 bg-slate-50/60 rounded-[3rem] border border-slate-200/80 shadow-[0_10px_30px_rgb(0,0,0,0.03)] overflow-hidden flex items-center justify-center">
              {/* CAPA 1 (Fondo): Mapa logístico sutil y Anillos Radar */}
              <div
                ref={bgLayerRef}
                data-parallax-layer="bg"
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                {/* Retícula cartográfica / mapa mundial sutil de fondo */}
                <svg
                  className="absolute inset-0 w-full h-full opacity-[0.055]"
                  viewBox="0 0 600 600"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M60 150 Q 180 110, 300 150 T 540 150 M40 300 Q 190 260, 300 300 T 560 300 M60 450 Q 180 410, 300 450 T 540 450"
                    stroke="#0B2737"
                    strokeWidth="1.2"
                    strokeDasharray="4 6"
                  />
                  <path
                    d="M150 60 Q 190 180, 150 300 T 150 540 M300 40 L 300 560 M450 60 Q 410 180, 450 300 T 450 540"
                    stroke="#0B2737"
                    strokeWidth="1.2"
                    strokeDasharray="4 6"
                  />
                  <circle cx="485" cy="125" r="5" fill="#12435e" />
                  <circle cx="110" cy="145" r="5" fill="#12435e" />
                  <circle cx="115" cy="455" r="5" fill="#EF4444" />
                  <circle cx="300" cy="300" r="8" stroke="#EF4444" strokeWidth="2" />
                </svg>

                {/* Radar Rings - Rotating via GPU CSS */}
                <div
                  className="absolute w-[800px] h-[800px] rounded-full border-[1.5px] border-dashed border-brand-blue/10 pointer-events-none"
                  style={{
                    willChange: 'transform',
                    animation: 'gpu-spin-cw 60s linear infinite',
                  }}
                />
                <div
                  className="absolute w-[550px] h-[550px] rounded-full border-[1.5px] border-dashed border-brand-red/15 pointer-events-none"
                  style={{
                    willChange: 'transform',
                    animation: 'gpu-spin-ccw 45s linear infinite',
                  }}
                />
                <div
                  className="absolute w-[350px] h-[350px] rounded-full border-[1.5px] border-dashed border-brand-yellow/30 pointer-events-none"
                  style={{
                    willChange: 'transform',
                    animation: 'gpu-spin-cw 30s linear infinite',
                  }}
                />
              </div>

              {/* CAPA 2 (Plano Medio): Aviones, Buque y Rutas de Conexión */}
              <div
                ref={midLayerRef}
                data-parallax-layer="mid"
                className="absolute inset-0 pointer-events-none"
                style={{ zIndex: 10 }}
              >
                {/* Connecting Animated Lines */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ zIndex: 5 }}
                >
                  {/* Top-Right (Miami Air) to Hub */}
                  <line
                    x1="85%"
                    y1="18%"
                    x2="50%"
                    y2="50%"
                    stroke="#12435e"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                    className="opacity-40"
                    style={{ animation: 'gpu-dash-flow 1.2s linear infinite' }}
                  />
                  {/* Top-Left (Spain Air) to Hub */}
                  <line
                    x1="15%"
                    y1="22%"
                    x2="50%"
                    y2="50%"
                    stroke="#fdc151"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                    className="opacity-40"
                    style={{ animation: 'gpu-dash-flow 1.2s linear infinite' }}
                  />
                  {/* Bottom-Left (China Air) to Hub */}
                  <line
                    x1="15%"
                    y1="78%"
                    x2="50%"
                    y2="50%"
                    stroke="#fd4e64"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                    className="opacity-40"
                    style={{ animation: 'gpu-dash-flow 1.2s linear infinite' }}
                  />
                  {/* Bottom-Right (Miami Sea) to Hub */}
                  <line
                    x1="85%"
                    y1="82%"
                    x2="50%"
                    y2="50%"
                    stroke="#12435e"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                    className="opacity-40"
                    style={{ animation: 'gpu-dash-flow 1.2s linear infinite' }}
                  />
                </svg>

                {/* Vehicles (Planes and Ships) moving along routes via GPU translate3d */}

                {/* Miami Air Plane (Moving ↙️) */}
                <div
                  className="absolute top-[18%] left-[85%] z-10 text-brand-blue pointer-events-none"
                  style={{
                    willChange: 'transform, opacity',
                    animation: 'gpu-plane-miami 4s linear infinite',
                  }}
                >
                  <div className="rotate-[180deg] -translate-x-1/2 -translate-y-1/2">
                    <Plane size={24} className="fill-current opacity-80" />
                  </div>
                </div>

                {/* Spain Air Plane (Moving ↘️) */}
                <div
                  className="absolute top-[22%] left-[15%] z-10 text-[#fdc151] pointer-events-none"
                  style={{
                    willChange: 'transform, opacity',
                    animation: 'gpu-plane-spain 4.5s linear 0.8s infinite',
                  }}
                >
                  <div className="rotate-[90deg] -translate-x-1/2 -translate-y-1/2">
                    <Plane size={24} className="fill-current opacity-80" />
                  </div>
                </div>

                {/* China Air Plane (Moving ↗️) */}
                <div
                  className="absolute top-[78%] left-[15%] z-10 text-brand-red pointer-events-none"
                  style={{
                    willChange: 'transform, opacity',
                    animation: 'gpu-plane-china 5s linear 1.5s infinite',
                  }}
                >
                  <div className="rotate-[0deg] -translate-x-1/2 -translate-y-1/2">
                    <Plane size={24} className="fill-current opacity-80" />
                  </div>
                </div>

                {/* Miami Sea Container (Moving ↖️) */}
                <div
                  className="absolute top-[82%] left-[85%] z-10 text-brand-blue pointer-events-none"
                  style={{
                    willChange: 'transform, opacity',
                    animation: 'gpu-ship-miami 6s linear 2.2s infinite',
                  }}
                >
                  <div className="-translate-x-1/2 -translate-y-1/2">
                    <Container size={26} strokeWidth={2.5} className="opacity-80" />
                  </div>
                </div>
              </div>

              {/* CAPA 3 (Primer Plano): Hub Central JRS Cargo, Paquete y Tarjetas Flotantes */}
              <div
                ref={fgLayerRef}
                data-parallax-layer="fg"
                className="absolute inset-0 flex items-center justify-center"
                style={{ zIndex: 20 }}
              >
                {/* Center Premium Hub */}
                <div className="relative z-20 flex items-center justify-center">
                  {isHalloween && (
                    <div
                      className="absolute w-64 h-64 rounded-full pointer-events-none"
                      style={{
                        background:
                          'radial-gradient(circle, rgba(251, 146, 60, 0.28) 0%, rgba(168, 85, 247, 0.16) 45%, transparent 72%)',
                      }}
                    />
                  )}

                  {/* Glassmorphic Base */}
                  <div
                    className={`absolute w-48 h-48 rounded-full border shadow-[0_8px_32px_rgba(0,0,0,0.08)] ${
                      isHalloween
                        ? 'bg-gradient-to-tr from-orange-50/80 via-white/75 to-purple-50/80 border-orange-300/60'
                        : 'bg-white/65 border-white/80'
                    }`}
                  />

                  {/* Solid Core */}
                  <div className="relative w-36 h-36 bg-white rounded-full shadow-[0_0_20px_rgba(0,0,0,0.05)] border-4 border-white flex items-center justify-center">
                    {isHalloween && (
                      <>
                        <div
                          className="absolute -top-8 -right-4 z-30 pointer-events-none"
                          style={{
                            willChange: 'transform',
                            animation: 'gpu-witch-hat 3.5s ease-in-out infinite',
                          }}
                        >
                          <HalloweenWitchHat size={52} />
                        </div>
                        <div
                          className="absolute -bottom-3 -left-3 z-30 pointer-events-none"
                          style={{
                            willChange: 'transform',
                            animation: 'gpu-pumpkin-bob 3s ease-in-out infinite',
                          }}
                        >
                          <HalloweenMiniPumpkin size={28} />
                        </div>
                      </>
                    )}
                    <Image
                      src="/logo.png"
                      alt="JRS CARGO"
                      width={110}
                      height={110}
                      className="w-[85%] h-auto object-contain transition-transform duration-700 hover:scale-110"
                    />
                  </div>
                </div>

                {/* Floating Cards (GPU-Composited) */}

                {/* Card: Miami Air */}
                <div
                  style={{
                    willChange: 'transform',
                    animation: 'gpu-card-1 5s ease-in-out infinite',
                  }}
                  className="absolute top-[10%] right-[3%] bg-white p-3.5 rounded-2xl shadow-xl border border-white/80 z-30 flex items-center gap-3 hover:shadow-2xl transition-shadow cursor-default"
                >
                  <div className="w-11 h-11 bg-gradient-to-br from-brand-blue to-[#1e5c82] rounded-xl flex items-center justify-center text-brand-yellow shadow-inner relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10"></div>
                    <Plane size={22} className="relative z-10" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-brand-text-light uppercase tracking-wider mb-0.5">
                      {t.hero.boxAirMiami}
                    </p>
                    <p className="text-sm font-black text-brand-blue leading-none">
                      {t.hero.serviceAir}
                    </p>
                  </div>
                </div>

                {/* Card: Spain Air */}
                <div
                  style={{
                    willChange: 'transform',
                    animation: 'gpu-card-2 6s ease-in-out 1s infinite',
                  }}
                  className="absolute top-[18%] left-[2%] bg-white p-3.5 rounded-2xl shadow-xl border border-white/80 z-30 flex items-center gap-3 hover:shadow-2xl transition-shadow cursor-default"
                >
                  <div className="w-11 h-11 bg-gradient-to-br from-[#fdc151] to-[#f4a920] rounded-xl flex items-center justify-center text-brand-blue shadow-inner relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/20"></div>
                    <Plane size={22} className="relative z-10" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-brand-text-light uppercase tracking-wider mb-0.5">
                      {t.hero.boxAirSpain}
                    </p>
                    <p className="text-sm font-black text-brand-blue leading-none">
                      {t.hero.serviceAir}
                    </p>
                  </div>
                </div>

                {/* Card: China Air */}
                <div
                  style={{
                    willChange: 'transform',
                    animation: 'gpu-card-3 5.5s ease-in-out 2s infinite',
                  }}
                  className="absolute bottom-[18%] left-[2%] bg-white p-3.5 rounded-2xl shadow-xl border border-white/80 z-30 flex items-center gap-3 hover:shadow-2xl transition-shadow cursor-default"
                >
                  <div className="w-11 h-11 bg-gradient-to-br from-brand-red to-[#e23046] rounded-xl flex items-center justify-center text-white shadow-inner relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10"></div>
                    <Plane size={22} className="relative z-10" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-brand-text-light uppercase tracking-wider mb-0.5">
                      {t.hero.boxAirChina}
                    </p>
                    <p className="text-sm font-black text-brand-blue leading-none">
                      {t.hero.serviceAir}
                    </p>
                  </div>
                </div>

                {/* Card: Miami Sea */}
                <div
                  style={{
                    willChange: 'transform',
                    animation: 'gpu-card-4 7s ease-in-out 0.5s infinite',
                  }}
                  className="absolute bottom-[10%] right-[3%] bg-white p-3.5 rounded-2xl shadow-xl border border-white/80 z-30 flex items-center gap-3 hover:shadow-2xl transition-shadow cursor-default"
                >
                  <div className="w-11 h-11 bg-gradient-to-br from-brand-blue to-[#1e5c82] rounded-xl flex items-center justify-center text-white shadow-inner relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10"></div>
                    <Ship size={22} className="relative z-10" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-brand-text-light uppercase tracking-wider mb-0.5">
                      {t.hero.boxSeaMiami}
                    </p>
                    <p className="text-sm font-black text-brand-blue leading-none">
                      {t.hero.serviceSea}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
