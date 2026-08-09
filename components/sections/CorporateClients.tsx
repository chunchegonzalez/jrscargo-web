'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, User, Mail, Phone, PackageSearch, MessageSquare, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CorporateClients() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    const formData = new FormData(e.currentTarget);
    const data = {
      empresa: formData.get('companyName'),
      contacto: formData.get('contactName'),
      email: formData.get('email'),
      telefono: formData.get('phone'),
      volumen: formData.get('volume'),
      mensaje: formData.get('message'),
      _subject: `Nueva Cotización Corporativa: ${formData.get('companyName')}`
    };

    try {
      const response = await fetch('https://formsubmit.co/ajax/info@jrscargocr.com', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Error al enviar');
      
      setSubmitStatus('success');
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="mayoristas" className="relative section-padding overflow-hidden bg-white">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-brand-blue/5 blur-3xl opacity-70" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-yellow/10 blur-3xl opacity-60" />
      </div>

      <div className="container-max relative z-10 px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Text Content */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-blue/10 text-brand-blue font-bold text-sm mb-6">
              <Building2 size={16} />
              <span>Clientes Mayoristas</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-black text-brand-blue mb-6 leading-tight">
              Soluciones logísticas a la medida de tu <span className="text-brand-red">empresa</span>.
            </h2>
            
            <p className="text-lg text-brand-text-gray mb-8">
              Ofrecemos tarifas preferenciales y un servicio prioritario para negocios, importadores y mayoristas. Optimiza tus costos y tiempos de entrega con JRS Cargo.
            </p>

            <ul className="space-y-4 mb-10">
              {[
                'Tarifas reducidas por volumen de importación.',
                'Asesoría aduanal y manejo de trámites.',
                'Soporte prioritario y atención personalizada.',
                'Consolidación de carga en Miami, España y China.'
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#fdc151]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 size={14} className="text-brand-blue" />
                  </div>
                  <span className="text-brand-text-gray font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Form */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/80 backdrop-blur-xl p-6 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 relative"
          >
            <h3 className="text-2xl font-bold text-brand-blue mb-6">Solicitar cotización corporativa</h3>
            
            {submitStatus === 'success' ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-2xl flex flex-col items-center text-center gap-4"
              >
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h4 className="font-bold text-xl mb-2">¡Solicitud Enviada!</h4>
                  <p className="text-sm">Hemos recibido tus datos correctamente. Nuestro equipo comercial se pondrá en contacto contigo a la brevedad posible.</p>
                </div>
                <button 
                  onClick={() => setSubmitStatus('idle')}
                  className="mt-4 text-green-700 font-semibold text-sm hover:underline"
                >
                  Enviar otra solicitud
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-brand-text-gray block">Nombre de la Empresa</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        <Building2 size={18} />
                      </div>
                      <input required type="text" name="companyName" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all outline-none" placeholder="Ej: Importaciones CR" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-brand-text-gray block">Nombre del Contacto</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        <User size={18} />
                      </div>
                      <input required type="text" name="contactName" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all outline-none" placeholder="Tu nombre" />
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-brand-text-gray block">Correo Electrónico</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        <Mail size={18} />
                      </div>
                      <input required type="email" name="email" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all outline-none" placeholder="correo@empresa.com" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-brand-text-gray block">Teléfono / WhatsApp</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        <Phone size={18} />
                      </div>
                      <input required type="tel" name="phone" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all outline-none" placeholder="+506 0000 0000" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-brand-text-gray block">Volumen Mensual Estimado</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                      <PackageSearch size={18} />
                    </div>
                    <select required name="volume" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all outline-none appearance-none">
                      <option value="">Selecciona un rango...</option>
                      <option value="10-50">10 a 50 lbs</option>
                      <option value="51-200">51 a 200 lbs</option>
                      <option value="201-500">201 a 500 lbs</option>
                      <option value="500+">Más de 500 lbs</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-brand-text-gray block">Cuéntanos sobre tus necesidades</label>
                  <div className="relative">
                    <div className="absolute top-3 left-0 pl-4 pointer-events-none text-gray-400">
                      <MessageSquare size={18} />
                    </div>
                    <textarea name="message" rows={3} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all outline-none resize-none" placeholder="Tipo de mercadería, frecuencia de envíos, requerimientos..."></textarea>
                  </div>
                </div>

                {submitStatus === 'error' && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm font-medium">
                    <AlertCircle size={16} />
                    Ocurrió un error. Por favor intenta de nuevo.
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full btn-primary py-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      Enviar Solicitud
                      <Send size={18} />
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>

        </div>
      </div>
    </section>
  );
}
