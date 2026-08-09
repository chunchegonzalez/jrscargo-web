'use client'

import { MessageCircle, Mail, Instagram } from 'lucide-react'
import { WHATSAPP_NUMBER, EMAIL, INSTAGRAM_URL } from '@/data/rates'

const contacts = [
  {
    id: 'whatsapp',
    icon: MessageCircle,
    label: 'WhatsApp',
    value: '+506 7260 1238',
    href: `https://wa.me/${WHATSAPP_NUMBER}?text=Hola%20JRS%20CARGO%2C%20necesito%20informaci%C3%B3n%20sobre%20un%20env%C3%ADo`,
    color: 'from-green-400 to-green-600',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    description: 'Respuesta rápida',
  },
  {
    id: 'email',
    icon: Mail,
    label: 'Correo electrónico',
    value: EMAIL,
    href: `mailto:${EMAIL}`,
    color: 'from-blue-400 to-blue-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    description: 'Soporte formal',
  },
  {
    id: 'instagram',
    icon: Instagram,
    label: 'Instagram',
    value: '@jrscargocr',
    href: INSTAGRAM_URL,
    color: 'from-pink-400 to-purple-600',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
    description: 'Síguenos',
  },
]

export default function ContactSection() {
  return (
    <section id="contacto" className="section-padding bg-brand-bg-section">
      <div className="container-max">
        {/* Heading */}
        <div className="text-center mb-12">
          <span className="badge bg-brand-navy/10 text-brand-navy mb-4">Contacto</span>
          <h2 className="section-title">¿Necesitas ayuda con tu envío?</h2>
          <p className="section-subtitle max-w-md mx-auto">
            Estamos disponibles para ayudarte con cualquier consulta sobre tu paquete o envío.
          </p>
        </div>

        {/* Contact cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {contacts.map((contact) => {
            const Icon = contact.icon
            return (
              <a
                key={contact.id}
                href={contact.href}
                target={contact.id !== 'email' ? '_blank' : undefined}
                rel={contact.id !== 'email' ? 'noopener noreferrer' : undefined}
                className="card p-6 text-center group block"
                id={`contact-${contact.id}`}
                aria-label={`Contactar por ${contact.label}`}
              >
                <div
                  className={`w-14 h-14 bg-gradient-to-br ${contact.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200`}
                >
                  <Icon className="w-7 h-7 text-white" aria-hidden="true" />
                </div>
                <p className="font-bold text-brand-navy text-sm mb-1">{contact.label}</p>
                <p className="text-brand-text-gray text-sm font-medium">{contact.value}</p>
                <p className={`text-xs mt-2 ${contact.textColor} font-medium`}>
                  {contact.description}
                </p>
              </a>
            )
          })}
        </div>

        {/* Big WhatsApp CTA */}
        <div className="text-center mt-10">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hola%20JRS%20CARGO%2C%20necesito%20informaci%C3%B3n%20sobre%20un%20env%C3%ADo`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp text-base px-10 py-4 inline-flex"
            id="contact-main-whatsapp"
          >
            <MessageCircle className="w-5 h-5" />
            Escribir a JRS CARGO ahora
          </a>
        </div>
      </div>
    </section>
  )
}
