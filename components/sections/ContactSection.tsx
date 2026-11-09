'use client';

import { Mail, MessageCircle } from 'lucide-react';
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
      label: isEn ? 'Official WhatsApp' : 'WhatsApp oficial',
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
      label: isEn ? 'Email address' : 'Correo electrónico',
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
      className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-white"
    >
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Encabezado proporcionado con icono dinámico */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="text-center mb-8 sm:mb-10 max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white shadow-2xs border border-slate-200/90 text-brand-blue font-bold text-xs sm:text-sm mb-4">
            <MessageCircle size={15} className="text-[#f59e0b]" />
            <span>{isEn ? 'Customer Support' : 'Atención al cliente'}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#0B2737] tracking-tight mb-2">
            {isEn ? (
              <>Need help with <span className="text-[#f59e0b]">your shipment?</span></>
            ) : (
              <>¿Necesitas ayuda con <span className="text-[#f59e0b]">tu envío?</span></>
            )}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
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
