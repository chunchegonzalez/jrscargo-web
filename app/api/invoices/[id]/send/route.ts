import { NextResponse } from 'next/server';
import { getInvoiceById } from '@/lib/supabase';
import { generateInvoicePdf } from '@/lib/invoice-pdf';
import { parseClientAddress } from '@/lib/billing';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

type InvoiceItem = {
  service_name: string;
  tracking_number?: string;
  weight?: string | number;
  rate?: string | number;
  amount: number;
};

function buildItemRow(item: InvoiceItem): string {
  const trackingPart = item.tracking_number ? '<span style="font-family:Consolas,Monaco,monospace;color:#475569;word-break:break-all;font-size:12px;">📦 ' + item.tracking_number + '</span>' : '';
  const weightPart = item.weight ? '<span style="font-weight:600;color:#334155;font-size:12px;">' + item.weight + ' lb</span>' : '';
  const sep = (item.tracking_number && item.weight) ? ' &nbsp;•&nbsp; ' : '';
  const metaLine = (trackingPart || weightPart) ? '<p style="margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.4;">' + trackingPart + sep + weightPart + '</p>' : '';

  return '<tr>' +
    '<td style="padding:14px 0;border-bottom:1px solid #f1f5f9;">' +
      '<table style="width:100%;border-collapse:collapse;">' +
        '<tr>' +
          '<td style="vertical-align:top;padding-right:16px;">' +
            '<p style="margin:0;font-size:14px;font-weight:700;color:#1e293b;line-height:1.4;">' + item.service_name + '</p>' +
            metaLine +
          '</td>' +
          '<td style="vertical-align:top;text-align:right;white-space:nowrap;width:95px;">' +
            '<p style="margin:0;font-size:15px;font-weight:700;color:#12435E;">$' + item.amount.toFixed(2) + '</p>' +
          '</td>' +
        '</tr>' +
      '</table>' +
    '</td>' +
  '</tr>';
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;

    if (!smtpUser || !smtpPass) {
      return NextResponse.json({ success: false, error: 'SMTP credentials not configured' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: smtpUser, pass: smtpPass },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });

    const invoice = await getInvoiceById(params.id);
    
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    if (!invoice.clients || !invoice.clients.email) {
      return NextResponse.json({ success: false, error: 'Client email not found' }, { status: 400 });
    }

    let customSubject = 'Comprobante de Compra #' + invoice.invoice_number + ' - JRS CARGO';
    let customMessage = 'Adjunto a este correo encontrarás los detalles de tu comprobante de compra reciente. Por favor, revisa la información a continuación.';
    let customCc = '';

    try {
      const body = await request.json();
      if (body.subject) customSubject = body.subject;
      if (body.message) {
        customMessage = body.message.replace(/\n/g, '<br/>');
      }
      if (body.cc !== undefined) {
        customCc = String(body.cc).trim();
      }
    } catch {
      // Ignorar si no hay body
    }

    const exchangeRate = invoice.exchange_rate || 530;
    const totalColones = (invoice.total * exchangeRate).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const [y, m, d] = (invoice.issue_date || '').split('T')[0].split('-').map(Number);
    const dateObj = y && m && d ? new Date(y, m - 1, d) : new Date();
    const issueDate = dateObj.toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' });

    const itemsHtml = invoice.items.map((item: InvoiceItem) => buildItemRow(item)).join('');

    const subtotalVal = Number(invoice.subtotal || invoice.total || 0);
    const totalVal = Number(invoice.total || 0);
    const rawDiscPercent = Number(invoice.discount_percent) || 0;
    const rawDiscAmt = Number(invoice.discount_amount) || 0;

    let computedDiscPercent = 0;
    let computedDiscAmt = 0;

    if (rawDiscPercent > 0) {
      computedDiscPercent = rawDiscPercent;
      computedDiscAmt = (subtotalVal * rawDiscPercent) / 100;
    } else if (rawDiscAmt > 0) {
      computedDiscAmt = rawDiscAmt;
      computedDiscPercent = subtotalVal > 0 ? Math.round((rawDiscAmt / subtotalVal) * 100 * 10) / 10 : 0;
    } else if (subtotalVal > totalVal && subtotalVal > 0) {
      computedDiscAmt = subtotalVal - totalVal;
      computedDiscPercent = Math.round(((subtotalVal - totalVal) / subtotalVal) * 100 * 10) / 10;
    }

    const discountHtml = computedDiscAmt > 0 ? (
      '<tr>' +
        '<td style="padding:6px 0;font-size:13px;color:#10b981;font-weight:600;">Descuento ' + (computedDiscPercent > 0 ? '(' + computedDiscPercent + '%)' : '') + '</td>' +
        '<td style="padding:6px 0;font-size:14px;color:#10b981;text-align:right;font-weight:700;">-$' + computedDiscAmt.toFixed(2) + '</td>' +
      '</tr>'
    ) : '';

    const notesHtml = invoice.notes ? (
      '<div style="margin-top:20px;padding:14px 18px;background:#f8fafc;border-left:4px solid #12435E;border-radius:0 10px 10px 0;">' +
        '<p style="margin:0;font-size:12px;color:#475569;line-height:1.6;font-style:italic;">' + invoice.notes.replace(/\n/g, '<br/>') + '</p>' +
      '</div>'
    ) : '';

    // Modern, spacious Email body HTML
    const htmlContent = [
      '<!DOCTYPE html>',
      '<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>',
      '<body style="margin:0;padding:24px 12px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;-webkit-font-smoothing:antialiased;">',
      '  <table role="presentation" style="width:100%;max-width:580px;margin:0 auto;background-color:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 20px rgba(0,0,0,0.04);border-collapse:separate;">',
      '    <tr><td style="padding:32px 32px 24px;">',
      '      <table role="presentation" style="width:100%;border-collapse:collapse;">',
      '        <tr>',
      '          <td style="vertical-align:middle;">',
      '            <img src="https://www.jrscargocr.com/logo.png" alt="JRS Cargo" style="height:40px;width:auto;display:block;" />',
      '          </td>',
      '          <td style="text-align:right;vertical-align:middle;">',
      '            <span style="display:inline-block;background:#eff6ff;color:#12435E;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;padding:4px 10px;border-radius:8px;border:1px solid #dbeafe;">Comprobante de Compra</span>',
      '            <p style="margin:4px 0 0;font-size:16px;font-weight:800;color:#12435E;">' + invoice.invoice_number + '</p>',
      '          </td>',
      '        </tr>',
      '      </table>',
      '    </td></tr>',
      '    <tr><td style="height:1px;background:#e2e8f0;margin:0;padding:0;font-size:0;line-height:0;"></td></tr>',
      '    <tr><td style="padding:28px 32px;">',
      '      <p style="font-size:16px;color:#0f172a;line-height:1.5;margin:0 0 8px;">Hola <strong>' + invoice.clients.name + '</strong>,</p>',
      '      <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px;">' + customMessage + '</p>',
      '      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:28px;">',
      '        <table role="presentation" style="width:100%;border-collapse:collapse;">',
      '          <tr>',
      '            <td style="padding:4px 0;font-size:12px;color:#64748b;">Fecha de Emisión</td>',
      '            <td style="padding:4px 0;font-size:13px;font-weight:600;color:#1e293b;text-align:right;">' + issueDate + '</td>',
      '          </tr>',
      '          <tr>',
      '            <td style="padding:4px 0;font-size:12px;color:#64748b;">Cliente</td>',
      '            <td style="padding:4px 0;font-size:13px;font-weight:600;color:#1e293b;text-align:right;">' + invoice.clients.name + '</td>',
      '          </tr>',
      '        </table>',
      '      </div>',
      '      <p style="font-size:11px;font-weight:800;color:#12435E;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Detalle de Paquetes y Servicios</p>',
      '      <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:24px;">',
      '        <tbody>' + itemsHtml + '</tbody>',
      '      </table>',
      '      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin-top:12px;">',
      '        <table role="presentation" style="width:100%;border-collapse:collapse;">',
      '          <tr>',
      '            <td style="padding:4px 0;font-size:13px;color:#64748b;">Subtotal</td>',
      '            <td style="padding:4px 0;font-size:14px;color:#1e293b;text-align:right;font-weight:600;">$' + subtotalVal.toFixed(2) + '</td>',
      '          </tr>',
      discountHtml,
      '          <tr>',
      '            <td style="padding:10px 0 4px;font-size:15px;font-weight:800;color:#12435E;border-top:1px solid #e2e8f0;">Total USD</td>',
      '            <td style="padding:10px 0 4px;font-size:22px;font-weight:900;color:#12435E;text-align:right;border-top:1px solid #e2e8f0;">$' + invoice.total.toFixed(2) + '</td>',
      '          </tr>',
      '          <tr>',
      '            <td style="padding:2px 0;font-size:12px;color:#64748b;">Total Colones</td>',
      '            <td style="padding:2px 0;font-size:14px;font-weight:700;color:#334155;text-align:right;">&#8353;' + totalColones + ' CRC</td>',
      '          </tr>',
      '          <tr>',
      '            <td colspan="2" style="padding:4px 0 0;font-size:11px;color:#94a3b8;text-align:right;">Tipo de cambio: &#8353;' + exchangeRate + ' por $1 USD</td>',
      '          </tr>',
      '        </table>',
      '      </div>',
      notesHtml,
      '      <div style="margin-top:24px;padding:12px 16px;background:#f1f5f9;border-radius:10px;text-align:center;">',
      '        <p style="margin:0;font-size:12px;color:#64748b;">📎 Encontrarás el comprobante oficial en formato PDF adjunto a este mensaje.</p>',
      '      </div>',
      '    </td></tr>',
      '    <tr><td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">',
      '      <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#12435E;">JRS CARGO S.A.</p>',
      '      <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.5;">San Pablo de Heredia, Costa Rica &nbsp;|&nbsp; Tel: +506 7260-1238<br/>info@jrscargocr.com &nbsp;|&nbsp; www.jrscargocr.com</p>',
      '    </td></tr>',
      '  </table>',
      '</body></html>'
    ].join('\n');

    // Generate PDF document buffer
    const pdfBuffer = await generateInvoicePdf(invoice);

    const clientExtra = parseClientAddress(invoice.clients?.address);
    const primaryEmail = invoice.clients.email?.trim();
    const secondaryEmail = customCc || clientExtra.secondary_email?.trim();

    const mailOptions: nodemailer.SendMailOptions = {
      from: '"JRS CARGO" <' + smtpUser + '>',
      to: primaryEmail,
      subject: customSubject,
      html: htmlContent,
      attachments: [{
        filename: 'Comprobante-' + invoice.invoice_number + '.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    };

    if (secondaryEmail && secondaryEmail.includes('@')) {
      mailOptions.cc = secondaryEmail;
    }

    const info = await transporter.sendMail(mailOptions);
    const sentAt = new Date().toISOString();
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      await fetch(supabaseUrl + '/rest/v1/invoices?id=eq.' + params.id, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': 'Bearer ' + supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ email_sent_at: sentAt })
      });
    } catch {
      // Non-critical
    }

    return NextResponse.json({ success: true, messageId: info.messageId, email_sent_at: sentAt }, { status: 200 });
  } catch (err) {
    console.error('SMTP Error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Error sending email via SMTP';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
