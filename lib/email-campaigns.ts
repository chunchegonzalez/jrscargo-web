import nodemailer from 'nodemailer';
import { getHeaders } from './supabase';
import { formatCostaRicaDateTime } from './billing';

export const EMAIL_CAMPAIGNS_ROW_ID = '__JRS_EMAIL_CAMPAIGNS_STATE__';

export interface EmailCampaignDraft {
  id: string;
  title: string;
  idea: string;
  category: 'promocion' | 'aviso' | 'temporada' | 'informativo';
  subject: string;
  preheader: string;
  badgeText: string;
  headline: string;
  body: string;
  highlights: string[];
  ctaText: string;
  ctaUrl: string;
  updatedAtIso: string;
  updatedAtDisplay: string;
}

export interface EmailCampaignHistoryEntry {
  id: string;
  sentAtIso: string;
  sentAtDisplay: string;
  title: string;
  subject: string;
  totalRecipients: number;
  sentCount: number;
  errorCount: number;
  sentBy: string;
  errors?: string[];
}

export interface EmailCampaignsState {
  drafts: EmailCampaignDraft[];
  history: EmailCampaignHistoryEntry[];
}

const DEFAULT_STATE: EmailCampaignsState = {
  drafts: [],
  history: [],
};

export function isValidCampaignEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = String(email).trim().toLowerCase();
  if (!clean || !clean.includes('@') || !clean.includes('.')) return false;
  if (
    clean === 'pendiente@pendiente' ||
    clean.startsWith('pendiente@') ||
    clean.endsWith('@pendiente')
  ) {
    return false;
  }
  return true;
}

export async function loadEmailCampaignsState(): Promise<EmailCampaignsState> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!url) return { ...DEFAULT_STATE, drafts: [], history: [] };

  try {
    const res = await fetch(
      `${url}/rest/v1/local_inventory?id=eq.${encodeURIComponent(EMAIL_CAMPAIGNS_ROW_ID)}&limit=1`,
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
            drafts: Array.isArray(container.drafts) ? container.drafts : [],
            history: Array.isArray(container.history) ? container.history : [],
          };
        }
      }
    }
  } catch (err) {
    console.error('Error loading email campaigns state:', err);
  }

  return { ...DEFAULT_STATE, drafts: [], history: [] };
}

