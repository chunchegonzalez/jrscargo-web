'use client';

import { Calculator, MessageCircle } from 'lucide-react';
import Image from 'next/image';

export default function Institutional() {
  return (
    <section className="section-padding bg-white relative">
      <div className="container-max">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          <div className="order-2 lg:order-1 relative rounded-3xl overflow-hidden aspect-[4/3] bg-brand-bg-section border border-gray-100 shadow-sm flex items-center justify-center p-12">
            <div className="absolute inset-0 bg-hero-gradient opacity-[0.03] pointer-events-none mix-blend-multiply" />
            <Image 
              src="/logo.png" 
              alt="JRS CARGO CR" 
              width={400} 
              height={150} 
              className="w-full max-w-[300px] h-auto object-contain opacity-80"
            />
          </div>

          <div className="order-1 lg:order-2">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-blue mb-6 leading-tight">
              Llevamos el <span className="text-brand-red">mundo</span> a Costa Rica
            </h2>
            <div className="space-y-4 text-lg text-brand-text-gray mb-10 text-balance">
              <p>
                En <strong>JRS CARGO</strong> conectamos Costa Rica con Estados Unidos, España y China mediante soluciones de transporte aéreo y marítimo diseñadas para hacer tus compras internacionales más simples.
              </p>
              <p>
                Ya sea que estés comprando para uso personal o para tu negocio, queremos que tengas una experiencia clara, sencilla y acompañada durante todo el proceso.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href="#cotizador"
                className="btn-primary"
              >
                <Calculator size={20} />
                Cotizar un envío
              </a>
              <a 
                href="https://wa.me/50672601238"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline"
              >
                <MessageCircle size={20} />
                Hablar con un asesor
              </a>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
