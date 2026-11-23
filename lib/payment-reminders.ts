import nodemailer from 'nodemailer';
import { getHeaders, getInvoiceById, getInvoices } from './supabase';
import { generateInvoicePdf } from './invoice-pdf';
import {
  formatCostaRicaDateTime,
  getInvoiceStats,
  parseClientAddress,
} from './billing';

export const PAYMENT_REMINDERS_ROW_ID = '__JRS_PAYMENT_REMINDERS_STATE__';
export const DEFAULT_REMINDER_DAYS = 4;

export interface PaymentReminderRecord {
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  email: string;
  firstEmailSentAt: string;
  reminderSentAt: string;
  trigger: 'auto' | 'manual' | 'cron' | 'omitted';
  messageId?: string;
}

export interface PaymentReminderHistoryEntry {
  id: string;
  timestampIso: string;
  timestampDisplay: string;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  email: string;
  trigger: 'auto' | 'manual' | 'cron' | 'omitted';
  status: 'sent' | 'omitted' | 'error';
  detail: string;
}

export interface PaymentRemindersState {
  enabled: boolean;
  daysAfterFirstEmail: number;
  lastAutoCheckAtIso: string | null;
  reminders: Record<string, PaymentReminderRecord>;
  history: PaymentReminderHistoryEntry[];
}

const DEFAULT_STATE: PaymentRemindersState = {
  enabled: true,
  daysAfterFirstEmail: DEFAULT_REMINDER_DAYS,
  lastAutoCheckAtIso: null,
  reminders: {},
  history: [],
};

export function isInvalidClientEmail(email?: string | null): boolean {
  if (!email) return true;
  const clean = String(email).trim().toLowerCase();
  if (!clean || !clean.includes('@')) return true;
  return (
    clean === 'pendiente@pendiente' ||
    clean.startsWith('pendiente@') ||
    clean.endsWith('@pendiente')
  );
}

/**
 * Calcula los días calendario (en zona horaria de Costa Rica) transcurridos
 * desde que se envió el primer correo (`email_sent_at`) hasta hoy.
 */
export function getDaysSinceFirstEmail(emailSentAt?: string | null): number {
  if (!emailSentAt) return -1;
  const sentDate = new Date(emailSentAt);
  if (Number.isNaN(sentDate.getTime())) return -1;

  const sentCR = new Date(sentDate.toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }));
  const nowCR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }));

  const sentDayUtc = Date.UTC(sentCR.getFullYear(), sentCR.getMonth(), sentCR.getDate());
  const todayUtc = Date.UTC(nowCR.getFullYear(), nowCR.getMonth(), nowCR.getDate());

  return Math.floor((todayUtc - sentDayUtc) / (1000 * 60 * 60 * 24));
}

export function getScheduledReminderDateStr(
  emailSentAt?: string | null,
  daysAfter: number = DEFAULT_REMINDER_DAYS
): string {
  if (!emailSentAt) return '-';
  const sentDate = new Date(emailSentAt);
  if (Number.isNaN(sentDate.getTime())) return '-';
  const sentCR = new Date(sentDate.toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }));
  sentCR.setDate(sentCR.getDate() + daysAfter);
  const dd = String(sentCR.getDate()).padStart(2, '0');
  const mm = String(sentCR.getMonth() + 1).padStart(2, '0');
  const yyyy = sentCR.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export async function loadPaymentRemindersState(): Promise<PaymentRemindersState> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!url) return { ...DEFAULT_STATE, reminders: {}, history: [] };

  try {
    const res = await fetch(
      `${url}/rest/v1/local_inventory?id=eq.${encodeURIComponent(PAYMENT_REMINDERS_ROW_ID)}&limit=1`,
      {
        headers: getHeaders(),
        cache: 'no-store',
      }
    );
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const rawHistory = rows[0]?.history;
        const container = Array.isArray(rawHistory) ? rawHistory[0] : rawHistory;
        if (container && typeof container === 'object') {
          return {
            enabled: container.enabled !== undefined ? Boolean(container.enabled) : true,
            daysAfterFirstEmail:
              typeof container.daysAfterFirstEmail === 'number' && container.daysAfterFirstEmail >= 1
                ? container.daysAfterFirstEmail
                : DEFAULT_REMINDER_DAYS,
            lastAutoCheckAtIso: container.lastAutoCheckAtIso || null,
            reminders:
              container.reminders && typeof container.reminders === 'object'
                ? container.reminders
                : {},
            history: Array.isArray(container.history) ? container.history : [],
          };
        }
      }
    }
  } catch (err) {
    console.error('Error loading payment reminders state:', err);
  }

  return { ...DEFAULT_STATE, reminders: {}, history: [] };
}

