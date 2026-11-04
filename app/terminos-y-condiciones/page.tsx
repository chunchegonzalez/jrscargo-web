import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ArrowLeft, Calendar, ShieldCheck, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Términos y Condiciones del Servicio | JRS CARGO CR',
  description: 'Términos y condiciones del servicio de casillero y transporte de JRS Cargo Costa Rica. Vigente a partir del 1 de abril del 2026.',
};

export default function TerminosYCondiciones() {
  return (
    <main className="pt-28 pb-20 bg-gray-50 min-h-screen">
      <div className="container-max">
        <div className="max-w-4xl mx-auto">
          {/* Botón de regreso */}
          <div className="mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-brand-blue transition-colors"
            >
              <ArrowLeft size={16} />
              Volver al inicio
            </Link>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Encabezado Corporativo */}
            <div className="bg-brand-blue p-8 sm:p-12 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-10 pointer-events-none">
                <FileText size={220} />
              </div>
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold mb-4 backdrop-blur-xs border border-white/15">
                  <Calendar size={13} className="text-brand-yellow" />
                  <span>Fecha de validez: 1 de abril del 2026</span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight">
                  Términos y Condiciones
                </h1>
                <p className="text-white/80 text-base sm:text-lg">
                  Términos y condiciones del servicio de JRS Cargo Costa Rica
                </p>
              </div>
            </div>

            {/* Contenido Legal */}
            <div className="p-8 sm:p-12 prose prose-blue max-w-none prose-headings:text-brand-blue prose-headings:font-black prose-p:text-brand-text-gray prose-li:text-brand-text-gray">
              
              {/* Resumen inicial */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 text-sm leading-relaxed mb-6">
                <p className="m-0 font-medium">
                  El presente documento establece los <strong>Términos y Condiciones</strong> que regulan la prestación de los servicios de transporte, logística, casillero y recepción de paquetes brindados por <strong>JRS Cargo</strong> (en adelante, &quot;La Empresa&quot;). Al hacer uso de nuestros servicios o solicitar el envío de paquetes a nuestras direcciones, el cliente (en adelante, &quot;El Cliente&quot;) declara haber leído, comprendido y aceptado plenamente las cláusulas descritas a continuación.
                </p>
                <div className="mt-3 pt-3 border-t border-slate-200/70 flex items-center gap-2 text-xs text-slate-500 font-semibold">
                  <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
                  <span>Vigencia oficial a partir del 1 de abril del 2026.</span>
                </div>
              </div>

              <hr className="my-8 border-gray-100" />

              {/* SECCIÓN 1 */}
              <h2 className="text-2xl mt-8 mb-4">1. Uso de la dirección de entrega (casillero o bodega)</h2>
              <ul className="space-y-3 list-none pl-0">
                <li className="pl-7 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">1.1.</span>
                  <strong>Dirección y número de casillero.</strong> El Cliente es responsable de ingresar de forma exacta y completa la dirección proporcionada por JRS Cargo en las plataformas donde realice sus compras, como Amazon, eBay u otras. También debe incluir su número de casillero o código de cliente cuando corresponda.
                </li>
                <li className="pl-7 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">1.2.</span>
                  <strong>Errores en la dirección.</strong> JRS Cargo no se hace responsable por paquetes enviados a direcciones incorrectas debido a errores u omisiones del Cliente al realizar la compra.
                </li>
              </ul>

              {/* SECCIÓN 2 */}
              <h2 className="text-2xl mt-10 mb-4">2. Manejo de paquetes y entregas por proveedores (USPS, FedEx, UPS, correo local y otros)</h2>
              <ul className="space-y-4 list-none pl-0">
                <li className="pl-7 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">2.1.</span>
                  <strong>Confirmación de recepción.</strong> La responsabilidad de JRS Cargo sobre la custodia y el manejo de la mercancía comienza únicamente cuando el paquete es recibido físicamente e ingresado en el sistema de una bodega autorizada de origen.
                </li>
                <li className="pl-7 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">2.2.</span>
                  <strong>Estado del rastreo y entregas de USPS.</strong> Que el rastreo de USPS u otro transportista indique «Entregado» no confirma que JRS Cargo haya recibido físicamente el paquete. En algunos casos, USPS entrega el paquete a un proveedor de última milla, que luego lo traslada a nuestra bodega. Este proceso puede tardar de cinco (5) a ocho (8) días hábiles desde que USPS registra la entrega. El plazo puede variar según la operación del proveedor y la bodega de destino. Por ello, el estado «Entregado» del transportista inicial no constituye por sí solo un registro de recepción de JRS Cargo.
                </li>
                <li className="pl-7 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">2.3.</span>
                  <strong>Entregas fallidas o incorrectas antes del ingreso a la bodega.</strong> JRS Cargo no se hace responsable por paquetes perdidos, extraviados o entregados en una dirección incorrecta por USPS, otros transportistas, proveedores de última milla o el vendedor antes de que exista un registro confirmado de ingreso en nuestro sistema. En esos casos, el Cliente deberá presentar el reclamo ante el vendedor o el transportista correspondiente.
                </li>
              </ul>

              {/* SECCIÓN 3 */}
              <h2 className="text-2xl mt-10 mb-4">3. Mercancía dañada, incompleta o distinta a la compra</h2>
              <ul className="space-y-4 list-none pl-0">
                <li className="pl-7 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">3.1.</span>
                  <strong>Responsabilidad del vendedor.</strong> JRS Cargo presta servicios de transporte y logística. No es responsable si el vendedor o la tienda envía un producto equivocado, incompleto o defectuoso, si el producto no corresponde al comprado por el Cliente, ni por daños o defectos que existieran antes de que el paquete fuera recibido por JRS Cargo.
                </li>
                <li className="pl-7 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">3.2.</span>
                  <strong>Alcance de la verificación.</strong> JRS Cargo verifica que el número de rastreo registrado para el paquete corresponda al número de rastreo que el Cliente proporcionó. Esta verificación no incluye confirmar que el contenido del paquete coincida con la orden de compra, el producto seleccionado o la descripción publicada por el vendedor. Cualquier reclamo sobre el producto recibido deberá gestionarse directamente con el vendedor o la tienda.
                </li>
                <li className="pl-7 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">3.3.</span>
                  <strong>Condiciones del empaque.</strong> JRS Cargo transporta los paquetes en las condiciones físicas en que los recibe del vendedor o del transportista. Corresponde al vendedor o proveedor empacar adecuadamente los productos para su transporte.
                </li>
              </ul>

              {/* SECCIÓN 4 */}
              <h2 className="text-2xl mt-10 mb-4">4. Póliza de seguro y cobertura de transporte</h2>
              <ul className="space-y-4 list-none pl-0">
                <li className="pl-7 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">4.1.</span>
                  <strong>Validez de la cobertura.</strong> JRS Cargo cuenta con cobertura de seguro para la carga. Esta cobertura se activa únicamente cuando el paquete aparece registrado e ingresado en nuestros sistemas. Aplica a eventualidades, pérdidas o siniestros ocurridos durante el traslado internacional desde nuestras bodegas en Miami, España o China hacia Costa Rica.
                </li>
                <li className="pl-7 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">4.2.</span>
                  <strong>Plazo de aplicación del seguro.</strong> Una vez reportado e iniciado un incidente que cumpla con las condiciones de cobertura, el proceso de aplicación y resolución del seguro tiene un plazo de tres (3) días hábiles.
                </li>
                <li className="pl-7 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">4.3.</span>
                  <strong>Exclusiones del seguro.</strong> El seguro no cubre paquetes que no hayan sido registrados previamente en el sistema de JRS Cargo, ni daños ocasionados por empaque inadecuado de la tienda de origen, defectos de fábrica o entregas fallidas de transportistas y correos locales antes del ingreso formal del paquete a nuestra bodega.
                </li>
              </ul>

              {/* SECCIÓN 5 */}
              <h2 className="text-2xl mt-10 mb-4">5. Inspección de paquetes y mercancía prohibida</h2>
              <ul className="space-y-3 list-none pl-0 mb-4">
                <li className="pl-7 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">5.1.</span>
                  <strong>Derecho de inspección.</strong> JRS Cargo se reserva el derecho de abrir e inspeccionar el contenido de los paquetes por motivos de seguridad, para cumplir con regulaciones aduaneras o ante la sospecha de que contienen mercancía no permitida. Esta inspección no implica verificar que el producto recibido coincida con la orden de compra del Cliente.
                </li>
                <li className="pl-7 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">5.2.</span>
                  <strong>Mercancía prohibida.</strong> Está estrictamente prohibido enviar las siguientes categorías de artículos:
                </li>
              </ul>

              {/* Cuadro destacado de mercancía prohibida */}
              <div className="bg-red-50/80 border border-red-200/80 p-5 sm:p-6 rounded-2xl mb-6 shadow-xs">
                <div className="flex items-center gap-2 mb-3 text-red-900 font-bold text-sm sm:text-base">
                  <AlertTriangle size={18} className="text-red-600 shrink-0" />
                  <span>Artículos de importación prohibida o restringida:</span>
                </div>
                <ul className="space-y-2.5 mb-0 text-red-950 text-xs sm:text-sm pl-4 list-disc">
                  <li>
                    <strong>Materiales peligrosos e inflamables:</strong> explosivos, fuegos artificiales, fósforos, encendedores, aerosoles, gas comprimido, pinturas, solventes, sustancias corrosivas, venenos y baterías de litio sueltas o defectuosas.
                  </li>
                  <li>
                    <strong>Armas y artículos tácticos:</strong> armas de fuego, armas blancas, municiones, partes de armas, accesorios para armas, miras telescópicas, equipo táctico de uso exclusivo militar o policial, dispositivos de electrochoque (taser) y aerosol de pimienta.
                  </li>
                  <li>
                    <strong>Sustancias ilícitas:</strong> drogas, estupefacientes, sustancias psicotrópicas o precursores químicos de uso no autorizado.
                  </li>
                  <li>
                    <strong>Valores y dinero:</strong> dinero en efectivo, monedas, billetes de lotería, joyas de oro o plata o de alto valor, piedras preciosas, cheques y títulos valores.
                  </li>
                  <li>
                    <strong>Medicamentos y químicos regulados:</strong> medicamentos sujetos a receta médica, fármacos sin registro sanitario o insumos médicos regulados que requieran permisos especiales de importación ante el Ministerio de Salud.
                  </li>
                  <li>
                    <strong>Alimentos perecederos y productos de origen vegetal o animal:</strong> alimentos frescos o que requieran refrigeración, plantas, semillas, tierra, madera sin tratar, animales vivos o disecados y productos de origen animal sin procesar.
                  </li>
                  <li>
                    <strong>Mercancía ilegal o falsificada:</strong> réplicas no autorizadas o falsificaciones, productos de piratería y material pornográfico ilegal.
                  </li>
                </ul>
              </div>

              <ul className="space-y-4 list-none pl-0">
                <li className="pl-7 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">5.3.</span>
                  <strong>Retención y sanciones.</strong> Si se detecta mercancía prohibida, JRS Cargo podrá retener el paquete y notificar a las autoridades competentes cuando la ley así lo exija. Los gastos, multas, sanciones y costos de retención o destrucción que se generen por intentar enviar mercancía prohibida serán responsabilidad exclusiva del Cliente.
                </li>
              </ul>

              {/* SECCIÓN 6 */}
              <h2 className="text-2xl mt-10 mb-4">6. Aceptación de los términos</h2>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 sm:p-6 text-slate-800 text-sm leading-relaxed space-y-3">
                <p className="m-0">
                  El uso de los servicios de JRS Cargo implica que el Cliente declara haber leído y comprendido estos Términos y Condiciones, y que acepta sus disposiciones. JRS Cargo se reserva el derecho de actualizar este documento en cualquier momento y comunicar los cambios a través de sus canales oficiales.
                </p>
                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
                  <span><strong>JRS Cargo S.A.</strong> — Costa Rica</span>
                  <span className="font-semibold text-brand-blue">Fecha de validez oficial: 1 de abril del 2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
