import type { Metadata } from 'next';
import TrackingSearch from '@/components/sections/TrackingSearch';

export const metadata: Metadata = {
  title: 'Rastrear Mi Paquete | Tracking en Tiempo Real | JRS CARGO',
  description: 'Rastrea tus paquetes y compras internacionales de Miami, España y China a Costa Rica. Consulta el estado de tu guía en tiempo real.',
  keywords: ['tracking Costa Rica', 'rastreo de paquetes', 'JRS CARGO tracking', 'rastrear compras Miami', 'rastreo casillero Costa Rica'],
  openGraph: {
    title: 'Rastrear Mi Paquete | JRS CARGO Costa Rica',
    description: 'Consulta en tiempo real la ubicación y estado de tus paquetes desde Miami a Costa Rica.',
    url: 'https://jrscargocr.com/tracking',
    type: 'website',
  },
  alternates: {
    canonical: 'https://jrscargocr.com/tracking',
  }
};

export default function TrackingPage() {
  return (
    <div className="pt-8 pb-16 bg-brand-bg-section min-h-[85vh]">
      <TrackingSearch />
    </div>
  );
}
