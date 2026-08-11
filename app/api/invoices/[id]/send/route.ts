import { NextResponse } from 'next/server';
import { getInvoiceById } from '@/lib/supabase';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ success: false, error: 'Resend API key not configured' }, { status: 500 });
    }

    const resend = new Resend(resendApiKey);
    const invoice = await getInvoiceById(params.id);
    
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    if (!invoice.clients || !invoice.clients.email) {
      return NextResponse.json({ success: false, error: 'Client email not found' }, { status: 400 });
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
          <p>Adjunto a este correo encontrarás los detalles de tu factura reciente. Por favor, revisa la información a continuación.</p>
          
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Total a Pagar</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 18px; color: #12435e;">$${invoice.total.toFixed(2)} USD</td>
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
              ${invoice.items.map((item: any) => `
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

    const { data, error } = await resend.emails.send({
      from: 'JRS Cargo Facturación <facturacion@jrscargocr.com>',
      to: [invoice.clients.email],
      subject: `Factura #${invoice.invoice_number} de JRS CARGO S.A.`,
      html: htmlContent,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error sending email';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
