import { NextResponse } from 'next/server';

function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email).trim())) {
      return NextResponse.json(
        { error: 'Formato de correo electrónico inválido.' },
        { status: 400 }
      );
    }

    const safeCompany = escapeHtml(companyName);
    const safeContact = escapeHtml(contactName);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);
    const safeVolume = escapeHtml(volume);
    const safeMessage = escapeHtml(message);

    // Save to Supabase for monitoring
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      if (supabaseUrl && supabaseKey) {
        await fetch(supabaseUrl + '/rest/v1/contact_submissions', {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': 'Bearer ' + supabaseKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            company_name: String(companyName).substring(0, 200),
            contact_name: String(contactName).substring(0, 200),
            email: String(email).substring(0, 200),
            phone: String(phone).substring(0, 50),
            volume: String(volume || '').substring(0, 50),
            message: String(message || '').substring(0, 2000),
            status: 'nuevo'
          })
        });
      }
    } catch {
      // Non-critical, continue with email
    }

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      // Return simulated success if no Resend key is configured
      return NextResponse.json({ success: true, simulated: true });
    }

    // HTML del correo sanitizado
    const emailHtml = `
      <h2>Nueva Solicitud de Cotización Empresarial</h2>
      <p>Un cliente mayorista/empresarial ha llenado el formulario en la web de JRS CARGO.</p>
      <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 600px;">
        <tr>
          <td style="background: #f3f4f6; font-weight: bold; width: 30%;">Empresa</td>
          <td>${safeCompany}</td>
        </tr>
        <tr>
          <td style="background: #f3f4f6; font-weight: bold;">Contacto</td>
          <td>${safeContact}</td>
        </tr>
        <tr>
          <td style="background: #f3f4f6; font-weight: bold;">Correo</td>
          <td><a href="mailto:${safeEmail}">${safeEmail}</a></td>
        </tr>
        <tr>
          <td style="background: #f3f4f6; font-weight: bold;">Teléfono</td>
          <td>${safePhone}</td>
        </tr>
        <tr>
          <td style="background: #f3f4f6; font-weight: bold;">Volumen Mes</td>
          <td>${safeVolume} lbs</td>
        </tr>
        <tr>
          <td style="background: #f3f4f6; font-weight: bold;">Detalles</td>
          <td>${safeMessage || 'Sin detalles adicionales'}</td>
        </tr>
      </table>
      <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
        Este correo fue generado automáticamente desde la web de JRS CARGO CR.
      </p>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: 'JRS Cargo Web <onboarding@resend.dev>',
        to: 'info@jrscargocr.com',
        subject: `Cotización Corporativa: ${safeCompany}`,
        html: emailHtml,
        reply_to: String(email).trim()
      })
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error('Error enviando correo con Resend:', errorData);
      return NextResponse.json(
        { error: 'No se pudo enviar el correo.' },
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
