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
  '¡Gracias por confiar tus envíos a JRS Cargo! Aquí tienes el resumen detallado de tu comprobante reciente y los paquetes procesados para ti.';

function buildItemRow(item: InvoiceItem): string {
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

  const trackingBadge = item.tracking_number
    ? '<span style="display:inline-block;background-color:#f1f5f9;color:#334155;font-family:Consolas,Monaco,monospace;font-size:11.5px;font-weight:600;padding:3px 8px;border-radius:6px;margin-right:6px;margin-top:5px;word-break:break-all;">📦 ' +
      item.tracking_number +
      '</span>'
    : '';

  const weightBadge = item.weight
    ? '<span style="display:inline-block;background-color:#eff6ff;color:#12435E;font-size:11.5px;font-weight:700;padding:3px 8px;border-radius:6px;margin-top:5px;">⚖️ ' +
      item.weight +
      ' ' +
      unitLabel +
      '</span>'
    : '';

  const badgesLine =
    trackingBadge || weightBadge
      ? '<div style="margin-top:2px;line-height:1.4;">' + trackingBadge + weightBadge + '</div>'
      : '';

  return (
    '<tr>' +
    '<td style="padding:14px 16px;background-color:#ffffff;border-bottom:1px solid #f1f5f9;">' +
    '<table role="presentation" style="width:100%;border-collapse:collapse;">' +
    '<tr>' +
    '<td style="vertical-align:top;padding-right:12px;">' +
    '<p style="margin:0;font-size:14px;font-weight:800;color:#0f172a;line-height:1.35;">' +
    item.service_name +
    '</p>' +
    badgesLine +
    '</td>' +
    '<td style="vertical-align:top;text-align:right;white-space:nowrap;width:90px;">' +
    '<p style="margin:0;font-size:15px;font-weight:900;color:#12435E;">$' +
    Number(item.amount || 0).toFixed(2) +
    '</p>' +
    '</td>' +
    '</tr>' +
    '</table>' +
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
    const totalColones = (invoice.total * exchangeRate).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const [y, m, d] = (invoice.issue_date || '').split('T')[0].split('-').map(Number);
    const dateObj = y && m && d ? new Date(y, m - 1, d) : new Date();
    const issueDate = dateObj.toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' });

    const itemsHtml = invoice.items.map((item: InvoiceItem) => buildItemRow(item)).join('');
    const itemCount = Array.isArray(invoice.items) ? invoice.items.length : 1;

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
          '<td style="padding:6px 0;font-size:13px;color:#059669;font-weight:700;">🎁 Descuento aplicado ' +
          (computedDiscPercent > 0 ? '(' + computedDiscPercent + '%)' : '') +
          '</td>' +
          '<td style="padding:6px 0;font-size:14px;color:#059669;text-align:right;font-weight:800;">-$' +
          computedDiscAmt.toFixed(2) +
          '</td>' +
          '</tr>'
        : '';

    const notesHtml = invoice.notes
      ? '<div style="margin-top:18px;padding:14px 16px;background-color:#fffbeb;border-left:4px solid #f59e0b;border-radius:10px;">' +
        '<p style="margin:0 0 4px;font-size:11px;font-weight:800;color:#b45309;text-transform:uppercase;letter-spacing:0.5px;">Nota importante</p>' +
        '<p style="margin:0;font-size:13px;color:#78350f;line-height:1.55;">' +
        invoice.notes.replace(/\n/g, '<br/>') +
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

    let clientPendingUSD = Number(invoice.total || 0);

    if (clientId) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const headers = {
          apikey: supabaseKey,
          Authorization: 'Bearer ' + supabaseKey,
          'Content-Type': 'application/json',
        };

        const [resClientInvs, resAllPayments] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/invoices?client_id=eq.${encodeURIComponent(clientId)}&select=id,total,status`, {
            headers,
            cache: 'no-store',
          }),
          fetch(`${supabaseUrl}/rest/v1/invoice_payments?select=invoice_id,amount_applied`, {
            headers,
            cache: 'no-store',
          }).catch(() => null),
        ]);

        if (resClientInvs.ok) {
          const clientInvs = await resClientInvs.json();
          const payments = resAllPayments && resAllPayments.ok ? await resAllPayments.json() : [];

          const paymentsMap = new Map<string, number>();
          for (const p of payments) {
            const invId = String(p.invoice_id);
            paymentsMap.set(invId, (paymentsMap.get(invId) || 0) + Number(p.amount_applied || 0));
          }

          let calculatedPending = 0;
          for (const inv of clientInvs) {
            if (inv.status === 'Anulada') continue;
            const t = Number(inv.total || 0);
            const paid = paymentsMap.get(String(inv.id)) || 0;
            calculatedPending += Math.max(0, t - paid);
          }
          clientPendingUSD = calculatedPending;
        }
      } catch (e) {
        console.error('Error calculating client pending balance for email:', e);
      }
    }

    const clientPendingCRC = Math.round(clientPendingUSD * exchangeRate).toLocaleString('es-CR');
    const isPaidUp = clientPendingUSD <= 0.01;

    const statementBoxHtml = clientId
      ? '<div style="margin-top:24px;padding:24px 20px;background-color:#f8fafc;border-radius:16px;text-align:center;">' +
        '<span style="display:inline-block;background-color:#0B2737;color:#facc15;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;padding:4px 12px;border-radius:999px;margin-bottom:10px;">' +
        'Estado de Cuenta en Línea' +
        '</span>' +
        (isPaidUp
          ? '<p style="margin:4px 0 6px;font-size:14px;color:#334155;">¡Excelente <strong>' +
            firstName +
            '</strong>! Tu cuenta se encuentra al día:</p>' +
            '<p style="margin:4px 0 14px;font-size:24px;font-weight:900;color:#059669;">$0.00 USD <span style="font-size:13px;font-weight:700;color:#059669;">(Al día ✓)</span></p>'
          : '<p style="margin:4px 0 4px;font-size:13.5px;color:#475569;line-height:1.45;">' +
            'Hola <strong>' +
            firstName +
            '</strong>, tu saldo total pendiente a la fecha es:' +
            '</p>' +
            '<p style="margin:6px 0 4px;font-size:28px;font-weight:900;color:#0B2737;letter-spacing:-0.5px;">' +
            '$' +
            clientPendingUSD.toFixed(2) +
            ' <span style="font-size:15px;font-weight:800;color:#12435E;">USD</span>' +
            '</p>' +
            '<p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#64748b;">' +
            '&#8776; &#8353;' +
            clientPendingCRC +
            ' CRC' +
            '</p>') +
        '<p style="margin:0 auto 18px;max-width:420px;font-size:13px;color:#475569;line-height:1.55;">' +
        'Consulta tus facturas, descarga tus comprobantes o revisa los datos de pago por <strong>SINPE Móvil y transferencia</strong> desde tu celular:' +
        '</p>' +
        '<div style="margin:0 auto;max-width:340px;">' +
        '<a href="' +
        clientStatementUrl +
        '" style="display:block;background-color:#12435E;background-image:linear-gradient(135deg,#12435E 0%,#0B2737 100%);color:#ffffff;font-size:14px;font-weight:800;line-height:48px;text-align:center;text-decoration:none;padding:0 20px;border-radius:12px;box-shadow:0 4px 12px rgba(11,39,55,0.22);">' +
        'Ver Mi Estado de Cuenta Online &rarr;' +
        '</a>' +
        '</div>' +
        '<p style="margin:14px 0 0;font-size:11px;color:#64748b;line-height:1.4;">' +
        '&#128274; Enlace personal y seguro exclusivo para ti.' +
        '</p>' +
        '</div>'
      : '';

    const htmlContent = [
      '<!DOCTYPE html>',
      '<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="color-scheme" content="light"/><meta name="supported-color-schemes" content="light"/>',
      '<style>',
      '  @media only screen and (max-width: 600px) {',
      '    .email-shell { padding: 10px 6px !important; }',
      '    .email-pad { padding: 22px 18px !important; }',
      '    .hero-pad { padding: 22px 18px !important; }',
      '  }',
      '</style>',
      '</head>',
      '<body class="email-shell" style="margin:0;padding:24px 12px;background-color:#eef2f6;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">',
      '  <table role="presentation" style="width:100%;max-width:580px;margin:0 auto;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(11,39,55,0.08);border-collapse:separate;">',
      '    <!-- HERO HEADER (No se invierte en modo oscuro gracias a linear-gradient y badge blanco para el logo) -->',
      '    <tr><td class="hero-pad" style="padding:28px 30px;background-color:#0B2737;background-image:linear-gradient(135deg,#0B2737 0%,#12435E 100%);color:#ffffff;">',
      '      <table role="presentation" style="width:100%;border-collapse:collapse;">',
      '        <tr>',
      '          <td style="vertical-align:middle;">',
      '            <div style="display:inline-block;background-color:#ffffff;background-image:linear-gradient(#ffffff,#ffffff);padding:8px 14px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.18);">',
      '              <img src="https://www.jrscargocr.com/logo.png" alt="JRS Cargo" style="height:36px;width:auto;display:block;" />',
      '            </div>',
      '          </td>',
      '          <td style="text-align:right;vertical-align:middle;">',
      '            <span style="display:inline-block;background-color:rgba(250,204,21,0.18);color:#fde047;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;padding:4px 10px;border-radius:999px;">Comprobante Oficial</span>',
      '            <p style="margin:5px 0 0;font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.3px;">' + invoice.invoice_number + '</p>',
      '            <p style="margin:2px 0 0;font-size:11.5px;color:#cbd5e1;">' + issueDate + '</p>',
      '          </td>',
      '        </tr>',
      '      </table>',
      '    </td></tr>',
      '    <!-- CUERPO PRINCIPAL -->',
      '    <tr><td class="email-pad" style="padding:28px 30px;background-color:#ffffff;">',
      '      <p style="font-size:18px;font-weight:800;color:#0f172a;line-height:1.35;margin:0 0 8px;">¡Hola ' + firstName + '! 👋</p>',
      '      <p style="font-size:14.5px;color:#475569;line-height:1.6;margin:0 0 22px;">' + customMessage + '</p>',
      '      <!-- RESUMEN RÁPIDO CLIENTE -->',
      '      <div style="background-color:#f8fafc;border-radius:14px;padding:14px 18px;margin-bottom:24px;">',
      '        <table role="presentation" style="width:100%;border-collapse:collapse;">',
      '          <tr>',
      '            <td style="padding:3px 0;font-size:12px;color:#64748b;font-weight:600;">Cliente</td>',
      '            <td style="padding:3px 0;font-size:13.5px;font-weight:800;color:#0f172a;text-align:right;">' + invoice.clients.name + '</td>',
      '          </tr>',
      '          <tr>',
      '            <td style="padding:3px 0;font-size:12px;color:#64748b;font-weight:600;">Paquetes / Servicios</td>',
      '            <td style="padding:3px 0;font-size:13px;font-weight:700;color:#12435E;text-align:right;">' + itemCount + (itemCount === 1 ? ' ítem registrado' : ' ítems registrados') + '</td>',
      '          </tr>',
      '        </table>',
      '      </div>',
      '      <!-- LISTA DE PAQUETES -->',
      '      <p style="font-size:11px;font-weight:800;color:#12435E;text-transform:uppercase;letter-spacing:0.9px;margin:0 0 10px;">📦 Detalle de Paquetes y Servicios</p>',
      '      <div style="border-radius:14px;overflow:hidden;background-color:#ffffff;margin-bottom:22px;box-shadow:0 1px 3px rgba(15,23,42,0.05);">',
      '        <table role="presentation" style="width:100%;border-collapse:collapse;">',
      '          <tbody>' + itemsHtml + '</tbody>',
      '        </table>',
      '      </div>',
      '      <!-- TOTALES DESTACADOS -->',
      '      <div style="background-color:#0B2737;background-image:linear-gradient(135deg,#0B2737 0%,#12435E 100%);color:#ffffff;border-radius:16px;padding:20px 22px;margin-top:8px;">',
      '        <table role="presentation" style="width:100%;border-collapse:collapse;">',
      '          <tr>',
      '            <td style="padding:3px 0;font-size:13px;color:#cbd5e1;">Subtotal</td>',
      '            <td style="padding:3px 0;font-size:14px;color:#ffffff;text-align:right;font-weight:700;">$' + subtotalVal.toFixed(2) + '</td>',
      '          </tr>',
      discountHtml,
      '          <tr>',
      '            <td style="padding:10px 0 4px;font-size:15px;font-weight:800;color:#fde047;border-top:1px solid rgba(255,255,255,0.16);">Total Comprobante (USD)</td>',
      '            <td style="padding:10px 0 4px;font-size:24px;font-weight:900;color:#ffffff;text-align:right;border-top:1px solid rgba(255,255,255,0.16);">$' + Number(invoice.total || 0).toFixed(2) + '</td>',
      '          </tr>',
      '          <tr>',
      '            <td style="padding:2px 0;font-size:12.5px;color:#cbd5e1;">Equivalente en Colones</td>',
      '            <td style="padding:2px 0;font-size:15px;font-weight:800;color:#fde047;text-align:right;">&#8353;' + totalColones + ' CRC</td>',
      '          </tr>',
      '          <tr>',
      '            <td colspan="2" style="padding:6px 0 0;font-size:11px;color:#94a3b8;text-align:right;">Tipo de cambio aplicado: &#8353;' + exchangeRate + ' por $1 USD</td>',
      '          </tr>',
      '        </table>',
      '      </div>',
      notesHtml,
      statementBoxHtml,
      '      <!-- BOTÓN DE AYUDA POR WHATSAPP Y NOTA DE PDF -->',
      '      <div style="margin-top:20px;padding:14px 16px;background-color:#ecfdf5;border-radius:12px;text-align:center;">',
      '        <p style="margin:0 0 6px;font-size:12.5px;color:#065f46;font-weight:700;">💬 ¿Deseas enviar tu comprobante SINPE o tienes alguna consulta?</p>',
      '        <a href="' + whatsappHelpUrl + '" style="display:inline-block;color:#047857;font-size:13px;font-weight:800;text-decoration:underline;">Escríbenos directo por WhatsApp (+506 7260-1238) &rarr;</a>',
      '      </div>',
      '      <div style="margin-top:14px;padding:11px 14px;background-color:#f8fafc;border-radius:10px;text-align:center;">',
      '        <p style="margin:0;font-size:12px;color:#64748b;">📎 <strong>PDF adjunto:</strong> Encontrarás tu factura oficial lista para descargar en este correo.</p>',
      '      </div>',
      '    </td></tr>',
      '    <!-- FOOTER -->',
      '    <tr><td style="padding:22px 24px;background-color:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">',
      '      <p style="margin:0 0 4px;font-size:13px;font-weight:900;color:#0B2737;letter-spacing:0.3px;">JRS CARGO S.A.</p>',
      '      <p style="margin:0;font-size:11.5px;color:#64748b;line-height:1.6;">San Pablo de Heredia, Costa Rica &nbsp;&bull;&nbsp; <a href="https://wa.me/50672601238" style="color:#12435E;text-decoration:none;font-weight:700;">+506 7260-1238</a><br/><a href="mailto:info@jrscargocr.com" style="color:#64748b;text-decoration:none;">info@jrscargocr.com</a> &nbsp;&bull;&nbsp; <a href="https://www.jrscargocr.com" style="color:#12435E;text-decoration:none;font-weight:700;">www.jrscargocr.com</a></p>',
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
