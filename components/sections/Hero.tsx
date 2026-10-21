'use client';

import { ArrowRight, Calculator, Plane, Container, Ship } from 'lucide-react';
import { FaStar, FaWhatsapp } from 'react-icons/fa';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
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
            return (
              <motion.span
                key={cIdx}
                animate={{
                  y: [0, -4, 1, -2, 0],
                  rotate: [0, -1.8, 1.8, -0.8, 0],
                }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: baseDelay + idx * 0.09,
                }}
                whileHover={{
                  y: -10,
                  scale: 1.16,
                  rotate: idx % 2 === 0 ? -8 : 8,
                  transition: { duration: 0.18 },
                }}
                className={`inline-block cursor-default ${
                  isGradient
                    ? 'text-transparent bg-clip-text bg-gradient-to-b from-[#FF5500] via-[#E11D48] to-[#7E22CE] drop-shadow-[0_4px_12px_rgba(249,115,22,0.32)]'
                    : 'text-brand-blue drop-shadow-[0_3px_0_rgba(147,51,234,0.14)]'
                }`}
              >
                {ch}
              </motion.span>
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

  return (
    <section className={`relative pt-20 pb-20 lg:pt-32 lg:pb-28 overflow-hidden ${
      isHalloween ? 'bg-gradient-to-b from-[#FAF7FF] via-[#FFF9F5] to-[#F8F5FF]' : 'bg-brand-bg-section'
    }`}>
      {/* Halloween Dynamic Background Layer */}
      <HalloweenHeroBackground />

      {/* Abstract Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {isHalloween ? (
          <>
            {/* Warm golden-orange & purple ambient glow */}
            <div className="absolute -top-10 -left-10 w-[520px] h-[420px] rounded-full bg-orange-200/35 blur-3xl pointer-events-none" />
          </>
        ) : (
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-blue/5 blur-3xl opacity-60 mix-blend-multiply" />
        )}
      </div>

      <div className="container-max relative z-10 px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          
          {/* Content */}
          <div className="max-w-2xl animate-slide-up">
            {isHalloween && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#1E1B4B] via-[#311042] to-[#1E1B4B] text-white text-xs sm:text-sm font-extrabold mb-5 shadow-[0_8px_25px_-4px_rgba(249,115,22,0.4)] border border-orange-400/40"
              >
                <HalloweenMiniPumpkin size={18} className="animate-bounce" />
                <span className="bg-gradient-to-r from-amber-200 via-orange-300 to-amber-200 bg-clip-text text-transparent">
                  Halloween Edition • Tus envíos llegan volando sin sustos
                </span>
              </motion.div>
            )}

            {isHalloween ? (
              <div className="relative mb-7 pt-3">
                {/* 1. Crawling Skeleton Hand gripping top of "Tus compras" */}
                <motion.div
                  animate={{
                    x: [0, 14, -6, 0],
                    y: [0, 4, -2, 0],
                    rotate: [-8, 6, -4, -8],
                  }}
                  transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -top-6 left-[34%] sm:left-[40%] z-20 pointer-events-none"
                >
                  <HalloweenSkeletonHand size={50} />
                </motion.div>

                {/* 2. Floating Bone spinning near top-right of headline */}
                <motion.div
                  animate={{
                    y: [0, -8, 0],
                    rotate: [15, -20, 15],
                  }}
                  transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="hidden sm:block absolute top-1 -right-2 lg:right-4 z-20 pointer-events-none"
                >
                  <HalloweenFloatingBone size={32} />
                </motion.div>

                {/* 3. Chattering Animated Skull perched on "más cerca de" */}
                <motion.div
                  animate={{
                    y: [0, -7, 0],
                    rotate: [-12, 10, -12],
                    scale: [1, 1.08, 1],
                  }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-[46%] -left-4 sm:-left-7 z-20 pointer-events-none"
                >
                  <HalloweenAnimatedSkull size={42} />
                </motion.div>

                {/* 4. Full Articulated Dancing Skeleton swinging next to "Costa Rica." */}
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                    rotate: [-8, 10, -8],
                  }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -bottom-3 right-2 sm:right-10 lg:right-14 z-20 pointer-events-none"
                >
                  <HalloweenDancingSkeleton size={58} />
                </motion.div>

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
                        <linearGradient id="spookyDripGrad" x1="0" y1="0" x2="320" y2="0" gradientUnits="userSpaceOnUse">
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
                {t.hero.titleLine1} <br className="hidden lg:block"/>
                <span className="text-brand-red">{t.hero.titleHighlight}</span>{' '}
                <br className="hidden lg:block"/>
                {t.hero.titleLine2}
              </h1>
            )}
            
            <div className="flex items-center gap-2 mb-6">
              <motion.div 
                className="flex text-brand-red"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.1, delayChildren: 0.3 }
                  }
                }}
              >
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    variants={{
                      hidden: { opacity: 0, scale: 0, rotate: -45 },
                      visible: { opacity: 1, scale: 1, rotate: 0, transition: { type: "spring", stiffness: 300, damping: 12 } }
                    }}
                  >
                    <FaStar size={20} />
                  </motion.div>
                ))}
              </motion.div>
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="text-sm font-semibold text-brand-text-gray ml-2"
              >
                {t.hero.deliveries}
              </motion.span>
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
              <span className="font-bold text-2xl tracking-tighter">amazon</span>
              <span className="font-bold text-2xl tracking-tight">ebay</span>
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
                <FaWhatsapp size={20} className="text-[#25D366] group-hover:scale-110 transition-transform" />
                {t.hero.whatsappBtn}
              </a>
            </div>
          </div>

          {/* Visual/Image */}
          <div className="relative lg:h-[600px] hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-blue/5 via-white/40 to-brand-red/5 rounded-[3rem] border border-white/80 shadow-[0_20px_40px_rgb(0,0,0,0.05)] overflow-hidden flex items-center justify-center backdrop-blur-sm">
              {/* Radar Rings - Rotating */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="absolute w-[800px] h-[800px] rounded-full border-[1.5px] border-dashed border-brand-blue/10 flex items-center justify-center pointer-events-none"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                className="absolute w-[550px] h-[550px] rounded-full border-[1.5px] border-dashed border-brand-red/15 flex items-center justify-center pointer-events-none"
              />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute w-[350px] h-[350px] rounded-full border-[1.5px] border-dashed border-brand-yellow/30 flex items-center justify-center pointer-events-none"
              />

              {/* Connecting Animated Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                {/* Top-Right (Miami Air) to Hub */}
                <motion.line 
                  x1="85%" y1="18%" x2="50%" y2="50%" 
                  stroke="#12435e" strokeWidth="2" strokeDasharray="6 6" 
                  animate={{ strokeDashoffset: [24, 0] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="opacity-40" 
                />
                {/* Top-Left (Spain Air) to Hub */}
                <motion.line 
                  x1="15%" y1="22%" x2="50%" y2="50%" 
                  stroke="#fdc151" strokeWidth="2" strokeDasharray="6 6" 
                  animate={{ strokeDashoffset: [24, 0] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="opacity-40" 
                />
                {/* Bottom-Left (China Air) to Hub */}
                <motion.line 
                  x1="15%" y1="78%" x2="50%" y2="50%" 
                  stroke="#fd4e64" strokeWidth="2" strokeDasharray="6 6" 
                  animate={{ strokeDashoffset: [24, 0] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="opacity-40" 
                />
                {/* Bottom-Right (Miami Sea) to Hub */}
                <motion.line 
                  x1="85%" y1="82%" x2="50%" y2="50%" 
                  stroke="#12435e" strokeWidth="2" strokeDasharray="6 6" 
                  animate={{ strokeDashoffset: [24, 0] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="opacity-40" 
                />
              </svg>

              {/* Vehicles (Planes and Ships) moving along routes */}
              
              {/* Miami Air Plane (Moving ↙️) */}
              <motion.div
                animate={{ top: ['18%', '50%'], left: ['85%', '50%'], opacity: [0, 1, 0, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute z-10 text-brand-blue drop-shadow-md"
                style={{ transform: 'translate(-50%, -50%)' }}
              >
                <div className="rotate-[180deg]">
                  <Plane size={24} className="fill-current opacity-80" />
                </div>
              </motion.div>

              {/* Spain Air Plane (Moving ↘️) */}
              <motion.div
                animate={{ top: ['22%', '50%'], left: ['15%', '50%'], opacity: [0, 1, 0, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "linear", delay: 0.8 }}
                className="absolute z-10 text-[#fdc151] drop-shadow-md"
                style={{ transform: 'translate(-50%, -50%)' }}
              >
                <div className="rotate-[90deg]">
                  <Plane size={24} className="fill-current opacity-80" />
                </div>
              </motion.div>

              {/* China Air Plane (Moving ↗️) */}
              <motion.div
                animate={{ top: ['78%', '50%'], left: ['15%', '50%'], opacity: [0, 1, 0, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 1.5 }}
                className="absolute z-10 text-brand-red drop-shadow-md"
                style={{ transform: 'translate(-50%, -50%)' }}
              >
                <div className="rotate-[0deg]">
                  <Plane size={24} className="fill-current opacity-80" />
                </div>
              </motion.div>

              {/* Miami Sea Container (Moving ↖️) */}
              <motion.div
                animate={{ top: ['82%', '50%'], left: ['85%', '50%'], opacity: [0, 1, 0, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear", delay: 2.2 }}
                className="absolute z-10 text-brand-blue drop-shadow-md"
                style={{ transform: 'translate(-50%, -50%)' }}
              >
                <div>
                  <Container size={26} strokeWidth={2.5} className="opacity-80" />
                </div>
              </motion.div>

              {/* Center Premium Hub */}
              <div className="relative z-20 flex items-center justify-center">
                {isHalloween && (
                  <div className="absolute w-56 h-56 rounded-full bg-gradient-to-tr from-orange-400/25 via-purple-500/20 to-amber-300/25 blur-2xl animate-pulse pointer-events-none" />
                )}

                {/* Glassmorphic Base */}
                <div
                  className={`absolute w-48 h-48 backdrop-blur-xl rounded-full border shadow-[0_8px_32px_rgba(0,0,0,0.1)] ${
                    isHalloween
                      ? 'bg-gradient-to-tr from-orange-50/60 via-white/50 to-purple-50/60 border-orange-300/60'
                      : 'bg-white/40 border-white/60'
                  }`}
                />
                
                {/* Solid Core */}
                <div className="relative w-36 h-36 bg-white rounded-full shadow-[0_0_20px_rgba(0,0,0,0.05)] border-4 border-white flex items-center justify-center">
                  {isHalloween && (
                    <>
                      <motion.div
                        animate={{ rotate: [10, 16, 10], y: [0, -4, 0] }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute -top-8 -right-4 z-30 pointer-events-none drop-shadow-[0_6px_12px_rgba(88,28,135,0.35)]"
                      >
                        <HalloweenWitchHat size={52} />
                      </motion.div>
                      <motion.div
                        animate={{ y: [0, -5, 0], rotate: [-8, 8, -8] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute -bottom-3 -left-3 z-30 pointer-events-none"
                      >
                        <HalloweenMiniPumpkin size={28} />
                      </motion.div>
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

              {/* Floating Cards with Glows */}
              
              {/* Card: Miami Air */}
              <motion.div 
                animate={{ y: [0, -10, 0], x: [0, 5, 0], rotate: [0, 1, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[10%] right-[3%] bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-white/80 z-30 flex items-center gap-3 hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-blue/10 transition-all cursor-default"
              >
                <div className="w-11 h-11 bg-gradient-to-br from-brand-blue to-[#1e5c82] rounded-xl flex items-center justify-center text-brand-yellow shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 mix-blend-overlay"></div>
                  <Plane size={22} className="relative z-10" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-brand-text-light uppercase tracking-wider mb-0.5">{t.hero.boxAirMiami}</p>
                  <p className="text-sm font-black text-brand-blue leading-none">{t.hero.serviceAir}</p>
                </div>
              </motion.div>

              {/* Card: Spain Air */}
              <motion.div 
                animate={{ y: [0, 10, 0], x: [0, -5, 0], rotate: [0, -1, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute top-[18%] left-[2%] bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-white/80 z-30 flex items-center gap-3 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#fdc151]/10 transition-all cursor-default"
              >
                <div className="w-11 h-11 bg-gradient-to-br from-[#fdc151] to-[#f4a920] rounded-xl flex items-center justify-center text-brand-blue shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/20 mix-blend-overlay"></div>
                  <Plane size={22} className="relative z-10" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-brand-text-light uppercase tracking-wider mb-0.5">{t.hero.boxAirSpain}</p>
                  <p className="text-sm font-black text-brand-blue leading-none">{t.hero.serviceAir}</p>
                </div>
              </motion.div>

              {/* Card: China Air */}
              <motion.div 
                animate={{ y: [0, -8, 0], x: [0, -8, 0], rotate: [0, 2, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute bottom-[18%] left-[2%] bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-white/80 z-30 flex items-center gap-3 hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-red/10 transition-all cursor-default"
              >
                <div className="w-11 h-11 bg-gradient-to-br from-brand-red to-[#e23046] rounded-xl flex items-center justify-center text-white shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 mix-blend-overlay"></div>
                  <Plane size={22} className="relative z-10" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-brand-text-light uppercase tracking-wider mb-0.5">{t.hero.boxAirChina}</p>
                  <p className="text-sm font-black text-brand-blue leading-none">{t.hero.serviceAir}</p>
                </div>
              </motion.div>

              {/* Card: Miami Sea */}
              <motion.div 
                animate={{ y: [0, 8, 0], x: [0, 8, 0], rotate: [0, -2, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute bottom-[10%] right-[3%] bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-white/80 z-30 flex items-center gap-3 hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-blue/10 transition-all cursor-default"
              >
                <div className="w-11 h-11 bg-gradient-to-br from-brand-blue to-[#1e5c82] rounded-xl flex items-center justify-center text-white shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 mix-blend-overlay"></div>
                  <Ship size={22} className="relative z-10" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-brand-text-light uppercase tracking-wider mb-0.5">{t.hero.boxSeaMiami}</p>
                  <p className="text-sm font-black text-brand-blue leading-none">{t.hero.serviceSea}</p>
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
