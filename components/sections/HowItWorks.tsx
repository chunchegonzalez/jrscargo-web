'use client';

import { UserPlus, ShoppingBag, Box, Truck, ArrowRight, MapPin, PlaneTakeoff } from 'lucide-react';

import { motion, Variants } from 'framer-motion';

const steps = [
  {
    icon: UserPlus,
    title: 'Abre tu casillero',
    description: 'Regístrate y obtén tu dirección única de casillero para utilizarla en tus compras.',
    color: 'bg-brand-blue',
    textColor: 'text-brand-blue',
  },
  {
    icon: ShoppingBag,
    title: 'Haz tus compras',
    description: 'Compra en tus tiendas en línea y utiliza tu dirección de casillero como dirección de entrega. Selecciona el servicio que deseas utilizar para transportar tu paquete.',
    color: 'bg-brand-red',
    textColor: 'text-brand-red',
  },
  {
    icon: Box,
    title: 'Nosotros recibimos tu paquete',
    description: 'Cuando tu paquete llegue a nuestra bodega, JRS CARGO lo procesará de acuerdo con el servicio seleccionado. Podrás consultar la información correspondiente a tu paquete desde tu cuenta.',
    color: 'bg-brand-yellow',
    textColor: 'text-brand-yellow',
  },
  {
    icon: Truck,
    title: 'Tu paquete llega a Costa Rica',
    description: 'Cuando tu paquete llegue a Costa Rica recibirás la información correspondiente y podrás continuar con el proceso de entrega definido por JRS CARGO.',
    color: 'bg-brand-blue',
    textColor: 'text-brand-blue',
  },
];



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
  return (
    <section id="como-funciona" className="section-padding bg-brand-bg-light relative overflow-hidden">
      {/* Decorative floating background elements */}
      <motion.div 
        animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 left-10 text-brand-blue/10 pointer-events-none"
      >
        <PlaneTakeoff size={120} />
      </motion.div>
      <motion.div 
        animate={{ y: [0, 20, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-20 right-10 text-brand-yellow/10 pointer-events-none"
      >
        <ShoppingBag size={100} />
      </motion.div>

      <div className="container-max relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="section-title">Trae lo que quieras del mundo, sin complicaciones</h2>
          <p className="section-subtitle max-w-2xl mx-auto">
            Sigue esta guía rápida y recibe tus paquetes directo en casa.
          </p>
        </motion.div>

        <div className="relative max-w-5xl mx-auto">
          {/* Animated Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-12 left-16 right-16 h-[2px] bg-gray-200 z-0 overflow-hidden">
            <motion.div 
              initial={{ x: "-100%" }}
              whileInView={{ x: "100%" }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              className="w-1/2 h-full bg-gradient-to-r from-transparent via-brand-blue to-transparent"
            />
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
                      Crear casillero
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
              <ShoppingBag size={18} className="text-brand-red" /> Compra
            </motion.span>
            <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
              <ArrowRight className="text-brand-blue/50" />
            </motion.div>
            <motion.span whileHover={{ scale: 1.05 }} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm cursor-default hover:shadow-md transition-shadow">
              <UserPlus size={18} className="text-brand-blue" /> Casillero
            </motion.span>
            <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
              <ArrowRight className="text-brand-blue/50" />
            </motion.div>
            <motion.span whileHover={{ scale: 1.05 }} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm cursor-default hover:shadow-md transition-shadow">
              <PlaneTakeoff size={18} className="text-brand-yellow" /> Transporte
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

