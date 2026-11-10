'use client';

import { useState } from 'react';
import {
  Building2,
  User,
  Mail,
  Phone,
  PackageSearch,
  MessageSquare,
  Check,
  CheckCircle2,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function CorporateClients() {
  const { t, language } = useLanguage();
  const isEn = language === 'en';
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
          Accept: 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Error al enviar');

      setSubmitStatus('success');
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    t.corporate.benefit1,
    t.corporate.benefit2,
    t.corporate.benefit3,
    t.corporate.benefit4
  ];

  return (
    <section
      id="mayoristas"
      className="py-12 lg:py-16 bg-white relative overflow-hidden"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Columna izquierda: Información corporativa y beneficios */}
          <div data-parallax-header className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white shadow-2xs border border-slate-200/90 text-brand-blue font-bold text-xs sm:text-sm mb-4">
              <Building2 size={15} className="text-brand-red" />
              <span>{isEn ? 'Corporate Clients' : 'Clientes empresariales'}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-black text-[#0B2737] leading-[1.2] tracking-tight">
              {isEn ? (
                <>
                  Logistics solutions for <span className="text-brand-red">your company</span>
                </>
              ) : (
                <>
                  Soluciones logísticas para <span className="text-brand-red">tu empresa</span>
                </>
              )}
            </h2>

            {/* Línea de acento coral de la marca */}
            <div className="w-14 h-1 rounded-full bg-brand-red mt-4 mb-5" />

            <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed mb-6">
              {t.corporate.subtitle}
            </p>

            {/* Lista sobria de los 4 beneficios con separadores finos */}
            <ul className="divide-y divide-slate-200/80 border-t border-slate-200/80">
              {benefits.map((item, idx) => (
                <li key={idx} className="py-3.5 flex items-start gap-3">
                  <Check
                    size={16}
                    strokeWidth={2.5}
                    className="text-[#0B2737] shrink-0 mt-0.5"
                  />
                  <span className="text-xs sm:text-sm text-slate-700 font-medium leading-snug">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna derecha: Formulario en tarjeta blanca con borde gris sutil */}
          <div data-parallax-content className="lg:col-span-6">
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-7 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
              <div className="mb-5">
                <h3 className="text-lg sm:text-xl font-bold text-[#0B2737] tracking-tight">
                  {t.corporate.formTitle}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isEn
                    ? 'Tell us about your operation and our team will review your request.'
                    : 'Cuéntanos sobre tu operación y nuestro equipo revisará tu solicitud.'}
                </p>
              </div>

              {submitStatus === 'success' ? (
                <div className="bg-slate-50 border border-slate-200/90 text-[#0B2737] p-6 rounded-xl flex flex-col items-center text-center gap-3">
                  <div className="w-11 h-11 bg-[#0B2737]/10 text-[#0B2737] rounded-full flex items-center justify-center">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-base mb-1">{t.corporate.successTitle}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{t.corporate.successDesc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubmitStatus('idle')}
                    className="mt-2 text-[#12435e] font-semibold text-xs hover:underline cursor-pointer"
                  >
                    {t.corporate.submitBtn}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        {t.corporate.formCompany}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Building2 size={15} />
                        </div>
                        <input
                          required
                          type="text"
                          name="companyName"
                          placeholder={t.corporate.formCompanyPlaceholder}
                          className="w-full h-10 pl-9 pr-3 bg-slate-50/70 border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#12435e] focus:ring-2 focus:ring-[#12435e]/10 transition-colors outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        {t.corporate.formContact}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <User size={15} />
                        </div>
                        <input
                          required
                          type="text"
                          name="contactName"
                          placeholder={t.corporate.formContactPlaceholder}
                          className="w-full h-10 pl-9 pr-3 bg-slate-50/70 border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#12435e] focus:ring-2 focus:ring-[#12435e]/10 transition-colors outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        {t.corporate.formEmail}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Mail size={15} />
                        </div>
                        <input
                          required
                          type="email"
                          name="email"
                          placeholder={t.corporate.formEmailPlaceholder}
                          className="w-full h-10 pl-9 pr-3 bg-slate-50/70 border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#12435e] focus:ring-2 focus:ring-[#12435e]/10 transition-colors outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        {t.corporate.formPhone}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Phone size={15} />
                        </div>
                        <input
                          required
                          type="tel"
                          name="phone"
                          placeholder={t.corporate.formPhonePlaceholder}
                          className="w-full h-10 pl-9 pr-3 bg-slate-50/70 border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#12435e] focus:ring-2 focus:ring-[#12435e]/10 transition-colors outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      {t.corporate.formVolume}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <PackageSearch size={15} />
                      </div>
                      <select
                        required
                        name="volume"
                        className="w-full h-10 pl-9 pr-8 bg-slate-50/70 border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-[#12435e] focus:ring-2 focus:ring-[#12435e]/10 transition-colors outline-none appearance-none cursor-pointer"
                      >
                        <option value="">{t.corporate.formVolumePlaceholder}</option>
                        <option value="10-50">10 - 50 lbs / 5 - 20 kg</option>
                        <option value="51-200">51 - 200 lbs / 20 - 90 kg</option>
                        <option value="201-500">201 - 500 lbs / 90 - 220 kg</option>
                        <option value="500+">500+ lbs / 220+ kg / 20+ ft³</option>
                      </select>
                      <ChevronDown
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      {t.corporate.formMessage}
                    </label>
                    <div className="relative">
                      <div className="absolute top-2.5 left-0 pl-3 pointer-events-none text-slate-400">
                        <MessageSquare size={15} />
                      </div>
                      <textarea
                        name="message"
                        rows={3}
                        placeholder={t.corporate.formMessagePlaceholder}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50/70 border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#12435e] focus:ring-2 focus:ring-[#12435e]/10 transition-colors outline-none resize-none"
                      />
                    </div>
                  </div>

                  {submitStatus === 'error' && (
                    <div className="p-2.5 bg-red-50 border border-red-200/80 text-red-700 rounded-lg flex items-center gap-2 text-xs font-medium">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{t.corporate.errorDesc}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 rounded-lg bg-[#0B2737] hover:bg-[#12435e] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>{isEn ? 'Request quote' : 'Solicitar cotización'}</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
