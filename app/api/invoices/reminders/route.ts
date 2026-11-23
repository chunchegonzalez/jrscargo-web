import { NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getInvoiceById } from '@/lib/supabase';
import { formatCostaRicaDateTime } from '@/lib/billing';
import {
  DEFAULT_REMINDER_DAYS,
  loadPaymentRemindersState,
  runDuePaymentReminders,
  savePaymentRemindersState,
  sendPaymentReminderForInvoice,
  PaymentReminderHistoryEntry,
  PaymentReminderRecord,
} from '@/lib/payment-reminders';

export const dynamic = 'force-dynamic';

function isAuthorizedCron(request: Request): boolean {
  const url = new URL(request.url);
  if (url.searchParams.get('cron') !== '1') return false;
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (vercelCronHeader === '1') return true;
  return false;
}

export async function GET(request: Request) {
  try {
    // 1. Vercel Cron daily execution
    if (isAuthorizedCron(request)) {
      const result = await runDuePaymentReminders({
        trigger: 'cron',
        maxPerRun: 15,
      });
      return NextResponse.json({
        success: true,
        cron: true,
        skipped: !!result.skipped,
        reason: result.reason,
        sentCount: result.sentCount,
        errorCount: result.errorCount,
        eligibleCount: result.eligibleCount,
      });
    }

    // 2. Authenticated admin fetch
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado. Sesión requerida.' },
        { status: 401 }
      );
    }

    const state = await loadPaymentRemindersState();
    return NextResponse.json({
      success: true,
      data: state,
    });
  } catch (err) {
    console.error('GET /api/invoices/reminders error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error cargando recordatorios' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado. Sesión requerida.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'send_one');

    // Action 1: Toggle automatic 4-day payment reminders
    if (action === 'toggle_enabled') {
      const state = await loadPaymentRemindersState();
      const nextEnabled =
        body.enabled !== undefined ? Boolean(body.enabled) : !state.enabled;
      const nextState = {
        ...state,
        enabled: nextEnabled,
      };
      await savePaymentRemindersState(nextState);
      return NextResponse.json({ success: true, data: nextState });
    }

    // Action 2: Silent background auto_check from AdminLayout
    if (action === 'auto_check') {
      const result = await runDuePaymentReminders({
        trigger: 'auto',
        maxPerRun: 8,
      });
      return NextResponse.json({
        success: true,
        skipped: !!result.skipped,
        reason: result.reason,
        sentCount: result.sentCount,
        errorCount: result.errorCount,
        eligibleCount: result.eligibleCount,
        data: result.state,
      });
    }

    // Action 3: Manual batch send of all ready (4+ days after first email) reminders
    if (action === 'send_batch') {
      const result = await runDuePaymentReminders({
        trigger: 'manual',
        forceEvenIfDisabled: true,
        maxPerRun: 25,
      });
      return NextResponse.json({
        success: true,
        sentCount: result.sentCount,
        errorCount: result.errorCount,
        eligibleCount: result.eligibleCount,
        data: result.state,
      });
    }

    // Action 4: Mark reminder as omitted (won't be auto-sent)
    if (action === 'mark_omitted') {
      const invoiceId = String(body.invoiceId || '').trim();
      if (!invoiceId) {
        return NextResponse.json({ success: false, error: 'invoiceId requerido' }, { status: 400 });
      }
      const invoice = await getInvoiceById(invoiceId);
      const state = await loadPaymentRemindersState();
      const nowIso = new Date().toISOString();

      const record: PaymentReminderRecord = {
        invoiceId,
        invoiceNumber: String(invoice?.invoice_number || body.invoiceNumber || ''),
        clientName: String(invoice?.clients?.name || body.clientName || 'Cliente'),
        email: String(invoice?.clients?.email || body.email || ''),
        firstEmailSentAt: String(invoice?.email_sent_at || nowIso),
        reminderSentAt: nowIso,
        trigger: 'omitted',
      };

      const historyEntry: PaymentReminderHistoryEntry = {
        id: `rem-omit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestampIso: nowIso,
        timestampDisplay: formatCostaRicaDateTime(new Date(nowIso)),
        invoiceId,
        invoiceNumber: record.invoiceNumber,
        clientName: record.clientName,
        email: record.email,
        trigger: 'omitted',
        status: 'omitted',
        detail: 'Recordatorio de pago omitido manualmente',
      };

      const nextState = {
        ...state,
        reminders: {
          ...state.reminders,
          [invoiceId]: record,
        },
        history: [historyEntry, ...(state.history || [])].slice(0, 200),
      };
      await savePaymentRemindersState(nextState);
      return NextResponse.json({ success: true, record, historyEntry, data: nextState });
    }

    // Action 5: Send single payment reminder (manual or custom modal)
    if (action === 'send_one') {
      const invoiceId = String(body.invoiceId || '').trim();
      if (!invoiceId) {
        return NextResponse.json({ success: false, error: 'invoiceId requerido' }, { status: 400 });
      }

      const result = await sendPaymentReminderForInvoice({
        invoiceId,
        trigger: body.trigger === 'auto' ? 'auto' : 'manual',
        customSubject: typeof body.subject === 'string' ? body.subject : undefined,
        customMessage: typeof body.message === 'string' ? body.message : undefined,
        customCc: typeof body.cc === 'string' ? body.cc : undefined,
        customTo: typeof body.to === 'string' ? body.to : undefined,
      });

      const state = await loadPaymentRemindersState();

      if (!result.success || !result.record || !result.historyEntry) {
        const nowIso = new Date().toISOString();
        const errEntry: PaymentReminderHistoryEntry = {
          id: `rem-err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestampIso: nowIso,
          timestampDisplay: formatCostaRicaDateTime(new Date(nowIso)),
          invoiceId,
          invoiceNumber: String(body.invoiceNumber || ''),
          clientName: String(body.clientName || 'Cliente'),
          email: String(body.email || ''),
          trigger: 'manual',
          status: 'error',
          detail: result.error || 'Error al enviar recordatorio de pago',
        };
        const nextState = {
          ...state,
          daysAfterFirstEmail: state.daysAfterFirstEmail || DEFAULT_REMINDER_DAYS,
          history: [errEntry, ...(state.history || [])].slice(0, 200),
        };
        await savePaymentRemindersState(nextState);
        return NextResponse.json(
          { success: false, error: result.error || 'No se pudo enviar el recordatorio', data: nextState },
          { status: 400 }
        );
      }

      const nextState = {
        ...state,
        daysAfterFirstEmail: state.daysAfterFirstEmail || DEFAULT_REMINDER_DAYS,
        reminders: {
          ...state.reminders,
          [invoiceId]: result.record,
        },
        history: [result.historyEntry, ...(state.history || [])].slice(0, 200),
      };
      await savePaymentRemindersState(nextState);

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        reminderSentAt: result.reminderSentAt,
        record: result.record,
        historyEntry: result.historyEntry,
        data: nextState,
      });
    }

    return NextResponse.json({ success: false, error: 'Acción no reconocida' }, { status: 400 });
  } catch (err) {
    console.error('POST /api/invoices/reminders error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error procesando recordatorio' },
      { status: 500 }
    );
  }
}
