import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Plane,
  UserPlus,
  ShoppingBag,
  Warehouse,
  Truck,
  Ship,
  CheckCircle2,
  MessageCircle,
} from 'lucide-react';

const SITE = 'https://www.jrscargocr.com';
const REGISTER_URL = 'https://worldboxcr.com/jrscargo/register';

export const metadata: Metadata = {
  title: 'Casillero en Miami Gratis para Costa Rica | JRS CARGO',
  description:
    'Abrí tu casillero en Miami 100% gratis, sin mensualidades. Comprá en Amazon, SHEIN, eBay, Walmart y más, y recibí en Costa Rica desde $7/lb aéreo con tracking en vivo.',
  keywords: [
    'casillero en Miami',
    'casillero Miami Costa Rica',
    'abrir casillero en Miami',
    'casillero gratis Costa Rica',
    'casillero virtual Costa Rica',
    'casillero para Amazon Costa Rica',
    'casillero SHEIN Costa Rica',
    'dirección en Miami para compras',
    'courier Costa Rica',
    'JRS CARGO casillero',
  ],
  openGraph: {
    title: 'Casillero en Miami Gratis para Costa Rica | JRS CARGO',
    description:
      'Obtené tu dirección en Miami gratis y recibí tus compras de USA en Costa Rica desde $7/lb.',
    url: `${SITE}/casillero`,
    type: 'website',
    locale: 'es_CR',
  },
  alternates: {
    canonical: `${SITE}/casillero`,
  },
};

const faqs = [
  {
    q: '¿Cuánto cuesta abrir un casillero en Miami con JRS CARGO?',
    a: 'Abrir tu casillero en Miami es 100% gratis. No cobramos membresía ni mensualidades: solo pagás el envío de tus paquetes según su peso, desde $7 por libra en servicio aéreo.',
  },
  {
    q: '¿Cuál es la dirección de mi casillero en Miami?',
    a: 'Tu dirección es 8280 NW 64th St, Miami, FL 33166, teléfono +1 (786) 388-7100. En el nombre debés poner tu nombre completo seguido de tu código JRS, que recibís al registrarte.',
  },
  {
    q: '¿Cuánto tarda un paquete de Miami a Costa Rica?',
    a: 'El servicio aéreo tarda de 3 a 5 días hábiles desde que el paquete llega a nuestra bodega en Miami. El servicio marítimo tarda de 2 a 3 semanas y cuesta $30 por pie cúbico.',
  },
  {
    q: '¿Puedo usar el casillero para comprar en Amazon, SHEIN y eBay?',
    a: 'Sí. Podés usar tu dirección de Miami en Amazon, SHEIN, eBay, Walmart, Temu, Best Buy, Nike y prácticamente cualquier tienda en línea de Estados Unidos.',
  },
  {
    q: '¿Cómo rastreo mi paquete?',
    a: 'Ingresá tu número de guía o tracking en la sección "¿Dónde está mi paquete?" de jrscargocr.com y verás cada movimiento en tiempo real, desde Miami hasta la entrega en Costa Rica.',
  },
  {
    q: '¿Hacen entregas a domicilio en Costa Rica?',
    a: 'Sí. Entregamos en el GAM por un costo adicional y enviamos a todo el país mediante Correos de Costa Rica o encomienda. También podés retirar en nuestra oficina en Heredia.',
  },
  {
    q: '¿También tienen casillero en España y China?',
    a: 'Sí. Además del casillero en Miami ofrecemos casillero en España (aéreo $15/lb) y en China (aéreo $17/lb), todo con la misma cuenta gratuita.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Casillero en Miami para Costa Rica',
  serviceType: 'Casillero internacional y courier',
  provider: { '@id': `${SITE}/#organization` },
  areaServed: { '@type': 'Country', name: 'Costa Rica' },
  url: `${SITE}/casillero`,
  offers: [
    {
      '@type': 'Offer',
      name: 'Apertura de casillero en Miami',
      price: '0',
      priceCurrency: 'USD',
    },
    {
      '@type': 'Offer',
      name: 'Envío aéreo Miami a Costa Rica (por libra)',
      price: '7',
      priceCurrency: 'USD',
    },
  ],
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE },
    { '@type': 'ListItem', position: 2, name: 'Casillero en Miami', item: `${SITE}/casillero` },
  ],
};

