'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Mail,
  MailCheck,
  Clock,
  AlertTriangle,
  Send,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Edit3,
  ExternalLink,
  Play,
  Pause,
  Check,
  Calendar,
  FileText,
  Sparkles,
  BellRing,
  History,
  X
} from 'lucide-react';
import { getInvoiceStats, formatCurrency, formatDisplayDate, parseClientAddress } from '@/lib/billing';
import { useModal } from '@/app/components/ModalProvider';

type Invoice = {
  id: string;
  invoice_number: string;
  issue_date: string;
  created_at?: string;
  total: number | string;
  status: string;
  client_id: string;
  currency?: string;
  email_sent_at?: string | null;
  clients?: { id?: string; name: string; email: string; address?: string; secondary_email?: string; phone?: string };
  invoice_payments?: { amount_applied: number | string }[];
};

type PaymentReminderRecord = {
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  email: string;
  firstEmailSentAt: string;
  reminderSentAt: string;
  trigger: 'auto' | 'manual' | 'cron' | 'omitted';
  messageId?: string;
};

type PaymentReminderHistoryEntry = {
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
};

type ActivityLogItem = {
  id: string;
  timestamp: string;
  invoiceNumber: string;
  clientName: string;
  email: string;
  type: 'auto_sent' | 'manual_sent' | 'reminder_sent' | 'skipped' | 'email_updated' | 'error';
  detail: string;
};

type TabFilter =
  | 'rec_listos'
  | 'rec_programados'
  | 'rec_enviados'
  | 'cola'
  | 'listos_4d'
  | 'programados'
  | 'retenidos'
  | 'enviados'
  | 'todos';

const DEFAULT_REMINDER_MESSAGE =
  'Te recordamos amablemente que el comprobante detallado a continuación se encuentra pendiente de pago. Si ya realizaste el pago recientemente, por favor omite este aviso o compártenos tu comprobante por WhatsApp para aplicarlo de inmediato.';

const CR_OFFSET_MS = 6 * 60 * 60 * 1000; // Costa Rica UTC-6 fijo (sin horario de verano)
const CORREOS_CACHE_KEY = 'jrs_correos_cache_v1';

function getDaysSinceFirstEmail(emailSentAt?: string | null): number {
  if (!emailSentAt) return -1;
  const sentMs = Date.parse(emailSentAt);
  if (Number.isNaN(sentMs)) return -1;
  const sentCrDay = Math.floor((sentMs - CR_OFFSET_MS) / 86_400_000);
  const todayCrDay = Math.floor((Date.now() - CR_OFFSET_MS) / 86_400_000);
  return todayCrDay - sentCrDay;
}

