import type { Metadata } from 'next';
import Rates from '@/components/sections/Rates';
import QuoteCalculator from '@/components/sections/QuoteCalculator';

export const metadata: Metadata = {
  title: 'Tarifas Aéreas y Marítimas | Cotizador | JRS CARGO Costa Rica',
  description: 'Conoce nuestras tarifas: Aéreo Miami $7/lb, España $15/lb, China $17/lb, Marítimo $30/ft³. Cotiza tu flete y entregas a domicilio en Costa Rica.',
  keywords: ['tarifas casillero Costa Rica', 'precio por libra Miami', 'flete aéreo Costa Rica', 'flete marítimo Costa Rica', 'cotizar envíos USA Costa Rica'],
  openGraph: {
    title: 'Tarifas Aéreas y Marítimas | JRS CARGO Costa Rica',
    description: 'Envíos aéreos desde $7/lb y marítimos desde $30/ft³. Cotiza tus paquetes online con JRS CARGO.',
    url: 'https://jrscargocr.com/tarifas',
    type: 'website',
  },
  alternates: {
    canonical: 'https://jrscargocr.com/tarifas',
  }
};

export default function TarifasPage() {
  return (
    <div className="pt-6 pb-16 bg-white min-h-[85vh] space-y-12">
      <Rates />
      <QuoteCalculator />
    </div>
  );
}
