import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { HeaderWrapper, FooterWrapper, ChatBotWrapper, MainWrapper } from '@/components/ui/LayoutWrapper'
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from '@vercel/speed-insights/next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'JRS CARGO Costa Rica | Casillero y Envíos Internacionales',
  description:
    'Trae tus compras desde Estados Unidos, España y China a Costa Rica con JRS CARGO. Envíos aéreos y marítimos, casillero internacional, tracking y cotizador online.',
  keywords: [
    'casillero Costa Rica',
    'envíos internacionales Costa Rica',
    'compras en USA Costa Rica',
    'JRS CARGO',
    'importar de Estados Unidos',
    'importar de España',
    'importar de China',
    'courier Costa Rica',
    'envío aéreo Costa Rica',
    'envío marítimo Costa Rica',
  ],
  openGraph: {
    title: 'JRS CARGO Costa Rica | Casillero y Envíos Internacionales',
    description:
      'Trae tus compras desde Estados Unidos, España y China a Costa Rica con JRS CARGO. Envíos aéreos y marítimos, casillero internacional, tracking y cotizador online.',
    url: 'https://jrscargocr.com',
    siteName: 'JRS CARGO CR',
    locale: 'es_CR',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'JRS CARGO CR — Casillero y Envíos Internacionales',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JRS CARGO Costa Rica | Casillero y Envíos Internacionales',
    description:
      'Trae tus compras desde Estados Unidos, España y China a Costa Rica con JRS CARGO.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  alternates: {
    canonical: 'https://jrscargocr.com',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} antialiased flex flex-col min-h-screen`}>
        <HeaderWrapper />
        <MainWrapper>
          {children}
        </MainWrapper>
        <FooterWrapper />
        <ChatBotWrapper />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
