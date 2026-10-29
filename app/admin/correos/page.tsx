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

type ActivityLogItem = {
  id: string;
  timestamp: string;
  invoiceNumber: string;
  clientName: string;
  email: string;
  type: 'auto_sent' | 'manual_sent' | 'skipped' | 'email_updated' | 'error';
  detail: string;
};

type TabFilter = 'cola' | 'listos_4d' | 'programados' | 'retenidos' | 'enviados' | 'todos';

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
  const createdUtc = Date.UTC(y, m - 1, d);

  const nowCR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }));
  const todayUtc = Date.UTC(nowCR.getFullYear(), nowCR.getMonth(), nowCR.getDate());

  return Math.floor((todayUtc - createdUtc) / (1000 * 60 * 60 * 24));
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
  const [activeTab, setActiveTab] = useState<TabFilter>('cola');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoSendEnabled, setAutoSendEnabled] = useState<boolean>(true);

  // Sending states
  const [sendingIds, setSendingIds] = useState<Record<string, boolean>>({});
  const [isBatchSending, setIsBatchSending] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);

  // Custom Email Modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
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

  useEffect(() => {
    const saved = localStorage.getItem('jrs_auto_email_4days_enabled');
    if (saved !== null) {
      setAutoSendEnabled(saved === 'true');
    }
  }, []);

  const toggleAutoSendEnabled = () => {
    setAutoSendEnabled(prev => {
      const next = !prev;
      localStorage.setItem('jrs_auto_email_4days_enabled', String(next));
      return next;
    });
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

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/invoices', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setInvoices((data.data || []).filter((inv: Invoice) => inv.status !== 'Anulada'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Classify invoices by email status
  const classified = useMemo(() => {
    const ready4Days: Invoice[] = [];
    const scheduledUnder4Days: Invoice[] = [];
    const blockedPendingEmail: Invoice[] = [];
    const sentHistory: Invoice[] = [];

    invoices.forEach(inv => {
      if (inv.email_sent_at) {
        sentHistory.push(inv);
        return;
      }

      // Si ya está Pagada, no se envía correo automático
      const stats = getInvoiceStats(inv);
      if (inv.status === 'Pagada' || stats.displayStatus === 'Pagada') {
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

    return {
      ready4Days,
      scheduledUnder4Days,
      blockedPendingEmail,
      sentHistory
    };
  }, [invoices]);

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

  // Open custom email modal
  const openCustomEmailModal = (inv: Invoice) => {
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
    setEmailInvoice(inv);
    const extra = parseClientAddress(inv.clients?.address);
    setEmailCc(inv.clients?.secondary_email || extra.secondary_email || '');
    setEmailSubject('Comprobante de Compra #' + inv.invoice_number + ' - JRS CARGO');
    setEmailMessage(
      'Adjunto a este correo encontrarás los detalles de tu comprobante de compra reciente. Por favor, revisa la información a continuación.'
    );
    setEmailModalOpen(true);
  };

  const confirmCustomSendEmail = async () => {
    if (!emailInvoice) return;
    setIsSendingModal(true);
    try {
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
    } catch {
      showAlert('Error', 'Error de red al enviar el correo.', 'error');
    } finally {
      setIsSendingModal(false);
    }
  };

  // Filtered list according to active tab and search
  const visibleInvoices = useMemo(() => {
    let baseList: Invoice[] = [];
    if (activeTab === 'cola') {
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
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString('es-CR', {
        timeZone: 'America/Costa_Rica',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }) +
      ' ' +
      d.toLocaleTimeString('es-CR', {
        timeZone: 'America/Costa_Rica',
        hour: '2-digit',
        minute: '2-digit'
      })
    );
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Actividad de Correos</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/15">
              Regla 4 Días
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitorea qué comprobantes se enviarán automáticamente a los 4 días de creación, cuáles están retenidos por{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold text-xs">pendiente@pendiente</code> y el historial de envíos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Auto-Send */}
          <button
            type="button"
            onClick={toggleAutoSendEnabled}
            className={`h-9 px-3.5 rounded-lg text-xs font-semibold border transition-all inline-flex items-center gap-1.5 cursor-pointer ${
              autoSendEnabled
                ? 'bg-emerald-50 border-emerald-200/80 text-emerald-800 hover:bg-emerald-100'
                : 'bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {autoSendEnabled ? (
              <>
                <Play size={13} className="text-emerald-600 fill-emerald-600" />
                <span>Envío Automático (4 días): Activo</span>
              </>
            ) : (
              <>
                <Pause size={13} className="text-slate-500" />
                <span>Envío Automático: Pausado</span>
              </>
            )}
          </button>

          {/* Send All Ready Button */}
          {classified.ready4Days.length > 0 && (
            <button
              type="button"
              onClick={handleSendAllReady}
              disabled={isBatchSending}
              className="h-9 px-3.5 rounded-lg bg-brand-blue hover:bg-[#0e354b] text-white text-xs font-semibold shadow-2xs transition-all inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isBatchSending ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Enviando lote...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Enviar {classified.ready4Days.length} Listos Ahora (4+ días)</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={loadInvoices}
            className="h-9 px-3.5 rounded-lg bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Actualizar lista"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-brand-blue' : 'text-slate-500'} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => setActiveTab('listos_4d')}
          className={`text-left bg-white rounded-xl p-4 border transition-all flex items-center justify-between group cursor-pointer ${
            activeTab === 'listos_4d'
              ? 'border-amber-400 ring-2 ring-amber-400/15 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
          }`}
        >
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Listos para Envío Auto</p>
            <p className="text-2xl font-black text-slate-900 tabular-nums mt-1">{classified.ready4Days.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">4+ días y correo válido</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles size={18} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('programados')}
          className={`text-left bg-white rounded-xl p-4 border transition-all flex items-center justify-between group cursor-pointer ${
            activeTab === 'programados'
              ? 'border-brand-blue ring-2 ring-brand-blue/15 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
          }`}
        >
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Programados Próximos</p>
            <p className="text-2xl font-black text-brand-blue tabular-nums mt-1">{classified.scheduledUnder4Days.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">En espera (&lt; 4 días)</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
            <Clock size={18} />
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
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Retenidos (pendiente@)</p>
            <p className="text-2xl font-black text-red-600 tabular-nums mt-1">{classified.blockedPendingEmail.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Sin correo válido</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('enviados')}
          className={`text-left bg-white rounded-xl p-4 border transition-all flex items-center justify-between group cursor-pointer ${
            activeTab === 'enviados'
              ? 'border-emerald-400 ring-2 ring-emerald-400/15 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
          }`}
        >
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Correos Enviados</p>
            <p className="text-2xl font-black text-emerald-700 tabular-nums mt-1">{classified.sentHistory.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Comprobantes entregados</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <MailCheck size={18} />
          </div>
        </button>
      </div>

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
        <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              {
                id: 'cola' as TabFilter,
                label: 'Cola de Envío',
                count: classified.ready4Days.length + classified.scheduledUnder4Days.length
              },
              {
                id: 'listos_4d' as TabFilter,
                label: 'Listos (4+ días)',
                count: classified.ready4Days.length
              },
              {
                id: 'programados' as TabFilter,
                label: 'En Espera (< 4 días)',
                count: classified.scheduledUnder4Days.length
              },
              {
                id: 'retenidos' as TabFilter,
                label: 'Retenidos (pendiente@)',
                count: classified.blockedPendingEmail.length
              },
              {
                id: 'enviados' as TabFilter,
                label: 'Historial Enviados',
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
                className={`h-8 px-2.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-brand-blue text-white shadow-2xs'
                    : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100'
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

          <div className="relative w-full lg:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar factura, cliente o correo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
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
                  const daysElapsed = getDaysSinceCreation(inv.issue_date, inv.created_at);
                  const daysRemaining = Math.max(0, 4 - daysElapsed);
                  const scheduledDate = getScheduledSendDateStr(inv.issue_date, inv.created_at);
                  const isPendingEmail = isPendingClientEmail(inv.clients?.email);
                  const isSending = !!sendingIds[inv.id];

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

                      {/* Estado / Programación */}
                      <td className="py-2.5 px-3.5">
                        {inv.email_sent_at ? (
                          <div className="inline-flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full w-fit">
                              <MailCheck size={13} />
                              Enviado
                            </span>
                            <span className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                              {formatEmailDate(inv.email_sent_at)}
                            </span>
                          </div>
                        ) : stats.displayStatus === 'Pagada' || inv.status === 'Pagada' ? (
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
                                onClick={() => openCustomEmailModal(inv)}
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
                <Mail size={16} className="text-brand-blue" />
                Enviar Comprobante #{emailInvoice.invoice_number}
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
    </div>
  );
}