export async function savePaymentRemindersState(state: PaymentRemindersState): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!url) return;

  const payload = {
    id: PAYMENT_REMINDERS_ROW_ID,
    client: 'SYSTEM_PAYMENT_REMINDERS_CONFIG',
    company: 'JRS CARGO',
    weight: '0 lbs',
    status: 'Eliminado',
    history: [
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        enabled: state.enabled,
        daysAfterFirstEmail: state.daysAfterFirstEmail || DEFAULT_REMINDER_DAYS,
        lastAutoCheckAtIso: state.lastAutoCheckAtIso,
        reminders: state.reminders || {},
        history: (state.history || []).slice(0, 200),
      },
    ],
  };

  const checkRes = await fetch(
    `${url}/rest/v1/local_inventory?id=eq.${encodeURIComponent(PAYMENT_REMINDERS_ROW_ID)}&select=id`,
    {
      headers: getHeaders(),
      cache: 'no-store',
    }
  );
  const existing = checkRes.ok ? await checkRes.json() : [];

  if (Array.isArray(existing) && existing.length > 0) {
    await fetch(
      `${url}/rest/v1/local_inventory?id=eq.${encodeURIComponent(PAYMENT_REMINDERS_ROW_ID)}`,
      {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          status: 'Eliminado',
          history: payload.history,
        }),
      }
    );
  } else {
    await fetch(`${url}/rest/v1/local_inventory`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
  }
}

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

export const DEFAULT_REMINDER_MESSAGE =
  'Te recordamos amablemente que el comprobante detallado a continuación se encuentra pendiente de pago. Si ya realizaste el pago recientemente, por favor omite este aviso o compártenos tu comprobante por WhatsApp para aplicarlo de inmediato.';

