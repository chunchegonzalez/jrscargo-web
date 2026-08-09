import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Privacidad | JRS CARGO CR',
  description: 'Política de privacidad de JRS CARGO Costa Rica. Información sobre el tratamiento de datos personales.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-brand-bg-section">
      {/* Header */}
      <div className="py-8 px-4 sm:px-6" style={{ background: '#0B2D4E' }}>
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link
            href="/"
            className="text-white/70 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-yellow rounded-lg px-2 py-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="card p-8 sm:p-12">
          {/* Title */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-brand-blue rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-brand-navy">Política de Privacidad</h1>
              <p className="text-brand-text-light text-sm">JRS CARGO CR</p>
            </div>
          </div>

          {/* Notice */}
          <div className="bg-brand-yellow/10 border border-brand-yellow/30 rounded-xl p-4 mb-8">
            <p className="text-sm font-semibold text-brand-navy">📋 Aviso importante</p>
            <p className="text-sm text-brand-text-gray mt-1">
              Este documento es un borrador preparado para JRS CARGO CR.{' '}
              <strong>
                El texto legal definitivo debe ser redactado o revisado por JRS CARGO y, si corresponde,
                por un asesor legal autorizado antes de su publicación oficial.
              </strong>
            </p>
          </div>

          <div className="prose prose-sm max-w-none text-brand-text-gray space-y-6">
            <section>
              <h2 className="text-lg font-bold text-brand-navy">1. Responsable del tratamiento</h2>
              <p>
                JRS CARGO CR es responsable del tratamiento de los datos personales recopilados
                a través de este sitio web y de sus servicios de logística internacional.
              </p>
              <p className="text-xs text-brand-text-light italic">
                [JRS CARGO deberá completar aquí: razón social, cédula jurídica o número de identificación,
                domicilio legal y datos de contacto del responsable.]
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-brand-navy">2. Datos que recopilamos</h2>
              <p>Podemos recopilar los siguientes tipos de datos personales:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Nombre completo</li>
                <li>Correo electrónico</li>
                <li>Número de teléfono</li>
                <li>Dirección de entrega en Costa Rica</li>
                <li>Información de paquetes y envíos</li>
                <li>Datos de uso del sitio web (cookies, IP, navegador)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-brand-navy">3. Finalidad del tratamiento</h2>
              <p>Los datos recopilados se utilizan para:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Gestionar el servicio de casillero y envíos internacionales</li>
                <li>Comunicar el estado de paquetes y envíos</li>
                <li>Atender consultas y solicitudes de soporte</li>
                <li>Mejorar los servicios y la experiencia del sitio web</li>
                <li>Cumplir con obligaciones legales y aduaneras</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-brand-navy">4. Base legal</h2>
              <p className="text-xs text-brand-text-light italic">
                [JRS CARGO deberá especificar la base legal aplicable según la legislación costarricense
                de protección de datos personales (Ley 8968 y su reglamento).]
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-brand-navy">5. Derechos del titular</h2>
              <p>
                Como titular de los datos, tienes derecho a acceder, rectificar, suprimir,
                oponerte y portar tus datos personales, de acuerdo con la Ley de Protección
                de la Persona frente al Tratamiento de sus Datos Personales (Ley 8968) de Costa Rica.
              </p>
              <p>
                Para ejercer estos derechos, comunícate con nosotros a:{' '}
                <a href="mailto:info@jrscargocr.com" className="text-brand-blue hover:underline">
                  info@jrscargocr.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-brand-navy">6. Cookies</h2>
              <p className="text-xs text-brand-text-light italic">
                [JRS CARGO deberá detallar aquí el uso de cookies en el sitio, incluyendo tipos,
                finalidades y opciones de configuración.]
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-brand-navy">7. Modificaciones</h2>
              <p>
                JRS CARGO CR se reserva el derecho de modificar esta Política de Privacidad
                en cualquier momento. Las modificaciones entrarán en vigor al publicarse en este sitio web.
              </p>
            </section>

            <p className="text-xs text-brand-text-light border-t pt-4 mt-8">
              Última actualización: [JRS CARGO deberá colocar la fecha de vigencia]
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
