import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Términos y Condiciones | JRS CARGO CR',
  description: 'Términos y condiciones del servicio de JRS CARGO Costa Rica.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-brand-bg-section">
      {/* Header */}
      <div className="py-8 px-4 sm:px-6" style={{ background: '#0B2D4E' }}>
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="text-white/70 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-yellow rounded-lg px-2 py-1 w-fit"
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
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-brand-navy">Términos y Condiciones</h1>
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
              <h2 className="text-lg font-bold text-brand-navy">1. Aceptación de los términos</h2>
              <p>
                Al utilizar los servicios de JRS CARGO CR, el usuario acepta los presentes
                Términos y Condiciones. Si no está de acuerdo con alguno de estos términos,
                le solicitamos no utilizar el servicio.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-brand-navy">2. Descripción del servicio</h2>
              <p>
                JRS CARGO CR ofrece servicios de casillero internacional y transporte de paquetes
                desde Estados Unidos, España y China hacia Costa Rica, mediante modalidades
                de transporte aéreo y marítimo.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-brand-navy">3. Tarifas y cotizaciones</h2>
              <p>
                Las tarifas publicadas en el sitio web son estimativas y están sujetas a
                confirmación. Las cotizaciones generadas por el cotizador en línea son
                aproximaciones basadas en las tarifas vigentes y no constituyen una oferta
                vinculante.
              </p>
              <p className="text-xs text-brand-text-light italic">
                [JRS CARGO deberá especificar aquí las condiciones exactas de pago, cambios
                de tarifas, cargos adicionales aplicables, etc.]
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-brand-navy">4. Mercancías prohibidas y restricciones</h2>
              <p className="text-xs text-brand-text-light italic">
                [JRS CARGO deberá detallar aquí la lista de mercancías prohibidas, restricciones
                de peso y dimensiones, y cualquier limitación del servicio.]
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-brand-navy">5. Responsabilidad</h2>
              <p className="text-xs text-brand-text-light italic">
                [JRS CARGO deberá especificar aquí los límites de responsabilidad, seguros
                disponibles, procedimientos en caso de pérdida o daño, y cualquier otra
                condición relevante.]
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-brand-navy">6. Aduanas e impuestos</h2>
              <p>
                El usuario es responsable de conocer y cumplir las regulaciones aduaneras
                vigentes en Costa Rica. JRS CARGO CR puede asistir en el proceso pero no
                se responsabiliza por impuestos, aranceles o restricciones de importación.
              </p>
              <p className="text-xs text-brand-text-light italic">
                [JRS CARGO deberá ampliar este apartado según sus procedimientos internos.]
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-brand-navy">7. Modificaciones al servicio</h2>
              <p>
                JRS CARGO CR se reserva el derecho de modificar, suspender o discontinuar
                cualquier aspecto del servicio en cualquier momento, con previo aviso cuando
                sea posible.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-brand-navy">8. Ley aplicable</h2>
              <p>
                Estos Términos y Condiciones se rigen por las leyes de la República de Costa Rica.
                Cualquier controversia será sometida a la jurisdicción de los tribunales
                competentes de Costa Rica.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-brand-navy">9. Contacto</h2>
              <p>
                Para consultas sobre estos Términos y Condiciones, comunícate con JRS CARGO CR
                a través de:{' '}
                <a href="mailto:info@jrscargocr.com" className="text-brand-blue hover:underline">
                  info@jrscargocr.com
                </a>
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
