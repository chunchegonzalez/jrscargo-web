'use client';

import { UserPlus, ShoppingBag, Box, Truck, ArrowRight, MapPin, PlaneTakeoff } from 'lucide-react';
import Link from 'next/link';
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
      <div className="container-max">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="section-title">Comprar afuera nunca fue tan sencillo</h2>
          <p className="section-subtitle max-w-2xl mx-auto">
            Sigue estos simples pasos y nosotros nos encargamos del resto.
          </p>
        </motion.div>

        <div className="relative max-w-5xl mx-auto">
          {/* Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-12 left-16 right-16 h-1 border-t-2 border-dashed border-gray-300 z-0"></div>

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

                  {/* Icon Circle */}
                  <div className={`w-24 h-24 rounded-3xl ${step.color} text-white flex items-center justify-center mb-6 shadow-md transform group-hover:-translate-y-2 transition-transform duration-300`}>
                    <Icon size={40} />
                  </div>

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

        {/* Visual summary */}
        <div className="mt-20 pt-12 border-t border-gray-200">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 font-bold text-brand-text-gray">
            <span className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm">
              <ShoppingBag size={18} className="text-brand-red" /> Compra
            </span>
            <ArrowRight className="text-gray-300" />
            <span className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm">
              <UserPlus size={18} className="text-brand-blue" /> Casillero
            </span>
            <ArrowRight className="text-gray-300" />
            <span className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm">
              <PlaneTakeoff size={18} className="text-brand-yellow" /> Transporte
            </span>
            <ArrowRight className="text-gray-300" />
            <span className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm">
              <MapPin size={18} className="text-brand-blue" /> Costa Rica
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

