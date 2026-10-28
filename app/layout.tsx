import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { HeaderWrapper, FooterWrapper, ChatBotWrapper, MainWrapper, PrimeBigDealPopupWrapper } from '@/components/ui/LayoutWrapper'
import { Analytics } from "@vercel/analytics/react"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://www.jrscargocr.com'),
  title: 'JRS CARGO CR',
  description:
    'Abrí tu casillero en Miami gratis y comprá en Amazon, SHEIN, eBay y más. Recibí en Costa Rica desde $7/lb aéreo, con tracking en vivo. También casillero en España y China.',
  keywords: [
    'casillero en Miami',
    'casillero Miami Costa Rica',
    'casillero gratis Costa Rica',
    'casillero virtual Costa Rica',
    'casillero internacional',
    'casillero Amazon Costa Rica',
    'casillero España Costa Rica',
    'casillero China Costa Rica',
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
    title: 'Casillero en Miami Gratis | JRS CARGO Costa Rica',
    description:
      'Abrí tu casillero en Miami gratis y recibí tus compras de USA, España y China en Costa Rica con tracking en vivo.',
    url: 'https://www.jrscargocr.com',
    siteName: 'JRS CARGO CR',
    locale: 'es_CR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Casillero en Miami Gratis | JRS CARGO Costa Rica',
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
    canonical: 'https://www.jrscargocr.com',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://www.jrscargocr.com/#organization',
      'name': 'JRS CARGO Costa Rica',
      'url': 'https://www.jrscargocr.com',
      'logo': 'https://www.jrscargocr.com/logo.png',
      'contactPoint': {
        '@type': 'ContactPoint',
        'telephone': '+506-7260-1238',
        'contactType': 'customer support',
        'areaServed': 'CR',
        'availableLanguage': 'Spanish'
      }
    },
    {
      '@type': 'LocalBusiness',
      '@id': 'https://www.jrscargocr.com/#localbusiness',
      'name': 'JRS CARGO Costa Rica — Casillero en Miami',
      'description': 'Casillero en Miami, España y China para comprar en línea y recibir en Costa Rica. Envíos aéreos y marítimos.',
      'url': 'https://www.jrscargocr.com',
      'image': 'https://www.jrscargocr.com/logo.png',
      'logo': 'https://www.jrscargocr.com/logo.png',
      'telephone': '+506-7260-1238',
      'email': 'info@jrscargocr.com',
      'priceRange': '$$',
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': '2W23+2P4, San Pablo',
        'addressLocality': 'Heredia',
        'addressRegion': 'Heredia',
        'addressCountry': 'CR'
      },
      'areaServed': { '@type': 'Country', 'name': 'Costa Rica' },
      'openingHoursSpecification': [
        {
          '@type': 'OpeningHoursSpecification',
          'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          'opens': '08:00',
          'closes': '17:30'
        }
      ],
      'parentOrganization': { '@id': 'https://www.jrscargocr.com/#organization' }
    },
    {
      '@type': 'WebSite',
      '@id': 'https://www.jrscargocr.com/#website',
      'url': 'https://www.jrscargocr.com',
      'name': 'JRS CARGO Costa Rica',
      'publisher': { '@id': 'https://www.jrscargocr.com/#organization' },
      'potentialAction': {
        '@type': 'SearchAction',
        'target': {
          '@type': 'EntryPoint',
          'urlTemplate': 'https://www.jrscargocr.com/tracking?number={search_term_string}'
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
          'url': 'https://www.jrscargocr.com/tracking'
        },
        {
          '@type': 'SiteNavigationElement',
          'position': 2,
          'name': 'Abrir Casillero en Miami',
          'description': 'Regístrate 100% gratis y obtén tu casillero en Miami para comprar en USA y el mundo.',
          'url': 'https://www.jrscargocr.com/casillero'
        },
        {
          '@type': 'SiteNavigationElement',
          'position': 3,
          'name': 'Tarifas Aéreas y Marítimas',
          'description': 'Conoce nuestras tarifas: Aéreo Miami $7/lb y Marítimo $30/ft³ hacia Costa Rica.',
          'url': 'https://www.jrscargocr.com/tarifas'
        },
        {
          '@type': 'SiteNavigationElement',
          'position': 4,
          'name': '¿Cómo Funciona el Casillero?',
          'description': 'Guía paso a paso para comprar por internet y recibir tus paquetes en Costa Rica.',
          'url': 'https://www.jrscargocr.com/como-funciona'
        }
      ]
    }
  ]
};

import { LanguageProvider } from '@/context/LanguageContext';
import { HalloweenProvider } from '@/components/ui/HalloweenProvider';

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
        <HalloweenProvider>
          <LanguageProvider>
            <HeaderWrapper />
            <MainWrapper>
              {children}
            </MainWrapper>
            <FooterWrapper />
            <ChatBotWrapper />
            <PrimeBigDealPopupWrapper />
          </LanguageProvider>
        </HalloweenProvider>
        <Analytics />
      </body>
    </html>
  )
}
