'use client';

import { ArrowRight, Laptop, Smartphone, Shirt, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import { FaAmazon } from 'react-icons/fa';
import { motion, Variants } from 'framer-motion';

const deals = [
  {
    title: 'Ofertas del Día',
    discount: 'Hasta 50% de descuento',
    icon: Zap,
    color: 'from-brand-red to-rose-500',
    link: 'https://www.amazon.com/deals',
  },
  {
    title: 'Electrónica',
    discount: 'Lo más buscado',
    icon: Laptop,
    color: 'from-brand-yellow to-amber-400',
    link: 'https://www.amazon.com/b?node=16225009011',
  },
  {
    title: 'Celulares',
    discount: 'Accesorios y más',
    icon: Smartphone,
    color: 'from-brand-blue-light to-blue-400',
    link: 'https://www.amazon.com/b?node=2335752011',
  },
  {
    title: 'Moda y Ropa',
    discount: 'Tendencias actuales',
    icon: Shirt,
    color: 'from-brand-red to-orange-500',
    link: 'https://www.amazon.com/b?node=7141123011',
  },
];

const tickerItems = [
  { icon: FaAmazon, text: 'AMAZON BUSINESS PARTNER', highlight: true },
  { icon: ShieldCheck, text: 'DESPACHOS PRIORITARIOS EN MIAMI', highlight: false },
  { icon: Sparkles, text: 'TARIFAS EXCLUSIVAS DE IMPORTACIÓN', highlight: false },
  { icon: Zap, text: 'CONEXIÓN DIRECTA A COSTA RICA', highlight: false },
  { icon: ShieldCheck, text: 'ENVÍOS 100% GARANTIZADOS', highlight: false },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
};

export default function AmazonDeals() {
  return (
    <section className="py-20 bg-[#0B1D2B] relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-brand-yellow/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-brand-red/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Ultra-Pro Premium Partner Ticker Banner */}
      <div className="relative w-full border-y border-white/10 bg-[#07131D]/80 backdrop-blur-md shadow-2xl py-3.5 mb-14 overflow-hidden z-20">
        {/* Left & Right Smooth Edge Masks */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-r from-[#07131D] to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-l from-[#07131D] to-transparent z-10" />

        <div className="flex select-none">
          <motion.div 
            animate={{ x: ['0%', '-50%'] }}
            transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
            className="flex items-center whitespace-nowrap shrink-0"
          >
            {[...tickerItems, ...tickerItems, ...tickerItems, ...tickerItems].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex items-center mx-6 gap-2.5">
                  <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${
                    item.highlight 
                      ? 'bg-gradient-to-tr from-[#FF9900] to-amber-300 text-[#0B1D2B] shadow-md shadow-[#FF9900]/30' 
                      : 'bg-white/10 text-brand-yellow'
                  }`}>
                    <Icon size={item.highlight ? 15 : 14} />
                  </div>
                  <span className={`text-xs sm:text-sm font-black tracking-widest uppercase ${
                    item.highlight 
                      ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#FF9900] via-amber-300 to-[#FF9900] font-black' 
                      : 'text-gray-300 font-bold'
                  }`}>
                    {item.text}
                  </span>
                  <span className="text-white/20 text-xs ml-4">✦</span>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>

      <div className="container-max relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="flex items-start gap-4">
            <motion.div 
              initial={{ rotate: -180, scale: 0 }}
              whileInView={{ rotate: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", duration: 1 }}
              className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-[#0B1D2B] shadow-xl shadow-black/30 shrink-0"
            >
              <FaAmazon size={36} className="text-[#FF9900]" />
            </motion.div>
            <div>
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF9900]/15 border border-[#FF9900]/30 text-amber-300 text-xs font-bold mb-3 shadow-sm"
              >
                <ShieldCheck size={14} className="text-[#FF9900]" /> Socio Oficial Amazon Business Partner
              </motion.div>
              <h2 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tight">
                Promociones <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF9900] via-amber-300 to-brand-red">Exclusivas</span>
              </h2>
              <p className="text-gray-300 text-sm md:text-base max-w-md text-balance font-medium">
                Aprovecha los mejores descuentos de Amazon y trae tus compras a Costa Rica de forma rápida y segura con JRS Cargo.
              </p>
            </div>
          </div>
          
          <motion.a 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            href="https://www.amazon.com/deals" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center gap-2.5 bg-gradient-to-r from-[#FF9900] to-amber-500 hover:from-amber-400 hover:to-[#FF9900] text-[#0B1D2B] px-6 py-3.5 rounded-xl font-black transition-all duration-300 shadow-lg shadow-[#FF9900]/25 hover:shadow-[#FF9900]/40 hover:scale-[1.02]"
          >
            Ver todas las ofertas <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </motion.a>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {deals.map((deal, index) => {
            const Icon = deal.icon;
            return (
              <motion.a 
                variants={itemVariants}
                key={index}
                href={deal.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative bg-white/[0.04] backdrop-blur-md p-6 rounded-3xl border border-white/10 hover:border-[#FF9900]/50 hover:bg-white/[0.08] overflow-hidden flex flex-col shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Hover gradient glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#FF9900]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className={`w-14 h-14 bg-gradient-to-br ${deal.color} rounded-2xl flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform duration-500 relative z-10`}>
                  <Icon size={24} />
                </div>
                
                <div className="relative z-10 mt-auto">
                  <h3 className="font-bold text-xl text-white mb-1 group-hover:text-amber-300 transition-colors">{deal.title}</h3>
                  <p className="text-sm font-medium text-gray-300">{deal.discount}</p>
                </div>

                {/* Giant watermark icon */}
                <div className="absolute -right-6 -bottom-6 text-white/[0.03] group-hover:text-[#FF9900]/10 transition-colors duration-500 transform group-hover:rotate-[-10deg] group-hover:scale-110 pointer-events-none">
                  <FaAmazon size={120} />
                </div>
              </motion.a>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
