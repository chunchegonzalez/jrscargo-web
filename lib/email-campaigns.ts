import nodemailer from 'nodemailer';
import { getHeaders } from './supabase';
import { formatCostaRicaDateTime } from './billing';

export const EMAIL_CAMPAIGNS_ROW_ID = '__JRS_EMAIL_CAMPAIGNS_STATE__';

export type CampaignCategory = 'promocion' | 'paquete' | 'cobro' | 'estado_cuenta';
export type CampaignImagePosition = 'top' | 'middle' | 'bottom';

export interface CampaignImage {
  id: string;
  src: string; // data:image/...;base64,... or https://...
  caption?: string;
  position: CampaignImagePosition;
}

export interface CampaignVariables {
  trackingNumber?: string;
  campaignDate?: string;
  customLink?: string;
}

export interface EmailCampaignDraft {
  id: string;
  title: string;
  idea: string;
  category: CampaignCategory;
  subject: string;
  preheader: string;
  badgeText: string;
  headline: string;
  body: string;
  highlights: string[];
  images?: CampaignImage[];
  ctaText: string;
  ctaUrl: string;
  showWhatsappSecondary?: boolean;
  variables?: CampaignVariables;
  updatedAtIso: string;
  updatedAtDisplay: string;
}

export interface EmailCampaignHistoryEntry {
  id: string;
  sentAtIso: string;
  sentAtDisplay: string;
  title: string;
  subject: string;
  category?: CampaignCategory;
  totalRecipients: number;
  sentCount: number;
  errorCount: number;
  sentBy: string;
  imagesCount?: number;
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

const FORBIDDEN_PLACEHOLDERS = [
  'titular de tu campaña',
  '(sin asunto aún)',
  '(sin asunto)',
  '(escribe aquí tu idea)',
  'lorem ipsum',
  '[pendiente]',
  'texto de ejemplo',
];

const AMOUNT_PATTERN_IN_STATEMENT =
  /(?:[$₡]\s*\d|\b(?:usd|crc|colones|dólares|dolares)\s*[:.]?\s*\d|\d+(?:[.,]\d{2})?\s*(?:usd|crc|colones|dólares|dolares)\b)/i;

export function normalizeCampaignCategory(raw?: unknown): CampaignCategory {
  if (raw === 'promocion' || raw === 'paquete' || raw === 'cobro' || raw === 'estado_cuenta') {
    return raw;
  }
  return 'promocion';
}

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

export function sanitizeCampaignImages(raw: unknown): CampaignImage[] {
  if (!Array.isArray(raw)) return [];
  const valid: CampaignImage[] = [];
  for (let i = 0; i < Math.min(raw.length, 4); i++) {
    const item = raw[i] as Record<string, unknown> | null;
    if (!item || typeof item !== 'object') continue;
    const src = String(item.src || '').trim();
    if (!src) continue;
    if (!src.startsWith('data:image/') && !src.startsWith('https://') && !src.startsWith('http://')) {
      continue;
    }
    const pos =
      item.position === 'top' || item.position === 'middle' || item.position === 'bottom'
        ? item.position
        : 'middle';
    valid.push({
      id: String(item.id || `img-${i}`),
      src,
      caption: typeof item.caption === 'string' ? item.caption.trim().slice(0, 180) : '',
      position: pos,
    });
  }
  return valid;
}

export function validateCampaignPayload(payload: {
  category: CampaignCategory;
  subject: string;
  headline: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  variables?: CampaignVariables;
}): string[] {
  const errors: string[] = [];
  const subject = String(payload.subject || '').trim();
  const headline = String(payload.headline || '').trim();
  const body = String(payload.body || '').trim();
  const ctaText = String(payload.ctaText || '').trim();
  const ctaUrl = String(payload.ctaUrl || '').trim();

  if (!subject) errors.push('Falta el asunto del correo.');
  if (!headline) errors.push('Falta el título principal del correo.');
  if (!body) errors.push('Falta el mensaje principal.');
  if (!ctaText) errors.push('Falta el texto del botón principal.');
  if (!ctaUrl) {
    errors.push('Falta el enlace del botón principal.');
  } else if (
    !ctaUrl.includes('{{enlace}}') &&
    !ctaUrl.startsWith('https://') &&
    !ctaUrl.startsWith('http://')
  ) {
    errors.push('El enlace del botón principal debe iniciar con https:// o usar {{enlace}}.');
  }

  const combined = `${subject}\n${headline}\n${body}\n${ctaText}`;
  const combinedLower = combined.toLowerCase();

  for (const forbidden of FORBIDDEN_PLACEHOLDERS) {
    if (combinedLower.includes(forbidden)) {
      errors.push(`El correo contiene texto de ejemplo sin reemplazar («${forbidden}»).`);
    }
  }

  if (/\{\{\s*guia\s*\}\}/i.test(combined) && !String(payload.variables?.trackingNumber || '').trim()) {
    errors.push('Usaste {{guia}} pero falta completar el número de guía.');
  }
  if (/\{\{\s*fecha\s*\}\}/i.test(combined) && !String(payload.variables?.campaignDate || '').trim()) {
    errors.push('Usaste {{fecha}} pero falta completar la fecha.');
  }
  if (
    payload.category !== 'estado_cuenta' &&
    (/\{\{\s*enlace\s*\}\}/i.test(combined) || /\{\{\s*enlace\s*\}\}/i.test(ctaUrl)) &&
    !String(payload.variables?.customLink || '').trim()
  ) {
    errors.push('Usaste {{enlace}} pero falta completar el enlace variable.');
  }

  if (payload.category === 'estado_cuenta') {
    const statementText = `${subject}\n${headline}\n${body}`;
    if (AMOUNT_PATTERN_IN_STATEMENT.test(statementText)) {
      errors.push(
        'En correos de Estado de Cuenta no incluyas montos pendientes en el mensaje; invita al cliente a consultarlo en línea mediante el botón.'
      );
    }
  }

  return errors;
}

export function resolveCampaignVariables(
  text: string,
  opts: {
    recipientName?: string;
    recipientId?: string;
    category?: CampaignCategory;
    variables?: CampaignVariables;
  }
): string {
  const firstName = (opts.recipientName || 'Cliente').trim().split(' ')[0] || 'Cliente';
  const trackingNumber = String(opts.variables?.trackingNumber || '').trim();
  const campaignDate = String(opts.variables?.campaignDate || '').trim();
  const statementLink =
    opts.category === 'estado_cuenta' && opts.recipientId
      ? `https://www.jrscargocr.com/estado-cuenta/${encodeURIComponent(opts.recipientId)}`
      : '';
  const resolvedLink =
    statementLink ||
    String(opts.variables?.customLink || '').trim() ||
    'https://www.jrscargocr.com';

  return String(text || '')
    .replace(/\{\{\s*nombre\s*\}\}/gi, firstName)
    .replace(/\{\{\s*guia\s*\}\}/gi, trackingNumber)
    .replace(/\{\{\s*fecha\s*\}\}/gi, campaignDate)
    .replace(/\{\{\s*enlace\s*\}\}/gi, resolvedLink);
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
        drafts: (state.drafts || []).slice(0, 30),
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

function prepareInlineImages(images?: CampaignImage[]): {
  resolvedImages: Array<{ src: string; caption: string; position: CampaignImagePosition }>;
  attachments: nodemailer.SendMailOptions['attachments'];
} {
  const sanitized = sanitizeCampaignImages(images);
  const resolvedImages: Array<{ src: string; caption: string; position: CampaignImagePosition }> = [];
  const attachments: NonNullable<nodemailer.SendMailOptions['attachments']> = [];

  sanitized.forEach((img, idx) => {
    if (img.src.startsWith('data:image/')) {
      const match = img.src.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (match) {
        const contentType = match[1];
        const base64Data = match[2];
        const ext = contentType.includes('png')
          ? 'png'
          : contentType.includes('webp')
            ? 'webp'
            : contentType.includes('gif')
              ? 'gif'
              : 'jpg';
        const cid = `jrs-campaign-img-${idx}@jrscargocr.com`;
        attachments.push({
          filename: `campana-jrs-${idx + 1}.${ext}`,
          content: Buffer.from(base64Data, 'base64'),
          contentType,
          cid,
          contentDisposition: 'inline',
        });
        resolvedImages.push({
          src: `cid:${cid}`,
          caption: img.caption || '',
          position: img.position,
        });
      }
    } else {
      resolvedImages.push({
        src: img.src,
        caption: img.caption || '',
        position: img.position,
      });
    }
  });

  return { resolvedImages, attachments };
}

function renderImageBlockHtml(img: { src: string; caption: string }, isHero: boolean): string {
  const marginStyle = isHero ? 'margin:0 0 22px;' : 'margin:20px 0 22px;';
  const captionHtml = img.caption
    ? `<p style="margin:0;padding:10px 14px;background-color:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#475569;text-align:center;line-height:1.45;">${escapeHtml(img.caption)}</p>`
    : '';

  return (
    `<div style="${marginStyle}border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;background-color:#f8fafc;">` +
    `<img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.caption || 'JRS Cargo')}" style="width:100%;max-width:536px;height:auto;display:block;border:0;outline:none;" />` +
    captionHtml +
    '</div>'
  );
}

/**
 * Plantilla HTML limpia, sobria y 100% compatible con Gmail, Outlook y móviles:
 * Encabezado compacto azul JRS Cargo con logo oficial + línea naranja/ámbar ->
 * Título centrado -> Saludo personalizado -> Mensaje (+ imágenes opcionales) ->
 * Botón principal según el propósito -> Acción secundaria de WhatsApp ->
 * Pie compacto con datos de contacto y línea inferior naranja/ámbar.
 */
export function buildCampaignEmailHtml(opts: {
  recipientName?: string;
  recipientId?: string;
  category?: CampaignCategory;
  variables?: CampaignVariables;
  preheader?: string;
  badgeText?: string;
  headline: string;
  body: string;
  highlights?: string[];
  resolvedImages?: Array<{ src: string; caption: string; position: CampaignImagePosition }>;
  ctaText?: string;
  ctaUrl?: string;
  showWhatsappSecondary?: boolean;
  isTest?: boolean;
}): string {
  const firstName = (opts.recipientName || 'Cliente').trim().split(' ')[0] || 'Cliente';
  const greeting = `Hola, ${escapeHtml(firstName)}:`;

  const varCtx = {
    recipientName: opts.recipientName,
    recipientId: opts.recipientId,
    category: opts.category,
    variables: opts.variables,
  };

  const resolvedHeadline = resolveCampaignVariables(opts.headline, varCtx);
  const resolvedPreheader = resolveCampaignVariables(opts.preheader || opts.headline, varCtx);
  const resolvedBody = resolveCampaignVariables(opts.body, varCtx);
  const resolvedCtaText = resolveCampaignVariables(opts.ctaText || '', varCtx).trim();
  const resolvedCtaUrl = resolveCampaignVariables(opts.ctaUrl || '', varCtx).trim();

  const imgs = opts.resolvedImages || [];
  const topImages = imgs.filter(i => i.position === 'top');
  const middleImages = imgs.filter(i => i.position === 'middle');
  const bottomImages = imgs.filter(i => i.position === 'bottom');

  const rawParagraphs = resolvedBody
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean);

  const paragraphHtmlList = rawParagraphs.map(
    p =>
      `<p style="margin:0 0 14px;font-size:15px;color:#334155;line-height:1.65;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`
  );

  let bodyWithMiddleImages = '';
  if (middleImages.length > 0 && paragraphHtmlList.length > 1) {
    const midHtml = middleImages.map(img => renderImageBlockHtml(img, false)).join('');
    bodyWithMiddleImages =
      paragraphHtmlList[0] + midHtml + paragraphHtmlList.slice(1).join('');
  } else {
    bodyWithMiddleImages =
      paragraphHtmlList.join('') +
      middleImages.map(img => renderImageBlockHtml(img, false)).join('');
  }

  const topImagesHtml = topImages.map(img => renderImageBlockHtml(img, true)).join('');
  const bottomImagesHtml = bottomImages.map(img => renderImageBlockHtml(img, false)).join('');

  const validHighlights = (opts.highlights || [])
    .map(h => resolveCampaignVariables(h, varCtx).trim())
    .filter(Boolean);

  const highlightsHtml =
    validHighlights.length > 0
      ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 22px;background-color:#f8fafc;border:1px solid #e2e8f0;border-left:3px solid #F59E0B;border-radius:8px;">' +
        '<tr><td style="padding:14px 18px;">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
        validHighlights
          .map(
            h =>
              '<tr>' +
              '<td width="18" valign="top" style="padding:3px 0;font-size:14px;color:#F59E0B;font-weight:700;">&#8226;</td>' +
              '<td valign="top" style="padding:3px 0;font-size:14px;color:#1e293b;line-height:1.5;">' +
              escapeHtml(h) +
              '</td>' +
              '</tr>'
          )
          .join('') +
        '</table></td></tr></table>'
      : '';

  const ctaHtml =
    resolvedCtaUrl && resolvedCtaText
      ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">' +
        '<tr><td align="center">' +
        '<table role="presentation" cellpadding="0" cellspacing="0">' +
        '<tr><td align="center" bgcolor="#0B2737" style="border-radius:8px;background-color:#0B2737;">' +
        '<a href="' +
        escapeHtml(resolvedCtaUrl) +
        '" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;">' +
        escapeHtml(resolvedCtaText) +
        ' &rarr;</a>' +
        '</td></tr></table>' +
        '</td></tr></table>'
      : '';

  const showWhatsapp = opts.showWhatsappSecondary !== false;
  const whatsappUrl =
    'https://wa.me/50672601238?text=' +
    encodeURIComponent(`Hola JRS Cargo, tengo una consulta sobre: ${resolvedHeadline}`);

  const secondaryWhatsappHtml = showWhatsapp
    ? '<p style="margin:18px 0 0;text-align:center;font-size:13.5px;color:#475569;line-height:1.5;">' +
      '¿Necesitas ayuda? ' +
      '<a href="' +
      whatsappUrl +
      '" target="_blank" style="color:#0B2737;font-weight:700;text-decoration:underline;">Escríbenos por WhatsApp</a>' +
      '</p>'
    : '';

  const badgeHtml =
    opts.badgeText && opts.badgeText.trim()
      ? '<p style="margin:0 0 8px;text-align:center;font-size:11px;font-weight:700;color:#12435E;text-transform:uppercase;letter-spacing:1px;">' +
        escapeHtml(opts.badgeText.trim()) +
        '</p>'
      : '';

  const testBanner = opts.isTest
    ? '<p style="margin:0 0 18px;padding:8px 12px;border-radius:6px;background-color:#fffbeb;border:1px solid #fde68a;color:#92400e;font-size:12px;font-weight:700;text-align:center;">CORREO DE PRUEBA &middot; Verificación antes del envío a clientes</p>'
    : '';

  return [
    '<!DOCTYPE html>',
    '<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="color-scheme" content="light"/><meta name="supported-color-schemes" content="light"/>',
    '<style>',
    '  @media only screen and (max-width: 600px) {',
    '    .email-shell { padding: 12px 8px !important; }',
    '    .email-body { padding: 24px 20px !important; }',
    '    .email-title { font-size: 21px !important; }',
    '  }',
    '</style>',
    '</head>',
    '<body class="email-shell" style="margin:0;padding:24px 12px;background-color:#eef2f6;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">',
    '  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#eef2f6;">' +
      escapeHtml(resolvedPreheader) +
      '&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>',
    '  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto;background-color:#ffffff;border:1px solid #dbe4ee;border-radius:12px;overflow:hidden;">',
    '    <!-- ENCABEZADO COMPACTO JRS CARGO -->',
    '    <tr><td align="center" bgcolor="#0B2737" style="padding:18px 24px;background-color:#0B2737;border-bottom:4px solid #F59E0B;">',
    '      <table role="presentation" cellpadding="0" cellspacing="0"><tr>',
    '        <td align="center" bgcolor="#ffffff" style="background-color:#ffffff;padding:6px 14px;border-radius:8px;">',
    '          <img src="https://www.jrscargocr.com/logo.png" alt="JRS Cargo" height="36" style="height:36px;width:auto;display:block;border:0;" />',
    '        </td>',
    '      </tr></table>',
    '    </td></tr>',
    '    <!-- CUERPO DEL CORREO -->',
    '    <tr><td class="email-body" style="padding:30px 32px 26px;background-color:#ffffff;">',
    testBanner,
    topImagesHtml,
    badgeHtml,
    '      <h1 class="email-title" style="margin:0 0 22px;text-align:center;font-size:24px;font-weight:800;line-height:1.25;color:#0B2737;letter-spacing:-0.3px;">' +
      escapeHtml(resolvedHeadline) +
      '</h1>',
    '      <p style="margin:0 0 10px;font-size:16px;font-weight:700;color:#0B2737;">' + greeting + '</p>',
    bodyWithMiddleImages,
    highlightsHtml,
    bottomImagesHtml,
    ctaHtml,
    secondaryWhatsappHtml,
    '    </td></tr>',
    '    <!-- PIE DE PÁGINA COMPACTO -->',
    '    <tr><td style="padding:0 32px 24px;background-color:#ffffff;border-bottom:4px solid #F59E0B;">',
    '      <div style="border-top:1px solid #e2e8f0;padding-top:18px;text-align:center;">',
    '        <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#0B2737;letter-spacing:0.3px;">JRS CARGO S.A.</p>',
    '        <p style="margin:0;font-size:12.5px;color:#475569;line-height:1.6;">San Pablo de Heredia, Costa Rica<br/>+506 7260-1238 &nbsp;&middot;&nbsp; <a href="https://www.jrscargocr.com" style="color:#12435E;text-decoration:none;font-weight:600;">www.jrscargocr.com</a></p>',
    '      </div>',
    '    </td></tr>',
    '  </table>',
    '</body></html>',
  ].join('\n');
}

export async function sendCampaignBatchEmails(opts: {
  recipients: Array<{ id?: string; email: string; name?: string }>;
  category?: CampaignCategory;
  variables?: CampaignVariables;
  subject: string;
  preheader?: string;
  badgeText?: string;
  headline: string;
  body: string;
  highlights?: string[];
  images?: CampaignImage[];
  ctaText?: string;
  ctaUrl?: string;
  showWhatsappSecondary?: boolean;
  isTest?: boolean;
}): Promise<{ sentCount: number; errorCount: number; errors: string[] }> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;
  if (!smtpUser || !smtpPass) {
    throw new Error('Credenciales SMTP no configuradas en el servidor.');
  }

  const { resolvedImages, attachments } = prepareInlineImages(opts.images);

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
      const resolvedSubject = resolveCampaignVariables(opts.subject, {
        recipientName: rec.name || 'Cliente',
        recipientId: rec.id,
        category: opts.category,
        variables: opts.variables,
      });

      const html = buildCampaignEmailHtml({
        recipientName: rec.name || 'Cliente',
        recipientId: rec.id,
        category: opts.category,
        variables: opts.variables,
        preheader: opts.preheader,
        badgeText: opts.badgeText,
        headline: opts.headline,
        body: opts.body,
        highlights: opts.highlights,
        resolvedImages,
        ctaText: opts.ctaText,
        ctaUrl: opts.ctaUrl,
        showWhatsappSecondary: opts.showWhatsappSecondary,
        isTest: opts.isTest,
      });

      const finalSubject = opts.isTest ? `[PRUEBA] ${resolvedSubject}` : resolvedSubject;

      await transporter.sendMail({
        from: `"JRS CARGO" <${smtpUser}>`,
        to: email,
        subject: finalSubject,
        html,
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
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