export async function saveEmailCampaignsState(state: EmailCampaignsState): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!url) return;

  const payload = {
    id: EMAIL_CAMPAIGNS_ROW_ID,
    client: 'SYSTEM_EMAIL_CAMPAIGNS_STATE',
    company: 'JRS CARGO',
    weight: '0 lbs',
    status: 'Eliminado',
    history: [
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        drafts: (state.drafts || []).slice(0, 50),
        history: (state.history || []).slice(0, 100),
      },
    ],
  };

  const checkRes = await fetch(
    `${url}/rest/v1/local_inventory?id=eq.${encodeURIComponent(EMAIL_CAMPAIGNS_ROW_ID)}&select=id`,
    {
      headers: getHeaders(),
      cache: 'no-store',
    }
  );
  const existing = checkRes.ok ? await checkRes.json() : [];

  if (Array.isArray(existing) && existing.length > 0) {
    await fetch(
      `${url}/rest/v1/local_inventory?id=eq.${encodeURIComponent(EMAIL_CAMPAIGNS_ROW_ID)}`,
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

export function buildCampaignEmailHtml(opts: {
  recipientName?: string;
  preheader?: string;
  badgeText?: string;
  headline: string;
  body: string;
  highlights?: string[];
  ctaText?: string;
  ctaUrl?: string;
  isTest?: boolean;
}): string {
  const firstName = (opts.recipientName || 'Cliente').trim().split(' ')[0] || 'Cliente';
  const greeting = `Hola ${escapeHtml(firstName)},`;

  const bodyParagraphs = String(opts.body || '')
    .replace(/\{\{\s*nombre\s*\}\}/gi, firstName)
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(
      p =>
        `<p style="margin:0 0 14px;font-size:14.5px;color:#334155;line-height:1.68;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`
    )
    .join('');

  const validHighlights = (opts.highlights || []).map(h => h.trim()).filter(Boolean);
  const highlightsHtml =
    validHighlights.length > 0
      ? '<div style="margin:20px 0 22px;padding:18px 20px;background-color:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #F59E0B;border-radius:12px;">' +
        '<p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#0B2737;text-transform:uppercase;letter-spacing:0.8px;">Puntos destacados</p>' +
        '<table role="presentation" style="width:100%;border-collapse:collapse;">' +
        validHighlights
          .map(
            h =>
              '<tr><td style="padding:4px 0;vertical-align:top;width:18px;font-size:14px;color:#F59E0B;font-weight:800;">&#9679;</td>' +
              '<td style="padding:4px 0;font-size:13.5px;color:#1e293b;line-height:1.5;font-weight:500;">' +
              escapeHtml(h) +
              '</td></tr>'
          )
          .join('') +
        '</table></div>'
      : '';

  const ctaUrl = (opts.ctaUrl || '').trim();
  const ctaText = (opts.ctaText || '').trim();
  const ctaHtml =
    ctaUrl && ctaText
      ? '<div style="margin:24px 0 8px;text-align:center;">' +
        '<table role="presentation" style="margin:0 auto;border-collapse:collapse;">' +
        '<tr><td align="center" style="border-radius:10px;background-color:#0B2737;">' +
        '<a href="' +
        escapeHtml(ctaUrl) +
        '" target="_blank" style="display:inline-block;background-color:#0B2737;color:#ffffff;font-size:14.5px;font-weight:700;line-height:20px;text-align:center;text-decoration:none;padding:14px 30px;border-radius:10px;border:1px solid #0B2737;">' +
        escapeHtml(ctaText) +
        '</a></td></tr></table></div>'
      : '';

  const badgeText = (opts.badgeText || 'JRS Cargo Informa').trim();
  const testBanner = opts.isTest
    ? '<p style="margin:0 0 14px;padding:8px 12px;border-radius:8px;background-color:#fffbeb;border:1px solid #fde68a;color:#b45309;font-size:12px;font-weight:700;text-align:center;">VISTA DE PRUEBA &middot; Este correo es una prueba de campaña antes del envío masivo.</p>'
    : '';

  return [
    '<!DOCTYPE html>',
    '<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="color-scheme" content="light"/><meta name="supported-color-schemes" content="light"/></head>',
    '<body style="margin:0;padding:24px 12px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">',
    '  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#f1f5f9;">' +
      escapeHtml(opts.preheader || opts.headline) +
      '&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>',
    '  <table role="presentation" style="width:100%;max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;border-collapse:separate;">',
    '    <tr><td style="padding:26px 30px;background-color:#0B2737;background-image:linear-gradient(135deg,#0B2737 0%,#12435E 100%);border-bottom:3px solid #F59E0B;color:#ffffff;">',
    '      <table role="presentation" style="width:100%;border-collapse:collapse;">',
    '        <tr>',
    '          <td style="vertical-align:middle;">',
    '            <div style="display:inline-block;background-color:#ffffff;padding:7px 12px;border-radius:10px;">',
    '              <img src="https://www.jrscargocr.com/logo.png" alt="JRS Cargo" style="height:34px;width:auto;display:block;" />',
    '            </div>',
    '          </td>',
    '          <td style="text-align:right;vertical-align:middle;">',
    '            <span style="display:inline-block;padding:4px 10px;border-radius:999px;background-color:rgba(250,204,21,0.16);border:1px solid rgba(250,204,21,0.4);color:#FACC15;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">' +
      escapeHtml(badgeText) +
      '</span>',
    '          </td>',
    '        </tr>',
    '      </table>',
    '      <h1 style="margin:18px 0 0;font-size:23px;font-weight:800;line-height:1.25;color:#ffffff;letter-spacing:-0.3px;">' +
      escapeHtml(opts.headline) +
      '</h1>',
    '    </td></tr>',
    '    <tr><td style="padding:28px 30px;background-color:#ffffff;">',
    testBanner,
    '      <p style="margin:0 0 12px;font-size:16.5px;font-weight:700;color:#0f172a;">' + greeting + '</p>',
    bodyParagraphs,
    highlightsHtml,
    ctaHtml,
    '      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;">',
    '        <p style="margin:0;font-size:12.5px;color:#475569;line-height:1.55;">¿Tienes dudas o deseas cotizar un envío?<br/>' +
      '<a href="https://wa.me/50672601238" target="_blank" style="color:#12435E;font-weight:700;text-decoration:underline;">Escríbenos por WhatsApp (+506 7260-1238)</a></p>',
    '      </div>',
    '    </td></tr>',
    '    <tr><td style="padding:20px 24px;background-color:#ffffff;border-top:1px solid #e2e8f0;text-align:center;">',
    '      <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#0B2737;letter-spacing:0.3px;">JRS CARGO S.A.</p>',
    '      <p style="margin:0;font-size:11.5px;color:#64748b;line-height:1.65;">San Pablo de Heredia, Costa Rica &nbsp;&middot;&nbsp; <a href="https://wa.me/50672601238" style="color:#12435E;text-decoration:none;font-weight:600;">+506 7260-1238</a><br/><a href="mailto:info@jrscargocr.com" style="color:#64748b;text-decoration:none;">info@jrscargocr.com</a> &nbsp;&middot;&nbsp; <a href="https://www.jrscargocr.com" style="color:#12435E;text-decoration:none;font-weight:600;">www.jrscargocr.com</a></p>',
    '    </td></tr>',
    '  </table>',
    '</body></html>',
  ].join('\n');
}

export async function sendCampaignBatchEmails(opts: {
  recipients: Array<{ email: string; name?: string }>;
  subject: string;
  preheader?: string;
  badgeText?: string;
  headline: string;
  body: string;
  highlights?: string[];
  ctaText?: string;
  ctaUrl?: string;
  isTest?: boolean;
}): Promise<{ sentCount: number; errorCount: number; errors: string[] }> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;
  if (!smtpUser || !smtpPass) {
    throw new Error('Credenciales SMTP no configuradas en el servidor.');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    pool: true,
    maxConnections: 3,
    auth: { user: smtpUser, pass: smtpPass },
  });

  let sentCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const rec of opts.recipients) {
    const email = String(rec.email || '').trim();
    if (!isValidCampaignEmail(email)) continue;

    try {
      const html = buildCampaignEmailHtml({
        recipientName: rec.name || 'Cliente',
        preheader: opts.preheader,
        badgeText: opts.badgeText,
        headline: opts.headline,
        body: opts.body,
        highlights: opts.highlights,
        ctaText: opts.ctaText,
        ctaUrl: opts.ctaUrl,
        isTest: opts.isTest,
      });

      const finalSubject = opts.isTest ? `[PRUEBA] ${opts.subject}` : opts.subject;

      await transporter.sendMail({
        from: `"JRS CARGO" <${smtpUser}>`,
        to: email,
        subject: finalSubject,
        html,
      });
      sentCount++;
    } catch (err) {
      errorCount++;
      errors.push(`${email}: ${err instanceof Error ? err.message : 'Error SMTP'}`);
    }
  }

  try {
    transporter.close();
  } catch {
    // Ignore pool close error
  }

  return { sentCount, errorCount, errors };
}

export function createDraftTimestamp(): { iso: string; display: string } {
  const now = new Date();
  return {
    iso: now.toISOString(),
    display: formatCostaRicaDateTime(now),
  };
}
