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
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';

export default function HowItWorks() {
  const { t, language } = useLanguage();
  const [activeStep, setActiveStep] = useState<number>(0);

  const isEn = language === 'en';

  const steps = [
    {
      number: '01',
      icon: UserPlus,
      title: t.howItWorks.step1Title,
      subtitle: isEn ? 'Free instant registration' : 'Registro inmediato y sin costo',
      description: t.howItWorks.step1Desc,
      tag: isEn ? 'Miami • Spain • China' : 'Miami • España • China',
      tagColor: 'bg-sky-50 text-sky-800 border-sky-200',
      badgeColor: 'bg-brand-blue text-white',
      accentColor: '#14445D',
      features: [
        isEn ? 'Personal locker code' : 'Código de casillero exclusivo',
        isEn ? 'Zero setup fees or maintenance' : 'Sin anualidad ni mensualidad',
        isEn ? 'Immediate activation' : 'Activación al instante'
      ],
      preview: {
        label: isEn ? 'Assigned Locker' : 'Casillero asignado',
        value: 'JRS-XXXXX • Miami, FL',
        subtext: '8205 NW 68th St, Miami'
      }
    },
    {
      number: '02',
      icon: ShoppingBag,
      title: t.howItWorks.step2Title,
      subtitle: isEn ? 'Shop in any global store' : 'Compra en tus tiendas favoritas',
      description: t.howItWorks.step2Desc,
      tag: isEn ? 'Amazon, eBay, Shein & more' : 'Amazon, eBay, Shein y más',
      tagColor: 'bg-rose-50 text-rose-800 border-rose-200',
      badgeColor: 'bg-brand-red text-white',
      accentColor: '#E22D4B',
      features: [
        isEn ? 'Put your JRS address at checkout' : 'Coloca tu dirección JRS en la tienda',
        isEn ? 'Access US, Europe & China prices' : 'Aprovecha ofertas y precios de EE.UU.',
        isEn ? 'Consolidate multiple orders' : 'Compra en tantas tiendas como quieras'
      ],
      stores: ['Amazon', 'eBay', 'Shein', 'Apple', 'AliExpress', 'Walmart']
    },
    {
      number: '03',
      icon: Box,
      title: t.howItWorks.step3Title,
      subtitle: isEn ? 'Warehouse check & weigh-in' : 'Ingreso, inspección y pesaje',
      description: t.howItWorks.step3Desc,
      tag: isEn ? 'Real-time alert' : 'Notificación en tiempo real',
      tagColor: 'bg-amber-50 text-amber-900 border-amber-200',
      badgeColor: 'bg-[#FFB82E] text-slate-950',
      accentColor: '#D97706',
      features: [
        isEn ? 'Physical receipt confirmation' : 'Confirmación física de recepción',
        isEn ? 'Accurate weight and guide check' : 'Verificación de peso y guía',
        isEn ? 'Instant WhatsApp / email notification' : 'Aviso inmediato a tu correo y cuenta'
      ],
      preview: {
        label: isEn ? 'Status update' : 'Estado en bodega',
        value: isEn ? 'Package Verified & Ready' : 'Paquete verificado y listo',
        subtext: isEn ? 'Air / Maritime transit queued' : 'Listo para embarque hacia Costa Rica'
      }
    },
    {
      number: '04',
      icon: Truck,
      title: t.howItWorks.step4Title,
      subtitle: isEn ? 'Direct to your door in CR' : 'Entrega directa en tu puerta',
      description: t.howItWorks.step4Desc,
      tag: isEn ? 'GAM & Countrywide' : 'GAM y todo Costa Rica',
      tagColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      badgeColor: 'bg-emerald-600 text-white',
      accentColor: '#059669',
      features: [
        isEn ? 'Fast air (3-5 days) or economy maritime' : 'Aéreo rápido (3 a 5 días) o marítimo',
        isEn ? 'Home delivery or local pickup' : 'Entrega a domicilio o retiro en sucursal',
        isEn ? 'Official statement with verified rate' : 'Estado de cuenta claro con tarifa oficial'
      ],
      preview: {
        label: isEn ? 'Delivery' : 'Destino final',
        value: isEn ? 'Delivered at your home / office' : 'Entregado en tus manos',
        subtext: isEn ? 'Safe arrival in Costa Rica' : 'Envíos rápidos y sin sorpresas'
      }
    },
  ];

  return (
    <section id="como-funciona" className="py-20 lg:py-28 bg-gradient-to-b from-[#F8FAFC] via-white to-[#F8FAFC] relative overflow-hidden">
      {/* Elementos decorativos de fondo suaves */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[850px] h-[350px] rounded-full blur-3xl opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(20, 68, 93, 0.12) 0%, rgba(255, 196, 77, 0.08) 50%, transparent 75%)' }}
        />
        <div 
          className="absolute bottom-0 right-[-10%] w-[500px] h-[500px] rounded-full blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(226, 45, 75, 0.08) 0%, transparent 70%)' }}
        />
      </div>

      <div className="container-max relative z-10 px-4 sm:px-6 lg:px-8">
        
        {/* Cabecera de la Sección */}
        <motion.div 
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-14 lg:mb-20"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-blue/10 border border-brand-blue/15 text-brand-blue text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles size={14} className="text-[#FFC44D]" />
            <span>{isEn ? 'Step by step guide' : 'Paso a paso simple'}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
            {t.howItWorks.title}
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed text-balance">
            {t.howItWorks.subtitle}
          </p>

          {/* Selector de pasos rápido en móvil / tablet */}
          <div className="mt-8 flex items-center justify-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl max-w-md mx-auto border border-slate-200/80">
            {steps.map((st, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveStep(i)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeStep === i 
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/90' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Paso {i + 1}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ================= CONTENEDOR DE PASOS (4 TARJETAS DINÁMICAS) ================= */}
        <div className="relative max-w-7xl mx-auto">
          
          {/* Línea conectora animada de progreso (Visible en desktop) */}
          <div className="hidden lg:block absolute top-[52px] left-[12%] right-[12%] h-[3px] z-0">
            {/* Base gris clara */}
            <div className="absolute inset-0 bg-slate-200 rounded-full" />
            {/* Barra de progreso interactiva según el paso activo */}
            <motion.div 
              className="absolute top-0 left-0 bottom-0 rounded-full bg-gradient-to-r from-brand-blue via-brand-red to-emerald-500"
              initial={false}
              animate={{
                width: `${((activeStep + 1) / steps.length) * 100}%`
              }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            />
          </div>

          {/* Grilla de 4 pasos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5 relative z-10">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isCurrent = activeStep === idx;

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  onMouseEnter={() => setActiveStep(idx)}
                  className={`group relative rounded-3xl p-6 sm:p-7 transition-all duration-300 flex flex-col justify-between border cursor-pointer ${
                    isCurrent
                      ? 'bg-white shadow-[0_12px_32px_-8px_rgba(15,23,42,0.12)] border-slate-300/90 ring-2 ring-brand-blue/10 -translate-y-1'
                      : 'bg-white/80 hover:bg-white border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  {/* Encabezado de la tarjeta: Icono + Número */}
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-5">
                      {/* Icono con halo de color */}
                      <div className="relative">
                        <div 
                          className={`w-14 h-14 rounded-2xl ${step.badgeColor} flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-105 group-hover:rotate-1`}
                        >
                          <Icon size={26} />
                        </div>
                      </div>

                      {/* Número de paso elegante */}
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-black text-2xl text-slate-300 group-hover:text-slate-500 transition-colors">
                          {step.number}
                        </span>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-0.5 ${step.tagColor}`}>
                          {step.tag}
                        </span>
                      </div>
                    </div>

                    {/* Título y subtítulo */}
                    <h3 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-brand-blue transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      {step.subtitle}
                    </p>

                    {/* Descripción principal */}
                    <p className="text-slate-600 text-xs sm:text-sm mt-3.5 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Micro-componente visual interactivo por paso */}
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    {/* Paso 1: Preview de casillero */}
                    {idx === 0 && step.preview && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                          <span>{step.preview.label}</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <p className="font-mono font-bold text-slate-900 mt-0.5">{step.preview.value}</p>
                        <p className="text-[11px] text-slate-500 truncate">{step.preview.subtext}</p>
                      </div>
                    )}

                    {/* Paso 2: Pills de tiendas */}
                    {idx === 1 && step.stores && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                          {isEn ? 'Popular stores:' : 'Tiendas populares:'}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {step.stores.map((s, sIdx) => (
                            <span 
                              key={sIdx}
                              className="text-[11px] font-semibold px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Paso 3: Notificación en tiempo real */}
                    {idx === 2 && step.preview && (
                      <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 text-xs">
                        <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                          <BellRing size={13} className="text-amber-600 shrink-0" />
                          <span>{step.preview.label}</span>
                        </div>
                        <p className="font-semibold text-slate-900 mt-1">{step.preview.value}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">{step.preview.subtext}</p>
                      </div>
                    )}

                    {/* Paso 4: Entrega en Costa Rica */}
                    {idx === 3 && step.preview && (
                      <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/80 text-xs">
                        <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px]">
                          <MapPin size={13} className="text-emerald-700 shrink-0" />
                          <span>{step.preview.label}</span>
                        </div>
                        <p className="font-semibold text-slate-900 mt-1">{step.preview.value}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">{step.preview.subtext}</p>
                      </div>
                    )}

                    {/* Checklist con 3 beneficios del paso */}
                    <ul className="mt-3.5 space-y-1.5 text-[11px] sm:text-xs text-slate-600">
                      {step.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-1.5">
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* ================= BLOQUE INFERIOR CON ACCIÓN Y GARANTÍAS ================= */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 lg:mt-16 bg-gradient-to-r from-[#0B2737] via-[#14445D] to-[#0B2737] rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden"
          >
            {/* Patrón de brillo */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
              
              <div className="text-center lg:text-left max-w-xl">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-brand-yellow text-xs font-bold uppercase tracking-wider mb-2 border border-white/15">
                  <Sparkles size={13} />
                  <span>{isEn ? 'Ready to get started?' : '¿Listo para empezar a traer tus compras?'}</span>
                </span>
                
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {isEn ? 'Create your locker in less than 2 minutes' : 'Abre tu casillero gratis en menos de 2 minutos'}
                </h3>
                
                <p className="text-white/80 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  {isEn 
                    ? 'Get your shipping addresses in Miami, Spain, and China instantly with zero registration or maintenance costs.'
                    : 'Obtén tus direcciones de entrega en Miami, España y China al instante y empieza a comprar con tarifas transparentes.'}
                </p>
              </div>

              {/* Botones de Acción */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0">
                <a
                  href="https://worldboxcr.com/jrscargo/register"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto h-12 px-7 rounded-xl bg-gradient-to-r from-[#FFC44D] to-[#FFB020] hover:brightness-105 text-[#0B2737] font-black text-sm inline-flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98]"
                >
                  <span>{t.footer.createLocker}</span>
                  <ArrowRight size={16} />
                </a>

                <a
                  href="#cotizador"
                  className="w-full sm:w-auto h-12 px-6 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors border border-white/20"
                >
                  <Clock size={16} className="text-brand-yellow" />
                  <span>{isEn ? 'Calculate shipping cost' : 'Calcular mi envío'}</span>
                </a>
              </div>
            </div>

            {/* Micro-beneficios al pie */}
            <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-xs text-white/90">
              <div className="flex items-center justify-center gap-2">
                <ShieldCheck size={16} className="text-brand-yellow" />
                <span>{isEn ? 'Zero monthly fee' : 'Sin mensualidades'}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Globe2 size={16} className="text-brand-yellow" />
                <span>{isEn ? 'USA • Spain • China' : 'EE.UU. • España • China'}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Truck size={16} className="text-brand-yellow" />
                <span>{isEn ? 'Door to door delivery' : 'Entrega a domicilio'}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 size={16} className="text-brand-yellow" />
                <span>{isEn ? 'Customs advice included' : 'Asesoría aduanal'}</span>
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
