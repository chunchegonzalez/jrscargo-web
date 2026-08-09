'use client'

import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { WHATSAPP_NUMBER } from '@/data/rates'

export default function WhatsAppButton() {
  const [showTooltip, setShowTooltip] = useState(false)

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=Hola%20JRS%20CARGO%2C%20necesito%20informacion%20sobre%20un%20envio`

  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-2">
      {/* Tooltip */}
      {showTooltip && (
        <div className="flex items-center gap-2 bg-white rounded-xl shadow-lg px-4 py-3 mb-2 animate-slide-up max-w-[220px]">
          <p className="text-brand-navy text-sm font-medium">
            ¿Necesitas ayuda? Escríbenos
          </p>
          <button
            onClick={() => setShowTooltip(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded"
            aria-label="Cerrar mensaje"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* WhatsApp FAB */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 hover:shadow-2xl active:scale-95 focus:outline-none focus:ring-4 focus:ring-green-300 wa-pulse"
        style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
        aria-label="Contactar a JRS CARGO por WhatsApp"
        id="whatsapp-fab"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
      >
        <MessageCircle className="w-7 h-7" aria-hidden="true" fill="white" />
      </a>
    </div>
  )
}
