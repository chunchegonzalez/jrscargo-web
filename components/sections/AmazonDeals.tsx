'use client';

import { ArrowRight, Laptop, Smartphone, Shirt, ShieldCheck, Zap } from 'lucide-react';
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
    <section className="py-16 bg-brand-blue relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-red/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Prominent Ticker Banner */}
      <div className="absolute top-6 left-0 right-0 overflow-hidden bg-gradient-to-r from-brand-yellow via-amber-400 to-brand-yellow py-3 shadow-[0_0_20px_rgba(255,184,0,0.3)] transform -rotate-1 origin-center z-20 border-y-2 border-white/20">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
          className="flex whitespace-nowrap text-brand-blue text-sm font-black uppercase tracking-widest"
        >
          {[...Array(12)].map((_, i) => (
            <span key={i} className="flex items-center mx-6">
              <ShieldCheck size={18} className="mr-2" /> JRS CARGO ES AMAZON BUSINESS PARTNER
            </span>
          ))}
        </motion.div>
      </div>

      <div className="container-max relative z-10 pt-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="flex items-start gap-4">
            <motion.div 
              initial={{ rotate: -180, scale: 0 }}
              whileInView={{ rotate: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", duration: 1 }}
              className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-brand-blue shadow-xl shrink-0"
            >
              <FaAmazon size={36} />
            </motion.div>
            <div>
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-red/20 border border-brand-red/30 text-white text-xs font-bold mb-3"
              >
                <ShieldCheck size={14} className="text-brand-yellow" /> Socio Oficial de Amazon
              </motion.div>
              <h2 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tight">
                Promociones <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow to-brand-red">Exclusivas</span>
              </h2>
              <p className="text-gray-300 text-sm md:text-base max-w-md text-balance font-medium">
                Aprovecha los descuentos de Amazon y trae tus compras a Costa Rica de forma rápida y segura con JRS Cargo.
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
            className="group flex items-center gap-2 bg-brand-red hover:bg-brand-yellow hover:text-brand-blue text-white px-6 py-3.5 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-brand-yellow/30"
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
                className="group relative bg-white/5 backdrop-blur-sm p-6 rounded-3xl border border-white/10 hover:border-brand-yellow/50 hover:bg-white/10 overflow-hidden flex flex-col shadow-xl"
              >
                {/* Hover gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className={`w-14 h-14 bg-gradient-to-br ${deal.color} rounded-2xl flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform duration-500 relative z-10`}>
                  <Icon size={24} />
                </div>
                
                <div className="relative z-10 mt-auto">
                  <h3 className="font-bold text-xl text-white mb-1 group-hover:text-brand-yellow transition-colors">{deal.title}</h3>
                  <p className="text-sm font-medium text-gray-300">{deal.discount}</p>
                </div>

                {/* Giant watermark icon */}
                <div className="absolute -right-6 -bottom-6 text-white/[0.03] group-hover:text-brand-yellow/10 transition-colors duration-500 transform group-hover:rotate-[-10deg] group-hover:scale-110">
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
