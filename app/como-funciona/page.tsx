import type { Metadata } from 'next';
import HowItWorks from '@/components/sections/HowItWorks';
import Rates from '@/components/sections/Rates';

export const metadata: Metadata = {
  title: '¿Cómo Funciona el Casillero? | Guía Paso a Paso | JRS CARGO',
  description: 'Aprende cómo comprar en tiendas de Estados Unidos y recibir tus compras en Costa Rica en 4 simples pasos con JRS CARGO.',
  keywords: ['como funciona casillero', 'pasos para comprar en USA', 'importar a Costa Rica', 'guia compras por internet Costa Rica'],
  openGraph: {
    title: '¿Cómo Funciona el Casillero Internacional? | JRS CARGO',
    description: 'Guía paso a paso para comprar en USA, España y China y recibir tus paquetes en Costa Rica.',
    url: 'https://jrscargocr.com/como-funciona',
    type: 'website',
  },
  alternates: {
    canonical: 'https://jrscargocr.com/como-funciona',
  }
};

export default function ComoFuncionaPage() {
  return (
    <div className="pt-6 pb-16 bg-white min-h-[85vh] space-y-12">
      <HowItWorks />
      <Rates />
    </div>
  );
}
