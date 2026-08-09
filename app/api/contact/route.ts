import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, contactName, email, phone, volume, message } = body;

    // Validate inputs
    if (!companyName || !contactName || !email || !phone) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;

    // Si no hay API key configurada, solo registramos en consola (útil para desarrollo)
    if (!apiKey) {
      console.log('--- NUEVA SOLICITUD EMPRESARIAL ---');
      console.log(`Empresa: ${companyName}`);
      console.log(`Contacto: ${contactName}`);
      console.log(`Email: ${email}`);
      console.log(`Teléfono: ${phone}`);
      console.log(`Volumen: ${volume}`);
      console.log(`Mensaje: ${message}`);
      console.log('-----------------------------------');
      console.warn('NOTA: El correo no se envió porque falta RESEND_API_KEY en .env.local');
      
      // Retornamos success simulado para que la UI funcione
      return NextResponse.json({ success: true, simulated: true });
    }

    // HTML del correo
    const emailHtml = `
      <h2>Nueva Solicitud de Cotización Empresarial</h2>
      <p>Un cliente mayorista/empresarial ha llenado el formulario en la web de JRS CARGO.</p>
      <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 600px;">
        <tr>
          <td style="background: #f3f4f6; font-weight: bold; width: 30%;">Empresa</td>
          <td>${companyName}</td>
        </tr>
        <tr>
          <td style="background: #f3f4f6; font-weight: bold;">Contacto</td>
          <td>${contactName}</td>
        </tr>
        <tr>
          <td style="background: #f3f4f6; font-weight: bold;">Correo</td>
          <td><a href="mailto:${email}">${email}</a></td>
        </tr>
        <tr>
          <td style="background: #f3f4f6; font-weight: bold;">Teléfono</td>
          <td>${phone}</td>
        </tr>
        <tr>
          <td style="background: #f3f4f6; font-weight: bold;">Volumen Mes</td>
          <td>${volume} lbs</td>
        </tr>
        <tr>
          <td style="background: #f3f4f6; font-weight: bold;">Detalles</td>
          <td>${message || 'Sin detalles adicionales'}</td>
        </tr>
      </table>
      <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
        Este correo fue generado automáticamente desde la web de JRS CARGO CR.
      </p>
    `;

    // Enviar usando la API HTTP de Resend (sin dependencias)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: 'JRS Cargo Web <onboarding@resend.dev>', // Debe actualizarse si tienes un dominio verificado
        to: 'info@jrscargocr.com',
        subject: `Cotización Corporativa: ${companyName}`,
        html: emailHtml,
        reply_to: email
      })
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error('Error enviando correo con Resend:', errorData);
      return NextResponse.json(
        { error: 'No se pudo enviar el correo a través de Resend.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Error procesando la solicitud.' },
      { status: 500 }
    );
  }
}
