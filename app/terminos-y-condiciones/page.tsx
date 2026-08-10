import React from 'react';
import { FileText } from 'lucide-react';

export default function TerminosYCondiciones() {
  return (
    <>
      
      <main className="pt-28 pb-20 bg-gray-50 min-h-screen">
        <div className="container-max">
          <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-brand-blue p-8 sm:p-12 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-10">
                <FileText size={200} />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-4 relative z-10">Términos y Condiciones</h1>
              <p className="text-white/80 text-lg relative z-10">JRS Cargo Costa Rica</p>
            </div>
            
            <div className="p-8 sm:p-12 prose prose-blue max-w-none prose-headings:text-brand-blue prose-headings:font-black prose-p:text-brand-text-gray prose-li:text-brand-text-gray">
              <p className="lead font-medium text-lg">
                El presente documento establece los Términos y Condiciones que regulan la prestación de los servicios de transporte, logística y recepción de paquetes brindados por JRS Cargo (en adelante, &quot;La Empresa&quot;). Al hacer uso de nuestros servicios o solicitar el envío de paquetes a nuestras direcciones, el cliente (en adelante, &quot;El Cliente&quot;) acepta plenamente y sin reservas las cláusulas aquí descritas.
              </p>

              <hr className="my-8 border-gray-100" />

              <h2 className="text-2xl mt-8 mb-4">1. Uso de la Dirección de Entrega (Casillero / Warehouse)</h2>
              <ul className="space-y-2 list-none pl-0">
                <li className="pl-6 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">1.1.</span> 
                  El Cliente es responsable de ingresar de forma exacta y completa la dirección proporcionada por JRS Cargo en las plataformas de compras donde realice sus pedidos (Amazon, eBay, USPS, etc.), incluyendo su número de casillero o código de cliente cuando aplique.
                </li>
                <li className="pl-6 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">1.2.</span> 
                  JRS Cargo no se hace responsable por paquetes entregados en direcciones erróneas debido a equivocaciones cometidas por el Cliente al realizar la compra.
                </li>
              </ul>

              <h2 className="text-2xl mt-10 mb-4">2. Manejo de Paquetes y Entregas por Proveedores (USPS, FedEx, UPS, Correo Local, etc.)</h2>
              <ul className="space-y-4 list-none pl-0">
                <li className="pl-8 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">2.1.</span> 
                  <strong className="text-gray-900">Confirmación de Recepción:</strong> La responsabilidad de JRS Cargo sobre la custodia y manejo de cualquier mercancía inicia únicamente a partir del momento en que el paquete es físicamente recibido e ingresado en el sistema en nuestras bodegas autorizadas de origen.
                </li>
                <li className="pl-8 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">2.2.</span> 
                  <strong className="text-gray-900">Estatus del Rastreo (Tracking) y Prácticas de Proveedores:</strong> La actualización de un estado como &quot;Entregado&quot; (Delivered) en el rastreo del proveedor o del correo público/privado (como USPS, FedEx, DHL, etc.) no constituye una prueba de recepción física. Los transportistas locales con frecuencia marcan paquetes como entregados antes de dejarlos físicamente o los entregan en direcciones incorrectas.
                </li>
                <li className="pl-8 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">2.3.</span> 
                  <strong className="text-gray-900">Exención por Fallas del Proveedor:</strong> JRS Cargo no se responsabiliza por la pérdida, extravío o entrega errónea de paquetes por parte de empresas de correo o transportistas locales si no existe un registro de ingreso confirmado en el sistema de JRS Cargo. Dichos reclamos deben realizarse directamente ante el vendedor o la empresa de transporte emisor.
                </li>
              </ul>

              <h2 className="text-2xl mt-10 mb-4">3. Responsabilidad sobre Mercancía Dañada o Envíos Incorrectos por el Vendedor</h2>
              <ul className="space-y-4 list-none pl-0">
                <li className="pl-8 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">3.1.</span> 
                  <strong className="text-gray-900">Estado de la Mercancía:</strong> JRS Cargo opera estrictamente como una empresa de transporte y logística. No nos hacemos responsables por paquetes que lleguen a nuestras bodegas con mercancía dañada, rota, incompleta, defectuosa o que contenga artículos distintos a los solicitados por el Cliente (envíos incorrectos por parte del vendedor o tienda emisor).
                </li>
                <li className="pl-8 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">3.2.</span> 
                  <strong className="text-gray-900">Empaque Original:</strong> JRS Cargo transporta los paquetes en las mismas condiciones físicas en las que son entregados por el vendedor. Es responsabilidad exclusiva de la tienda o proveedor garantizar el embalaje adecuado para proteger el producto.
                </li>
              </ul>

              <h2 className="text-2xl mt-10 mb-4">4. Póliza de Seguro y Cobertura de Transporte</h2>
              <ul className="space-y-4 list-none pl-0">
                <li className="pl-8 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">4.1.</span> 
                  <strong className="text-gray-900">Validez de la Cobertura:</strong> JRS Cargo cuenta con cobertura de seguro para la carga. Esta cobertura se activa únicamente cuando el paquete figura registrado e ingresado en nuestros sistemas y aplica para eventualidades, pérdidas o siniestros ocurridos durante el traslado internacional desde nuestras bodegas en Miami, España o China hacia Costa Rica.
                </li>
                <li className="pl-8 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">4.2.</span> 
                  <strong className="text-gray-900">Plazo de Aplicación del Seguro:</strong> Una vez reportado e iniciado un incidente que cumpla con las condiciones de cobertura, el seguro cuenta con un periodo de aplicación y resolución de tres (3) días hábiles.
                </li>
                <li className="pl-8 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">4.3.</span> 
                  <strong className="text-gray-900">Exclusiones del Seguro:</strong> El seguro no cubre paquetes que no hayan sido registrados previamente en el sistema de JRS Cargo, ni aquellos daños originados por mal empaque desde la tienda de origen, defectos de fábrica o entregas fallidas de transportistas y correos locales antes de su ingreso formal a nuestra bodega.
                </li>
              </ul>

              <h2 className="text-2xl mt-10 mb-4">5. Inspección de Paquetes y Mercancía Prohibida</h2>
              <ul className="space-y-4 list-none pl-0 mb-6">
                <li className="pl-8 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">5.1.</span> 
                  <strong className="text-gray-900">Derecho de Inspección:</strong> JRS Cargo se reserva el derecho de abrir e inspeccionar el contenido de las compras por razones de seguridad, regulaciones aduaneras o sospecha de mercancía no permitida.
                </li>
                <li className="pl-8 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">5.2.</span> 
                  <strong className="text-gray-900">Mercancía Prohibida:</strong> Está estrictamente prohibido el envío de las siguientes categorías de artículos:
                </li>
              </ul>
              
              <div className="bg-red-50 border border-red-100 p-6 rounded-2xl mb-6">
                <ul className="space-y-3 mb-0 text-red-900">
                  <li><strong>Materiales peligrosos e inflamables:</strong> Explosivos, fuegos artificiales, fósforos, encendedores, aerosoles, gas comprimido, pinturas, solventes, corrosivos, venenos y baterías de litio sueltas o defectuosas.</li>
                  <li><strong>Armas y artículos tácticos:</strong> Armas de fuego, armas blancas, municiones, partes de armas, accesorios para armas, miras telescópicas, equipo táctico de uso exclusivo militar/policial, taser (electrochoque) y aerosol de pimienta.</li>
                  <li><strong>Sustancias ilícitas:</strong> Drogas, estupefacientes, sustancias psicotrópicas o precursores químicos de uso no autorizado.</li>
                  <li><strong>Valores y dinero:</strong> Dinero en efectivo, monedas, billetes de lotería, joyas de oro/plata o alto valor, piedras preciosas, cheques y títulos valores.</li>
                  <li><strong>Medicamentos y químicos regulados:</strong> Medicamentos sujetos a receta médica, fármacos sin registro sanitario o insumos médicos regulados que requieran permisos especiales de importación ante el Ministerio de Salud.</li>
                  <li><strong>Alimentos perecederos y origen vegetal/animal:</strong> Alimentos frescos o que requieran refrigeración, plantas, semillas, tierra, madera no tratada, animales vivos o disecados y productos de origen animal no procesados.</li>
                  <li><strong>Mercancía ilegal o falsificada:</strong> Réplicas no autorizadas (falsificaciones), piratería y material pornográfico ilegal.</li>
                </ul>
              </div>
              
              <ul className="space-y-4 list-none pl-0">
                <li className="pl-8 relative">
                  <span className="absolute left-0 top-0 font-bold text-brand-blue">5.3.</span> 
                  <strong className="text-gray-900">Retención y Sanciones:</strong> En caso de detectar mercancía prohibida, JRS Cargo retendrá el paquete y notificará a las autoridades competentes si la ley así lo exige. Todos los gastos, multas, sanciones o costos de retención y destrucción generados por el intento de envío de mercancía prohibida serán responsabilidad exclusiva del Cliente.
                </li>
              </ul>

              <h2 className="text-2xl mt-10 mb-4">6. Aceptación de los Términos</h2>
              <p>
                El uso de los servicios de JRS Cargo implica la lectura, comprensión y aceptación incondicional de los presentes Términos y Condiciones. La Empresa se reserva el derecho de actualizar este documento en cualquier momento a través de sus canales oficiales.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
