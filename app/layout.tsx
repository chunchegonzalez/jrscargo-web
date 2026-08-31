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
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.png', type: 'image/png' },
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  alternates: {
    canonical: 'https://jrscargocr.com',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://jrscargocr.com/#organization',
      'name': 'JRS CARGO Costa Rica',
      'url': 'https://jrscargocr.com',
      'logo': 'https://jrscargocr.com/logo.png',
      'contactPoint': {
        '@type': 'ContactPoint',
        'telephone': '+506-7260-1238',
        'contactType': 'customer support',
        'areaServed': 'CR',
        'availableLanguage': 'Spanish'
      }
    },
    {
      '@type': 'WebSite',
      '@id': 'https://jrscargocr.com/#website',
      'url': 'https://jrscargocr.com',
      'name': 'JRS CARGO Costa Rica',
      'publisher': { '@id': 'https://jrscargocr.com/#organization' },
      'potentialAction': {
        '@type': 'SearchAction',
        'target': {
          '@type': 'EntryPoint',
          'urlTemplate': 'https://jrscargocr.com/tracking?number={search_term_string}'
        },
        'query-input': 'required name=search_term_string'
      }
    },
    {
      '@type': 'ItemList',
      'name': 'Servicios y Funciones JRS CARGO',
      'itemListElement': [
        {
          '@type': 'SiteNavigationElement',
          'position': 1,
          'name': 'Rastrear Mi Paquete (Tracking)',
          'description': 'Consulta en tiempo real la ubicación y estado de tus paquetes desde Miami a Costa Rica.',
          'url': 'https://jrscargocr.com/tracking'
        },
        {
          '@type': 'SiteNavigationElement',
          'position': 2,
          'name': 'Abrir Casillero en Miami',
          'description': 'Regístrate 100% gratis y obtén tu casillero en Miami para comprar en USA y el mundo.',
          'url': 'https://jrscargocr.com/casillero'
        },
        {
          '@type': 'SiteNavigationElement',
          'position': 3,
          'name': 'Tarifas Aéreas y Marítimas',
          'description': 'Conoce nuestras tarifas: Aéreo Miami $7/lb y Marítimo $30/ft³ hacia Costa Rica.',
          'url': 'https://jrscargocr.com/tarifas'
        },
        {
          '@type': 'SiteNavigationElement',
          'position': 4,
          'name': '¿Cómo Funciona el Casillero?',
          'description': 'Guía paso a paso para comprar por internet y recibir tus paquetes en Costa Rica.',
          'url': 'https://jrscargocr.com/como-funciona'
        }
      ]
    }
  ]
};

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
