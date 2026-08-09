'use client'

import { Package, Camera, Scale, MapPin, Bell, Home, ArrowRight } from 'lucide-react'
import { PORTAL_LOGIN_URL, PORTAL_REGISTER_URL } from '@/data/rates'

const portalFeatures = [
  {
    icon: Package,
    title: 'Mis paquetes',
    description: 'Consulta el estado y detalle de todos tus paquetes en un solo lugar.',
    color: 'from-blue-500 to-blue-700',
  },
  {
    icon: Camera,
    title: 'Imágenes',
    description: 'Visualiza fotografías de tus paquetes recibidos en bodega.',
    color: 'from-purple-500 to-purple-700',
  },
  {
    icon: Scale,
    title: 'Peso',
    description: 'Consulta el peso registrado de cada uno de tus paquetes.',
    color: 'from-teal-500 to-teal-700',
  },
  {
    icon: MapPin,
    title: 'Seguimiento',
    description: 'Conoce la ubicación y el estado de tus envíos en tránsito.',
    color: 'from-orange-500 to-orange-700',
  },
  {
    icon: Bell,
    title: 'Prealertas',
    description: 'Registra prealertas para informar a JRS CARGO sobre tus próximas compras.',
    color: 'from-red-500 to-red-700',
  },
  {
    icon: Home,
    title: 'Mis direcciones',
    description: 'Gestiona tus casilleros y direcciones de entrega asignadas.',
    color: 'from-green-500 to-green-700',
  },
]

export default function CustomerPortal() {
  return (
    <section id="portal" className="section-padding bg-white">
      <div className="container-max">
        {/* Heading */}
        <div className="text-center mb-12">
          <span className="badge bg-brand-blue/10 text-brand-blue mb-4">
            Portal de clientes
          </span>
          <h2 className="section-title">Todo tu casillero en un solo lugar</h2>
          <p className="section-subtitle max-w-lg mx-auto">
            Los clientes con cuenta activa pueden acceder al portal para gestionar
            sus paquetes e información de envíos.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {portalFeatures.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="card p-5 flex gap-4 group"
              >
                <div
                  className={`bg-gradient-to-br ${feature.color} rounded-xl p-3 flex-shrink-0 w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform duration-200`}
                >
                  <Icon className="w-5 h-5 text-white" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-bold text-brand-navy text-sm">{feature.title}</h3>
                  <p className="text-brand-text-light text-xs mt-1 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA buttons */}
        <div className="text-center space-y-3">
          <p className="text-brand-text-gray text-sm">
            Accede a tu portal oficial de JRS CARGO
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={PORTAL_LOGIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              id="portal-login-btn"
            >
              Ingresar a mi cuenta
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href={PORTAL_REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
              id="portal-register-btn"
            >
              Crear una cuenta
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
