import { NextResponse } from 'next/server';
import { getInvoiceById } from '@/lib/supabase';
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
  return '<tr>' +
    '<td style="padding:10px 0;font-size:13px;color:#333;border-bottom:1px solid #f0f0f0;">' + item.service_name + '</td>' +
    '<td style="padding:10px 0;font-size:11px;color:#999;font-family:monospace;border-bottom:1px solid #f0f0f0;">' + (item.tracking_number || '-') + '</td>' +
    '<td style="padding:10px 0;font-size:12px;color:#999;text-align:center;border-bottom:1px solid #f0f0f0;">' + (item.weight || '-') + ' lb</td>' +
    '<td style="padding:10px 0;font-size:13px;color:#333;font-weight:600;text-align:right;border-bottom:1px solid #f0f0f0;">$' + item.amount.toFixed(2) + '</td>' +
  '</tr>';
}

function buildAttachmentItemRow(item: InvoiceItem): string {
  return '<tr>' +
    '<td>' + item.service_name + '</td>' +
    '<td style="font-family:monospace;color:#666;">' + (item.tracking_number || '-') + '</td>' +
    '<td style="text-align:center;color:#666;">' + (item.weight || '-') + ' lb</td>' +
    '<td style="text-align:right;font-weight:600;">$' + item.amount.toFixed(2) + '</td>' +
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
      service: 'gmail',
      auth: { user: smtpUser, pass: smtpPass },
    });

    const invoice = await getInvoiceById(params.id);
    
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    if (!invoice.clients || !invoice.clients.email) {
      return NextResponse.json({ success: false, error: 'Client email not found' }, { status: 400 });
    }

    let customSubject = 'Factura #' + invoice.invoice_number + ' de JRS CARGO S.A.';
    let customMessage = 'Adjunto a este correo encontrarás los detalles de tu factura reciente.';

    try {
      const body = await request.json();
      if (body.subject) customSubject = body.subject;
      if (body.message) {
        customMessage = body.message.replace(/\n/g, '<br/>');
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

    const discountHtml = invoice.discount_percent > 0 ? (
      '<tr>' +
        '<td style="padding:6px 0;font-size:12px;color:#999;">Descuento (' + invoice.discount_percent + '%)</td>' +
        '<td style="padding:6px 0;font-size:13px;color:#10b981;text-align:right;">-$' + ((invoice.subtotal * invoice.discount_percent) / 100).toFixed(2) + '</td>' +
      '</tr>'
    ) : '';

    const notesHtml = invoice.notes ? (
      '<div style="margin-top:24px;padding:14px;background:#fafafa;border-radius:6px;">' +
        '<p style="margin:0;font-size:12px;color:#888;line-height:1.5;">' + invoice.notes.replace(/\n/g, '<br/>') + '</p>' +
      '</div>'
    ) : '';

    // Email body HTML
    const htmlContent = [
      '<div style="font-family:Helvetica Neue,Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;color:#333;">',
      '<div style="padding:32px 32px 0;">',
      '<table style="width:100%;"><tr>',
      '<td><img src="https://www.jrscargocr.com/logo.png" alt="JRS Cargo" style="height:36px;width:auto;" /></td>',
      '<td style="text-align:right;">',
      '<p style="margin:0;font-size:10px;color:#bbb;text-transform:uppercase;letter-spacing:1px;">Factura</p>',
      '<p style="margin:2px 0 0;font-size:15px;font-weight:700;color:#12435E;">' + invoice.invoice_number + '</p>',
      '</td></tr></table></div>',
      '<div style="height:1px;background:#eee;margin:20px 32px;"></div>',
      '<div style="padding:0 32px;">',
      '<p style="font-size:14px;color:#333;line-height:1.6;margin:0 0 4px;">Hola <strong>' + invoice.clients.name + '</strong>,</p>',
      '<p style="font-size:13px;color:#999;line-height:1.6;margin:0 0 28px;">' + customMessage + '</p>',
      '<table style="width:100%;border-collapse:collapse;margin-bottom:24px;">',
      '<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:12px;color:#bbb;">Fecha</td>',
      '<td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;text-align:right;">' + issueDate + '</td></tr>',
      '<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:12px;color:#bbb;">Cliente</td>',
      '<td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;text-align:right;">' + invoice.clients.name + '</td></tr>',
      '</table>',
      '<p style="font-size:10px;font-weight:700;color:#12435E;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Detalle</p>',
      '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">',
      '<thead><tr>',
      '<th style="text-align:left;padding:6px 0;color:#bbb;font-size:10px;text-transform:uppercase;border-bottom:1px solid #eee;font-weight:600;">Servicio</th>',
      '<th style="text-align:left;padding:6px 0;color:#bbb;font-size:10px;text-transform:uppercase;border-bottom:1px solid #eee;font-weight:600;">Tracking</th>',
      '<th style="text-align:center;padding:6px 0;color:#bbb;font-size:10px;text-transform:uppercase;border-bottom:1px solid #eee;font-weight:600;">Peso</th>',
      '<th style="text-align:right;padding:6px 0;color:#bbb;font-size:10px;text-transform:uppercase;border-bottom:1px solid #eee;font-weight:600;">Monto</th>',
      '</tr></thead>',
      '<tbody>' + itemsHtml + '</tbody></table>',
      '<div style="border-top:2px solid #12435E;padding-top:14px;margin-top:4px;">',
      '<table style="width:100%;border-collapse:collapse;">',
      discountHtml,
      '<tr><td style="padding:4px 0;font-size:14px;font-weight:700;color:#12435E;">Total USD</td>',
      '<td style="padding:4px 0;font-size:20px;font-weight:800;color:#12435E;text-align:right;">$' + invoice.total.toFixed(2) + '</td></tr>',
      '<tr><td style="padding:2px 0;font-size:12px;color:#999;">Total Colones</td>',
      '<td style="padding:2px 0;font-size:14px;font-weight:600;color:#666;text-align:right;">&#8353;' + totalColones + '</td></tr>',
      '<tr><td colspan="2" style="padding:2px 0 0;font-size:10px;color:#ccc;text-align:right;">T.C. &#8353;' + exchangeRate + ' por $1 USD</td></tr>',
      '</table></div>',
      notesHtml,
      '</div>',
      '<div style="padding:24px 32px;margin-top:32px;border-top:1px solid #eee;text-align:center;">',
      '<p style="margin:0 0 2px;font-size:12px;font-weight:700;color:#12435E;">JRS CARGO S.A.</p>',
      '<p style="margin:0;font-size:10px;color:#ccc;">info@jrscargocr.com &nbsp;|&nbsp; +506 7260-1238 &nbsp;|&nbsp; jrscargocr.com</p>',
      '</div></div>'
    ].join('\n');

    // Attachment: printable invoice HTML document
    const attachmentItems = invoice.items.map((item: InvoiceItem) => buildAttachmentItemRow(item)).join('');
    
    const attachmentDiscount = invoice.discount_percent > 0 ? (
      '<tr><td style="text-align:right;color:#999;">Descuento (' + invoice.discount_percent + '%)</td>' +
      '<td style="text-align:right;color:#10b981;width:120px;">-$' + ((invoice.subtotal * invoice.discount_percent) / 100).toFixed(2) + '</td></tr>'
    ) : '';

    const attachmentNotes = invoice.notes ? (
      '<div style="margin-top:30px;padding:15px;background:#f9f9f9;border-radius:4px;font-size:12px;color:#666;">' +
      '<strong>Notas:</strong><br/>' + invoice.notes.replace(/\n/g, '<br/>') + '</div>'
    ) : '';

    const invoiceHtml = [
      '<!DOCTYPE html><html><head><meta charset="UTF-8">',
      '<title>Factura ' + invoice.invoice_number + '</title>',
      '<style>',
      '@media print { body { margin:0; padding:20px; -webkit-print-color-adjust:exact; print-color-adjust:exact; } }',
      'body { font-family:Helvetica Neue,Arial,sans-serif; margin:0; padding:40px; background:#fff; color:#333; }',
      'table { width:100%; border-collapse:collapse; }',
      'th, td { padding:10px 0; border-bottom:1px solid #eee; }',
      'th { text-align:left; color:#bbb; font-size:11px; text-transform:uppercase; font-weight:600; }',
      '.header td { border:none; } .details td { border:none; padding:5px 0; } .totals td { border:none; padding:5px 0; }',
      '.footer { margin-top:50px; text-align:center; font-size:10px; color:#999; border-top:1px solid #eee; padding-top:20px; }',
      '</style></head><body>',
      '<table class="header"><tr>',
      '<td><img src="https://www.jrscargocr.com/logo.png" alt="JRS Cargo" style="height:40px;" /></td>',
      '<td style="text-align:right;">',
      '<div style="font-size:12px;color:#bbb;text-transform:uppercase;">Factura</div>',
      '<div style="font-size:20px;font-weight:bold;color:#12435E;">' + invoice.invoice_number + '</div>',
      '</td></tr></table>',
      '<table class="details"><tr>',
      '<td style="width:50%;"><strong>Cliente:</strong><br/>' + invoice.clients.name + '<br/>' + invoice.clients.email + '<br/>' + (invoice.clients.phone || '') + '</td>',
      '<td style="width:50%;text-align:right;"><strong>Fecha:</strong><br/>' + issueDate + '</td>',
      '</tr></table>',
      '<table><thead><tr>',
      '<th>Servicio</th><th>Tracking</th><th style="text-align:center;">Peso</th><th style="text-align:right;">Monto</th>',
      '</tr></thead><tbody>' + attachmentItems + '</tbody></table>',
      '<table class="totals">',
      attachmentDiscount,
      '<tr><td style="text-align:right;font-size:14px;font-weight:bold;color:#12435E;">Total USD</td>',
      '<td style="text-align:right;font-size:18px;font-weight:bold;color:#12435E;width:120px;">$' + invoice.total.toFixed(2) + '</td></tr>',
      '<tr><td style="text-align:right;font-size:12px;color:#666;">Total Colones</td>',
      '<td style="text-align:right;font-size:14px;font-weight:bold;color:#666;width:120px;">&#8353;' + totalColones + '</td></tr>',
      '<tr><td colspan="2" style="text-align:right;font-size:10px;color:#999;padding-top:10px;">Tipo de cambio: &#8353;' + exchangeRate + ' por $1 USD</td></tr>',
      '</table>',
      attachmentNotes,
      '<div class="footer"><strong style="color:#12435E;">JRS CARGO S.A.</strong><br/>info@jrscargocr.com | +506 7260-1238 | jrscargocr.com</div>',
      '</body></html>'
    ].join('\n');

    const info = await transporter.sendMail({
      from: '"JRS Cargo Facturación" <' + smtpUser + '>',
      to: invoice.clients.email,
      subject: customSubject,
      html: htmlContent,
      attachments: [{
        filename: 'Factura-' + invoice.invoice_number + '.html',
        content: invoiceHtml,
        contentType: 'text/html'
      }]
    });
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
