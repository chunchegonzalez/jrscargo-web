'use client';

import { ArrowRight, Calculator, Plane, Container, Ship } from 'lucide-react';
import { FaStar, FaWhatsapp } from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <section className="relative pt-20 pb-20 lg:pt-32 lg:pb-28 overflow-hidden bg-brand-bg-section">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-brand-yellow/10 blur-3xl opacity-60 mix-blend-multiply animate-pulse-soft" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-blue/5 blur-3xl opacity-60 mix-blend-multiply" />
      </div>

      <div className="container-max relative z-10 px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          
          {/* Content */}
          <div className="max-w-2xl animate-slide-up">
            <h1 className="text-[2.5rem] sm:text-5xl lg:text-[4.5rem] font-black text-brand-blue leading-[1.1] mb-6 text-balance tracking-tight">
              Tus compras del mundo, <br className="hidden lg:block"/>
              <span className="text-brand-red">más cerca de</span> <br className="hidden lg:block"/>
              Costa Rica.
            </h1>
            
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
                +10,000 entregas exitosas
              </motion.span>
            </div>

            <p className="text-lg sm:text-xl text-brand-text-gray mb-10 text-balance leading-relaxed">
              Compra en Estados Unidos, España o China y nosotros nos encargamos de traer tus paquetes a Costa Rica de forma sencilla, rápida y segura.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <a 
                href="https://worldboxcr.com/jrscargo/register"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary py-4 px-8 text-base shadow-xl shadow-brand-blue/20"
              >
                Abrir mi casillero gratis
                <ArrowRight size={20} />
              </a>
              <a 
                href="#cotizador"
                className="btn-white border-2 border-gray-200 py-4 px-8 text-base hover:border-brand-blue/30"
              >
                <Calculator size={20} className="text-brand-blue" />
                Cotizar mi envío
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
              <span>¿Tienes dudas?</span>
              <a 
                href="https://wa.me/50672601238" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-brand-text-gray hover:text-[#25D366] flex items-center gap-2 transition-colors group bg-white/60 px-4 py-2 rounded-full border border-gray-200 shadow-sm"
              >
                <FaWhatsapp size={20} className="text-[#25D366] group-hover:scale-110 transition-transform" />
                Hablar por WhatsApp (+506 7260 1238)
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

              {/* Animated Vehicles (Planes and Ships) */}
              
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
                {/* Glassmorphic Base */}
                <div className="absolute w-48 h-48 bg-white/40 backdrop-blur-xl rounded-full border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.1)]"></div>
                
                {/* Solid Core */}
                <div className="relative w-36 h-36 bg-white rounded-full shadow-[0_0_20px_rgba(0,0,0,0.05)] border-4 border-white flex items-center justify-center">
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
                  <p className="text-[10px] font-bold text-brand-text-light uppercase tracking-wider mb-0.5">Miami → SJ</p>
                  <p className="text-sm font-black text-brand-blue leading-none">Aéreo</p>
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
                  <p className="text-[10px] font-bold text-brand-text-light uppercase tracking-wider mb-0.5">España → SJ</p>
                  <p className="text-sm font-black text-brand-blue leading-none">Aéreo</p>
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
                  <p className="text-[10px] font-bold text-brand-text-light uppercase tracking-wider mb-0.5">China → SJ</p>
                  <p className="text-sm font-black text-brand-blue leading-none">Aéreo</p>
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
                  <p className="text-[10px] font-bold text-brand-text-light uppercase tracking-wider mb-0.5">Miami → SJ</p>
                  <p className="text-sm font-black text-brand-blue leading-none">Marítimo</p>
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