export async function sendPaymentReminderForInvoice(opts: {
  invoiceId: string;
  trigger: 'auto' | 'manual' | 'cron';
  customSubject?: string;
  customMessage?: string;
  customCc?: string;
  customTo?: string;
}): Promise<{
  success: boolean;
  messageId?: string;
  reminderSentAt?: string;
  error?: string;
  record?: PaymentReminderRecord;
  historyEntry?: PaymentReminderHistoryEntry;
}> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;

  if (!smtpUser || !smtpPass) {
    return { success: false, error: 'Credenciales SMTP no configuradas en el servidor.' };
  }

  const invoice = await getInvoiceById(opts.invoiceId);
  if (!invoice) {
    return { success: false, error: 'Factura no encontrada.' };
  }

  const stats = getInvoiceStats(invoice);
  if (invoice.status === 'Anulada') {
    return { success: false, error: 'La factura está anulada.' };
  }
  if (invoice.status === 'Pagada' || stats.displayStatus === 'Pagada' || stats.pending <= 0.009) {
    return { success: false, error: 'La factura ya se encuentra pagada.' };
  }

  const defaultClientEmail = String(invoice.clients?.email || '').trim();
  const destinationEmail =
    opts.customTo && opts.customTo.includes('@') ? opts.customTo.trim() : defaultClientEmail;

  if (isInvalidClientEmail(destinationEmail)) {
    return {
      success: false,
      error: 'El cliente tiene correo pendiente@pendiente o inválido. No se envió el recordatorio.',
    };
  }

  const clientId = String(invoice.client_id || invoice.clients?.id || '');
  const clientName = String(invoice.clients?.name || 'Cliente');
  const firstName = clientName.split(' ')[0] || clientName;
  const exchangeRate = Number(invoice.exchange_rate) || 530;
  const totalVal = Number(invoice.total || 0);
  const balanceVal = Number(stats.pending ?? totalVal);
  const paidVal = Math.max(0, totalVal - balanceVal);
  const balanceColones = Number(balanceVal * exchangeRate).toLocaleString('es-CR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const [y, m, d] = (invoice.issue_date || '').split('T')[0].split('-').map(Number);
  const dateObj = y && m && d ? new Date(y, m - 1, d) : new Date();
  const issueDate = dateObj.toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const firstEmailSentAt = invoice.email_sent_at || new Date().toISOString();
  const firstSentDateObj = new Date(firstEmailSentAt);
  const firstSentDisplay = Number.isNaN(firstSentDateObj.getTime())
    ? issueDate
    : firstSentDateObj.toLocaleDateString('es-CR', {
        timeZone: 'America/Costa_Rica',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

  const subject =
    opts.customSubject && opts.customSubject.trim()
      ? opts.customSubject.trim()
      : `Recordatorio de Pago - Comprobante #${invoice.invoice_number} - JRS CARGO`;

  const bodyMessageHtml =
    opts.customMessage && opts.customMessage.trim()
      ? escapeHtml(opts.customMessage.trim()).replace(/\n/g, '<br/>')
      : escapeHtml(DEFAULT_REMINDER_MESSAGE);

  const clientStatementUrl = 'https://www.jrscargocr.com/estado-cuenta/' + encodeURIComponent(clientId);
  const whatsappHelpUrl =
    'https://wa.me/50672601238?text=' +
    encodeURIComponent(
      `Hola JRS Cargo, te comparto mi comprobante de pago / consulta sobre la factura ${invoice.invoice_number} (${clientName}).`
    );

  const preheaderText = `Recordatorio de pago para tu comprobante ${invoice.invoice_number} por ${formatUsd(balanceVal)}. Adjuntamos tu PDF y acceso a tu estado de cuenta en línea.`;

  const paidRowHtml =
    paidVal > 0.009
      ? '<tr>' +
        '<td style="padding:8px 0;border-top:1px solid #f1f5f9;font-size:12.5px;color:#64748b;">Abonado previamente</td>' +
        '<td style="padding:8px 0;border-top:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#047857;text-align:right;font-variant-numeric:tabular-nums;">-' +
        formatUsd(paidVal) +
        '</td>' +
        '</tr>'
      : '';

  const statementBoxHtml = clientId
    ? '<div style="margin-top:24px;padding:24px 22px;background-color:#ffffff;border:1px solid #cbd5e1;border-top:3px solid #0B2737;border-radius:12px;text-align:center;">' +
      '<p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#12435E;text-transform:uppercase;letter-spacing:0.9px;">Estado de cuenta en línea</p>' +
      '<p style="margin:0 auto 20px;max-width:440px;font-size:14px;color:#334155;line-height:1.6;">' +
      'Consulta el detalle actualizado de tus comprobantes, abonos registrados y saldo pendiente en tu portal personal.' +
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
    '  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#f1f5f9;">' +
      escapeHtml(preheaderText) +
      '&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>',
    '  <table role="presentation" style="width:100%;max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;border-collapse:separate;">',
    '    <!-- ENCABEZADO DE MARCA -->',
    '    <tr><td class="hero-pad" style="padding:24px 30px;background-color:#0B2737;background-image:linear-gradient(135deg,#0B2737 0%,#12435E 100%);border-bottom:3px solid #F59E0B;color:#ffffff;">',
    '      <table role="presentation" style="width:100%;border-collapse:collapse;">',
    '        <tr>',
    '          <td class="hero-stack" style="vertical-align:middle;">',
    '            <div style="display:inline-block;background-color:#ffffff;padding:7px 12px;border-radius:10px;">',
    '              <img src="https://www.jrscargocr.com/logo.png" alt="JRS Cargo" style="height:34px;width:auto;display:block;" />',
    '            </div>',
    '          </td>',
    '          <td class="hero-stack hero-meta" style="text-align:right;vertical-align:middle;">',
    '            <p style="margin:0;font-size:10.5px;font-weight:700;color:#FACC15;text-transform:uppercase;letter-spacing:1px;">Recordatorio de Pago</p>',
    '            <p style="margin:4px 0 0;font-size:21px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">' + escapeHtml(invoice.invoice_number) + '</p>',
    '            <p style="margin:2px 0 0;font-size:12px;color:#cbd5e1;">Emitido el ' + escapeHtml(issueDate) + '</p>',
    '          </td>',
    '        </tr>',
    '      </table>',
    '    </td></tr>',
    '    <!-- CUERPO PRINCIPAL -->',
    '    <tr><td class="email-pad" style="padding:28px 30px;background-color:#ffffff;">',
    '      <div style="display:inline-block;padding:5px 12px;border-radius:999px;background-color:#fffbeb;border:1px solid #fde68a;color:#b45309;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:14px;">Aviso de saldo pendiente</div>',
    '      <p style="font-size:17px;font-weight:700;color:#0f172a;line-height:1.35;margin:0 0 8px;">Hola ' + escapeHtml(firstName) + ',</p>',
    '      <p style="font-size:14px;color:#475569;line-height:1.65;margin:0 0 22px;">' + bodyMessageHtml + '</p>',
    '      <!-- RESUMEN DEL COMPROBANTE -->',
    '      <div style="padding:18px 20px;background-color:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #F59E0B;border-radius:12px;margin-bottom:20px;">',
    '        <table role="presentation" style="width:100%;border-collapse:collapse;">',
    '          <tr>',
    '            <td style="padding:6px 0;font-size:12.5px;color:#64748b;">Cliente</td>',
    '            <td style="padding:6px 0;font-size:13.5px;font-weight:700;color:#0f172a;text-align:right;">' + escapeHtml(clientName) + '</td>',
    '          </tr>',
    '          <tr>',
    '            <td style="padding:8px 0;border-top:1px solid #e2e8f0;font-size:12.5px;color:#64748b;">Comprobante</td>',
    '            <td style="padding:8px 0;border-top:1px solid #e2e8f0;font-size:13px;font-weight:700;color:#0B2737;text-align:right;">' + escapeHtml(invoice.invoice_number) + '</td>',
    '          </tr>',
    '          <tr>',
    '            <td style="padding:8px 0;border-top:1px solid #e2e8f0;font-size:12.5px;color:#64748b;">Primer aviso enviado</td>',
    '            <td style="padding:8px 0;border-top:1px solid #e2e8f0;font-size:13px;font-weight:600;color:#334155;text-align:right;">' + escapeHtml(firstSentDisplay) + '</td>',
    '          </tr>',
    paidRowHtml,
    '          <tr>',
    '            <td style="padding:12px 0 4px;border-top:2px solid #0B2737;font-size:14.5px;font-weight:700;color:#0B2737;">Saldo pendiente (USD)</td>',
    '            <td style="padding:12px 0 4px;border-top:2px solid #0B2737;font-size:21px;font-weight:800;color:#0B2737;text-align:right;font-variant-numeric:tabular-nums;">' + formatUsd(balanceVal) + '</td>',
    '          </tr>',
    '          <tr>',
    '            <td style="padding:2px 0;font-size:12px;color:#64748b;">Equivalente en colones (T.C. &#8353;' + exchangeRate + ')</td>',
    '            <td style="padding:2px 0;font-size:13.5px;font-weight:700;color:#12435E;text-align:right;font-variant-numeric:tabular-nums;">&#8353;' + balanceColones + ' CRC</td>',
    '          </tr>',
    '        </table>',
    '      </div>',
    statementBoxHtml,
    '      <!-- ADJUNTO Y CONTACTO -->',
    '      <div style="margin-top:22px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;">',
    '        <p style="margin:0 0 10px;font-size:12.5px;color:#475569;line-height:1.5;"><strong>PDF adjunto:</strong> Adjuntamos nuevamente una copia de tu comprobante oficial para tu comodidad.</p>',
    '        <p style="margin:0;font-size:12.5px;color:#475569;line-height:1.5;">¿Ya realizaste tu pago o necesitas ayuda?<br/>' +
      '<a href="' + whatsappHelpUrl + '" target="_blank" style="color:#12435E;font-weight:700;text-decoration:underline;">Envíanos tu comprobante por WhatsApp (+506 7260-1238)</a></p>',
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

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const pdfBuffer = await generateInvoicePdf(invoice);
  const clientExtra = parseClientAddress(invoice.clients?.address);
  const secondaryEmail = (opts.customCc ?? clientExtra.secondary_email ?? '').trim();

  const mailOptions: nodemailer.SendMailOptions = {
    from: '"JRS CARGO" <' + smtpUser + '>',
    to: destinationEmail,
    subject,
    html: htmlContent,
    attachments: [
      {
        filename: 'Comprobante-' + invoice.invoice_number + '.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  if (secondaryEmail && !isInvalidClientEmail(secondaryEmail)) {
    mailOptions.cc = secondaryEmail;
  }

  const info = await transporter.sendMail(mailOptions);
  const nowIso = new Date().toISOString();

  const record: PaymentReminderRecord = {
    invoiceId: String(invoice.id),
    invoiceNumber: String(invoice.invoice_number || ''),
    clientName,
    email: destinationEmail,
    firstEmailSentAt,
    reminderSentAt: nowIso,
    trigger: opts.trigger,
    messageId: info.messageId,
  };

  const triggerText =
    opts.trigger === 'cron'
      ? 'Enviado automáticamente por tarea programada (4+ días del 1er correo)'
      : opts.trigger === 'auto'
        ? 'Enviado automáticamente (4+ días después del 1er correo)'
        : 'Recordatorio de pago enviado manualmente';

  const historyEntry: PaymentReminderHistoryEntry = {
    id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestampIso: nowIso,
    timestampDisplay: formatCostaRicaDateTime(new Date(nowIso)),
    invoiceId: String(invoice.id),
    invoiceNumber: String(invoice.invoice_number || ''),
    clientName,
    email: destinationEmail,
    trigger: opts.trigger,
    status: 'sent',
    detail: triggerText,
  };

  return {
    success: true,
    messageId: info.messageId,
    reminderSentAt: nowIso,
    record,
    historyEntry,
  };
}

/**
 * Busca todas las facturas pendientes cuyo primer correo (`email_sent_at`) fue enviado
 * hace 4 o más días y aún no tienen recordatorio enviado ni omitido.
 */
export async function runDuePaymentReminders(opts: {
  trigger: 'auto' | 'cron' | 'manual';
  maxPerRun?: number;
  forceEvenIfDisabled?: boolean;
}): Promise<{
  skipped?: boolean;
  reason?: string;
  sentCount: number;
  errorCount: number;
  eligibleCount: number;
  state: PaymentRemindersState;
}> {
  const state = await loadPaymentRemindersState();

  if (!state.enabled && !opts.forceEvenIfDisabled) {
    return {
      skipped: true,
      reason: 'reminders_disabled',
      sentCount: 0,
      errorCount: 0,
      eligibleCount: 0,
      state,
    };
  }

  // Throttle silent auto_check to at most once every 10 minutes
  if (opts.trigger === 'auto' && state.lastAutoCheckAtIso) {
    const lastMs = new Date(state.lastAutoCheckAtIso).getTime();
    if (!Number.isNaN(lastMs) && Date.now() - lastMs < 10 * 60 * 1000) {
      return {
        skipped: true,
        reason: 'recently_checked',
        sentCount: 0,
        errorCount: 0,
        eligibleCount: 0,
        state,
      };
    }
  }

  const allInvoices = (await getInvoices({ includeItems: false })) as Array<{
    id: string;
    invoice_number?: string;
    issue_date?: string;
    total: number | string;
    status: string;
    currency?: string;
    email_sent_at?: string | null;
    clients?: { name?: string; email?: string } | null;
    invoice_payments?: { amount_applied: number | string }[];
    [key: string]: unknown;
  }>;
  const daysThreshold = state.daysAfterFirstEmail || DEFAULT_REMINDER_DAYS;

  const eligible = (allInvoices || []).filter(inv => {
    if (!inv || inv.status === 'Anulada') return false;
    if (!inv.email_sent_at) return false;
    if (state.reminders[inv.id]) return false;

    const stats = getInvoiceStats(inv);
    if (inv.status === 'Pagada' || stats.displayStatus === 'Pagada' || stats.pending <= 0.009) {
      return false;
    }

    if (isInvalidClientEmail(inv.clients?.email)) return false;

    const daysSinceFirst = getDaysSinceFirstEmail(inv.email_sent_at);
    return daysSinceFirst >= daysThreshold;
  });

  const limit = opts.maxPerRun && opts.maxPerRun > 0 ? opts.maxPerRun : eligible.length;
  const batch = eligible.slice(0, limit);

  let sentCount = 0;
  let errorCount = 0;
  const nextReminders = { ...state.reminders };
  const nextHistory = [...(state.history || [])];

  for (const inv of batch) {
    try {
      const result = await sendPaymentReminderForInvoice({
        invoiceId: String(inv.id),
        trigger: opts.trigger,
      });

      if (result.success && result.record && result.historyEntry) {
        nextReminders[String(inv.id)] = result.record;
        nextHistory.unshift(result.historyEntry);
        sentCount++;
      } else {
        errorCount++;
        const nowIso = new Date().toISOString();
        nextHistory.unshift({
          id: `rem-err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestampIso: nowIso,
          timestampDisplay: formatCostaRicaDateTime(new Date(nowIso)),
          invoiceId: String(inv.id),
          invoiceNumber: String(inv.invoice_number || ''),
          clientName: String(inv.clients?.name || 'Cliente'),
          email: String(inv.clients?.email || ''),
          trigger: opts.trigger,
          status: 'error',
          detail: result.error || 'Error enviando recordatorio',
        });
      }
    } catch (err) {
      errorCount++;
      const nowIso = new Date().toISOString();
      nextHistory.unshift({
        id: `rem-err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestampIso: nowIso,
        timestampDisplay: formatCostaRicaDateTime(new Date(nowIso)),
        invoiceId: String(inv.id),
        invoiceNumber: String(inv.invoice_number || ''),
        clientName: String(inv.clients?.name || 'Cliente'),
        email: String(inv.clients?.email || ''),
        trigger: opts.trigger,
        status: 'error',
        detail: err instanceof Error ? err.message : 'Error inesperado enviando recordatorio',
      });
    }
  }

  const nextState: PaymentRemindersState = {
    ...state,
    lastAutoCheckAtIso: new Date().toISOString(),
    reminders: nextReminders,
    history: nextHistory.slice(0, 200),
  };

  await savePaymentRemindersState(nextState);

  return {
    sentCount,
    errorCount,
    eligibleCount: eligible.length,
    state: nextState,
  };
}
