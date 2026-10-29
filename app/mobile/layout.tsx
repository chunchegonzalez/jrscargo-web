import type { Metadata, Viewport } from 'next';
import { ModalProvider } from '@/app/components/ModalProvider';

export const metadata: Metadata = {
  title: 'JRS Cargo Mobile | Bodega QR',
  description: 'Gestión operativa de inventario y estantes mediante códigos QR — JRS Cargo Costa Rica.',
  manifest: '/manifest-mobile.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'JRS Mobile',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0B1D2B',
};

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModalProvider>
      <div className="min-h-dvh bg-[#F4F7FA] text-slate-900 select-none antialiased">
        {children}
      </div>
    </ModalProvider>
  );
}
