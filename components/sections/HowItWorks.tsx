'use client';

import { UserPlus, ShoppingBag, Box, Truck, ArrowRight, MapPin, PlaneTakeoff } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

export default function HowItWorks() {
  const { t, language } = useLanguage();

  const steps = [
    {
      icon: UserPlus,
      title: t.howItWorks.step1Title,
      description: t.howItWorks.step1Desc,
      color: 'bg-brand-blue',
      textColor: 'text-brand-blue',
    },
    {
      icon: ShoppingBag,
      title: t.howItWorks.step2Title,
      description: t.howItWorks.step2Desc,
      color: 'bg-brand-red',
      textColor: 'text-brand-red',
    },
    {
      icon: Box,
      title: t.howItWorks.step3Title,
      description: t.howItWorks.step3Desc,
      color: 'bg-brand-yellow',
      textColor: 'text-brand-yellow',
    },
    {
      icon: Truck,
      title: t.howItWorks.step4Title,
      description: t.howItWorks.step4Desc,
      color: 'bg-brand-blue',
      textColor: 'text-brand-blue',
    },
  ];

  return (
    <section id="como-funciona" className="section-padding bg-brand-bg-light relative overflow-hidden">
      <div className="container-max relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="section-title">{t.howItWorks.title}</h2>
          <p className="section-subtitle max-w-2xl mx-auto">
            {t.howItWorks.subtitle}
          </p>
        </motion.div>

        <div className="relative max-w-5xl mx-auto">
          {/* Animated Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-12 left-24 right-24 h-1 z-0">
            <svg width="100%" height="100%" className="text-gray-300">
              <motion.line 
                x1="0" y1="50%" x2="100%" y2="50%" 
                stroke="currentColor" 
                strokeWidth="3" 
                strokeDasharray="10 10" 
                animate={{ strokeDashoffset: [0, -20] }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </svg>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 relative z-10"
          >
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <motion.div variants={itemVariants} key={idx} className="relative flex flex-col items-center text-center group">
                  
                  {/* Step Number Badge */}
                  <div className="absolute top-0 right-1/2 translate-x-10 -translate-y-2 w-8 h-8 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center font-bold text-brand-text-light text-sm z-20 shadow-sm">
                    {idx + 1}
                  </div>

                  {/* Icon Circle with continuous floating animation */}
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: idx * 0.2 }}
                    className={`w-24 h-24 rounded-3xl ${step.color} text-white flex items-center justify-center mb-6 shadow-lg shadow-${step.color}/30 transform transition-transform duration-300 relative`}
                  >
                    <Icon size={40} className="relative z-10" />
                    <div className="absolute inset-0 bg-white opacity-0 hover:opacity-10 rounded-3xl transition-opacity" />
                  </motion.div>

                  {/* Content */}
                  <h3 className={`text-xl font-bold mb-4 ${step.textColor}`}>
                    {step.title}
                  </h3>
                  <p className="text-brand-text-gray text-sm leading-relaxed text-balance">
                    {step.description}
                  </p>

                  {idx === 0 && (
                    <a 
                      href="https://worldboxcr.com/jrscargo/register"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 btn-primary py-3 px-6 text-sm shadow-lg shadow-brand-blue/20 transition-colors inline-block text-center"
                    >
                      {t.footer.createLocker}
                    </a>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Visual summary with hover interactions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 pt-12 border-t border-gray-200"
        >
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 font-bold text-brand-text-gray">
            <motion.span whileHover={{ scale: 1.05 }} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm cursor-default hover:shadow-md transition-shadow">
              <ShoppingBag size={18} className="text-brand-red" /> {language === 'en' ? 'Shop' : 'Compra'}
            </motion.span>
            <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
              <ArrowRight className="text-brand-blue/50" />
            </motion.div>
            <motion.span whileHover={{ scale: 1.05 }} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm cursor-default hover:shadow-md transition-shadow">
              <UserPlus size={18} className="text-brand-blue" /> {language === 'en' ? 'Locker' : 'Casillero'}
            </motion.span>
            <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
              <ArrowRight className="text-brand-blue/50" />
            </motion.div>
            <motion.span whileHover={{ scale: 1.05 }} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm cursor-default hover:shadow-md transition-shadow">
              <PlaneTakeoff size={18} className="text-brand-yellow" /> {language === 'en' ? 'Shipping' : 'Transporte'}
            </motion.span>
            <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
              <ArrowRight className="text-brand-blue/50" />
            </motion.div>
            <motion.span whileHover={{ scale: 1.05 }} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm cursor-default hover:shadow-md transition-shadow">
              <MapPin size={18} className="text-brand-blue" /> Costa Rica
            </motion.span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

