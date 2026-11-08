'use client';

import { Mail } from 'lucide-react';
import { FaWhatsapp, FaInstagram } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';

export default function ContactSection() {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const contactMethods = [
    {
      id: 'whatsapp',
      icon: FaWhatsapp,
      iconSize: 28,
      label: isEn ? 'Official WhatsApp' : 'WhatsApp Oficial',
      value: '+506 7260 1238',
      href: 'https://wa.me/50672601238',
      buttonText: isEn ? 'Message on WhatsApp' : 'Escribir por WhatsApp',
      subNote: isEn ? 'Direct support' : 'Atención directa',
      iconBg: 'bg-[#22C55E]',
      iconShadow: 'shadow-[0_8px_20px_-4px_rgba(34,197,94,0.45)]',
      isPrimary: true,
    },
    {
      id: 'email',
      icon: Mail,
      iconSize: 25,
      label: isEn ? 'Email Address' : 'Correo Electrónico',
      value: 'info@jrscargocr.com',
      href: 'mailto:info@jrscargocr.com',
      buttonText: isEn ? 'Send email' : 'Enviar correo',
      subNote: null,
      iconBg: 'bg-[#12435e]',
      iconShadow: 'shadow-[0_8px_20px_-4px_rgba(18,67,94,0.35)]',
      isPrimary: false,
    },
    {
      id: 'instagram',
      icon: FaInstagram,
      iconSize: 28,
      label: 'Instagram',
      value: '@jrscargocr',
      href: 'https://www.instagram.com/jrscargocr/',
      buttonText: isEn ? 'View Instagram' : 'Ver Instagram',
      subNote: null,
      iconBg: 'bg-gradient-to-tr from-[#FBBF24] via-[#EC4899] to-[#8B5CF6]',
      iconShadow: 'shadow-[0_8px_20px_-4px_rgba(236,72,153,0.4)]',
      isPrimary: false,
    },
  ];

  return (
    <section
      id="contacto"
      className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-gradient-to-b from-[#F4F7FA] to-[#EEF3F8]"
    >
      {/* Formas decorativas suaves de fondo */}
      <div
        data-parallax-bg="36"
        className="absolute -top-24 -left-24 w-80 h-80 bg-white/70 rounded-full blur-2xl pointer-events-none"
      />
      <div
        data-parallax-bg="-32"
        className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-blue/[0.05] rounded-full blur-3xl pointer-events-none"
      />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Encabezado proporcionado con icono dinámico */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="text-center mb-8 sm:mb-10"
        >
          {/* Icono superior de paquete en movimiento */}
          <div className="inline-flex items-center justify-center mb-3">
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="flex items-center gap-1.5"
            >
              <div className="flex flex-col items-end gap-1 mr-0.5">
                <motion.span
                  animate={{ scaleX: [0.7, 1, 0.7], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="h-0.5 w-3.5 rounded-full bg-[#16A34A] origin-right block"
                />
                <motion.span
                  animate={{ scaleX: [1, 0.65, 1], opacity: [1, 0.65, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.25 }}
                  className="h-0.5 w-5 rounded-full bg-[#16A34A] origin-right block"
                />
                <motion.span
                  animate={{ scaleX: [0.8, 1, 0.8], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  className="h-0.5 w-3.5 rounded-full bg-[#16A34A] origin-right block"
                />
              </div>
              <svg
                width="38"
                height="38"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0B2737"
                strokeWidth="1.85"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" />
                <path d="M12 22V12" />
                <path d="m7.5 4.27 9 5.15" />
              </svg>
            </motion.div>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#0B2737] tracking-tight">
            {isEn ? 'Need help with your shipment?' : '¿Necesitas ayuda con tu envío?'}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-1.5 max-w-xl mx-auto">
            {isEn
              ? 'We are here to help you through the channel you prefer.'
              : 'Estamos aquí para ayudarte por el canal que prefieras.'}
          </p>
        </motion.div>

        {/* Tarjetas de los 3 canales de contacto */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 items-stretch">
          {contactMethods.map((method, idx) => {
            const Icon = method.icon;
            const isMailto = method.href.startsWith('mailto:');

            return (
              <motion.a
                key={method.id}
                href={method.href}
                target={isMailto ? undefined : '_blank'}
                rel={isMailto ? undefined : 'noopener noreferrer'}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08, duration: 0.4 }}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.99 }}
                className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(11,39,55,0.06)] hover:shadow-[0_14px_30px_-6px_rgba(11,39,55,0.12)] hover:border-slate-300/90 transition-all duration-300 flex flex-col items-center text-center group cursor-pointer"
              >
                {/* Icono del canal */}
                <div
                  className={`w-14 h-14 rounded-2xl ${method.iconBg} ${method.iconShadow} text-white flex items-center justify-center mb-4 transform group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300`}
                >
                  <Icon size={method.iconSize} />
                </div>

                {/* Nombre del canal */}
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  {method.label}
                </h3>

                {/* Dato exacto de contacto */}
                <p className="text-lg sm:text-[19px] font-extrabold text-[#0B2737] tracking-tight mt-1 mb-5 break-all">
                  {method.value}
                </p>

                {/* Botón de acción claro y dinámico */}
                <div className="w-full mt-auto flex flex-col items-center">
                  <span
                    className={`w-full max-w-[230px] h-10 px-4 rounded-full font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all duration-200 ${
                      method.isPrimary
                        ? 'bg-[#16A34A] group-hover:bg-[#15803D] text-white shadow-sm shadow-green-600/25 group-hover:shadow-md group-hover:shadow-green-600/30'
                        : 'bg-white text-[#0B2737] border-[1.5px] border-[#0B2737] group-hover:bg-[#0B2737] group-hover:text-white'
                    }`}
                  >
                    <Icon size={15} />
                    <span>{method.buttonText}</span>
                  </span>

                  {/* Subtítulo opcional (Atención directa en WhatsApp) */}
                  <div className="h-5 flex items-center justify-center mt-2">
                    {method.subNote && (
                      <span className="text-xs text-slate-500 font-medium">
                        {method.subNote}
                      </span>
                    )}
                  </div>
                </div>
              </motion.a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
