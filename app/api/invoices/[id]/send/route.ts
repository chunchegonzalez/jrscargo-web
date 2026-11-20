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

const DEFAULT_LEGACY_MESSAGE =
  'Adjunto a este correo encontrarás los detalles de tu comprobante de compra reciente. Por favor, revisa la información a continuación.';

const DEFAULT_FRIENDLY_MESSAGE =
  'Gracias por confiar tus envíos a JRS Cargo. A continuación encontrarás el detalle de tu comprobante y el PDF oficial adjunto.';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatUsd(value: number): string {
  return '$' + Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildItemRow(item: InvoiceItem, isLast: boolean): string {
  let unitLabel = 'lb';
  const sUpper = (item.service_name || '').toUpperCase();
  if (sUpper.includes('COMPRA') || sUpper.includes('SITIO WEB')) {
    unitLabel = 'und';
  } else if (sUpper.includes('MARITIMO') || sUpper.includes('MARÍTIMO') || sUpper.includes('FT3') || sUpper.includes('PIE')) {
    unitLabel = 'ft³';
  } else if (
    sUpper.includes('MAYORISTA AEREO') ||
    sUpper.includes('MAYORISTA AÉREO') ||
    sUpper.includes('MADRID') ||
    sUpper.includes('TONY') ||
    sUpper.includes('KILO') ||
    sUpper.includes('KG')
  ) {
    unitLabel = 'kg';
  }

  const metaParts: string[] = [];
  if (item.tracking_number) {
    metaParts.push(
      '<span style="font-family:Consolas,Monaco,\'Courier New\',monospace;color:#334155;font-weight:600;word-break:break-all;">' +
        escapeHtml(item.tracking_number) +
        '</span>'
    );
  }
  if (item.weight) {
    metaParts.push(
      '<span style="color:#475569;font-weight:600;">' +
        escapeHtml(item.weight) +
        ' ' +
        unitLabel +
        '</span>'
    );
  }

  const metaLine =
    metaParts.length > 0
      ? '<p style="margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.45;">' +
        metaParts.join(' &nbsp;&middot;&nbsp; ') +
        '</p>'
      : '';

  const borderStyle = isLast ? 'none' : '1px solid #e2e8f0';

  return (
    '<tr>' +
    '<td style="padding:13px 0;border-bottom:' +
    borderStyle +
    ';vertical-align:top;padding-right:12px;">' +
    '<p style="margin:0;font-size:13.5px;font-weight:700;color:#0f172a;line-height:1.4;">' +
    escapeHtml(item.service_name) +
    '</p>' +
    metaLine +
    '</td>' +
    '<td style="padding:13px 0;border-bottom:' +
    borderStyle +
    ';vertical-align:top;text-align:right;white-space:nowrap;width:96px;">' +
    '<p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums;">' +
    formatUsd(Number(item.amount || 0)) +
    '</p>' +
    '</td>' +
    '</tr>'
  );
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
    });

    const invoice = await getInvoiceById(params.id);

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    let customSubject = 'Comprobante de Compra #' + invoice.invoice_number + ' - JRS CARGO';
    let customMessage = DEFAULT_FRIENDLY_MESSAGE;
    let customCc = '';
    let customTo = '';

    try {
      const body = await request.json();
      if (body.subject) customSubject = body.subject;
      if (body.message) {
        const trimmedMsg = String(body.message).trim();
        if (trimmedMsg && trimmedMsg !== DEFAULT_LEGACY_MESSAGE) {
          customMessage = trimmedMsg.replace(/\n/g, '<br/>');
        }
      }
      if (body.cc !== undefined) {
        customCc = String(body.cc).trim();
      }
      if (body.to !== undefined && String(body.to).trim()) {
        customTo = String(body.to).trim();
      }
    } catch {
      // Ignorar si no hay body
    }

    const defaultClientEmail = invoice.clients?.email?.trim() || '';
    const destinationEmail = customTo && customTo.includes('@') ? customTo : defaultClientEmail;
    const normalizedDest = destinationEmail.toLowerCase().trim();

    if (
      !normalizedDest ||
      !normalizedDest.includes('@') ||
      normalizedDest === 'pendiente@pendiente' ||
      normalizedDest.startsWith('pendiente@') ||
      normalizedDest.endsWith('@pendiente')
    ) {
      return NextResponse.json(
        { success: false, error: 'El cliente tiene correo pendiente@pendiente o inválido. No se realizó el envío.' },
        { status: 400 }
      );
    }

    const exchangeRate = invoice.exchange_rate || 530;
    const totalColones = Number(invoice.total * exchangeRate).toLocaleString('es-CR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const [y, m, d] = (invoice.issue_date || '').split('T')[0].split('-').map(Number);
    const dateObj = y && m && d ? new Date(y, m - 1, d) : new Date();
    const issueDate = dateObj.toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' });

    const invoiceItems: InvoiceItem[] = Array.isArray(invoice.items) ? invoice.items : [];
    const itemsHtml = invoiceItems
      .map((item: InvoiceItem, idx: number) => buildItemRow(item, idx === invoiceItems.length - 1))
      .join('');
    const itemCount = invoiceItems.length;

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

    const discountHtml =
      computedDiscAmt > 0
        ? '<tr>' +
          '<td style="padding:6px 0;font-size:13px;color:#047857;font-weight:600;">Descuento aplicado' +
          (computedDiscPercent > 0 ? ' (' + computedDiscPercent + '%)' : '') +
          '</td>' +
          '<td style="padding:6px 0;font-size:13.5px;color:#047857;text-align:right;font-weight:700;font-variant-numeric:tabular-nums;">-' +
          formatUsd(computedDiscAmt) +
          '</td>' +
          '</tr>'
        : '';

    const notesHtml = invoice.notes
      ? '<div style="margin-top:20px;padding:12px 16px;background-color:#ffffff;border:1px solid #e2e8f0;border-left:3px solid #EAB308;border-radius:8px;">' +
        '<p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.6px;">Nota del comprobante</p>' +
        '<p style="margin:0;font-size:13px;color:#334155;line-height:1.55;">' +
        escapeHtml(invoice.notes).replace(/\n/g, '<br/>') +
        '</p>' +
        '</div>'
      : '';

    const clientId = String(invoice.client_id || invoice.clients?.id || '');
    const clientName = String(invoice.clients?.name || 'Cliente');
    const firstName = clientName.split(' ')[0] || clientName;
    const clientStatementUrl = 'https://www.jrscargocr.com/estado-cuenta/' + encodeURIComponent(clientId);
    const whatsappHelpUrl =
      'https://wa.me/50672601238?text=' +
      encodeURIComponent(`Hola JRS Cargo, tengo una consulta sobre mi comprobante ${invoice.invoice_number} (${clientName}).`);

    const preheaderText =
      'Comprobante ' +
      invoice.invoice_number +
      ' emitido el ' +
      issueDate +
      '. Adjuntamos tu PDF oficial y el acceso a tu estado de cuenta en línea.';

    const statementBoxHtml = clientId
      ? '<div style="margin-top:24px;padding:24px 22px;background-color:#ffffff;border:1px solid #cbd5e1;border-top:3px solid #0B2737;border-radius:12px;text-align:center;">' +
        '<p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#12435E;text-transform:uppercase;letter-spacing:0.9px;">Estado de cuenta en línea</p>' +
        '<p style="margin:0 auto 20px;max-width:440px;font-size:14px;color:#334155;line-height:1.6;">' +
        'Tu estado de cuenta actualizado está disponible en nuestro portal. Ingresa para consultar tus facturas, pagos y saldo pendiente.' +
        '</p>' +
        '<table role="presentation" style="margin:0 auto;border-collapse:collapse;">' +
        '<tr><td align="center" style="border-radius:10px;background-color:#0B2737;">' +
        '<a href="' +
        clientStatementUrl +
        '" target="_blank" style="display:inline-block;background-color:#0B2737;color:#ffffff;font-size:14.5px;font-weight:700;line-height:20px;text-align:center;text-decoration:none;padding:14px 28px;border-radius:10px;border:1px solid #0B2737;">' +
        'Ver mi estado de cuenta en línea' +
        '</a>' +
        '</td></tr>' +
        '</table>' +
        '<p style="margin:14px 0 0;font-size:11.5px;color:#64748b;line-height:1.45;">' +
        'Enlace personal y seguro exclusivo para ti.' +
        '</p>' +
        '</div>'
      : '';

    const htmlContent = [
      '<!DOCTYPE html>',
      '<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="color-scheme" content="light"/><meta name="supported-color-schemes" content="light"/>',
      '<style>',
      '  @media only screen and (max-width: 600px) {',
      '    .email-shell { padding: 12px 8px !important; }',
      '    .email-pad { padding: 22px 18px !important; }',
      '    .hero-pad { padding: 22px 18px !important; }',
      '    .hero-stack { display: block !important; width: 100% !important; text-align: left !important; }',
      '    .hero-meta { padding-top: 14px !important; }',
      '  }',
      '</style>',
      '</head>',
      '<body class="email-shell" style="margin:0;padding:24px 12px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">',
      '  <!-- Texto de vista previa oculto (sin saldo general) -->',
      '  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#f1f5f9;">' +
        escapeHtml(preheaderText) +
        '&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>',
      '  <table role="presentation" style="width:100%;max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;border-collapse:separate;">',
      '    <!-- ENCABEZADO DE MARCA -->',
      '    <tr><td class="hero-pad" style="padding:24px 30px;background-color:#0B2737;background-image:linear-gradient(135deg,#0B2737 0%,#12435E 100%);border-bottom:3px solid #EAB308;color:#ffffff;">',
      '      <table role="presentation" style="width:100%;border-collapse:collapse;">',
      '        <tr>',
      '          <td class="hero-stack" style="vertical-align:middle;">',
      '            <div style="display:inline-block;background-color:#ffffff;padding:7px 12px;border-radius:10px;">',
      '              <img src="https://www.jrscargocr.com/logo.png" alt="JRS Cargo" style="height:34px;width:auto;display:block;" />',
      '            </div>',
      '          </td>',
      '          <td class="hero-stack hero-meta" style="text-align:right;vertical-align:middle;">',
      '            <p style="margin:0;font-size:10.5px;font-weight:700;color:#FACC15;text-transform:uppercase;letter-spacing:1px;">Comprobante Oficial</p>',
      '            <p style="margin:4px 0 0;font-size:21px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">' + escapeHtml(invoice.invoice_number) + '</p>',
      '            <p style="margin:2px 0 0;font-size:12px;color:#cbd5e1;">' + escapeHtml(issueDate) + '</p>',
      '          </td>',
      '        </tr>',
      '      </table>',
      '    </td></tr>',
      '    <!-- CUERPO PRINCIPAL -->',
      '    <tr><td class="email-pad" style="padding:28px 30px;background-color:#ffffff;">',
      '      <p style="font-size:17px;font-weight:700;color:#0f172a;line-height:1.35;margin:0 0 8px;">Hola ' + escapeHtml(firstName) + ',</p>',
      '      <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 22px;">' + customMessage + '</p>',
      '      <!-- DATOS DEL COMPROBANTE -->',
      '      <table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin-bottom:22px;">',
      '        <tr>',
      '          <td style="padding:10px 0;font-size:12.5px;color:#64748b;">Cliente</td>',
      '          <td style="padding:10px 0;font-size:13.5px;font-weight:700;color:#0f172a;text-align:right;">' + escapeHtml(clientName) + '</td>',
      '        </tr>',
      '        <tr>',
      '          <td style="padding:10px 0;border-top:1px solid #f1f5f9;font-size:12.5px;color:#64748b;">Comprobante / Fecha</td>',
      '          <td style="padding:10px 0;border-top:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#334155;text-align:right;">' + escapeHtml(invoice.invoice_number) + ' &middot; ' + escapeHtml(issueDate) + '</td>',
      '        </tr>',
      '        <tr>',
      '          <td style="padding:10px 0;border-top:1px solid #f1f5f9;font-size:12.5px;color:#64748b;">Paquetes / Servicios</td>',
      '          <td style="padding:10px 0;border-top:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#12435E;text-align:right;">' + itemCount + (itemCount === 1 ? ' ítem registrado' : ' ítems registrados') + '</td>',
      '        </tr>',
      '      </table>',
      '      <!-- DETALLE DE PAQUETES Y SERVICIOS -->',
      '      <p style="font-size:11px;font-weight:700;color:#12435E;text-transform:uppercase;letter-spacing:0.9px;margin:0 0 6px;">Detalle de paquetes y servicios</p>',
      '      <table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #cbd5e1;border-bottom:1px solid #cbd5e1;margin-bottom:18px;">',
      '        <tbody>' + itemsHtml + '</tbody>',
      '      </table>',
      '      <!-- RESUMEN DE MONTOS DEL COMPROBANTE -->',
      '      <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:4px;">',
      '        <tr>',
      '          <td style="padding:5px 0;font-size:13px;color:#475569;">Subtotal</td>',
      '          <td style="padding:5px 0;font-size:13.5px;color:#0f172a;text-align:right;font-weight:600;font-variant-numeric:tabular-nums;">' + formatUsd(subtotalVal) + '</td>',
      '        </tr>',
      discountHtml,
      '        <tr>',
      '          <td style="padding:12px 0 4px;border-top:2px solid #0B2737;font-size:14.5px;font-weight:700;color:#0B2737;">Total del comprobante (USD)</td>',
      '          <td style="padding:12px 0 4px;border-top:2px solid #0B2737;font-size:20px;font-weight:800;color:#0B2737;text-align:right;font-variant-numeric:tabular-nums;">' + formatUsd(totalVal) + '</td>',
      '        </tr>',
      '        <tr>',
      '          <td style="padding:2px 0;font-size:12.5px;color:#64748b;">Equivalente en colones (T.C. &#8353;' + exchangeRate + ')</td>',
      '          <td style="padding:2px 0;font-size:13.5px;font-weight:700;color:#12435E;text-align:right;font-variant-numeric:tabular-nums;">&#8353;' + totalColones + ' CRC</td>',
      '        </tr>',
      '      </table>',
      notesHtml,
      statementBoxHtml,
      '      <!-- ADJUNTO Y CONTACTO -->',
      '      <div style="margin-top:22px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;">',
      '        <p style="margin:0 0 10px;font-size:12.5px;color:#475569;line-height:1.5;"><strong>PDF adjunto:</strong> Tu comprobante oficial está adjunto en este correo listo para descargar.</p>',
      '        <p style="margin:0;font-size:12.5px;color:#475569;line-height:1.5;">¿Deseas enviar tu comprobante SINPE o tienes alguna consulta?<br/>' +
        '<a href="' + whatsappHelpUrl + '" target="_blank" style="color:#12435E;font-weight:700;text-decoration:underline;">Escríbenos por WhatsApp (+506 7260-1238)</a></p>',
      '      </div>',
      '    </td></tr>',
      '    <!-- PIE DE PÁGINA -->',
      '    <tr><td style="padding:20px 24px;background-color:#ffffff;border-top:1px solid #e2e8f0;text-align:center;">',
      '      <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#0B2737;letter-spacing:0.3px;">JRS CARGO S.A.</p>',
      '      <p style="margin:0;font-size:11.5px;color:#64748b;line-height:1.65;">San Pablo de Heredia, Costa Rica &nbsp;&middot;&nbsp; <a href="https://wa.me/50672601238" style="color:#12435E;text-decoration:none;font-weight:600;">+506 7260-1238</a><br/><a href="mailto:info@jrscargocr.com" style="color:#64748b;text-decoration:none;">info@jrscargocr.com</a> &nbsp;&middot;&nbsp; <a href="https://www.jrscargocr.com" style="color:#12435E;text-decoration:none;font-weight:600;">www.jrscargocr.com</a></p>',
      '    </td></tr>',
      '  </table>',
      '</body></html>',
    ].join('\n');

    // Generate PDF document buffer
    const pdfBuffer = await generateInvoicePdf(invoice);

    const clientExtra = parseClientAddress(invoice.clients?.address);
    const secondaryEmail = customCc || clientExtra.secondary_email?.trim();

    const mailOptions: nodemailer.SendMailOptions = {
      from: '"JRS CARGO" <' + smtpUser + '>',
      to: destinationEmail,
      subject: customSubject,
      html: htmlContent,
      attachments: [
        {
          filename: 'Comprobante-' + invoice.invoice_number + '.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    if (
      secondaryEmail &&
      secondaryEmail.includes('@') &&
      secondaryEmail.toLowerCase().trim() !== 'pendiente@pendiente' &&
      !secondaryEmail.toLowerCase().trim().startsWith('pendiente@') &&
      !secondaryEmail.toLowerCase().trim().endsWith('@pendiente')
    ) {
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
          apikey: supabaseKey,
          Authorization: 'Bearer ' + supabaseKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ email_sent_at: sentAt }),
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
