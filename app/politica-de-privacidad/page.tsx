import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad | JRS CARGO CR',
};

export default function PrivacyPolicy() {
  return (
    <div className="section-padding bg-white min-h-[60vh]">
      <div className="container-max max-w-3xl">
        <h1 className="text-3xl font-bold text-brand-blue mb-6">Política de Privacidad</h1>
        
        <div className="prose prose-blue max-w-none text-brand-text-gray space-y-6">
          <p>
            En JRS Cargo (en adelante, &quot;La Empresa&quot;), nos comprometemos a proteger la privacidad y seguridad de los datos personales de nuestros clientes y usuarios (en adelante, &quot;El Usuario&quot;). La presente Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos y protegemos la información personal proporcionada a través de nuestros canales digitales, plataformas de rastreo, formularios o servicio al cliente, en cumplimiento con la normativa aplicable en Costa Rica (Ley N° 8968).
          </p>

          <h2 className="text-xl font-bold text-brand-blue mt-8">1. Información que Recopilamos</h2>
          <p className="mb-2">Para la correcta prestación de nuestros servicios de logística, consolidación y transporte internacional, JRS Cargo recopila las siguientes categorías de datos personales:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Datos de identificación:</strong> Nombre completo, número de cédula de identidad, dimex o pasaporte.</li>
            <li><strong>Datos de contacto:</strong> Dirección de correo electrónico, número de teléfono, dirección física de entrega en Costa Rica.</li>
            <li><strong>Información de envíos y paquetes:</strong> Números de rastreo (tracking), facturas de compra, valor declarado, descripción e historial de paquetes.</li>
            <li><strong>Información de facturación:</strong> Datos necesarios para la emisión de facturas electrónicas y comprobantes de pago.</li>
          </ul>

          <h2 className="text-xl font-bold text-brand-blue mt-8">2. Finalidad del Tratamiento de los Datos</h2>
          <p className="mb-2">Los datos personales recolectados serán utilizados únicamente para los siguientes fines:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Crear y gestionar la cuenta de casillero o usuario de El Usuario.</li>
            <li>Notificar el estado de recepción, tránsito, aduana y entrega de los paquetes.</li>
            <li>Gestionar trámites aduanales, cobros de fletes y facturación del servicio.</li>
            <li>Brindar atención al cliente, resolver consultas, reclamos o aplicar coberturas de seguro.</li>
            <li>Enviar comunicaciones informativas, operativas o promocionales relacionadas exclusivamente con los servicios de JRS Cargo (El Usuario podrá solicitar la baja de envíos comerciales en cualquier momento).</li>
          </ul>

          <h2 className="text-xl font-bold text-brand-blue mt-8">3. Almacenamiento y Seguridad de la Información</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>3.1.</strong> JRS Cargo implementa medidas de seguridad técnicas, administrativas y físicas orientadas a proteger la información personal contra el acceso no autorizado, pérdida, alteración, divulgación o destrucción.</li>
            <li><strong>3.2.</strong> Los datos personales son almacenados en bases de datos seguras y su acceso está restringido únicamente al personal autorizado que requiera procesar la información para cumplir con los servicios contratados.</li>
          </ul>

          <h2 className="text-xl font-bold text-brand-blue mt-8">4. Transferencia de Datos a Terceros</h2>
          <p className="mb-2">JRS Cargo no vende, alquila ni cede los datos personales de sus usuarios a terceros. No obstante, la información podrá ser compartida estrictamente con:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Autoridades gubernamentales y aduaneras:</strong> Cuando sea requerido por ley o por las autoridades fiscales y aduaneras de Costa Rica para el desalmacenaje de mercancía.</li>
            <li><strong>Proveedores de logística y mensajería local:</strong> Proveedores subcontratados únicamente para realizar la entrega final del paquete en el domicilio de El Usuario dentro del territorio nacional.</li>
          </ul>

          <h2 className="text-xl font-bold text-brand-blue mt-8">5. Derechos de los Usuarios (Derechos ARCO)</h2>
          <p className="mb-2">De conformidad con la legislación costarricense, El Usuario tiene derecho a ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO) sobre sus datos personales en cualquier momento:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Acceso:</strong> Solicitar qué datos personales posee La Empresa y cómo son procesados.</li>
            <li><strong>Rectificación:</strong> Solicitar la corrección de datos inexactos o desactualizados.</li>
            <li><strong>Cancelación / Oposición:</strong> Solicitar la eliminación de sus datos de nuestras bases de datos o negarse al tratamiento de los mismos para fines específicos (siempre que esto no impida el cumplimiento de obligaciones legales o contratos activos de envío).</li>
          </ul>
          <p className="mt-2">Para ejercer cualquiera de estos derechos, El Usuario puede enviar una solicitud por escrito a nuestros canales oficiales de atención al cliente.</p>

          <h2 className="text-xl font-bold text-brand-blue mt-8">6. Uso de Cookies y Medios Digitales</h2>
          <p>
            Nuestro sitio web o plataformas digitales pueden utilizar cookies u otras tecnologías para mejorar la experiencia de navegación, recordar preferencias y analizar el tráfico de usuarios de forma anónima. El Usuario puede configurar su navegador para rechazar las cookies si así lo desea.
          </p>

          <h2 className="text-xl font-bold text-brand-blue mt-8">7. Cambios en la Política de Privacidad</h2>
          <p>
            JRS Cargo se reserva el derecho de modificar o actualizar esta Política de Privacidad en cualquier momento. Las modificaciones entrarán en vigor a partir de su publicación en nuestros canales oficiales. Se recomienda a El Usuario revisar periódicamente este documento.
          </p>
        </div>
      </div>
    </div>
  );
}
