import nodemailer from 'nodemailer';
import { getHeaders } from './supabase';
import { formatCostaRicaDateTime } from './billing';

export const EMAIL_CAMPAIGNS_ROW_ID = '__JRS_EMAIL_CAMPAIGNS_STATE__';

export type CampaignImagePosition = 'top' | 'middle' | 'bottom';

export interface CampaignImage {
  id: string;
  src: string; // data:image/...;base64,... or https://...
  caption?: string;
  position: CampaignImagePosition;
}

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
  images?: CampaignImage[];
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
    ? `<p style="margin:0;padding:10px 14px;background-color:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#475569;text-align:center;line-height:1.45;font-weight:500;">${escapeHtml(img.caption)}</p>`
    : '';

  return (
    `<div style="${marginStyle}border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;background-color:#f8fafc;">` +
    `<img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.caption || 'JRS Cargo')}" style="width:100%;max-width:540px;height:auto;display:block;border:0;outline:none;" />` +
    captionHtml +
    '</div>'
  );
}

export function buildCampaignEmailHtml(opts: {
  recipientName?: string;
  preheader?: string;
  badgeText?: string;
  headline: string;
  body: string;
  highlights?: string[];
  resolvedImages?: Array<{ src: string; caption: string; position: CampaignImagePosition }>;
  ctaText?: string;
  ctaUrl?: string;
  isTest?: boolean;
}): string {
  const firstName = (opts.recipientName || 'Cliente').trim().split(' ')[0] || 'Cliente';
  const greeting = `Hola ${escapeHtml(firstName)},`;

  const imgs = opts.resolvedImages || [];
  const topImages = imgs.filter(i => i.position === 'top');
  const middleImages = imgs.filter(i => i.position === 'middle');
  const bottomImages = imgs.filter(i => i.position === 'bottom');

  const rawParagraphs = String(opts.body || '')
    .replace(/\{\{\s*nombre\s*\}\}/gi, firstName)
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean);

  const paragraphHtmlList = rawParagraphs.map(
    p =>
      `<p style="margin:0 0 15px;font-size:15px;color:#334155;line-height:1.7;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`
  );

  // Place "middle" images right after the 1st paragraph (or at the end if only 0-1 paragraphs)
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

  const validHighlights = (opts.highlights || []).map(h => h.trim()).filter(Boolean);
  const highlightsHtml =
    validHighlights.length > 0
      ? '<div style="margin:22px 0 24px;padding:20px 22px;background-color:#f8fafc;border:1px solid #e2e8f0;border-top:3px solid #F59E0B;border-radius:12px;">' +
        '<p style="margin:0 0 12px;font-size:11px;font-weight:800;color:#0B2737;text-transform:uppercase;letter-spacing:1px;">Lo que debes saber</p>' +
        '<table role="presentation" style="width:100%;border-collapse:collapse;">' +
        validHighlights
          .map(
            h =>
              '<tr>' +
              '<td style="padding:5px 0;vertical-align:top;width:24px;">' +
              '<span style="display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;border-radius:999px;background-color:#FEF3C7;color:#B45309;font-size:11px;font-weight:800;">&#10003;</span>' +
              '</td>' +
              '<td style="padding:5px 0;font-size:14px;color:#1e293b;line-height:1.5;font-weight:500;">' +
              escapeHtml(h) +
              '</td>' +
              '</tr>'
          )
          .join('') +
        '</table></div>'
      : '';

  const ctaUrl = (opts.ctaUrl || '').trim();
  const ctaText = (opts.ctaText || '').trim();
  const ctaHtml =
    ctaUrl && ctaText
      ? '<div style="margin:26px 0 10px;padding:22px 20px;background-color:#0B2737;background-image:linear-gradient(135deg,#0B2737 0%,#12435E 100%);border-radius:12px;text-align:center;">' +
        '<p style="margin:0 0 14px;font-size:13.5px;color:#e2e8f0;line-height:1.5;">¿Listo para coordinar tus envíos o recibir asesoría personalizada?</p>' +
        '<table role="presentation" style="margin:0 auto;border-collapse:collapse;">' +
        '<tr><td align="center" style="border-radius:10px;background-color:#F59E0B;">' +
        '<a href="' +
        escapeHtml(ctaUrl) +
        '" target="_blank" style="display:inline-block;background-color:#F59E0B;color:#0B2737;font-size:15px;font-weight:800;line-height:20px;text-align:center;text-decoration:none;padding:14px 32px;border-radius:10px;">' +
        escapeHtml(ctaText) +
        ' &rarr;</a></td></tr></table></div>'
      : '';

  const badgeText = (opts.badgeText || 'JRS Cargo Informa').trim();
  const testBanner = opts.isTest
    ? '<p style="margin:0 0 16px;padding:9px 14px;border-radius:8px;background-color:#fffbeb;border:1px solid #fde68a;color:#b45309;font-size:12px;font-weight:700;text-align:center;">VISTA DE PRUEBA &middot; Este correo es una prueba de campaña antes del envío masivo.</p>'
    : '';

  return [
    '<!DOCTYPE html>',
    '<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="color-scheme" content="light"/><meta name="supported-color-schemes" content="light"/>',
    '<style>',
    '  @media only screen and (max-width: 600px) {',
    '    .email-shell { padding: 12px 8px !important; }',
    '    .email-pad { padding: 22px 18px !important; }',
    '    .hero-pad { padding: 24px 20px !important; }',
    '  }',
    '</style>',
    '</head>',
    '<body class="email-shell" style="margin:0;padding:24px 12px;background-color:#eef2f6;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">',
    '  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#eef2f6;">' +
      escapeHtml(opts.preheader || opts.headline) +
      '&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>',
    '  <table role="presentation" style="width:100%;max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #dbe4ee;border-radius:16px;overflow:hidden;border-collapse:separate;">',
    '    <!-- FRANJA TRICOLOR DEL LOGO JRS CARGO -->',
    '    <tr><td style="padding:0;height:5px;font-size:0;line-height:0;">',
    '      <table role="presentation" style="width:100%;border-collapse:collapse;"><tr>',
    '        <td style="width:55%;height:5px;background-color:#0B2737;"></td>',
    '        <td style="width:25%;height:5px;background-color:#F59E0B;"></td>',
    '        <td style="width:20%;height:5px;background-color:#EF4444;"></td>',
    '      </tr></table>',
    '    </td></tr>',
    '    <!-- ENCABEZADO HERO -->',
    '    <tr><td class="hero-pad" style="padding:28px 30px 26px;background-color:#0B2737;background-image:linear-gradient(135deg,#0B2737 0%,#12435E 100%);color:#ffffff;">',
    '      <table role="presentation" style="width:100%;border-collapse:collapse;">',
    '        <tr>',
    '          <td style="vertical-align:middle;">',
    '            <div style="display:inline-block;background-color:#ffffff;padding:7px 13px;border-radius:10px;">',
    '              <img src="https://www.jrscargocr.com/logo.png" alt="JRS Cargo" style="height:36px;width:auto;display:block;" />',
    '            </div>',
    '          </td>',
    '          <td style="text-align:right;vertical-align:middle;">',
    '            <span style="display:inline-block;padding:5px 12px;border-radius:999px;background-color:rgba(245,158,11,0.18);border:1px solid rgba(250,204,21,0.45);color:#FACC15;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.9px;">' +
      escapeHtml(badgeText) +
      '</span>',
    '          </td>',
    '        </tr>',
    '      </table>',
    '      <h1 style="margin:20px 0 0;font-size:25px;font-weight:800;line-height:1.22;color:#ffffff;letter-spacing:-0.4px;">' +
      escapeHtml(opts.headline) +
      '</h1>',
    '      <div style="margin-top:12px;width:54px;height:3px;border-radius:99px;background-color:#F59E0B;"></div>',
    '    </td></tr>',
    '    <!-- CUERPO DEL CORREO -->',
    '    <tr><td class="email-pad" style="padding:28px 30px;background-color:#ffffff;">',
    testBanner,
    topImagesHtml,
    '      <p style="margin:0 0 12px;font-size:17px;font-weight:800;color:#0B2737;">' + greeting + '</p>',
    bodyWithMiddleImages,
    highlightsHtml,
    bottomImagesHtml,
    ctaHtml,
    '      <!-- FRANJA DE CONFIANZA JRS CARGO -->',
    '      <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:22px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">',
    '        <tr>',
    '          <td style="width:33.3%;padding:12px 8px;text-align:center;border-right:1px solid #e2e8f0;">',
    '            <p style="margin:0;font-size:11px;font-weight:800;color:#0B2737;text-transform:uppercase;letter-spacing:0.4px;">Miami &rarr; CR</p>',
    '            <p style="margin:2px 0 0;font-size:11px;color:#64748b;">Aéreo y Marítimo</p>',
    '          </td>',
    '          <td style="width:33.3%;padding:12px 8px;text-align:center;border-right:1px solid #e2e8f0;">',
    '            <p style="margin:0;font-size:11px;font-weight:800;color:#12435E;text-transform:uppercase;letter-spacing:0.4px;">Tracking 24/7</p>',
    '            <p style="margin:2px 0 0;font-size:11px;color:#64748b;">Seguimiento en línea</p>',
    '          </td>',
    '          <td style="width:33.3%;padding:12px 8px;text-align:center;">',
    '            <p style="margin:0;font-size:11px;font-weight:800;color:#EF4444;text-transform:uppercase;letter-spacing:0.4px;">Soporte Directo</p>',
    '            <p style="margin:2px 0 0;font-size:11px;color:#64748b;">WhatsApp +506 7260-1238</p>',
    '          </td>',
    '        </tr>',
    '      </table>',
    '    </td></tr>',
    '    <!-- PIE DE PÁGINA -->',
    '    <tr><td style="padding:20px 24px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">',
    '      <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#0B2737;letter-spacing:0.3px;">JRS CARGO S.A.</p>',
    '      <p style="margin:0;font-size:11.5px;color:#64748b;line-height:1.65;">San Pablo de Heredia, Costa Rica &nbsp;&middot;&nbsp; <a href="https://wa.me/50672601238" style="color:#12435E;text-decoration:none;font-weight:700;">+506 7260-1238</a><br/><a href="mailto:info@jrscargocr.com" style="color:#64748b;text-decoration:none;">info@jrscargocr.com</a> &nbsp;&middot;&nbsp; <a href="https://www.jrscargocr.com" style="color:#12435E;text-decoration:none;font-weight:700;">www.jrscargocr.com</a></p>',
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
  images?: CampaignImage[];
  ctaText?: string;
  ctaUrl?: string;
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
      const html = buildCampaignEmailHtml({
        recipientName: rec.name || 'Cliente',
        preheader: opts.preheader,
        badgeText: opts.badgeText,
        headline: opts.headline,
        body: opts.body,
        highlights: opts.highlights,
        resolvedImages,
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
