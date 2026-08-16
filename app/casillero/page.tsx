import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, MapPin, CheckCircle2, ArrowRight, ShieldCheck, Clock, Plane } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Abrir Casillero Gratis en Miami | JRS CARGO Costa Rica',
  description: 'Abre tu casillero internacional 100% gratis en Miami, España y China. Trae tus compras de Amazon, eBay y tiendas de USA a Costa Rica con entrega a domicilio.',
  keywords: ['abrir casillero Miami', 'casillero gratis Costa Rica', 'comprar en USA', 'casillero internacional', 'JRS CARGO casillero'],
  openGraph: {
    title: 'Abrir Casillero Gratis en Miami | JRS CARGO',
    description: 'Regístrate gratis y obtén tu dirección física en Miami para recibir tus compras en Costa Rica.',
    url: 'https://jrscargocr.com/casillero',
    type: 'website',
  },
  alternates: {
    canonical: 'https://jrscargocr.com/casillero',
  }
};

export default function CasilleroPage() {
  return (
    <div className="min-h-[85vh] bg-gradient-to-b from-brand-bg-section to-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-yellow/10 border border-brand-yellow/30 text-brand-blue text-xs font-black uppercase tracking-wider">
            <Sparkles size={14} className="text-brand-yellow" />
            <span>Casillero Internacional 100% Gratuito</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-brand-blue tracking-tight">
            Abre tu Casillero en Miami y Compra en el Mundo
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Sin mensualidades, sin costo de membresía. Obtén de inmediato tu dirección en Estados Unidos y recibe tus paquetes en Costa Rica.
          </p>
          
          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://worldboxcr.com/jrscargo/register"
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
            <h3 className="text-lg font-black text-brand-blue">Tarifa Aérea $7 / lb</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              La tarifa más competitiva del mercado desde Miami con entregas express de 3 a 5 días hábiles.
            </p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue/5 text-brand-blue flex items-center justify-center font-bold">
              <Clock size={24} />
            </div>
            <h3 className="text-lg font-black text-brand-blue">Vuelos Diarios</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Despachos continuos desde nuestra bodega en Miami para que tus compras no sufran retrasos.
            </p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue/5 text-brand-blue flex items-center justify-center font-bold">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-black text-brand-blue">Seguridad Garantizada</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Monitoreo y tracking en tiempo real con soporte al cliente personalizado por WhatsApp.
            </p>
          </div>
        </div>

        {/* Warehouse Address Card */}
        <div className="bg-[#0B1D2B] text-white p-8 sm:p-10 rounded-3xl relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-yellow/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-yellow">Formato de Dirección en USA</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Dirección de tu Bodega en Miami</h2>
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

      </div>
    </div>
  );
}
