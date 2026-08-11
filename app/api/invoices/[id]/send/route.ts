import { NextResponse } from 'next/server';
import { getInvoiceById } from '@/lib/supabase';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;

    if (!smtpUser || !smtpPass) {
      return NextResponse.json({ success: false, error: 'SMTP credentials not configured' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const invoice = await getInvoiceById(params.id);
    
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    if (!invoice.clients || !invoice.clients.email) {
      return NextResponse.json({ success: false, error: 'Client email not found' }, { status: 400 });
    }

    let customSubject = `Factura #${invoice.invoice_number} de JRS CARGO S.A.`;
    let customMessage = 'Adjunto a este correo encontrarás los detalles de tu factura reciente. Por favor, revisa la información a continuación.';

    try {
      const body = await request.json();
      if (body.subject) customSubject = body.subject;
      if (body.message) {
        // Convert plain text newlines to HTML breaks
        customMessage = body.message.replace(/\n/g, '<br/>');
      }
    } catch {
      // Ignorar si no hay body
    }

    // Generate HTML for the email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #12435e; padding: 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px;">Factura #${invoice.invoice_number}</h1>
          <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">JRS CARGO S.A.</p>
        </div>
        <div style="padding: 24px;">
          <p>Hola <strong>${invoice.clients.name}</strong>,</p>
          <p>${customMessage}</p>
          
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Subtotal</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 500; font-size: 14px; color: #374151;">$${invoice.subtotal.toFixed(2)} USD</td>
              </tr>
              ${invoice.discount_percent > 0 ? `
              <tr>
                <td style="padding: 8px 0; color: #10b981; font-size: 14px;">Descuento (${invoice.discount_percent}%)</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 500; font-size: 14px; color: #10b981;">-$${((invoice.subtotal * invoice.discount_percent) / 100).toFixed(2)} USD</td>
              </tr>
              ` : ''}
              <tr style="border-top: 1px solid #e5e7eb;">
                <td style="padding: 12px 0 8px 0; color: #6b7280; font-size: 14px; font-weight: bold;">Total a Pagar</td>
                <td style="padding: 12px 0 8px 0; text-align: right; font-weight: bold; font-size: 18px; color: #12435e;">$${invoice.total.toFixed(2)} USD</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Fecha de Emisión</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 500; font-size: 14px; color: #374151;">${new Date(invoice.issue_date).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Estado</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 500; font-size: 14px; color: #374151;">${invoice.status}</td>
              </tr>
            </table>
          </div>
          
          <h3 style="color: #12435e; font-size: 16px; margin-top: 32px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Detalle de Servicios</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <thead>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <th style="text-align: left; padding: 8px; color: #6b7280; font-size: 12px; text-transform: uppercase;">Servicio / Rastreo</th>
                <th style="text-align: right; padding: 8px; color: #6b7280; font-size: 12px; text-transform: uppercase;">Importe</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map((item: { service_name: string; tracking_number?: string; weight?: string | number; amount: number }) => `
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 8px;">
                    <div style="font-weight: 500; color: #374151; font-size: 14px;">${item.service_name}</div>
                    <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">Tracking: ${item.tracking_number || 'N/A'} (Peso: ${item.weight || 0}lb)</div>
                  </td>
                  <td style="padding: 12px 8px; text-align: right; font-weight: 500; color: #374151; font-size: 14px;">
                    $${item.amount.toFixed(2)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
            <p>Gracias por elegir a JRS CARGO.</p>
            <p>info@jrscargocr.com | +506 72601238</p>
          </div>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"JRS Cargo Facturación" <${smtpUser}>`,
      to: invoice.clients.email,
      subject: customSubject,
      html: htmlContent,
    });

    return NextResponse.json({ success: true, messageId: info.messageId }, { status: 200 });
  } catch (err) {
    console.error('SMTP Error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Error sending email via SMTP';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
