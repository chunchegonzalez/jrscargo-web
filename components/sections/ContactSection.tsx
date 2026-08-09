'use client';

import { Mail, ArrowRight } from 'lucide-react';
import { FaWhatsapp, FaInstagram } from 'react-icons/fa';
import { motion } from 'framer-motion';

const contactMethods = [
  {
    icon: FaWhatsapp,
    label: 'WhatsApp',
    value: '+506 7260 1238',
    href: 'https://wa.me/50672601238',
    color: 'bg-gradient-to-tr from-green-400 to-green-600',
    shadow: 'shadow-green-500/30',
  },
  {
    icon: Mail,
    label: 'Correo Electrónico',
    value: 'info@jrscargocr.com',
    href: 'mailto:info@jrscargocr.com',
    color: 'bg-gradient-to-tr from-brand-blue to-blue-800',
    shadow: 'shadow-brand-blue/30',
  },
  {
    icon: FaInstagram,
    label: 'Instagram',
    value: '@jrscargocr',
    href: 'https://www.instagram.com/jrscargocr/',
    color: 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600',
    shadow: 'shadow-pink-500/30',
  },
];

export default function ContactSection() {
  return (
    <section id="contacto" className="section-padding relative overflow-hidden bg-brand-bg-section">
      {/* Background blobs for premium feel */}
      <div className="absolute top-0 right-[-10%] w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-brand-red/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container-max text-center mb-16 relative z-10">
        <h2 className="text-3xl md:text-5xl font-black text-brand-blue mb-4">
          ¿Necesitas ayuda con tu envío?
        </h2>
        <p className="text-lg text-brand-text-gray max-w-2xl mx-auto">
          Nuestro equipo de atención al cliente está siempre listo para asesorarte de forma personalizada.
        </p>
      </div>

      <div className="container-max max-w-5xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {contactMethods.map((method, idx) => {
            const Icon = method.icon;
            return (
              <motion.a 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                key={idx}
                href={method.href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl border border-white hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 flex flex-col items-center text-center group"
              >
                <div className={`w-20 h-20 rounded-[1.25rem] ${method.color} ${method.shadow} shadow-xl text-white flex items-center justify-center mb-6 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                  <Icon size={36} />
                </div>
                <h3 className="text-xs font-bold text-brand-text-light uppercase tracking-widest mb-2">
                  {method.label}
                </h3>
                <p className="text-xl font-black text-brand-blue mb-8">
                  {method.value}
                </p>
                <div className="mt-auto flex items-center gap-2 text-sm font-bold text-brand-red opacity-0 group-hover:opacity-100 transition-opacity">
                  Contactar ahora <ArrowRight size={16} />
                </div>
              </motion.a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
