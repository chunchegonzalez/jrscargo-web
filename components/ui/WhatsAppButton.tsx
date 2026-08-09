'use client';

import { MessageCircle } from 'lucide-react';
import { useState } from 'react';

export default function WhatsAppButton() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center justify-end">
      {/* Tooltip */}
      <div 
        className={`mr-4 px-4 py-2 bg-white rounded-lg shadow-soft text-sm font-medium text-brand-blue transition-all duration-300 transform ${
          isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'
        }`}
      >
        ¿Necesitas ayuda? Escríbenos
      </div>
      
      {/* Button */}
      <a
        href="https://wa.me/50672601238?text=Hola%20JRS%20CARGO,%20necesito%20informacion%20sobre%20un%20envio"
        target="_blank"
        rel="noopener noreferrer"
        className="relative group flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-lg hover:scale-110 transition-transform duration-300 wa-pulse"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle size={28} />
      </a>
    </div>
  );
}