const steps = [
  {
    icon: UserPlus,
    title: '1. Registrate gratis',
    desc: 'Creá tu cuenta en 1 minuto y recibí tu código JRS y tu dirección en Miami.',
  },
  {
    icon: ShoppingBag,
    title: '2. Comprá en línea',
    desc: 'Usá tu dirección de Miami en Amazon, SHEIN, eBay, Walmart o cualquier tienda de USA.',
  },
  {
    icon: Warehouse,
    title: '3. Lo recibimos en Miami',
    desc: 'Pesamos, fotografiamos y procesamos tu paquete en nuestra bodega de Miami.',
  },
  {
    icon: Truck,
    title: '4. Te llega a Costa Rica',
    desc: 'En 3 a 5 días hábiles lo retirás en Heredia o te lo llevamos a domicilio.',
  },
];

const stores = ['Amazon', 'SHEIN', 'eBay', 'Walmart', 'Temu', 'Best Buy', 'Nike', 'Target', 'AliExpress', 'Apple'];

export default function CasilleroPage() {
  return (
    <div className="min-h-[85vh] bg-gradient-to-b from-brand-bg-section to-white py-16 px-4 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="max-w-4xl mx-auto space-y-14">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-yellow/10 border border-brand-yellow/30 text-brand-blue text-xs font-black uppercase tracking-wider">
            <Sparkles size={14} className="text-brand-yellow" />
            <span>Casillero Internacional 100% Gratuito</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-brand-blue tracking-tight">
            Casillero en Miami gratis para comprar desde Costa Rica
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Sin mensualidades ni membresía. Obtené de inmediato tu dirección en Miami, comprá en cualquier tienda de
            Estados Unidos y recibí tus paquetes en Costa Rica desde <strong>$7 por libra</strong> con tracking en vivo.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-brand-yellow hover:bg-brand-yellow/90 text-brand-blue font-black text-base rounded-2xl shadow-xl shadow-brand-yellow/20 flex items-center justify-center gap-3 transition-all hover:scale-105"
            >
              <span>Abrir Mi Casillero Gratis</span>
              <ArrowRight size={18} />
            </a>
            <Link
              href="/tarifas"
              className="px-8 py-4 bg-white hover:bg-gray-50 border border-gray-200 text-brand-blue font-bold text-base rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
              <span>Ver Tarifas de Envío</span>
            </Link>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue/5 text-brand-blue flex items-center justify-center font-bold">
              <Plane size={24} />
            </div>
            <h2 className="text-lg font-black text-brand-blue">Tarifa Aérea $7 / lb</h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              La tarifa más competitiva del mercado desde Miami con entregas express de 3 a 5 días hábiles.
            </p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue/5 text-brand-blue flex items-center justify-center font-bold">
              <Clock size={24} />
            </div>
            <h2 className="text-lg font-black text-brand-blue">Vuelos Diarios</h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              Despachos continuos desde nuestra bodega en Miami para que tus compras no sufran retrasos.
            </p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue/5 text-brand-blue flex items-center justify-center font-bold">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-lg font-black text-brand-blue">Seguridad Garantizada</h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              Monitoreo y tracking en tiempo real con soporte al cliente personalizado por WhatsApp.
            </p>
          </div>
        </div>

        {/* How it works */}
        <section className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-black text-brand-blue text-center">
            ¿Cómo funciona el casillero en Miami?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="p-5 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-brand-yellow/15 text-brand-blue flex items-center justify-center">
                    <Icon size={20} />
                  </div>
                  <h3 className="font-black text-brand-blue text-sm">{s.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Warehouse Address Card */}
        <div className="bg-[#0B1D2B] text-white p-8 sm:p-10 rounded-3xl relative overflow-hidden shadow-2xl">
          <div
            className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(245, 158, 11, 0.14) 0%, transparent 70%)' }}
          />
          <div className="relative z-10 max-w-xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-yellow">Formato de Dirección en USA</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Dirección de tu casillero en Miami</h2>
            <div className="space-y-2 text-sm text-gray-300 font-mono bg-white/5 p-5 rounded-2xl border border-white/10">
              <p><strong className="text-white">Full Name:</strong> Tu Nombre + (Código JRS)</p>
              <p><strong className="text-white">Address Line 1:</strong> 8280 NW 64th St</p>
              <p><strong className="text-white">City:</strong> Miami</p>
              <p><strong className="text-white">State:</strong> Florida (FL)</p>
              <p><strong className="text-white">ZIP Code:</strong> 33166</p>
              <p><strong className="text-white">Phone:</strong> +1 (786) 388-7100</p>
            </div>
          </div>
        </div>

        {/* Stores */}
        <section className="space-y-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-brand-blue">
            Comprá en tus tiendas favoritas de Estados Unidos
          </h2>
          <p className="text-sm text-gray-600 max-w-2xl mx-auto">
            Con tu casillero en Miami podés comprar en cualquier tienda en línea que envíe dentro de USA, incluso las que
            no hacen envíos directos a Costa Rica.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {stores.map((s) => (
              <span key={s} className="px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-bold text-gray-700 shadow-sm">
                {s}
              </span>
            ))}
          </div>
        </section>

        {/* Other lockers */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 bg-white rounded-3xl border-2 border-brand-blue/20 shadow-sm space-y-2">
            <Plane size={22} className="text-brand-blue" />
            <h3 className="font-black text-brand-blue">Casillero en Miami</h3>
            <p className="text-xs text-gray-600">Aéreo $7/lb · 3 a 5 días hábiles</p>
          </div>
          <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-2">
            <Ship size={22} className="text-brand-blue" />
            <h3 className="font-black text-brand-blue">Marítimo desde Miami</h3>
            <p className="text-xs text-gray-600">$30 por pie cúbico · 2 a 3 semanas</p>
          </div>
          <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-2">
            <Plane size={22} className="text-brand-blue" />
            <h3 className="font-black text-brand-blue">Casillero en España y China</h3>
            <p className="text-xs text-gray-600">España $15/lb · China $17/lb</p>
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-4">
          <h2 className="text-2xl sm:text-3xl font-black text-brand-blue text-center">
            Preguntas frecuentes sobre el casillero en Miami
          </h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-3 font-bold text-brand-blue text-sm">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-brand-yellow shrink-0" />
                    {f.q}
                  </span>
                  <ArrowRight size={16} className="shrink-0 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <div className="text-center space-y-4 pb-4">
          <h2 className="text-2xl font-black text-brand-blue">Abrí tu casillero en Miami hoy mismo</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-brand-blue hover:bg-brand-blue/90 text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-2"
            >
              Registrarme gratis <ArrowRight size={18} />
            </a>
            <a
              href="https://wa.me/50672601238?text=Hola%20JRS%20Cargo%2C%20quiero%20informaci%C3%B3n%20del%20casillero%20en%20Miami"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-[#25D366] hover:bg-[#1fb855] text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-2"
            >
              <MessageCircle size={18} /> Consultar por WhatsApp
            </a>
          </div>
          <p className="text-xs text-gray-500">
            ¿Ya tenés casillero? <Link href="/tracking" className="underline font-bold text-brand-blue">Rastreá tu paquete</Link> ·{' '}
            <Link href="/como-funciona" className="underline font-bold text-brand-blue">Cómo funciona</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