function getScheduledReminderDateStr(emailSentAt?: string | null, daysAfter = 4): string {
  if (!emailSentAt) return '-';
  const sentMs = Date.parse(emailSentAt);
  if (Number.isNaN(sentMs)) return '-';
  const targetCr = new Date(sentMs - CR_OFFSET_MS + daysAfter * 86_400_000);
  const dd = String(targetCr.getUTCDate()).padStart(2, '0');
  const mm = String(targetCr.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = targetCr.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function isPendingClientEmail(email?: string | null): boolean {
  if (!email) return true;
  const clean = String(email).trim().toLowerCase();
  if (!clean || !clean.includes('@')) return true;
  if (
    clean === 'pendiente@pendiente' ||
    clean.startsWith('pendiente@') ||
    clean.endsWith('@pendiente')
  ) {
    return true;
  }
  return false;
}

function getDaysSinceCreation(issueDateStr?: string, createdAtStr?: string): number {
  const rawDate = (issueDateStr || createdAtStr || '').split('T')[0];
  const parts = rawDate.split('-').map(Number);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return 0;
  const [y, m, d] = parts;
  const createdDay = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  const todayCrDay = Math.floor((Date.now() - CR_OFFSET_MS) / 86_400_000);
  return todayCrDay - createdDay;
}

function getScheduledSendDateStr(issueDateStr?: string, createdAtStr?: string): string {
  const rawDate = (issueDateStr || createdAtStr || '').split('T')[0];
  const parts = rawDate.split('-').map(Number);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return '-';
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 4);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function ActividadCorreosPage() {
  const { showAlert } = useModal();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>('rec_listos');
  const [searchTerm, setSearchTerm] = useState('');

  // Payment reminders (4 days after 1st email) state
  const [remindersAutoEnabled, setRemindersAutoEnabled] = useState<boolean>(true);
  const [togglingReminders, setTogglingReminders] = useState(false);
  const [remindersMap, setRemindersMap] = useState<Record<string, PaymentReminderRecord>>({});
  const [reminderHistory, setReminderHistory] = useState<PaymentReminderHistoryEntry[]>([]);
  const [showReminderHistory, setShowReminderHistory] = useState(false);
  const [sendingReminderIds, setSendingReminderIds] = useState<Record<string, boolean>>({});
  const [isBatchSendingReminders, setIsBatchSendingReminders] = useState(false);

  // Test email modal state
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('josegon2000@hotmail.com');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Sending states
  const [sendingIds, setSendingIds] = useState<Record<string, boolean>>({});
  const [isBatchSending, setIsBatchSending] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);

  // Custom Email Modal (supports both 1st invoice email and payment reminder)
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailModalMode, setEmailModalMode] = useState<'invoice' | 'reminder'>('invoice');
  const [emailInvoice, setEmailInvoice] = useState<Invoice | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [isSendingModal, setIsSendingModal] = useState(false);

  // Edit Client Email Modal (for pendiente@pendiente)
  const [editClientModal, setEditClientModal] = useState<{
    isOpen: boolean;
    clientId: string;
    clientName: string;
    currentEmail: string;
    invoiceNumber: string;
  } | null>(null);
  const [newClientEmail, setNewClientEmail] = useState('');
  const [isSavingClientEmail, setIsSavingClientEmail] = useState(false);

  const toggleRemindersAutoEnabled = async () => {
    if (togglingReminders) return;
    setTogglingReminders(true);
    try {
      const next = !remindersAutoEnabled;
      const res = await fetch('/api/invoices/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_enabled', enabled: next })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRemindersAutoEnabled(Boolean(data.data?.enabled));
      }
    } catch {
      showAlert('Error', 'No se pudo actualizar la configuración de recordatorios.', 'error');
    } finally {
      setTogglingReminders(false);
    }
  };

  const addLog = useCallback((item: Omit<ActivityLogItem, 'id' | 'timestamp'>) => {
    const nowStr = new Date().toLocaleTimeString('es-CR', {
      timeZone: 'America/Costa_Rica',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    setActivityLog(prev => [
      {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: nowStr
      },
      ...prev.slice(0, 49)
    ]);
  }, []);

  const loadInvoices = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const res = await fetch('/api/invoices/reminders?includeInvoices=1', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success) {
        const invList: Invoice[] = Array.isArray(data.invoices) ? data.invoices : [];
        const remState = data.data || {};
        setInvoices(invList);
        setRemindersAutoEnabled(remState.enabled !== false);
        setRemindersMap(remState.reminders || {});
        setReminderHistory(Array.isArray(remState.history) ? remState.history : []);
        try {
          sessionStorage.setItem(
            CORREOS_CACHE_KEY,
            JSON.stringify({
              ts: Date.now(),
              invoices: invList,
              remindersAutoEnabled: remState.enabled !== false,
              remindersMap: remState.reminders || {},
              reminderHistory: Array.isArray(remState.history) ? remState.history : []
            })
          );
        } catch {
          // Ignore storage quota errors
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let hadCache = false;
    try {
      const raw = sessionStorage.getItem(CORREOS_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Array.isArray(cached.invoices)) {
          setInvoices(cached.invoices);
          setRemindersAutoEnabled(cached.remindersAutoEnabled !== false);
          setRemindersMap(cached.remindersMap || {});
          setReminderHistory(Array.isArray(cached.reminderHistory) ? cached.reminderHistory : []);
          setLoading(false);
          hadCache = true;
        }
      }
    } catch {
      // Ignore cache parse error
    }
    loadInvoices({ silent: hadCache });
  }, [loadInvoices]);

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = testEmailTo.trim();
    if (!target || !target.includes('@')) {
      showAlert('Correo inválido', 'Ingresa un correo válido para enviar la prueba.', 'error');
      return;
    }
    setIsSendingTest(true);
    try {
      const res = await fetch('/api/invoices/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_test', to: target })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestModalOpen(false);
        showAlert('Correo de prueba enviado', `Se envió un recordatorio de pago de prueba a ${target}.`, 'success');
      } else {
        showAlert('Error', data.error || 'No se pudo enviar el correo de prueba.', 'error');
      }
    } catch {
      showAlert('Error', 'Error de red al enviar el correo de prueba.', 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Classify invoices by initial email status AND 4-day payment reminder status
  const classified = useMemo(() => {
    const ready4Days: Invoice[] = [];
    const scheduledUnder4Days: Invoice[] = [];
    const blockedPendingEmail: Invoice[] = [];
    const sentHistory: Invoice[] = [];

    const remindersReady4Days: Invoice[] = [];
    const remindersScheduled: Invoice[] = [];
    const remindersSent: Invoice[] = [];

    invoices.forEach(inv => {
      const stats = getInvoiceStats(inv);
      const isPaid = inv.status === 'Pagada' || stats.displayStatus === 'Pagada' || stats.pending <= 0.009;
      const reminderRecord = remindersMap[inv.id];

      if (reminderRecord) {
        remindersSent.push(inv);
      }

      if (inv.email_sent_at) {
        sentHistory.push(inv);

        // Recordatorio de pago: aplica a facturas con 1er correo enviado, aún pendientes y sin recordatorio previo
        if (!isPaid && !reminderRecord && !isPendingClientEmail(inv.clients?.email)) {
          const daysSinceFirst = getDaysSinceFirstEmail(inv.email_sent_at);
          if (daysSinceFirst >= 4) {
            remindersReady4Days.push(inv);
          } else {
            remindersScheduled.push(inv);
          }
        }
        return;
      }

      // Si ya está Pagada, no se envía correo automático
      if (isPaid) {
        return;
      }

      if (isPendingClientEmail(inv.clients?.email)) {
        blockedPendingEmail.push(inv);
        return;
      }

      const days = getDaysSinceCreation(inv.issue_date, inv.created_at);
      if (days >= 4) {
        ready4Days.push(inv);
      } else {
        scheduledUnder4Days.push(inv);
      }
    });

    // Sort sentHistory by email_sent_at desc
    sentHistory.sort((a, b) => {
      const ta = new Date(a.email_sent_at || 0).getTime();
      const tb = new Date(b.email_sent_at || 0).getTime();
      return tb - ta;
    });

    // Sort remindersReady4Days oldest first-email first (most urgent first)
    remindersReady4Days.sort((a, b) => {
      const ta = new Date(a.email_sent_at || 0).getTime();
      const tb = new Date(b.email_sent_at || 0).getTime();
      return ta - tb;
    });

    // Sort remindersScheduled soonest first
    remindersScheduled.sort((a, b) => {
      const ta = new Date(a.email_sent_at || 0).getTime();
      const tb = new Date(b.email_sent_at || 0).getTime();
      return ta - tb;
    });

    // Sort remindersSent by reminderSentAt desc
    remindersSent.sort((a, b) => {
      const ta = new Date(remindersMap[a.id]?.reminderSentAt || 0).getTime();
      const tb = new Date(remindersMap[b.id]?.reminderSentAt || 0).getTime();
      return tb - ta;
    });

    return {
      ready4Days,
      scheduledUnder4Days,
      blockedPendingEmail,
      sentHistory,
      remindersReady4Days,
      remindersScheduled,
      remindersSent
    };
  }, [invoices, remindersMap]);

  // Send single 4-day payment reminder quickly
  const sendSingleReminder = useCallback(
    async (inv: Invoice) => {
      if (isPendingClientEmail(inv.clients?.email)) {
        showAlert(
          'Correo Pendiente',
          'El cliente tiene correo "pendiente@pendiente". Actualiza su correo antes de enviar el recordatorio.',
          'error'
        );
        return false;
      }

      setSendingReminderIds(prev => ({ ...prev, [inv.id]: true }));
      try {
        const extra = parseClientAddress(inv.clients?.address);
        const cc = inv.clients?.secondary_email || extra.secondary_email || '';
        const res = await fetch('/api/invoices/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_one',
            invoiceId: inv.id,
            invoiceNumber: inv.invoice_number,
            clientName: inv.clients?.name || 'Cliente',
            email: inv.clients?.email || '',
            cc
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (data.data) {
            setRemindersMap(data.data.reminders || {});
            setReminderHistory(Array.isArray(data.data.history) ? data.data.history : []);
          }
          addLog({
            invoiceNumber: inv.invoice_number,
            clientName: inv.clients?.name || 'Cliente',
            email: inv.clients?.email || '',
            type: 'reminder_sent',
            detail: 'Recordatorio de pago enviado'
          });
          return true;
        } else {
          if (data.data?.history) {
            setReminderHistory(data.data.history);
          }
          addLog({
            invoiceNumber: inv.invoice_number,
            clientName: inv.clients?.name || 'Cliente',
            email: inv.clients?.email || '',
            type: 'error',
            detail: data.error || 'Error enviando recordatorio de pago'
          });
          showAlert('Error', data.error || 'No se pudo enviar el recordatorio de pago.', 'error');
          return false;
        }
      } catch {
        addLog({
          invoiceNumber: inv.invoice_number,
          clientName: inv.clients?.name || 'Cliente',
          email: inv.clients?.email || '',
          type: 'error',
          detail: 'Error de red enviando recordatorio de pago'
        });
        return false;
      } finally {
        setSendingReminderIds(prev => {
          const next = { ...prev };
          delete next[inv.id];
          return next;
        });
      }
    },
    [addLog, showAlert]
  );

  // Batch send all ready 4-day payment reminders
  const handleSendAllReadyReminders = useCallback(async () => {
    if (classified.remindersReady4Days.length === 0 || isBatchSendingReminders) return;
    setIsBatchSendingReminders(true);
    try {
      const res = await fetch('/api/invoices/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_batch' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.data) {
          setRemindersMap(data.data.reminders || {});
          setReminderHistory(Array.isArray(data.data.history) ? data.data.history : []);
        }
        showAlert(
          'Recordatorios Enviados',
          `Se enviaron ${data.sentCount || 0} recordatorio(s) de pago${data.errorCount ? ` (${data.errorCount} con error)` : ''}.`,
          data.errorCount ? 'error' : 'success'
        );
      } else {
        showAlert('Error', data.error || 'No se pudo procesar el lote de recordatorios.', 'error');
      }
    } catch {
      showAlert('Error', 'Error de red al enviar el lote de recordatorios.', 'error');
    } finally {
      setIsBatchSendingReminders(false);
    }
  }, [classified.remindersReady4Days.length, isBatchSendingReminders, showAlert]);

  // Mark payment reminder as omitted
  const handleOmitReminder = async (inv: Invoice) => {
    setSendingReminderIds(prev => ({ ...prev, [inv.id]: true }));
    try {
      const res = await fetch('/api/invoices/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_omitted',
          invoiceId: inv.id,
          invoiceNumber: inv.invoice_number,
          clientName: inv.clients?.name || 'Cliente',
          email: inv.clients?.email || ''
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setRemindersMap(data.data.reminders || {});
        setReminderHistory(Array.isArray(data.data.history) ? data.data.history : []);
        addLog({
          invoiceNumber: inv.invoice_number,
          clientName: inv.clients?.name || 'Cliente',
          email: inv.clients?.email || '-',
          type: 'skipped',
          detail: 'Recordatorio de pago omitido manualmente'
        });
      }
    } catch {
      showAlert('Error', 'No se pudo omitir el recordatorio.', 'error');
    } finally {
      setSendingReminderIds(prev => {
        const next = { ...prev };
        delete next[inv.id];
        return next;
      });
    }
  };

  // Send single invoice email quickly
  const sendSingleInvoice = useCallback(
    async (inv: Invoice, mode: 'auto' | 'manual' = 'manual') => {
      if (isPendingClientEmail(inv.clients?.email)) {
        showAlert(
          'Correo Pendiente',
          'El cliente tiene correo "pendiente@pendiente". Actualiza su correo antes de enviar.',
          'error'
        );
        return false;
      }

      setSendingIds(prev => ({ ...prev, [inv.id]: true }));
      try {
        const extra = parseClientAddress(inv.clients?.address);
        const cc = inv.clients?.secondary_email || extra.secondary_email || '';
        const res = await fetch('/api/invoices/' + inv.id + '/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'Comprobante de Compra #' + inv.invoice_number + ' - JRS CARGO',
            message:
              'Adjunto a este correo encontrarás los detalles de tu comprobante de compra reciente. Por favor, revisa la información a continuación.',
            cc
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const sentAt = data.email_sent_at || new Date().toISOString();
          setInvoices(prev =>
            prev.map(item => (item.id === inv.id ? { ...item, email_sent_at: sentAt } : item))
          );
          addLog({
            invoiceNumber: inv.invoice_number,
            clientName: inv.clients?.name || 'Cliente',
            email: inv.clients?.email || '',
            type: mode === 'auto' ? 'auto_sent' : 'manual_sent',
            detail:
              mode === 'auto'
                ? 'Enviado automáticamente (4+ días desde creación)'
                : 'Enviado manualmente'
          });
          return true;
        } else {
          addLog({
            invoiceNumber: inv.invoice_number,
            clientName: inv.clients?.name || 'Cliente',
            email: inv.clients?.email || '',
            type: 'error',
            detail: data.error || 'Error al enviar correo'
          });
          if (mode === 'manual') {
            showAlert('Error', 'Error al enviar: ' + (data.error || 'Error desconocido'), 'error');
          }
          return false;
        }
      } catch {
        addLog({
          invoiceNumber: inv.invoice_number,
          clientName: inv.clients?.name || 'Cliente',
          email: inv.clients?.email || '',
          type: 'error',
          detail: 'Error de conexión al enviar correo'
        });
        return false;
      } finally {
        setSendingIds(prev => {
          const next = { ...prev };
          delete next[inv.id];
          return next;
        });
      }
    },
    [addLog, showAlert]
  );

  // Batch send all ready (4+ days) invoices
  const handleSendAllReady = useCallback(async () => {
    if (classified.ready4Days.length === 0 || isBatchSending) return;
    setIsBatchSending(true);
    for (const inv of classified.ready4Days) {
      await sendSingleInvoice(inv, 'auto');
    }
    setIsBatchSending(false);
  }, [classified.ready4Days, isBatchSending, sendSingleInvoice]);

  // Mark as omitted / already sent without sending email
  const handleMarkAsOmitted = async (inv: Invoice) => {
    setSendingIds(prev => ({ ...prev, [inv.id]: true }));
    try {
      const nowIso = new Date().toISOString();
      const res = await fetch('/api/invoices/' + inv.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_sent_at: nowIso })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInvoices(prev =>
          prev.map(item => (item.id === inv.id ? { ...item, email_sent_at: nowIso } : item))
        );
        addLog({
          invoiceNumber: inv.invoice_number,
          clientName: inv.clients?.name || 'Cliente',
          email: inv.clients?.email || '-',
          type: 'skipped',
          detail: 'Marcado como enviado / omitido sin mandar correo'
        });
      }
    } catch {
      showAlert('Error', 'No se pudo actualizar el estado de la factura.', 'error');
    } finally {
      setSendingIds(prev => {
        const next = { ...prev };
        delete next[inv.id];
        return next;
      });
    }
  };

  // Update client email from modal
  const handleSaveClientEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClientModal) return;
    const trimmed = newClientEmail.trim();
    if (!trimmed || !trimmed.includes('@') || isPendingClientEmail(trimmed)) {
      showAlert('Correo inválido', 'Ingresa un correo electrónico válido (distinto de pendiente@pendiente).', 'error');
      return;
    }

    setIsSavingClientEmail(true);
    try {
      const res = await fetch('/api/clients/' + editClientModal.clientId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInvoices(prev =>
          prev.map(inv => {
            const cId = inv.clients?.id || inv.client_id;
            if (cId === editClientModal.clientId && inv.clients) {
              return {
                ...inv,
                clients: { ...inv.clients, email: trimmed }
              };
            }
            return inv;
          })
        );
        addLog({
          invoiceNumber: editClientModal.invoiceNumber,
          clientName: editClientModal.clientName,
          email: trimmed,
          type: 'email_updated',
          detail: `Correo actualizado a ${trimmed}`
        });
        setEditClientModal(null);
        setNewClientEmail('');
      } else {
        showAlert('Error', data.error || 'No se pudo actualizar el correo del cliente.', 'error');
      }
    } catch {
      showAlert('Error', 'Error de red al actualizar el correo.', 'error');
    } finally {
      setIsSavingClientEmail(false);
    }
  };

  // Open custom email modal (1st invoice email or payment reminder)
  const openCustomEmailModal = (inv: Invoice, mode: 'invoice' | 'reminder' = 'invoice') => {
    if (isPendingClientEmail(inv.clients?.email)) {
      const cId = inv.clients?.id || inv.client_id;
      setEditClientModal({
        isOpen: true,
        clientId: cId,
        clientName: inv.clients?.name || 'Cliente',
        currentEmail: inv.clients?.email || 'pendiente@pendiente',
        invoiceNumber: inv.invoice_number
      });
      setNewClientEmail('');
      return;
    }
    setEmailModalMode(mode);
    setEmailInvoice(inv);
    const extra = parseClientAddress(inv.clients?.address);
    setEmailCc(inv.clients?.secondary_email || extra.secondary_email || '');
    if (mode === 'reminder') {
      setEmailSubject('Recordatorio de Pago - Comprobante #' + inv.invoice_number + ' - JRS CARGO');
      setEmailMessage(DEFAULT_REMINDER_MESSAGE);
    } else {
      setEmailSubject('Comprobante de Compra #' + inv.invoice_number + ' - JRS CARGO');
      setEmailMessage(
        '¡Gracias por confiar tus envíos a JRS Cargo! Aquí tienes el resumen detallado de tu comprobante reciente y los paquetes procesados para ti.'
      );
    }
    setEmailModalOpen(true);
  };

  const confirmCustomSendEmail = async () => {
    if (!emailInvoice) return;
    setIsSendingModal(true);
    try {
      if (emailModalMode === 'reminder') {
        const res = await fetch('/api/invoices/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_one',
            invoiceId: emailInvoice.id,
            invoiceNumber: emailInvoice.invoice_number,
            clientName: emailInvoice.clients?.name || 'Cliente',
            email: emailInvoice.clients?.email || '',
            subject: emailSubject,
            message: emailMessage,
            cc: emailCc
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (data.data) {
            setRemindersMap(data.data.reminders || {});
            setReminderHistory(Array.isArray(data.data.history) ? data.data.history : []);
          }
          addLog({
            invoiceNumber: emailInvoice.invoice_number,
            clientName: emailInvoice.clients?.name || 'Cliente',
            email: emailInvoice.clients?.email || '',
            type: 'reminder_sent',
            detail: 'Recordatorio de pago enviado manualmente desde modal'
          });
          setEmailModalOpen(false);
          showAlert('Éxito', '¡Recordatorio de pago enviado con éxito!', 'success');
        } else {
          showAlert('Error', 'Error al enviar recordatorio: ' + (data.error || 'Error'), 'error');
        }
      } else {
        const res = await fetch('/api/invoices/' + emailInvoice.id + '/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject: emailSubject, message: emailMessage, cc: emailCc })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const sentAt = data.email_sent_at || new Date().toISOString();
          setInvoices(prev =>
            prev.map(inv => (inv.id === emailInvoice.id ? { ...inv, email_sent_at: sentAt } : inv))
          );
          addLog({
            invoiceNumber: emailInvoice.invoice_number,
            clientName: emailInvoice.clients?.name || 'Cliente',
            email: emailInvoice.clients?.email || '',
            type: 'manual_sent',
            detail: 'Enviado manualmente desde modal'
          });
          setEmailModalOpen(false);
          showAlert('Éxito', '¡Correo enviado con éxito!', 'success');
        } else {
          showAlert('Error', 'Error al enviar correo: ' + (data.error || 'Error'), 'error');
        }
      }
    } catch {
      showAlert('Error', 'Error de red al enviar el correo.', 'error');
    } finally {
      setIsSendingModal(false);
    }
  };

  // Filtered list according to active tab and search
  const visibleInvoices = useMemo(() => {
    let baseList: Invoice[] = [];
    if (activeTab === 'rec_listos') {
      baseList = classified.remindersReady4Days;
    } else if (activeTab === 'rec_programados') {
      baseList = classified.remindersScheduled;
    } else if (activeTab === 'rec_enviados') {
      baseList = classified.remindersSent;
    } else if (activeTab === 'cola') {
      baseList = [...classified.ready4Days, ...classified.scheduledUnder4Days];
    } else if (activeTab === 'listos_4d') {
      baseList = classified.ready4Days;
    } else if (activeTab === 'programados') {
      baseList = classified.scheduledUnder4Days;
    } else if (activeTab === 'retenidos') {
      baseList = classified.blockedPendingEmail;
    } else if (activeTab === 'enviados') {
      baseList = classified.sentHistory;
    } else {
      baseList = invoices;
    }

    const q = searchTerm.trim().toLowerCase();
    if (!q) return baseList;

    return baseList.filter(
      inv =>
        (inv.invoice_number || '').toLowerCase().includes(q) ||
        (inv.clients?.name || '').toLowerCase().includes(q) ||
        (inv.clients?.email || '').toLowerCase().includes(q)
    );
  }, [activeTab, classified, invoices, searchTerm]);

  const formatEmailDate = (dateStr: string) => {
    const ms = Date.parse(dateStr);
    if (Number.isNaN(ms)) return '-';
    const cr = new Date(ms - CR_OFFSET_MS);
    const dd = String(cr.getUTCDate()).padStart(2, '0');
    const mm = String(cr.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = cr.getUTCFullYear();
    const h24 = cr.getUTCHours();
    const ampm = h24 >= 12 ? 'p. m.' : 'a. m.';
    const h12 = String(h24 % 12 || 12).padStart(2, '0');
    const min = String(cr.getUTCMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${h12}:${min} ${ampm}`;
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Actividad de Correos</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
              <BellRing size={11} />
              Recordatorio Pago: +4 días del 1er correo
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Lleva el seguimiento del primer envío de comprobantes y del correo automático de{' '}
            <strong className="text-slate-700">recordatorio de pago 4 días después</strong> para facturas pendientes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Recordatorio Automático 4 días (Persistido en BD) */}
          <button
            type="button"
            disabled={togglingReminders}
            onClick={toggleRemindersAutoEnabled}
            className={`h-9 px-3.5 rounded-lg text-xs font-semibold border transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 ${
              remindersAutoEnabled
                ? 'bg-emerald-50 border-emerald-200/80 text-emerald-800 hover:bg-emerald-100'
                : 'bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50'
            }`}
            title="Activar o pausar el envío automático de recordatorios de pago 4 días después del primer correo"
          >
            {remindersAutoEnabled ? (
              <>
                <Play size={13} className="text-emerald-600 fill-emerald-600" />
                <span>Recordatorios Auto (+4d): Activo</span>
              </>
            ) : (
              <>
                <Pause size={13} className="text-slate-500" />
                <span>Recordatorios Auto: Pausado</span>
              </>
            )}
          </button>

          {/* Send All Ready Payment Reminders Button */}
          {classified.remindersReady4Days.length > 0 && (
            <button
              type="button"
              onClick={handleSendAllReadyReminders}
              disabled={isBatchSendingReminders}
              className="h-9 px-3.5 rounded-lg bg-[#0B2737] hover:bg-[#12435E] text-white text-xs font-semibold shadow-2xs transition-all inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isBatchSendingReminders ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Enviando recordatorios...</span>
                </>
              ) : (
                <>
                  <BellRing size={14} className="text-amber-400" />
                  <span>Enviar {classified.remindersReady4Days.length} Recordatorios (+4d)</span>
                </>
              )}
            </button>
          )}

          {/* Send All Ready 1st Emails Button */}
          {classified.ready4Days.length > 0 && (
            <button
              type="button"
              onClick={handleSendAllReady}
              disabled={isBatchSending}
              className="h-9 px-3.5 rounded-lg bg-white border border-brand-blue/30 hover:bg-brand-blue/5 text-brand-blue text-xs font-semibold shadow-2xs transition-all inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isBatchSending ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Enviando 1er correo...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Enviar {classified.ready4Days.length} 1er Correo</span>
                </>
              )}
            </button>
          )}

          {/* Persistent Reminder History Button */}
          <button
            type="button"
            onClick={() => setShowReminderHistory(prev => !prev)}
            className={`h-9 px-3 rounded-lg text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
              showReminderHistory
                ? 'bg-[#0B2737] text-white border-[#0B2737]'
                : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <History size={14} />
            <span>Bitácora ({reminderHistory.length})</span>
          </button>

          {/* Test Reminder Email Button */}
          <button
            type="button"
            onClick={() => setTestModalOpen(true)}
            className="h-9 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200/90 text-amber-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Enviar un recordatorio de pago de prueba sin afectar ninguna factura"
          >
            <Mail size={14} className="text-amber-600" />
            <span>Correo de prueba</span>
          </button>

          <button
            type="button"
            onClick={() => loadInvoices()}
            className="h-9 px-3.5 rounded-lg bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Actualizar lista"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-brand-blue' : 'text-slate-500'} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Seguimiento de Recordatorios de Pago (+4 días) y Estado General */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('rec_listos')}
          className={`text-left bg-white rounded-xl p-4 border transition-all flex items-center justify-between group cursor-pointer ${
            activeTab === 'rec_listos'
              ? 'border-amber-400 ring-2 ring-amber-400/15 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
          }`}
        >
          <div>
            <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Recordatorios Listos</p>
            <p className="text-2xl font-black text-amber-600 tabular-nums mt-1">{classified.remindersReady4Days.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">4+ días del 1er correo</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <BellRing size={18} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rec_programados')}
          className={`text-left bg-white rounded-xl p-4 border transition-all flex items-center justify-between group cursor-pointer ${
            activeTab === 'rec_programados'
              ? 'border-[#12435E] ring-2 ring-[#12435E]/15 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
          }`}
        >
          <div>
            <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Recordatorios en Espera</p>
            <p className="text-2xl font-black text-[#12435E] tabular-nums mt-1">{classified.remindersScheduled.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Programados (&lt; 4 días)</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#0B2737]/10 text-[#0B2737] flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rec_enviados')}
          className={`text-left bg-white rounded-xl p-4 border transition-all flex items-center justify-between group cursor-pointer ${
            activeTab === 'rec_enviados'
              ? 'border-emerald-400 ring-2 ring-emerald-400/15 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
          }`}
        >
          <div>
            <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Recordatorios Enviados</p>
            <p className="text-2xl font-black text-emerald-700 tabular-nums mt-1">{classified.remindersSent.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Avisos de pago gestionados</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <MailCheck size={18} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cola')}
          className={`text-left bg-white rounded-xl p-4 border transition-all flex items-center justify-between group cursor-pointer ${
            activeTab === 'cola' || activeTab === 'listos_4d' || activeTab === 'programados'
              ? 'border-brand-blue ring-2 ring-brand-blue/15 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
          }`}
        >
          <div>
            <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Cola 1er Correo</p>
            <p className="text-2xl font-black text-slate-900 tabular-nums mt-1">
              {classified.ready4Days.length + classified.scheduledUnder4Days.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Sin envío inicial aún</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Sparkles size={18} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('retenidos')}
          className={`text-left bg-white rounded-xl p-4 border transition-all flex items-center justify-between group cursor-pointer ${
            activeTab === 'retenidos'
              ? 'border-red-400 ring-2 ring-red-400/15 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
          }`}
        >
          <div>
            <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Retenidos (pendiente@)</p>
            <p className="text-2xl font-black text-red-600 tabular-nums mt-1">{classified.blockedPendingEmail.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Sin correo válido</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} />
          </div>
        </button>
      </div>

      {/* Bitácora Persistente de Recordatorios de Pago */}
      {showReminderHistory && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200/80 bg-[#0B2737] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={15} className="text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Bitácora de Recordatorios de Pago ({reminderHistory.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowReminderHistory(false)}
              className="text-slate-300 hover:text-white p-1 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
          {reminderHistory.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Aún no se han registrado envíos de recordatorios de pago.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
              {reminderHistory.map(item => (
                <div key={item.id} className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs hover:bg-slate-50">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.status === 'error' ? (
                      <XCircle size={14} className="text-red-500 shrink-0" />
                    ) : item.status === 'omitted' ? (
                      <Check size={14} className="text-slate-400 shrink-0" />
                    ) : (
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    )}
                    <span className="font-mono font-bold text-[#0B2737] shrink-0">#{item.invoiceNumber}</span>
                    <span className="font-semibold text-slate-800 truncate">{item.clientName}</span>
                    <span className="text-slate-400 truncate">({item.email})</span>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-slate-600">{item.detail}</span>
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums">{item.timestampDisplay}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activity Log (Session Live Log) */}
      {activityLog.length > 0 && (
        <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm border border-slate-800">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Registro de Actividad Reciente ({activityLog.length})
            </h3>
            <button
              type="button"
              onClick={() => setActivityLog([])}
              className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Limpiar registro
            </button>
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
            {activityLog.map(log => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {log.type === 'error' ? (
                    <XCircle size={13} className="text-red-400 shrink-0" />
                  ) : (
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  )}
                  <span className="font-mono font-bold text-amber-300 shrink-0">#{log.invoiceNumber}</span>
                  <span className="font-semibold text-white truncate">{log.clientName}</span>
                  <span className="text-slate-400 truncate">({log.email})</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-slate-300">{log.detail}</span>
                  <span className="text-[10px] font-mono text-slate-400 tabular-nums">{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
        {/* Tabs & Search Bar */}
        <div className="px-4 py-3 border-b border-slate-200/80 bg-slate-50/70 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
          <div className="inline-flex flex-wrap items-center bg-white border border-slate-200/90 rounded-lg p-0.5 gap-0.5 shadow-2xs">
            {[
              {
                id: 'rec_listos' as TabFilter,
                label: 'Recordatorios Listos (+4d)',
                count: classified.remindersReady4Days.length
              },
              {
                id: 'rec_programados' as TabFilter,
                label: 'Recordatorios Programados',
                count: classified.remindersScheduled.length
              },
              {
                id: 'rec_enviados' as TabFilter,
                label: 'Recordatorios Enviados',
                count: classified.remindersSent.length
              },
              {
                id: 'cola' as TabFilter,
                label: 'Cola 1er Correo',
                count: classified.ready4Days.length + classified.scheduledUnder4Days.length
              },
              {
                id: 'retenidos' as TabFilter,
                label: 'Retenidos',
                count: classified.blockedPendingEmail.length
              },
              {
                id: 'enviados' as TabFilter,
                label: '1er Correo Enviado',
                count: classified.sentHistory.length
              },
              {
                id: 'todos' as TabFilter,
                label: 'Todos',
                count: invoices.length
              }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`h-8 px-2.5 rounded-md text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-brand-blue text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full xl:w-auto">
            <div className="relative flex-1 xl:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar factura, cliente o correo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200/90 rounded-lg shadow-2xs text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <span className="h-9 px-3 bg-white border border-slate-200/80 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs inline-flex items-center tabular-nums shrink-0">
              {visibleInvoices.length} {visibleInvoices.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/95 border-b border-slate-200/90 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
                <th className="py-2.5 px-3.5 pl-5">Creación</th>
                <th className="py-2.5 px-3.5">Factura</th>
                <th className="py-2.5 px-3.5">Cliente y Correo</th>
                <th className="py-2.5 px-3.5 text-right">Monto</th>
                <th className="py-2.5 px-3.5">Estado del Correo / Programación</th>
                <th className="py-2.5 px-3.5 pr-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center text-slate-400 text-sm">
                    Cargando actividad de correos...
                  </td>
                </tr>
              ) : visibleInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center text-slate-400 text-sm">
                    No hay registros en esta categoría.
                  </td>
                </tr>
              ) : (
                visibleInvoices.map(inv => {
                  const stats = getInvoiceStats(inv);
                  const isPaid = inv.status === 'Pagada' || stats.displayStatus === 'Pagada' || stats.pending <= 0.009;
                  const daysElapsed = getDaysSinceCreation(inv.issue_date, inv.created_at);
                  const daysRemaining = Math.max(0, 4 - daysElapsed);
                  const scheduledDate = getScheduledSendDateStr(inv.issue_date, inv.created_at);
                  const isPendingEmail = isPendingClientEmail(inv.clients?.email);
                  const isSending = !!sendingIds[inv.id];
                  const isSendingReminder = !!sendingReminderIds[inv.id];
                  const reminderRec = remindersMap[inv.id];
                  const daysSinceFirst = getDaysSinceFirstEmail(inv.email_sent_at);
                  const reminderDaysRemaining = Math.max(0, 4 - Math.max(0, daysSinceFirst));
                  const reminderScheduledDate = getScheduledReminderDateStr(inv.email_sent_at, 4);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/90 transition-colors">
                      <td className="py-2.5 px-3.5 pl-5 text-slate-600 whitespace-nowrap tabular-nums">
                        <div className="font-semibold text-slate-800">{formatDisplayDate(inv.issue_date)}</div>
                        <div className="text-[11px] text-slate-400">
                          {daysElapsed === 0
                            ? 'Hoy'
                            : daysElapsed === 1
                              ? 'Hace 1 día'
                              : `Hace ${daysElapsed} días`}
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <Link
                          href={'/admin/facturacion/' + inv.id}
                          className="font-mono font-bold text-brand-blue hover:underline inline-flex items-center gap-1"
                        >
                          #{inv.invoice_number}
                          <ExternalLink size={11} className="opacity-60" />
                        </Link>
                        <div className="mt-0.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              stats.displayStatus === 'Pagada'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                : stats.displayStatus === 'Vencida'
                                  ? 'bg-red-50 text-red-700 border-red-200/80'
                                  : 'bg-amber-50 text-amber-700 border-amber-200/80'
                            }`}
                          >
                            {stats.displayStatus}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5">
                        <div className="font-semibold text-slate-900">{inv.clients?.name || 'Cliente'}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-xs font-medium ${
                              isPendingEmail
                                ? 'text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200/80 font-semibold'
                                : 'text-slate-500'
                            }`}
                          >
                            {inv.clients?.email || 'Sin correo'}
                          </span>
                          {isPendingEmail && (
                            <button
                              type="button"
                              onClick={() => {
                                const cId = inv.clients?.id || inv.client_id;
                                setEditClientModal({
                                  isOpen: true,
                                  clientId: cId,
                                  clientName: inv.clients?.name || 'Cliente',
                                  currentEmail: inv.clients?.email || 'pendiente@pendiente',
                                  invoiceNumber: inv.invoice_number
                                });
                                setNewClientEmail('');
                              }}
                              className="text-[11px] font-semibold text-brand-blue hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 size={11} />
                              Asignar correo
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap tabular-nums">
                        <span className="font-bold text-slate-900">
                          {formatCurrency(Number(inv.total), stats.currency)}
                        </span>
                      </td>

                      {/* Estado / Programación y Recordatorio de Pago (+4 días) */}
                      <td className="py-2.5 px-3.5">
                        {inv.email_sent_at ? (
                          <div className="inline-flex flex-col gap-1.5">
                            <div className="inline-flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full w-fit">
                                <MailCheck size={12} />
                                1er correo enviado
                              </span>
                              <span className="text-[11px] text-slate-400 tabular-nums">
                                {formatEmailDate(inv.email_sent_at)}
                              </span>
                            </div>

                            {/* Estado del Recordatorio de Pago (4 días después del 1er correo) */}
                            {reminderRec ? (
                              <div className="inline-flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit border ${
                                    reminderRec.trigger === 'omitted'
                                      ? 'bg-slate-100 text-slate-600 border-slate-200/80'
                                      : 'bg-[#0B2737]/10 text-[#0B2737] border-[#0B2737]/20'
                                  }`}
                                >
                                  {reminderRec.trigger === 'omitted' ? <Check size={11} /> : <BellRing size={11} />}
                                  {reminderRec.trigger === 'omitted'
                                    ? 'Recordatorio omitido'
                                    : reminderRec.trigger === 'cron'
                                      ? 'Recordatorio enviado (Auto Cron)'
                                      : reminderRec.trigger === 'auto'
                                        ? 'Recordatorio enviado (Auto)'
                                        : 'Recordatorio enviado (Manual)'}
                                </span>
                                <span className="text-[11px] text-slate-400 tabular-nums">
                                  {formatEmailDate(reminderRec.reminderSentAt)}
                                </span>
                              </div>
                            ) : isPaid ? (
                              <span className="text-[11px] text-slate-400">
                                Sin recordatorio (Factura pagada)
                              </span>
                            ) : isPendingEmail ? (
                              <span className="text-[11px] text-red-600 font-medium">
                                Recordatorio bloqueado (sin correo válido)
                              </span>
                            ) : daysSinceFirst >= 4 ? (
                              <div className="inline-flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full w-fit">
                                  <BellRing size={11} className="text-amber-600" />
                                  Recordatorio listo ({daysSinceFirst} días del 1er correo)
                                </span>
                                <span className="text-[10.5px] text-slate-400">
                                  Cumplió 4 días el {reminderScheduledDate}
                                </span>
                              </div>
                            ) : (
                              <div className="inline-flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#12435E] bg-[#12435E]/[0.08] border border-[#12435E]/15 px-2 py-0.5 rounded-full w-fit">
                                  <Calendar size={11} className="text-[#12435E]" />
                                  Recordatorio en {reminderDaysRemaining}{' '}
                                  {reminderDaysRemaining === 1 ? 'día' : 'días'} ({reminderScheduledDate})
                                </span>
                                <span className="text-[10.5px] text-slate-400">
                                  Automático 4 días después del 1er correo
                                </span>
                              </div>
                            )}
                          </div>
                        ) : isPaid ? (
                          <div className="inline-flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 rounded-full w-fit">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              No enviar (Factura Pagada)
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Excluida por estar cancelada en su totalidad
                            </span>
                          </div>
                        ) : isPendingEmail ? (
                          <div className="inline-flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200/80 px-2.5 py-0.5 rounded-full w-fit">
                              <AlertTriangle size={12} />
                              No se enviará (pendiente@pendiente)
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Bloqueado hasta actualizar correo del cliente
                            </span>
                          </div>
                        ) : daysElapsed >= 4 ? (
                          <div className="inline-flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full w-fit">
                              <Sparkles size={12} className="text-amber-600" />
                              Listo para Envío Automático ({daysElapsed} días)
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Cumplió el plazo de 4 días ({scheduledDate})
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue bg-brand-blue/[0.08] border border-brand-blue/15 px-2.5 py-0.5 rounded-full w-fit">
                              <Calendar size={12} className="text-brand-blue" />
                              Se enviará en {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'} ({scheduledDate})
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Envío automático al cumplir 4 días
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-2.5 px-3.5 pr-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {isPendingEmail ? (
                            <button
                              type="button"
                              onClick={() => {
                                const cId = inv.clients?.id || inv.client_id;
                                setEditClientModal({
                                  isOpen: true,
                                  clientId: cId,
                                  clientName: inv.clients?.name || 'Cliente',
                                  currentEmail: inv.clients?.email || 'pendiente@pendiente',
                                  invoiceNumber: inv.invoice_number
                                });
                                setNewClientEmail('');
                              }}
                              className="h-8 px-2.5 rounded-lg bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Edit3 size={12} />
                              Editar Correo
                            </button>
                          ) : inv.email_sent_at && !isPaid ? (
                            <>
                              <button
                                type="button"
                                disabled={isSendingReminder}
                                onClick={() => sendSingleReminder(inv)}
                                className={`h-8 px-2.5 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                                  reminderRec
                                    ? 'bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700'
                                    : 'bg-[#0B2737] hover:bg-[#12435E] text-white'
                                }`}
                                title={
                                  reminderRec
                                    ? 'Reenviar correo de recordatorio de pago'
                                    : 'Enviar correo de recordatorio de pago ahora'
                                }
                              >
                                {isSendingReminder ? (
                                  <>
                                    <RefreshCw size={12} className="animate-spin" />
                                    <span>Enviando...</span>
                                  </>
                                ) : (
                                  <>
                                    <BellRing size={12} className={reminderRec ? 'text-amber-600' : 'text-amber-400'} />
                                    <span>{reminderRec ? 'Reenviar Record.' : 'Recordar Pago'}</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => openCustomEmailModal(inv, 'reminder')}
                                className="h-8 px-2.5 rounded-lg bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors inline-flex items-center justify-center cursor-pointer"
                                title="Personalizar asunto o mensaje del recordatorio de pago"
                              >
                                <Mail size={13} />
                              </button>

                              {!reminderRec && (
                                <button
                                  type="button"
                                  disabled={isSendingReminder}
                                  onClick={() => handleOmitReminder(inv)}
                                  className="h-8 px-2 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-700 border border-slate-200/90 text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  title="Omitir el recordatorio automático de pago para esta factura"
                                >
                                  <Check size={12} />
                                  <span>Omitir</span>
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={isSending}
                                onClick={() => sendSingleInvoice(inv, 'manual')}
                                className="h-8 px-2.5 rounded-lg bg-brand-blue hover:bg-[#0e354b] text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                title={inv.email_sent_at ? 'Reenviar ahora con 1 clic' : 'Enviar correo ahora'}
                              >
                                {isSending ? (
                                  <>
                                    <RefreshCw size={12} className="animate-spin" />
                                    <span>Enviando...</span>
                                  </>
                                ) : (
                                  <>
                                    <Send size={12} />
                                    <span>{inv.email_sent_at ? 'Reenviar' : 'Enviar Ahora'}</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => openCustomEmailModal(inv, 'invoice')}
                                className="h-8 px-2.5 rounded-lg bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors inline-flex items-center justify-center cursor-pointer"
                                title="Personalizar asunto o mensaje antes de enviar"
                              >
                                <Mail size={13} />
                              </button>
                            </>
                          )}

                          {!inv.email_sent_at && (
                            <button
                              type="button"
                              disabled={isSending}
                              onClick={() => handleMarkAsOmitted(inv)}
                              className="h-8 px-2.5 rounded-lg bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200/90 hover:border-emerald-200 text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title="Marcar como ya enviado / omitir del envío automático sin mandar correo"
                            >
                              <Check size={12} />
                              <span>Omitir</span>
                            </button>
                          )}

                          <Link
                            href={'/admin/facturacion/' + inv.id}
                            className="p-1.5 rounded-md text-slate-400 hover:text-brand-blue hover:bg-slate-100 transition-colors"
                            title="Ver detalle de factura"
                          >
                            <FileText size={15} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Asignar Correo a Cliente con pendiente@pendiente */}
      {editClientModal?.isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setEditClientModal(null)}
        >
          <div
            className="bg-white rounded-xl border border-slate-200/90 shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit3 size={16} className="text-brand-blue" />
                Actualizar Correo del Cliente
              </h3>
              <button
                type="button"
                onClick={() => setEditClientModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveClientEmail} className="p-5 space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cliente</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{editClientModal.clientName}</p>
                <p className="text-xs text-red-600 font-medium mt-0.5">
                  Correo actual: {editClientModal.currentEmail}
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Nuevo Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  placeholder="cliente@ejemplo.com"
                  value={newClientEmail}
                  onChange={e => setNewClientEmail(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditClientModal(null)}
                  className="h-9 px-4 rounded-lg font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingClientEmail}
                  className="h-9 px-5 rounded-lg font-semibold bg-brand-blue text-white hover:bg-[#0e354b] text-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSavingClientEmail ? 'Guardando...' : 'Guardar Correo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Personalizar Envío de Correo */}
      {emailModalOpen && emailInvoice && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setEmailModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/60 shrink-0">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                {emailModalMode === 'reminder' ? (
                  <>
                    <BellRing size={16} className="text-amber-600" />
                    Recordatorio de Pago #{emailInvoice.invoice_number}
                  </>
                ) : (
                  <>
                    <Mail size={16} className="text-brand-blue" />
                    Enviar Comprobante #{emailInvoice.invoice_number}
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3.5 overflow-y-auto">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Destinatario (Para)
                </label>
                <p className="h-9 px-3 flex items-center bg-slate-50 border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-700 font-medium">
                  {emailInvoice.clients?.email}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Con Copia (CC) - Opcional
                </label>
                <input
                  type="email"
                  value={emailCc}
                  onChange={e => setEmailCc(e.target.value)}
                  placeholder="segundo@correo.com"
                  className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Asunto
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Mensaje
                </label>
                <textarea
                  rows={4}
                  value={emailMessage}
                  onChange={e => setEmailMessage(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 text-slate-800 leading-relaxed resize-none"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200/80 bg-slate-50/60 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="h-9 px-4 rounded-lg font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmCustomSendEmail}
                disabled={isSendingModal}
                className="h-9 px-5 rounded-lg font-semibold bg-brand-blue text-white hover:bg-[#0e354b] transition-colors text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSendingModal ? 'Enviando...' : 'Confirmar y Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Correo de Prueba de Recordatorio de Pago */}
      {testModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setTestModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl border border-slate-200/90 shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <BellRing size={16} className="text-amber-600" />
                Enviar Recordatorio de Prueba
              </h3>
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSendTestEmail} className="p-5 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Envía una muestra del correo de <strong>Recordatorio de Pago (+4 días)</strong> con el diseño oficial de JRS Cargo. No modifica ni marca ninguna factura real.
              </p>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Correo de destino
                </label>
                <input
                  type="email"
                  required
                  value={testEmailTo}
                  onChange={e => setTestEmailTo(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="h-9 px-4 rounded-lg font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="h-9 px-5 rounded-lg font-semibold bg-[#0B2737] text-white hover:bg-[#12435E] text-xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {isSendingTest ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Enviar Prueba</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
