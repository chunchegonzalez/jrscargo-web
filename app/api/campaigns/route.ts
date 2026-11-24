import { NextResponse } from 'next/server';
import { getAuthUserFromRequest, isMasterUser } from '@/lib/auth';
import { getClients } from '@/lib/supabase';
import {
  CampaignVariables,
  createDraftTimestamp,
  EmailCampaignDraft,
  EmailCampaignHistoryEntry,
  isValidCampaignEmail,
  loadEmailCampaignsState,
  normalizeCampaignCategory,
  sanitizeCampaignImages,
  saveEmailCampaignsState,
  sendCampaignBatchEmails,
  validateCampaignPayload,
} from '@/lib/email-campaigns';

export const dynamic = 'force-dynamic';

async function requireMaster(request: Request) {
  const user = await getAuthUserFromRequest(request);
  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Sesión requerida.' },
        { status: 401 }
      ),
      user: null,
    };
  }
  if (!isMasterUser(user.username)) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Acceso exclusivo para el usuario Master.' },
        { status: 403 }
      ),
      user: null,
    };
  }
  return { error: null, user };
}

function sanitizeVariables(raw: unknown): CampaignVariables {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  return {
    trackingNumber: typeof obj.trackingNumber === 'string' ? obj.trackingNumber.trim() : '',
    campaignDate: typeof obj.campaignDate === 'string' ? obj.campaignDate.trim() : '',
    customLink: typeof obj.customLink === 'string' ? obj.customLink.trim() : '',
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireMaster(request);
    if (auth.error) return auth.error;

    const [state, rawClients] = await Promise.all([
      loadEmailCampaignsState(),
      getClients(),
    ]);

    const seen = new Set<string>();
    const recipients: Array<{ id: string; name: string; email: string }> = [];

    for (const c of (rawClients || []) as Array<{ id?: string; name?: string; email?: string }>) {
      const email = String(c?.email || '').trim();
      if (!isValidCampaignEmail(email)) continue;
      const key = email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      recipients.push({
        id: String(c?.id || key),
        name: String(c?.name || 'Cliente').trim(),
        email,
      });
    }

    recipients.sort((a, b) => a.name.localeCompare(b.name, 'es'));

    return NextResponse.json({
      success: true,
      data: state,
      recipients,
      totalClientsRaw: Array.isArray(rawClients) ? rawClients.length : 0,
    });
  } catch (err) {
    console.error('GET /api/campaigns error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error cargando campañas' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireMaster(request);
    if (auth.error || !auth.user) return auth.error!;

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '');

    // 1. Save or update draft
    if (action === 'save_draft') {
      const state = await loadEmailCampaignsState();
      const ts = createDraftTimestamp();
      const incomingId =
        typeof body.id === 'string' && body.id.trim() ? body.id.trim() : `draft-${Date.now()}`;
      const category = normalizeCampaignCategory(body.category);

      const draft: EmailCampaignDraft = {
        id: incomingId,
        title: String(body.title || body.subject || 'Borrador sin título').trim(),
        idea: String(body.idea || '').trim(),
        category,
        subject: String(body.subject || '').trim(),
        preheader: String(body.preheader || '').trim(),
        badgeText: String(body.badgeText || '').trim(),
        headline: String(body.headline || '').trim(),
        body: String(body.body || '').trim(),
        highlights: Array.isArray(body.highlights)
          ? body.highlights.map((h: unknown) => String(h || '').trim()).filter(Boolean)
          : [],
        images: sanitizeCampaignImages(body.images),
        ctaText: String(body.ctaText || '').trim(),
        ctaUrl: String(body.ctaUrl || '').trim(),
        showWhatsappSecondary: body.showWhatsappSecondary !== false,
        variables: sanitizeVariables(body.variables),
        updatedAtIso: ts.iso,
        updatedAtDisplay: ts.display,
      };

      const remaining = (state.drafts || []).filter(d => d.id !== draft.id);
      const nextState = {
        ...state,
        drafts: [draft, ...remaining].slice(0, 30),
      };
      await saveEmailCampaignsState(nextState);
      return NextResponse.json({ success: true, draft, data: nextState });
    }

    // 2. Delete draft
    if (action === 'delete_draft') {
      const draftId = String(body.id || '').trim();
      const state = await loadEmailCampaignsState();
      const nextState = {
        ...state,
        drafts: (state.drafts || []).filter(d => d.id !== draftId),
      };
      await saveEmailCampaignsState(nextState);
      return NextResponse.json({ success: true, data: nextState });
    }

    // 3. Send test email (with strict validation)
    if (action === 'send_test') {
      const toEmail = String(body.to || '').trim();
      if (!isValidCampaignEmail(toEmail)) {
        return NextResponse.json(
          { success: false, error: 'Ingresa un correo válido para enviar la prueba.' },
          { status: 400 }
        );
      }

      const category = normalizeCampaignCategory(body.category);
      const variables = sanitizeVariables(body.variables);
      const validationErrors = validateCampaignPayload({
        category,
        subject: String(body.subject || ''),
        headline: String(body.headline || ''),
        body: String(body.body || ''),
        ctaText: String(body.ctaText || ''),
        ctaUrl: String(body.ctaUrl || ''),
        variables,
      });

      if (validationErrors.length > 0) {
        return NextResponse.json(
          { success: false, error: validationErrors[0], validationErrors },
          { status: 400 }
        );
      }

      const result = await sendCampaignBatchEmails({
        recipients: [{ id: '', email: toEmail, name: auth.user.username || 'José González' }],
        category,
        variables,
        subject: String(body.subject || '').trim(),
        preheader: String(body.preheader || '').trim(),
        badgeText: String(body.badgeText || '').trim(),
        headline: String(body.headline || '').trim(),
        body: String(body.body || '').trim(),
        highlights: Array.isArray(body.highlights) ? body.highlights : [],
        images: sanitizeCampaignImages(body.images),
        ctaText: String(body.ctaText || '').trim(),
        ctaUrl: String(body.ctaUrl || '').trim(),
        showWhatsappSecondary: body.showWhatsappSecondary !== false,
        isTest: true,
      });

      if (result.errorCount > 0) {
        return NextResponse.json(
          { success: false, error: result.errors[0] || 'Error enviando prueba' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, sentCount: result.sentCount, to: toEmail });
    }

    // 4. Send chunk of real recipients (with strict validation)
    if (action === 'send_chunk') {
      const category = normalizeCampaignCategory(body.category);
      const variables = sanitizeVariables(body.variables);
      const validationErrors = validateCampaignPayload({
        category,
        subject: String(body.subject || ''),
        headline: String(body.headline || ''),
        body: String(body.body || ''),
        ctaText: String(body.ctaText || ''),
        ctaUrl: String(body.ctaUrl || ''),
        variables,
      });

      if (validationErrors.length > 0) {
        return NextResponse.json(
          { success: false, error: validationErrors[0], validationErrors },
          { status: 400 }
        );
      }

      const recipients = Array.isArray(body.recipients)
        ? body.recipients.slice(0, 15).map((r: { id?: string; email?: string; name?: string }) => ({
            id: typeof r?.id === 'string' ? r.id.trim() : '',
            email: String(r?.email || '').trim(),
            name: String(r?.name || 'Cliente').trim(),
          }))
        : [];

      if (recipients.length === 0) {
        return NextResponse.json({ success: true, sentCount: 0, errorCount: 0, errors: [] });
      }

      const result = await sendCampaignBatchEmails({
        recipients,
        category,
        variables,
        subject: String(body.subject || '').trim(),
        preheader: String(body.preheader || '').trim(),
        badgeText: String(body.badgeText || '').trim(),
        headline: String(body.headline || '').trim(),
        body: String(body.body || '').trim(),
        highlights: Array.isArray(body.highlights) ? body.highlights : [],
        images: sanitizeCampaignImages(body.images),
        ctaText: String(body.ctaText || '').trim(),
        ctaUrl: String(body.ctaUrl || '').trim(),
        showWhatsappSecondary: body.showWhatsappSecondary !== false,
        isTest: false,
      });

      return NextResponse.json({
        success: true,
        sentCount: result.sentCount,
        errorCount: result.errorCount,
        errors: result.errors,
      });
    }

    // 5. Record completed campaign in persistent history
    if (action === 'record_campaign') {
      const state = await loadEmailCampaignsState();
      const ts = createDraftTimestamp();
      const entry: EmailCampaignHistoryEntry = {
        id: `camp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sentAtIso: ts.iso,
        sentAtDisplay: ts.display,
        title: String(body.title || body.subject || 'Campaña').trim(),
        subject: String(body.subject || '').trim(),
        category: normalizeCampaignCategory(body.category),
        totalRecipients: Number(body.totalRecipients) || 0,
        sentCount: Number(body.sentCount) || 0,
        errorCount: Number(body.errorCount) || 0,
        sentBy: auth.user.username,
        imagesCount: Number(body.imagesCount) || 0,
        errors: Array.isArray(body.errors) ? body.errors.slice(0, 20) : undefined,
      };

      const nextState = {
        ...state,
        history: [entry, ...(state.history || [])].slice(0, 100),
      };
      await saveEmailCampaignsState(nextState);
      return NextResponse.json({ success: true, entry, data: nextState });
    }

    return NextResponse.json({ success: false, error: 'Acción no reconocida' }, { status: 400 });
  } catch (err) {
    console.error('POST /api/campaigns error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error procesando campaña' },
      { status: 500 }
    );
  }
}
