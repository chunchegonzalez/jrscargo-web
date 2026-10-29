'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, AlertCircle, CheckCircle2, DollarSign, Mail, MailCheck, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, Filter, X, ShieldCheck } from 'lucide-react';
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
  clients?: { id?: string; name: string; email: string; address?: string; secondary_email?: string };
  invoice_payments?: { amount_applied: number | string }[];
};

type SortField = 'date' | 'number' | 'client' | 'amount' | 'status' | 'email';

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

export default function FacturacionDashboard() {
  const { showAlert } = useModal();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [filterStatus, setFilterStatus] = useState<string>('Todas');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterEmail, setFilterEmail] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Sorting State
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Email Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailInvoice, setEmailInvoice] = useState<Invoice | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Automatic 4-day email sending state
  const [autoSendingIds, setAutoSendingIds] = useState<Record<string, boolean>>({});
  const autoSentProcessedRef = useRef<Set<string>>(new Set());
  const isRunningAutoSendRef = useRef<boolean>(false);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/invoices');
      const data = await res.json();
      if (data.success) {
        setInvoices(data.data || []);
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

  // Automatic send for unsent invoices with >= 4 days since creation (excluding pendiente@pendiente)
  useEffect(() => {
    if (loading || invoices.length === 0 || isRunningAutoSendRef.current) return;
    if (typeof window !== 'undefined' && localStorage.getItem('jrs_auto_email_4days_enabled') === 'false') return;

    const pendingAutoSend = invoices.filter(inv => {
      if (inv.email_sent_at) return false;
      if (inv.status === 'Anulada' || inv.status === 'Pagada') return false;
      if (getInvoiceStats(inv).displayStatus === 'Pagada') return false;
      if (isPendingClientEmail(inv.clients?.email)) return false;
      if (autoSentProcessedRef.current.has(inv.id)) return false;
      const daysElapsed = getDaysSinceCreation(inv.issue_date, inv.created_at);
      return daysElapsed >= 4;
    });

    if (pendingAutoSend.length === 0) return;

    let cancelled = false;
    isRunningAutoSendRef.current = true;

    pendingAutoSend.forEach(inv => autoSentProcessedRef.current.add(inv.id));

    (async () => {
      for (const inv of pendingAutoSend) {
        if (cancelled) break;
        setAutoSendingIds(prev => ({ ...prev, [inv.id]: true }));
        try {
          const extra = parseClientAddress(inv.clients?.address);
          const cc = inv.clients?.secondary_email || extra.secondary_email || '';
          const res = await fetch('/api/invoices/' + inv.id + '/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: 'Comprobante de Compra #' + inv.invoice_number + ' - JRS CARGO',
              message: 'Adjunto a este correo encontrarás los detalles de tu comprobante de compra reciente. Por favor, revisa la información a continuación.',
              cc
            })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            const sentAt = data.email_sent_at || new Date().toISOString();
            setInvoices(prev =>
              prev.map(item => (item.id === inv.id ? { ...item, email_sent_at: sentAt } : item))
            );
          }
        } catch (err) {
          console.error('Error en envío automático de factura #' + inv.invoice_number, err);
        } finally {
          setAutoSendingIds(prev => {
            const next = { ...prev };
            delete next[inv.id];
            return next;
          });
        }
      }
      isRunningAutoSendRef.current = false;
    })();

    return () => {
      cancelled = true;
      isRunningAutoSendRef.current = false;
    };
  }, [invoices, loading]);

  const openEmailModal = (inv: Invoice) => {
    if (isPendingClientEmail(inv.clients?.email)) {
      showAlert('Correo Pendiente', 'Este cliente tiene el correo "pendiente@pendiente". Por favor actualiza el correo del cliente antes de enviar el comprobante.', 'error');
      return;
    }
    setEmailInvoice(inv);
    const extra = parseClientAddress(inv.clients?.address);
    setEmailCc(inv.clients?.secondary_email || extra.secondary_email || '');
    setEmailSubject('Comprobante de Compra #' + inv.invoice_number + ' - JRS CARGO');
    setEmailMessage('Adjunto a este correo encontrarás los detalles de tu comprobante de compra reciente. Por favor, revisa la información a continuación.');
    setEmailModalOpen(true);
  };

  const confirmSendEmail = async () => {
    if (!emailInvoice) return;
    setIsSendingEmail(true);
    try {
      const res = await fetch('/api/invoices/' + emailInvoice.id + '/send', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject, message: emailMessage, cc: emailCc })
      });
      const data = await res.json();
      if (data.success) {
        setInvoices(prev => prev.map(inv => 
          inv.id === emailInvoice.id ? { ...inv, email_sent_at: data.email_sent_at || new Date().toISOString() } : inv
        ));
        showAlert('Éxito', '¡Correo enviado con éxito!', 'success');
        setEmailModalOpen(false);
      } else {
        showAlert('Error', 'Error al enviar correo: ' + data.error, 'error');
      }
    } catch {
      showAlert('Error', 'Error de red al enviar el correo.', 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Filtered invoices (Dynamic calculation)
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const stats = getInvoiceStats(inv);
      const effectiveStatus = stats.displayStatus;
      const matchStatus = filterStatus === 'Todas' || effectiveStatus === filterStatus;
      
      const invDate = inv.issue_date ? inv.issue_date.split('T')[0] : '';
      const matchDate = filterDate === '' || invDate === filterDate;
      
      const matchEmail = filterEmail === 'Todos' ||
        (filterEmail === 'Enviado' && !!inv.email_sent_at) ||
        (filterEmail === 'No enviado' && !inv.email_sent_at);
        
      const searchLower = searchTerm.toLowerCase().trim();
      const matchSearch = !searchLower || 
        (inv.clients?.name || '').toLowerCase().includes(searchLower) || 
        (inv.clients?.email || '').toLowerCase().includes(searchLower) || 
        (inv.invoice_number || '').toLowerCase().includes(searchLower);

      return matchStatus && matchDate && matchEmail && matchSearch;
    });
  }, [invoices, filterStatus, filterDate, filterEmail, searchTerm]);

  // Sorted invoices based on active column header sort
  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        const da = new Date(a.issue_date).getTime() || 0;
        const db = new Date(b.issue_date).getTime() || 0;
        comparison = da - db;
      } else if (sortField === 'number') {
        comparison = a.invoice_number.localeCompare(b.invoice_number, undefined, { numeric: true });
      } else if (sortField === 'client') {
        const na = (a.clients?.name || '').toLowerCase();
        const nb = (b.clients?.name || '').toLowerCase();
        comparison = na.localeCompare(nb);
      } else if (sortField === 'amount') {
        const ta = Number(a.total) || 0;
        const tb = Number(b.total) || 0;
        comparison = ta - tb;
      } else if (sortField === 'status') {
        const sa = getInvoiceStats(a).displayStatus;
        const sb = getInvoiceStats(b).displayStatus;
        comparison = sa.localeCompare(sb);
      } else if (sortField === 'email') {
        const ea = a.email_sent_at ? 1 : 0;
        const eb = b.email_sent_at ? 1 : 0;
        comparison = ea - eb;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredInvoices, sortField, sortOrder]);

  // Dynamically calculated stats that react to ANY active filter
  const { totalPendingUSD, totalPaidUSD, totalFacturadoUSD } = useMemo(() => {
    let pendingUSD = 0, paidUSD = 0, facturadoUSD = 0;
    filteredInvoices.forEach(inv => {
      const stats = getInvoiceStats(inv);
      if (stats.currency !== 'CRC') {
        pendingUSD += stats.pending;
        paidUSD += stats.paid;
        facturadoUSD += Number(inv.total) || 0;
      }
    });
    return { totalPendingUSD: pendingUSD, totalPaidUSD: paidUSD, totalFacturadoUSD: facturadoUSD };
  }, [filteredInvoices]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'date' || field === 'amount' ? 'desc' : 'asc');
    }
  };

  const hasActiveFilters = filterStatus !== 'Todas' || filterDate !== '' || filterEmail !== 'Todos' || searchTerm !== '';

  const clearAllFilters = () => {
    setFilterStatus('Todas');
    setFilterDate('');
    setFilterEmail('Todos');
    setSearchTerm('');
  };

  const formatEmailDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica', day: '2-digit', month: '2-digit', year: 'numeric' }) + 
      ' ' + d.toLocaleTimeString('es-CR', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Facturación y Cobros</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/15">
              Finanzas
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Gestiona las cuentas por cobrar, envía facturas y registra pagos.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadInvoices()}
            disabled={loading}
            className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-2xs inline-flex items-center gap-1.5 font-medium text-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            title="Actualizar facturas"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-brand-blue' : 'text-slate-500'} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          <Link
            href="/admin/facturacion/nueva"
            className="h-9 px-3.5 rounded-lg border border-brand-blue/20 bg-brand-blue hover:bg-[#0e354b] text-white shadow-2xs inline-flex items-center justify-center gap-1.5 font-semibold text-xs transition-all active:scale-[0.98]"
          >
            <Plus size={15} /> Crear Factura
          </Link>
        </div>
      </div>

      {/* Tarjetas de Resumen Dinámicas (se recalculan con cualquier filtro) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <button
          type="button"
          onClick={() => setFilterStatus('Todas')}
          className={`text-left bg-white rounded-xl p-4 border transition-all cursor-pointer flex items-center justify-between group ${
            filterStatus === 'Todas'
              ? 'border-brand-blue/40 ring-2 ring-brand-blue/10 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">Total Facturado</p>
              <span className="px-1.5 py-0.5 bg-brand-blue/10 text-brand-blue text-[10px] font-bold rounded-md shrink-0 tabular-nums">
                {filteredInvoices.length} fact.
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 tabular-nums mt-1 truncate">
              {formatCurrency(totalFacturadoUSD, 'USD')}
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">Volumen en vista actual</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-brand-blue flex items-center justify-center shrink-0 group-hover:bg-brand-blue/10 transition-colors">
            <DollarSign size={19} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'Pendiente' ? 'Todas' : 'Pendiente')}
          className={`text-left bg-white rounded-xl p-4 border transition-all cursor-pointer flex items-center justify-between group ${
            filterStatus === 'Pendiente'
              ? 'border-amber-500/50 ring-2 ring-amber-500/15 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">Total Pendiente</p>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-amber-600 tabular-nums mt-1 truncate">
              {formatCurrency(totalPendingUSD, 'USD')}
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">Saldo por cobrar</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
            <AlertCircle size={19} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'Pagada' ? 'Todas' : 'Pagada')}
          className={`text-left bg-white rounded-xl p-4 border transition-all cursor-pointer flex items-center justify-between group ${
            filterStatus === 'Pagada'
              ? 'border-emerald-600/50 ring-2 ring-emerald-500/15 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">Total Pagado</p>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-700 tabular-nums mt-1 truncate">
              {formatCurrency(totalPaidUSD, 'USD')}
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">Cobros conciliados</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <CheckCircle2 size={19} />
          </div>
        </button>
      </div>

      {/* Lista de Facturas */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-0 lg:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
            <input 
              type="text" 
              placeholder="Buscar cliente, correo o n.º de factura..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-8 bg-white rounded-lg border border-slate-200/90 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all" 
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
          
          <div className="flex flex-wrap items-center gap-2">
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 px-2.5 bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:border-brand-blue transition-colors"
            >
              <option value="Todas">Estado: Todos</option>
              <option value="Pendiente">Pendientes</option>
              <option value="Pagada">Pagadas</option>
              <option value="Vencida">Vencidas</option>
            </select>

            <select 
              value={filterEmail}
              onChange={(e) => setFilterEmail(e.target.value)}
              className="h-9 px-2.5 bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:border-brand-blue transition-colors"
            >
              <option value="Todos">Correo: Todos</option>
              <option value="Enviado">Correo Enviado</option>
              <option value="No enviado">Correo No Enviado</option>
            </select>
            
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-9 px-2.5 bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:border-brand-blue transition-colors"
            />

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="h-9 px-3 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200/60 rounded-lg text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                title="Restablecer todos los filtros"
              >
                <X size={13} /> Limpiar
              </button>
            )}

            <span className="h-9 px-3 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center tabular-nums">
              {filteredInvoices.length} de {invoices.length}
            </span>
          </div>
        </div>

        {/* Vista Móvil: Tarjetas individuales táctiles (sin scroll horizontal) */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Cargando facturas...</div>
          ) : sortedInvoices.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No se encontraron facturas con esos filtros.</div>
          ) : (
            sortedInvoices.map((inv) => {
              const stats = getInvoiceStats(inv);
              const displayStatus = stats.displayStatus;

              return (
                <div key={inv.id} className="p-3.5 space-y-2.5 bg-white hover:bg-slate-50/90 transition-colors">
                  {/* Fila 1: N.° Factura, Fecha, Estado */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                        {inv.invoice_number}
                      </span>
                      <span className="text-xs text-slate-400 tabular-nums">
                        {formatDisplayDate(inv.issue_date)}
                      </span>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      displayStatus === 'Pagada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' :
                      displayStatus === 'Vencida' ? 'bg-red-50 text-red-700 border-red-200/80' :
                      displayStatus === 'Anulada' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                      'bg-amber-50 text-amber-700 border-amber-200/80'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        displayStatus === 'Pagada' ? 'bg-emerald-500' :
                        displayStatus === 'Vencida' ? 'bg-red-500' :
                        displayStatus === 'Anulada' ? 'bg-slate-400' :
                        'bg-amber-500'
                      }`} />
                      {displayStatus}
                    </span>
                  </div>

                  {/* Fila 2: Cliente e Importe */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {inv.clients?.name || 'Cliente sin nombre'}
                      </p>
                      {inv.clients?.email && (
                        <p className="text-xs text-slate-400 truncate">
                          {inv.clients.email}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <p className="text-sm font-black text-slate-900">
                        {formatCurrency(Number(inv.total), stats.currency)}
                      </p>
                      {stats.paid > 0 && stats.pending > 0 && (
                        <p className="text-[11px] text-amber-600 font-semibold">
                          Pend: {formatCurrency(stats.pending, stats.currency)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Fila 3: Estado de Correo y Acciones */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div>
                      {inv.email_sent_at ? (
                        <div className="flex items-center gap-1.5 text-emerald-600">
                          <MailCheck size={13} />
                          <span className="text-[11px] font-semibold">Enviado</span>
                          <button 
                            onClick={() => openEmailModal(inv)} 
                            className="text-[11px] text-brand-blue hover:underline font-semibold ml-1"
                          >
                            Reenviar
                          </button>
                        </div>
                      ) : autoSendingIds[inv.id] ? (
                        <div className="flex items-center gap-1.5 text-brand-blue">
                          <RefreshCw size={13} className="animate-spin" />
                          <span className="text-[11px] font-semibold">Enviando auto...</span>
                        </div>
                      ) : isPendingClientEmail(inv.clients?.email) ? (
                        <div className="flex items-center gap-1.5 text-slate-400" title="Correo pendiente@pendiente - no se envía en automático">
                          <Mail size={13} />
                          <span className="text-[11px]">Correo pendiente</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Mail size={13} />
                          <span className="text-[11px]">No enviado</span>
                          <button 
                            onClick={() => openEmailModal(inv)} 
                            className="text-[11px] text-brand-blue hover:underline font-semibold ml-1"
                          >
                            Enviar
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        href={'/admin/facturacion/' + inv.id}
                        className="h-7 px-2.5 inline-flex items-center text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                      >
                        Ver detalle
                      </Link>
                      {displayStatus !== 'Pagada' && displayStatus !== 'Anulada' && (inv.clients?.id || inv.client_id) && (
                        <Link
                          href={'/admin/cuentas-por-cobrar/recibir/' + (inv.clients?.id || inv.client_id) + '?invoice_id=' + inv.id}
                          className="h-7 px-2.5 inline-flex items-center text-xs font-semibold text-white bg-brand-blue hover:bg-[#0e354b] rounded-md shadow-2xs transition-colors"
                        >
                          Cobrar
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Vista Escritorio: Tabla completa con ordenamiento */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/95 border-b border-slate-200/90">
              <tr className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                <th 
                  className="py-2.5 px-3.5 pl-5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleSort('date')}
                  title="Ordenar por fecha"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Fecha</span>
                    {sortField === 'date' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} className="text-brand-blue" /> : <ArrowDown size={13} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={13} className="text-slate-300" />
                    )}
                  </div>
                </th>
                <th 
                  className="py-2.5 px-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleSort('number')}
                  title="Ordenar por número de factura"
                >
                  <div className="flex items-center gap-1.5">
                    <span>N.º Factura</span>
                    {sortField === 'number' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} className="text-brand-blue" /> : <ArrowDown size={13} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={13} className="text-slate-300" />
                    )}
                  </div>
                </th>
                <th 
                  className="py-2.5 px-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleSort('client')}
                  title="Ordenar por nombre de cliente"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Cliente</span>
                    {sortField === 'client' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} className="text-brand-blue" /> : <ArrowDown size={13} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={13} className="text-slate-300" />
                    )}
                  </div>
                </th>
                <th 
                  className="py-2.5 px-3.5 text-right cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleSort('amount')}
                  title="Ordenar por importe"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Importe</span>
                    {sortField === 'amount' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} className="text-brand-blue" /> : <ArrowDown size={13} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={13} className="text-slate-300" />
                    )}
                  </div>
                </th>
                <th 
                  className="py-2.5 px-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleSort('status')}
                  title="Ordenar por estado"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Estado</span>
                    {sortField === 'status' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} className="text-brand-blue" /> : <ArrowDown size={13} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={13} className="text-slate-300" />
                    )}
                  </div>
                </th>
                <th 
                  className="py-2.5 px-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleSort('email')}
                  title="Ordenar por estado de envío de correo"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Correo</span>
                    {sortField === 'email' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} className="text-brand-blue" /> : <ArrowDown size={13} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={13} className="text-slate-300" />
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-3.5 pr-5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 px-6 text-center text-slate-400">Cargando facturas...</td>
                </tr>
              ) : sortedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-6 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <FileText size={26} className="text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">No se encontraron facturas con esos filtros.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedInvoices.map(inv => {
                  const stats = getInvoiceStats(inv);
                  const displayStatus = stats.displayStatus;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/90 transition-colors group">
                      <td className="py-2.5 px-3.5 pl-5 text-slate-500 whitespace-nowrap tabular-nums text-xs">
                        {formatDisplayDate(inv.issue_date)}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <Link
                          href={'/admin/facturacion/' + inv.id}
                          className="inline-flex items-center gap-1 font-mono font-bold text-slate-900 group-hover:text-brand-blue transition-colors"
                        >
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="font-medium text-slate-800">{inv.clients?.name}</div>
                        <span className="block text-xs text-slate-400 font-normal">{inv.clients?.email}</span>
                      </td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-900 text-right tabular-nums whitespace-nowrap">
                        {formatCurrency(Number(inv.total), stats.currency)}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            displayStatus === 'Pagada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' :
                            displayStatus === 'Vencida' ? 'bg-red-50 text-red-700 border-red-200/80' :
                            displayStatus === 'Anulada' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                            'bg-amber-50 text-amber-700 border-amber-200/80'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              displayStatus === 'Pagada' ? 'bg-emerald-500' :
                              displayStatus === 'Vencida' ? 'bg-red-500' :
                              displayStatus === 'Anulada' ? 'bg-slate-400' :
                              'bg-amber-500'
                            }`} />
                            {displayStatus}
                          </span>
                          {stats.paid > 0 && stats.pending > 0 && (
                            <span className="text-[11px] text-slate-500">
                              Parcial · <span className="font-semibold text-amber-700 tabular-nums">{formatCurrency(stats.pending, stats.currency)}</span> pend.
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Email status column */}
                      <td className="py-2.5 px-3.5 text-center">
                        {inv.email_sent_at ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
                              <MailCheck size={12} />
                              <span className="text-[10px] font-semibold">Enviado</span>
                            </div>
                            <span className="text-[10px] text-slate-400 tabular-nums">{formatEmailDate(inv.email_sent_at)}</span>
                            <button 
                              onClick={() => openEmailModal(inv)} 
                              className="inline-flex items-center gap-1 text-[11px] text-brand-blue hover:underline font-semibold cursor-pointer"
                            >
                              <RefreshCw size={10} />
                              Reenviar
                            </button>
                          </div>
                        ) : autoSendingIds[inv.id] ? (
                          <div className="flex flex-col items-center gap-1 text-brand-blue">
                            <RefreshCw size={14} className="animate-spin" />
                            <span className="text-[10px] font-semibold">Enviando auto...</span>
                          </div>
                        ) : isPendingClientEmail(inv.clients?.email) ? (
                          <div className="flex flex-col items-center gap-0.5 text-slate-400" title="Cliente con correo pendiente@pendiente — no se envía automáticamente">
                            <div className="flex items-center gap-1">
                              <Mail size={13} />
                              <span className="text-[11px] font-medium">No enviado</span>
                            </div>
                            <span className="text-[10px] text-slate-400 italic">Correo pendiente</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex items-center gap-1 text-slate-400">
                              <Mail size={13} />
                              <span className="text-[11px] font-medium">No enviado</span>
                            </div>
                            <button 
                              onClick={() => openEmailModal(inv)} 
                              className="inline-flex items-center gap-1 text-[11px] text-brand-blue hover:underline font-semibold cursor-pointer"
                            >
                              Enviar
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 pr-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Link
                            href={'/admin/facturacion/' + inv.id}
                            className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center transition-colors"
                          >
                            Ver detalle
                          </Link>
                          {displayStatus !== 'Pagada' && displayStatus !== 'Anulada' && (inv.clients?.id || inv.client_id) && (
                            <Link 
                              href={'/admin/cuentas-por-cobrar/recibir/' + (inv.clients?.id || inv.client_id) + '?invoice_id=' + inv.id} 
                              className="h-7 px-2.5 rounded-md text-xs font-semibold text-white bg-brand-blue hover:bg-[#0e354b] inline-flex items-center transition-colors shadow-2xs"
                            >
                              Cobrar
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Tabla */}
        <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>
            Mostrando <strong className="font-semibold text-slate-700">{filteredInvoices.length}</strong> de{' '}
            <strong className="font-semibold text-slate-700">{invoices.length}</strong> facturas registradas
          </span>
        </div>
      </div>

      {/* Email Modal */}
      {emailModalOpen && emailInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/70 shrink-0">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                {emailInvoice.email_sent_at ? (
                  <>
                    <RefreshCw size={16} className="text-brand-blue" />
                    Reenviar Factura por Correo
                  </>
                ) : (
                  <>
                    <Mail size={16} className="text-brand-blue" />
                    Enviar Factura por Correo
                  </>
                )}
              </h3>
              <button onClick={() => setEmailModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5 space-y-4 overflow-y-auto">
              {emailInvoice.email_sent_at && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200/80 rounded-lg text-xs text-emerald-700">
                  <MailCheck size={15} />
                  <span>Último envío: <strong>{formatEmailDate(emailInvoice.email_sent_at)}</strong></span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Destinatario (Para)</label>
                <p className="px-3.5 py-2 bg-slate-50 border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-700 font-medium">{emailInvoice.clients?.email}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    En Copia (CC) <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                  </label>
                  {emailCc && (
                    <span className="text-[10px] bg-brand-blue/10 text-brand-blue border border-brand-blue/20 font-semibold px-2 py-0.5 rounded-md">
                      2º Correo del cliente
                    </span>
                  )}
                </div>
                <input 
                  type="email"
                  placeholder="ejemplo2@correo.com"
                  value={emailCc}
                  onChange={e => setEmailCc(e.target.value)}
                  className="w-full h-9 px-3.5 bg-white border border-slate-200/90 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Asunto del Correo</label>
                <input 
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  className="w-full h-9 px-3.5 bg-white border border-slate-200/90 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Mensaje Adicional</label>
                <textarea 
                  value={emailMessage}
                  onChange={e => setEmailMessage(e.target.value)}
                  rows={3}
                  className="w-full p-3.5 bg-white border border-slate-200/90 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm font-medium text-slate-800 resize-none"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">Este mensaje aparecerá en el cuerpo del correo. La factura se adjuntará automáticamente.</p>
              </div>

              <div className="p-3 bg-brand-blue/[0.06] border border-brand-blue/15 rounded-lg text-xs text-slate-700 flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-brand-blue shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Este correo incluirá automáticamente el <strong>saldo pendiente total</strong> del cliente y un enlace directo y exclusivo a su <strong>estado de cuenta personal</strong> online (sin contraseña).
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/80 flex justify-end gap-2">
                <button type="button" onClick={() => setEmailModalOpen(false)} className="h-9 px-4 font-semibold text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button 
                  onClick={confirmSendEmail}
                  disabled={isSendingEmail} 
                  className="h-9 px-4 font-semibold text-xs bg-brand-blue text-white rounded-lg hover:bg-[#0e354b] disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
                >
                  {isSendingEmail ? 'Enviando...' : emailInvoice.email_sent_at ? 'Reenviar Correo' : 'Enviar Correo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
