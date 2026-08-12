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

    const exchangeRate = invoice.exchange_rate || 530;
    const totalColones = (invoice.total * exchangeRate).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

    // Generate HTML for the email
    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="background-color: #12435e; padding: 32px 32px 24px 32px;">
          <table style="width: 100%;">
            <tr>
              <td>
                <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">FACTURA</h1>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.7);">${invoice.invoice_number}</p>
              </td>
              <td style="text-align: right;">
                <img src="https://www.jrscargocr.com/logo.png" alt="JRS Cargo" style="height: 50px; width: auto;" />
              </td>
            </tr>
          </table>
        </div>
        
        <!-- Franja amarilla -->
        <div style="height: 4px; background: linear-gradient(90deg, #F5A623, #F5A623 60%, transparent);"></div>
        
        <!-- Cuerpo -->
        <div style="padding: 32px;">
          
          <p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 8px 0;">
            Hola <strong>${invoice.clients.name}</strong>,
          </p>
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 24px 0;">
            ${customMessage}
          </p>
          
          <!-- Resumen de factura -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 28px;">
            <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Factura</td>
                  <td style="text-align: right; font-size: 14px; font-weight: 700; color: #1e293b;">${invoice.invoice_number}</td>
                </tr>
              </table>
            </div>
            <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Fecha de Emisión</td>
                  <td style="text-align: right; font-size: 14px; font-weight: 500; color: #1e293b;">${new Date(invoice.issue_date).toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                </tr>
              </table>
            </div>
            <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Subtotal</td>
                  <td style="text-align: right; font-size: 14px; font-weight: 500; color: #1e293b;">$${invoice.subtotal.toFixed(2)} USD</td>
                </tr>
              </table>
            </div>
            ${invoice.discount_percent > 0 ? `
            <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="font-size: 12px; color: #10b981; text-transform: uppercase; letter-spacing: 0.5px;">Descuento (${invoice.discount_percent}%)</td>
                  <td style="text-align: right; font-size: 14px; font-weight: 500; color: #10b981;">-$${((invoice.subtotal * invoice.discount_percent) / 100).toFixed(2)} USD</td>
                </tr>
              </table>
            </div>
            ` : ''}
            <div style="padding: 18px 20px; background-color: #12435e;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="font-size: 12px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">Total USD</td>
                  <td style="text-align: right; font-size: 22px; font-weight: 800; color: #ffffff;">$${invoice.total.toFixed(2)}</td>
                </tr>
              </table>
            </div>
            <div style="padding: 16px 20px; background-color: #fffbeb; border-top: 1px solid #fde68a;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">Total Colones</td>
                  <td style="text-align: right; font-size: 18px; font-weight: 800; color: #92400e;">₡${totalColones}</td>
                </tr>
              </table>
              <p style="margin: 4px 0 0 0; font-size: 10px; color: #b45309; text-align: right;">T.C. ₡${exchangeRate} por $1 USD</p>
            </div>
          </div>

          <!-- Detalle de servicios -->
          <p style="font-size: 13px; font-weight: 700; color: #12435e; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;">Detalle de Servicios</p>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #12435e;">
                <th style="text-align: left; padding: 10px 8px; color: #12435e; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Servicio</th>
                <th style="text-align: left; padding: 10px 8px; color: #12435e; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Tracking</th>
                <th style="text-align: center; padding: 10px 8px; color: #12435e; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Peso</th>
                <th style="text-align: right; padding: 10px 8px; color: #12435e; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Tarifa</th>
                <th style="text-align: right; padding: 10px 8px; color: #12435e; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Importe</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map((item: { service_name: string; tracking_number?: string; weight?: string | number; rate?: string | number; amount: number }) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px 8px; font-size: 13px; color: #374151; font-weight: 500;">${item.service_name}</td>
                  <td style="padding: 12px 8px; font-size: 12px; color: #6b7280; font-family: monospace;">${item.tracking_number || '-'}</td>
                  <td style="padding: 12px 8px; font-size: 12px; color: #6b7280; text-align: center;">${item.weight || '-'} lb</td>
                  <td style="padding: 12px 8px; font-size: 12px; color: #6b7280; text-align: right;">$${item.rate ? Number(item.rate).toFixed(2) : '0.00'}</td>
                  <td style="padding: 12px 8px; font-size: 13px; color: #1e293b; font-weight: 700; text-align: right;">$${item.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${invoice.notes ? `
          <div style="margin-top: 24px; padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">${invoice.notes.replace(/\n/g, '<br/>')}</p>
          </div>
          ` : ''}

        </div>
        
        <!-- Footer -->
        <div style="background-color: #12435e; padding: 24px 32px; text-align: center;">
          <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #ffffff;">JRS CARGO S.A.</p>
          <p style="margin: 0 0 12px 0; font-size: 11px; color: rgba(255,255,255,0.6);">San Pablo de Heredia, Costa Rica</p>
          <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.5);">
            info@jrscargocr.com &nbsp;|&nbsp; +506 72601238 &nbsp;|&nbsp; www.jrscargocr.com
          </p>
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
