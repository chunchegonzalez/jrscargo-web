'use client';

import React, { useState } from 'react';
import {
  UserPlus,
  ShoppingBag,
  Box,
  Truck,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Globe2,
  BellRing,
  MapPin,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';

export default function HowItWorks() {
  const { t, language } = useLanguage();
  const [activeStep, setActiveStep] = useState<number>(0);

  const isEn = language === 'en';

  const steps = [
    {
      stepNum: '1',
      number: '01',
      icon: UserPlus,
      title: t.howItWorks.step1Title,
      subtitle: isEn ? 'Free instant registration.' : 'Registro inmediato y sin costo.',
      description: t.howItWorks.step1Desc,
      tag: isEn ? 'Miami • Spain • China' : 'Miami • España • China',
      tagColor: 'bg-sky-50 text-sky-800 border-sky-200',
      badgeColor: 'bg-brand-blue text-white',
      features: [
        isEn ? '100% free registration' : 'Regístrate 100% gratis',
        isEn ? 'Zero setup fees or maintenance' : 'Sin anualidad ni mensualidad',
        isEn ? 'Immediate activation' : 'Activación al instante'
      ],
      preview: {
        label: isEn ? 'Assigned Locker' : 'Casillero asignado',
        value: 'JRS-XXXXX • Miami, FL',
        subtext: '8028 NW 14TH ST DORAL MIAMI, FL 33126-1612'
      }
    },
    {
      stepNum: '2',
      number: '02',
      icon: ShoppingBag,
      title: t.howItWorks.step2Title,
      subtitle: isEn ? 'Shop in your favorite stores.' : 'Compra en tus tiendas favoritas.',
      description: t.howItWorks.step2Desc,
      tag: isEn ? 'Amazon, eBay, Shein & more' : 'Amazon, eBay, Shein y más',
      tagColor: 'bg-rose-50 text-rose-800 border-rose-200',
      badgeColor: 'bg-brand-red text-white',
      features: [
        isEn ? 'Shop in your favorite online stores.' : 'Compra en tus tiendas online favoritas.',
        isEn ? 'Put your JRS locker as destination.' : 'Coloca tu casillero como destino.',
        isEn ? 'Access US, Europe & China prices.' : 'Aprovecha ofertas y precios de EE.UU.'
      ],
      stores: ['Amazon', 'eBay', 'Shein', 'Apple', 'AliExpress', 'Walmart']
    },
    {
      stepNum: '3',
      number: '03',
      icon: Box,
      title: t.howItWorks.step3Title,
      subtitle: isEn ? 'Check-in, inspection & weigh-in.' : 'Ingreso, inspección y pesaje.',
      description: t.howItWorks.step3Desc,
      tag: isEn ? 'Real-time alert' : 'Notificación en tiempo real',
      tagColor: 'bg-amber-50 text-amber-900 border-amber-200',
      badgeColor: 'bg-[#FFB82E] text-slate-950',
      features: [
        isEn ? 'We process and inspect your package.' : 'Procesamos e inspeccionamos tu paquete.',
        isEn ? 'Accurate weight and guide check.' : 'Verificación de peso y guía.',
        isEn ? 'Instant notice to your email and account.' : 'Aviso inmediato a tu correo y cuenta.'
      ],
      preview: {
        label: isEn ? 'Warehouse status' : 'Estado en bodega',
        value: isEn ? 'Package verified and ready' : 'Paquete verificado y listo',
        subtext: isEn ? 'Ready for shipment to Costa Rica' : 'Listo para embarque hacia Costa Rica'
      }
    },
    {
      stepNum: '4',
      number: '04',
      icon: Truck,
      title: t.howItWorks.step4Title,
      subtitle: isEn ? 'Direct delivery to your door.' : 'Entrega directa en tu puerta.',
      description: t.howItWorks.step4Desc,
      tag: isEn ? 'GAM & Countrywide' : 'GAM y todo Costa Rica',
      tagColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      badgeColor: 'bg-emerald-600 text-white',
      features: [
        isEn ? 'We bring your package to Costa Rica.' : 'Traemos tu paquete a Costa Rica.',
        isEn ? 'Home delivery or branch pickup.' : 'Entrega a domicilio o retiro en sucursal.',
        isEn ? 'Clear statement with official rate.' : 'Estado de cuenta claro con tarifa oficial.'
      ],
      preview: {
        label: isEn ? 'Final destination' : 'Destino final',
        value: isEn ? 'Delivered in your hands' : 'Entregado en tus manos',
        subtext: isEn ? 'Fast shipping without surprises' : 'Envíos rápidos y sin sorpresas'
      }
    }
  ];

  return (
    <section
      id="como-funciona"
      className="py-12 lg:py-16 bg-gradient-to-b from-[#F8FAFC] via-white to-[#F8FAFC] relative overflow-hidden"
    >
      {/* Elementos decorativos de fondo suaves (misma paleta) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[260px] rounded-full blur-3xl opacity-30"
          style={{
            background:
              'radial-gradient(circle, rgba(20, 68, 93, 0.10) 0%, rgba(255, 196, 77, 0.06) 50%, transparent 75%)'
          }}
        />
        <div
          className="absolute bottom-0 right-[-10%] w-[400px] h-[400px] rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(226, 45, 75, 0.06) 0%, transparent 70%)' }}
        />
      </div>

      <div className="max-w-6xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8">
        {/* Cabecera compacta y proporcionada */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-2xl mx-auto mb-8 lg:mb-10"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-brand-blue/10 border border-brand-blue/15 text-brand-blue text-[11px] font-bold uppercase tracking-wider mb-2.5">
            <Sparkles size={12} className="text-[#FFC44D]" />
            <span>{isEn ? 'How it works' : 'Cómo funciona'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-black text-slate-900 tracking-tight leading-tight">
            {t.howItWorks.title}
          </h2>

          <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t.howItWorks.subtitle}
          </p>
        </motion.div>

        {/* ================= CONTENEDOR DE LOS 4 PASOS ================= */}
        <div className="relative">
          {/* Línea fina superior con números pequeños (Escritorio) */}
          <div className="hidden lg:grid lg:grid-cols-4 gap-4 mb-3.5 relative items-center">
            {/* Línea base fina */}
            <div className="absolute top-1/2 left-[12.5%] right-[12.5%] -translate-y-1/2 h-px bg-slate-200 z-0" />
            {/* Línea de progreso activa */}
            <div className="absolute top-1/2 left-[12.5%] right-[12.5%] -translate-y-1/2 h-px z-0 overflow-hidden">
              <motion.div
                className="h-full bg-brand-blue/40"
                initial={false}
                animate={{
                  width: `${(activeStep / (steps.length - 1)) * 100}%`
                }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              />
            </div>

            {steps.map((st, idx) => {
              const isReached = idx <= activeStep;
              const isCurrent = idx === activeStep;
              return (
                <div key={st.stepNum} className="flex justify-center relative z-10">
                  <button
                    type="button"
                    onClick={() => setActiveStep(idx)}
                    aria-label={`Paso ${st.stepNum}: ${st.title}`}
                    className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      isCurrent
                        ? 'bg-brand-blue text-white ring-4 ring-brand-blue/15 scale-110'
                        : isReached
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {st.stepNum}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Selector compacto de pasos en móvil / tablet */}
          <div className="flex lg:hidden items-center justify-center gap-1.5 mb-4">
            {steps.map((st, i) => (
              <button
                key={st.stepNum}
                type="button"
                onClick={() => setActiveStep(i)}
                className={`h-7 px-3 rounded-full text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  activeStep === i
                    ? 'bg-brand-blue text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{st.stepNum}.</span>
                <span className="hidden sm:inline">{st.title}</span>
              </button>
            ))}
          </div>

          {/* Grilla de 4 tarjetas compactas y alineadas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10 items-stretch">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isCurrent = activeStep === idx;

              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.07, duration: 0.4 }}
                  whileHover={{ y: -3 }}
                  onMouseEnter={() => setActiveStep(idx)}
                  onClick={() => setActiveStep(idx)}
                  className={`group rounded-2xl p-5 transition-all duration-250 flex flex-col justify-between border cursor-pointer ${
                    isCurrent
                      ? 'bg-white shadow-[0_8px_24px_-6px_rgba(15,23,42,0.08)] border-slate-300/90 ring-1 ring-brand-blue/15'
                      : 'bg-white/90 hover:bg-white border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:shadow-md'
                  }`}
                >
                  <div>
                    {/* Cabecera de tarjeta: Icono compacto con su color original + etiqueta sutil */}
                    <div className="flex items-center justify-between gap-2 mb-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl ${step.badgeColor} flex items-center justify-center shadow-xs transition-transform duration-300 group-hover:scale-105`}
                      >
                        <Icon size={19} />
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${step.tagColor}`}
                      >
                        {step.tag}
                      </span>
                    </div>

                    {/* Título y subtítulo */}
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight group-hover:text-brand-blue transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{step.subtitle}</p>

                    {/* Bloque visual central alineado por paso */}
                    <div className="mt-3.5">
                      {/* Paso 1: Casillero */}
                      {idx === 0 && step.preview && (
                        <div className="bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/80 flex items-start gap-2">
                          <MapPin size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-mono font-bold text-slate-900 text-xs truncate">
                              {step.preview.value}
                            </p>
                            <p className="text-[11px] text-slate-500 leading-snug">
                              {step.preview.subtext}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Paso 2: Tiendas populares */}
                      {idx === 1 && step.stores && (
                        <div className="bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/80">
                          <div className="flex flex-wrap gap-1.5">
                            {step.stores.map((s) => (
                              <span
                                key={s}
                                className="text-[11px] font-semibold px-2 py-0.5 bg-white border border-slate-200/80 text-slate-700 rounded-md"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Paso 3: Estado en bodega */}
                      {idx === 2 && step.preview && (
                        <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80 flex items-start gap-2">
                          <BellRing size={14} className="text-amber-600 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-amber-900">
                              {step.preview.label}
                            </p>
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {step.preview.value}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Paso 4: Destino final */}
                      {idx === 3 && step.preview && (
                        <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/80 flex items-start gap-2">
                          <MapPin size={14} className="text-emerald-700 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-emerald-900">
                              {step.preview.label}
                            </p>
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {step.preview.value}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lista de 3 beneficios del paso */}
                  <ul className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    {step.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-1.5 leading-snug">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>

          {/* ================= BLOQUE INFERIOR COMPACTO DE LLAMADA A LA ACCIÓN ================= */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mt-7 lg:mt-8 bg-gradient-to-r from-[#0B2737] via-[#14445D] to-[#0B2737] rounded-2xl px-5 py-5 sm:px-7 sm:py-5 text-white shadow-md relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-4">
              {/* Izquierda: Icono + Texto conciso */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center gap-3.5 text-center sm:text-left">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 text-[#FFC44D] flex items-center justify-center shrink-0">
                  <Box size={20} />
                </div>
                <div className="hidden sm:block h-9 w-px bg-white/15 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold text-[#FFC44D] uppercase tracking-wider block">
                    {isEn ? 'Ready to get started?' : '¿Listo para empezar?'}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
                    {isEn ? 'Create your free locker' : 'Abre tu casillero gratis'}
                  </h3>
                  <p className="text-white/80 text-xs mt-0.5">
                    {isEn
                      ? 'Get your shipping addresses in Miami, Spain, and China instantly with transparent rates.'
                      : 'Obtén tus direcciones en Miami, España y China al instante y empieza a comprar con tarifas transparentes.'}
                  </p>
                </div>
              </div>

              {/* Derecha: Botones "Crear casillero" y "Calcular mi envío" */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto shrink-0">
                <a
                  href="https://worldboxcr.com/jrscargo/register"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto h-10 px-5 rounded-xl bg-gradient-to-r from-[#FFC44D] to-[#FFB020] hover:brightness-105 text-[#0B2737] font-black text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
                >
                  <span>{t.footer.createLocker}</span>
                  <ArrowRight size={15} />
                </a>

                <a
                  href="#cotizador"
                  className="w-full sm:w-auto h-10 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-colors border border-white/20"
                >
                  <Clock size={14} className="text-[#FFC44D]" />
                  <span>{isEn ? 'Calculate shipping' : 'Calcular mi envío'}</span>
                </a>
              </div>
            </div>

            {/* Micro-beneficios compactos en una línea discreta */}
            <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px] text-white/85">
              <div className="flex items-center justify-center gap-1.5">
                <ShieldCheck size={13} className="text-[#FFC44D] shrink-0" />
                <span>{isEn ? 'Zero monthly fee' : 'Sin mensualidades'}</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <Globe2 size={13} className="text-[#FFC44D] shrink-0" />
                <span>{isEn ? 'USA • Spain • China' : 'EE.UU. • España • China'}</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <Truck size={13} className="text-[#FFC44D] shrink-0" />
                <span>{isEn ? 'Door to door delivery' : 'Entrega a domicilio'}</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <CheckCircle2 size={13} className="text-[#FFC44D] shrink-0" />
                <span>{isEn ? 'Customs advice included' : 'Asesoría aduanal'}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
