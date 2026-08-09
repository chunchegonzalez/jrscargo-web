import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos y Condiciones | JRS CARGO CR',
};

export default function TermsAndConditions() {
  return (
    <div className="section-padding bg-white min-h-[60vh]">
      <div className="container-max max-w-3xl">
        <h1 className="text-3xl font-bold text-brand-blue mb-6">Términos y Condiciones</h1>
        
        <div className="prose prose-blue max-w-none text-brand-text-gray space-y-6">
          <p>
            El presente documento establece los Términos y Condiciones que regulan la prestación de los servicios de transporte, logística y recepción de paquetes brindados por JRS Cargo (en adelante, "La Empresa"). Al hacer uso de nuestros servicios o solicitar el envío de paquetes a nuestras direcciones, el cliente (en adelante, "El Cliente") acepta plenamente y sin reservas las cláusulas aquí descritas.
          </p>

          <h2 className="text-xl font-bold text-brand-blue mt-8">1. Uso de la Dirección de Entrega (Casillero / Warehouse)</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>1.1.</strong> El Cliente es responsable de ingresar de forma exacta y completa la dirección proporcionada por JRS Cargo en las plataformas de compras donde realice sus pedidos (Amazon, eBay, USPS, etc.), incluyendo su número de casillero o código de cliente cuando aplique.</li>
            <li><strong>1.2.</strong> JRS Cargo no se hace responsable por paquetes entregados en direcciones erróneas debido a equivocaciones cometidas por el Cliente al realizar la compra.</li>
          </ul>

          <h2 className="text-xl font-bold text-brand-blue mt-8">2. Manejo de Paquetes y Entregas por Proveedores (USPS, FedEx, UPS, Correo Local, etc.)</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>2.1. Confirmación de Recepción:</strong> La responsabilidad de JRS Cargo sobre la custodia y manejo de cualquier mercancía inicia únicamente a partir del momento en que el paquete es físicamente recibido e ingresado en el sistema en nuestras bodegas autorizadas de origen.</li>
            <li><strong>2.2. Estatus del Rastreo (Tracking) y Prácticas de Proveedores:</strong> La actualización de un estado como "Entregado" (Delivered) en el rastreo del proveedor o del correo público/privado (como USPS, FedEx, DHL, etc.) no constituye una prueba de recepción física. Los transportistas locales con frecuencia marcan paquetes como entregados antes de dejarlos físicamente o los entregan en direcciones incorrectas.</li>
            <li><strong>2.3. Exención por Fallas del Proveedor:</strong> JRS Cargo no se responsabiliza por la pérdida, extravío o entrega errónea de paquetes por parte de empresas de correo o transportistas locales si no existe un registro de ingreso confirmado en el sistema de JRS Cargo. Dichos reclamos deben realizarse directamente ante el vendedor o la empresa de transporte emisor.</li>
          </ul>

          <h2 className="text-xl font-bold text-brand-blue mt-8">3. Responsabilidad sobre Mercancía Dañada o Envíos Incorrectos por el Vendedor</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>3.1. Estado de la Mercancía:</strong> JRS Cargo opera estrictamente como una empresa de transporte y logística. No nos hacemos responsables por paquetes que lleguen a nuestras bodegas con mercancía dañada, rota, incompleta, defectuosa o que contenga artículos distintos a los solicitados por el Cliente (envíos incorrectos por parte del vendedor o tienda emisor).</li>
            <li><strong>3.2. Empaque Original:</strong> JRS Cargo transporta los paquetes en las mismas condiciones físicas en las que son entregados por el vendedor. Es responsabilidad exclusiva de la tienda o proveedor garantizar el embalaje adecuado para proteger el producto.</li>
          </ul>

          <h2 className="text-xl font-bold text-brand-blue mt-8">4. Póliza de Seguro y Cobertura de Transporte</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>4.1. Validez de la Cobertura:</strong> JRS Cargo cuenta con cobertura de seguro para la carga. Esta cobertura se activa únicamente cuando el paquete figura registrado e ingresado en nuestros sistemas y aplica para eventualidades, pérdidas o siniestros ocurridos durante el traslado internacional desde nuestras bodegas en Miami, España o China hacia Costa Rica.</li>
            <li><strong>4.2. Plazo de Aplicación del Seguro:</strong> Una vez reportado e iniciado un incidente que cumpla con las condiciones de cobertura, el seguro cuenta con un periodo de aplicación y resolución de tres (3) días hábiles.</li>
            <li><strong>4.3. Exclusiones del Seguro:</strong> El seguro no cubre paquetes que no hayan sido registrados previamente en el sistema de JRS Cargo, ni aquellos daños originados por mal empaque desde la tienda de origen, defectos de fábrica o entregas fallidas de transportistas y correos locales antes de su ingreso formal a nuestra bodega.</li>
          </ul>

          <h2 className="text-xl font-bold text-brand-blue mt-8">5. Inspección de Paquetes y Contenido Prohibido</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>5.1.</strong> JRS Cargo se reserva el derecho de inspeccionar el contenido de las compras por razones de seguridad, regulaciones aduaneras o sospecha de mercancía no permitida.</li>
            <li><strong>5.2.</strong> Está estrictamente prohibido el envío de dinero en efectivo, joyas de alto valor, sustancias ilícitas, armas, material inflamable o peligroso, y cualquier artículo restringido por las leyes aduaneras de Costa Rica e internacionales.</li>
          </ul>

          <h2 className="text-xl font-bold text-brand-blue mt-8">6. Aceptación de los Términos</h2>
          <p>
            El uso de los servicios de JRS Cargo implica la lectura, comprensión y aceptación incondicional de los presentes Términos y Condiciones. La Empresa se reserva el derecho de actualizar este documento en cualquier momento a través de sus canales oficiales.
          </p>
        </div>
      </div>
    </div>
  );
}
