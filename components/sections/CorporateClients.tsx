'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, User, Mail, Phone, PackageSearch, MessageSquare, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function CorporateClients() {
  const { t } = useLanguage();
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
              <span>{t.corporate.badge}</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-black text-brand-blue mb-6 leading-tight">
              {t.corporate.title} <span className="text-brand-red">{t.corporate.titleHighlight}</span>.
            </h2>
            
            <p className="text-lg text-brand-text-gray mb-8">
              {t.corporate.subtitle}
            </p>

            <ul className="space-y-4 mb-10">
              {[
                t.corporate.benefit1,
                t.corporate.benefit2,
                t.corporate.benefit3,
                t.corporate.benefit4
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
            <h3 className="text-2xl font-bold text-brand-blue mb-6">{t.corporate.formTitle}</h3>
            
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
                  <h4 className="font-bold text-xl mb-2">{t.corporate.successTitle}</h4>
                  <p className="text-sm">{t.corporate.successDesc}</p>
                </div>
                <button 
                  onClick={() => setSubmitStatus('idle')}
                  className="mt-4 text-green-700 font-semibold text-sm hover:underline"
                >
                  {t.corporate.submitBtn}
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-brand-text-gray block">{t.corporate.formCompany}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        <Building2 size={18} />
                      </div>
                      <input required type="text" name="companyName" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all outline-none" placeholder={t.corporate.formCompanyPlaceholder} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-brand-text-gray block">{t.corporate.formContact}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        <User size={18} />
                      </div>
                      <input required type="text" name="contactName" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all outline-none" placeholder={t.corporate.formContactPlaceholder} />
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-brand-text-gray block">{t.corporate.formEmail}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        <Mail size={18} />
                      </div>
                      <input required type="email" name="email" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all outline-none" placeholder={t.corporate.formEmailPlaceholder} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-brand-text-gray block">{t.corporate.formPhone}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        <Phone size={18} />
                      </div>
                      <input required type="tel" name="phone" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all outline-none" placeholder={t.corporate.formPhonePlaceholder} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-brand-text-gray block">{t.corporate.formVolume}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                      <PackageSearch size={18} />
                    </div>
                    <select required name="volume" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all outline-none appearance-none">
                      <option value="">{t.corporate.formVolumePlaceholder}</option>
                      <option value="10-50">10 - 50 lbs / 5 - 20 kg</option>
                      <option value="51-200">51 - 200 lbs / 20 - 90 kg</option>
                      <option value="201-500">201 - 500 lbs / 90 - 220 kg</option>
                      <option value="500+">500+ lbs / 220+ kg / 20+ ft³</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-brand-text-gray block">{t.corporate.formMessage}</label>
                  <div className="relative">
                    <div className="absolute top-3 left-0 pl-4 pointer-events-none text-gray-400">
                      <MessageSquare size={18} />
                    </div>
                    <textarea name="message" rows={3} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all outline-none resize-none" placeholder={t.corporate.formMessagePlaceholder}></textarea>
                  </div>
                </div>

                {submitStatus === 'error' && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm font-medium">
                    <AlertCircle size={16} />
                    {t.corporate.errorDesc}
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
                      {t.corporate.submitBtn}
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
