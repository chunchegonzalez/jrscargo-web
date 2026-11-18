'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  CheckCircle2,
  DollarSign,
  Mail,
  MailCheck,
  RefreshCw,
  X,
  FileSpreadsheet,
  Hourglass,
  ShoppingBag,
  Eye,
  Pencil,
  CreditCard,
  Trash2,
} from 'lucide-react';
import {
  getInvoiceStats,
  formatCurrency,
  formatDisplayDate,
  parseClientAddress,
  isCompraSitioWebInvoice,
} from '@/lib/billing';
import { generateIncomeReportXlsx } from '@/lib/excel-export';
import { useModal } from '@/app/components/ModalProvider';

type InvoiceItem = {
  service_name?: string;
  tracking_number?: string;
  weight?: string | number;
  amount?: number | string;
};

type Invoice = {
  id: string;
  invoice_number: string;
  issue_date: string;
  created_at?: string;
  total: number | string;
  status: string;
  client_id: string;
  currency?: string;
  exchange_rate?: number;
  email_sent_at?: string | null;
  clients?: {
    id?: string;
    name: string;
    email: string;
    address?: string;
    secondary_email?: string;
  };
  invoice_payments?: { amount_applied: number | string }[];
  invoice_items?: InvoiceItem[];
  items?: InvoiceItem[];
};

function getCRDate(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }));
}

function formatYMD(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CompraEnSitioWebPage() {
  const { showAlert, showConfirm } = useModal();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState<number>(500);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('Todas');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<string>('todos');

  // Email modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailInvoice, setEmailInvoice] = useState<Invoice | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [invRes, rateRes] = await Promise.all([
        fetch('/api/invoices?includeItems=true', { cache: 'no-store' }),
        fetch('/api/exchange-rate', { cache: 'no-store' }),
      ]);
      const invData = await invRes.json();
      if (invData.success) {
        const all: Invoice[] = invData.data || [];
        setInvoices(all.filter(inv => isCompraSitioWebInvoice(inv)));
      }
      if (rateRes.ok) {
        const rateData = await rateRes.json();
        if (rateData.success && Number(rateData.rate) > 0) {
          setExchangeRate(Number(rateData.rate));
        }
      }
    } catch (err) {
      console.error('Error cargando facturas de Compra en sitio web:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const applyDatePreset = (preset: string) => {
    setDatePreset(preset);
    const now = getCRDate();
    if (preset === 'este-mes') {
      setFilterStartDate(formatYMD(new Date(now.getFullYear(), now.getMonth(), 1)));
      setFilterEndDate(formatYMD(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
    } else if (preset === 'mes-anterior') {
      setFilterStartDate(formatYMD(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
      setFilterEndDate(formatYMD(new Date(now.getFullYear(), now.getMonth(), 0)));
    } else if (preset === 'todos') {
      setFilterStartDate('');
      setFilterEndDate('');
    }
  };

  // Base filtered (search + date)
  const baseFiltered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return invoices.filter(inv => {
      const invDate = inv.issue_date ? inv.issue_date.split('T')[0] : '';
      if (filterStartDate && invDate < filterStartDate) return false;
      if (filterEndDate && invDate > filterEndDate) return false;

      if (q) {
        const itemsList = inv.invoice_items || inv.items || [];
        const matchItem = itemsList.some(
          it =>
            (it.tracking_number || '').toLowerCase().includes(q) ||
            (it.service_name || '').toLowerCase().includes(q)
        );
        const matchHeader =
          (inv.invoice_number || '').toLowerCase().includes(q) ||
          (inv.clients?.name || '').toLowerCase().includes(q) ||
          (inv.clients?.email || '').toLowerCase().includes(q);
        if (!matchHeader && !matchItem) return false;
      }

      return true;
    });
  }, [invoices, searchTerm, filterStartDate, filterEndDate]);

  const statusCounts = useMemo(() => {
    let pendientes = 0;
    let pagadas = 0;
    let vencidas = 0;
    baseFiltered.forEach(inv => {
      const st = getInvoiceStats(inv).displayStatus;
      if (st === 'Pendiente') pendientes++;
      else if (st === 'Pagada') pagadas++;
      else if (st === 'Vencida') vencidas++;
    });
    return { todas: baseFiltered.length, pendientes, pagadas, vencidas };
  }, [baseFiltered]);

  const filteredInvoices = useMemo(() => {
    if (filterStatus === 'Todas') return baseFiltered;
    return baseFiltered.filter(inv => getInvoiceStats(inv).displayStatus === filterStatus);
  }, [baseFiltered, filterStatus]);

  const { totalFacturadoUSD, totalPendingUSD, totalPaidUSD } = useMemo(() => {
    let facturado = 0;
    let pending = 0;
    let paid = 0;
    filteredInvoices.forEach(inv => {
      const stats = getInvoiceStats(inv);
      if (stats.currency !== 'CRC') {
        facturado += Number(inv.total) || 0;
        pending += stats.pending;
        paid += stats.paid;
      }
    });
    return { totalFacturadoUSD: facturado, totalPendingUSD: pending, totalPaidUSD: paid };
  }, [filteredInvoices]);

  const openEmailModal = (inv: Invoice) => {
    if (!inv.clients?.email) {
      showAlert('Este cliente no tiene un correo electrónico registrado.', 'error');
      return;
    }
    const extra = parseClientAddress(inv.clients?.address);
    setEmailInvoice(inv);
    setEmailCc(inv.clients?.secondary_email || extra.secondary_email || '');
    setEmailSubject('Comprobante de Compra #' + inv.invoice_number + ' - JRS CARGO');
    setEmailMessage(
      '¡Gracias por confiar tus compras a JRS Cargo! Aquí tienes el resumen detallado de tu comprobante reciente.'
    );
    setEmailModalOpen(true);
  };

  const confirmSendEmail = async () => {
    if (!emailInvoice) return;
    setIsSendingEmail(true);
    try {
      const res = await fetch('/api/invoices/' + emailInvoice.id + '/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject, message: emailMessage, cc: emailCc }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const sentAt = data.email_sent_at || new Date().toISOString();
        setInvoices(prev =>
          prev.map(it => (it.id === emailInvoice.id ? { ...it, email_sent_at: sentAt } : it))
        );
        setEmailModalOpen(false);
        showAlert('Comprobante enviado correctamente por correo.', 'success');
      } else {
        showAlert(data.error || 'No se pudo enviar el correo.', 'error');
      }
    } catch {
      showAlert('Error de conexión al enviar correo.', 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDeleteInvoice = async (inv: Invoice) => {
    const ok = await showConfirm(
      `¿Seguro que deseas eliminar la factura ${inv.invoice_number} de ${inv.clients?.name || 'este cliente'}? Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    try {
      const res = await fetch('/api/invoices/' + inv.id, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setInvoices(prev => prev.filter(item => item.id !== inv.id));
        showAlert(`Factura ${inv.invoice_number} eliminada.`, 'success');
      } else {
        showAlert(data.error || 'Error eliminando factura.', 'error');
      }
    } catch {
      showAlert('Error de conexión al eliminar factura.', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Pagada') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    }
    if (status === 'Vencida') {
      return 'bg-red-50 text-red-700 border-red-200/80';
    }
    if (status === 'Anulada') {
      return 'bg-slate-100 text-slate-500 border-slate-200';
    }
    return 'bg-amber-50 text-amber-700 border-amber-200/80';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Compra en sitio web
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              <ShoppingBag size={12} />
              <span>Facturación Separada</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Consulta y administra de forma independiente todas las facturas del rubro{' '}
            <strong className="text-slate-700">COMPRA EN SITIO WEB</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => generateIncomeReportXlsx(filteredInvoices, filterStartDate, filterEndDate)}
            disabled={filteredInvoices.length === 0}
            className="h-9 px-3.5 rounded-lg border border-emerald-600/30 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs inline-flex items-center gap-1.5 font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <FileSpreadsheet size={14} />
            <span>Exportar Excel</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs inline-flex items-center gap-1.5 font-medium text-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-brand-blue' : 'text-slate-500'} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <Link
            href="/admin/facturacion/nueva?service=COMPRA+EN+SITIO+WEB"
            className="h-9 px-3.5 rounded-lg border border-brand-blue/20 bg-brand-blue hover:bg-[#0e354b] text-white shadow-2xs inline-flex items-center justify-center gap-1.5 font-semibold text-xs transition-all active:scale-[0.98]"
          >
            <Plus size={15} />
            <span>Nueva Compra Web</span>
          </Link>
        </div>
      </div>

      {/* KPIs Separados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setFilterStatus('Todas')}
          className={`text-left bg-white rounded-xl p-4 sm:p-5 border transition-all cursor-pointer flex items-center gap-4 group ${
            filterStatus === 'Todas'
              ? 'border-brand-blue/40 ring-2 ring-brand-blue/10 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.03)]'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <DollarSign size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
              Total Facturado (Web)
            </p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 tabular-nums mt-0.5 truncate">
              {formatCurrency(totalFacturadoUSD, 'USD')}
            </h2>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {filteredInvoices.length} {filteredInvoices.length === 1 ? 'factura' : 'facturas'} en vista
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'Pendiente' ? 'Todas' : 'Pendiente')}
          className={`text-left bg-white rounded-xl p-4 sm:p-5 border transition-all cursor-pointer flex items-center gap-4 group ${
            filterStatus === 'Pendiente'
              ? 'border-amber-500/50 ring-2 ring-amber-500/15 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.03)]'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
            <Hourglass size={21} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
              Pendiente Compra Web
            </p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-amber-600 tabular-nums mt-0.5 truncate">
              {formatCurrency(totalPendingUSD, 'USD')}
            </h2>
            <p className="text-xs text-slate-500 mt-1 truncate">
              ≈ ₡{Math.round(totalPendingUSD * exchangeRate).toLocaleString('es-CR')} CRC
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'Pagada' ? 'Todas' : 'Pagada')}
          className={`text-left bg-white rounded-xl p-4 sm:p-5 border transition-all cursor-pointer flex items-center gap-4 group ${
            filterStatus === 'Pagada'
              ? 'border-emerald-600/50 ring-2 ring-emerald-500/15 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.03)]'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <CheckCircle2 size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
              Total Pagado (Web)
            </p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-700 tabular-nums mt-0.5 truncate">
              {formatCurrency(totalPaidUSD, 'USD')}
            </h2>
            <p className="text-xs text-slate-500 mt-1 truncate">Cobros conciliados</p>
          </div>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0 lg:max-w-md">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={16}
            />
            <input
              type="text"
              placeholder="Buscar cliente, factura, correo o descripción..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-8 bg-white rounded-lg border border-slate-200/90 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Pestañas de estado */}
          <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 overflow-x-auto">
            {[
              { key: 'Todas', label: 'Todas', count: statusCounts.todas, dot: '' },
              { key: 'Pendiente', label: 'Pendientes', count: statusCounts.pendientes, dot: 'bg-amber-500' },
              { key: 'Pagada', label: 'Pagadas', count: statusCounts.pagadas, dot: 'bg-emerald-500' },
              { key: 'Vencida', label: 'Vencidas', count: statusCounts.vencidas, dot: 'bg-red-500' },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterStatus(tab.key)}
                className={`h-8 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                  filterStatus === tab.key
                    ? 'bg-[#0B2737] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {tab.dot && <span className={`w-2 h-2 rounded-full ${tab.dot} shrink-0`} />}
                <span>{tab.label}</span>
                <span className="opacity-75 tabular-nums">({tab.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fila de fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Período</label>
            <select
              value={datePreset}
              onChange={e => applyDatePreset(e.target.value)}
              className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-blue cursor-pointer"
            >
              <option value="todos">Todo el historial</option>
              <option value="este-mes">Este Mes</option>
              <option value="mes-anterior">Mes Anterior</option>
              <option value="personalizado">Rango personalizado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha desde</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={e => {
                setFilterStartDate(e.target.value);
                setDatePreset('personalizado');
              }}
              className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-blue"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha hasta</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={e => {
                setFilterEndDate(e.target.value);
                setDatePreset('personalizado');
              }}
              className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-blue"
            />
          </div>
        </div>
      </div>

      {/* Tabla de facturas de Compra en sitio web */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/95 border-b border-slate-200/90">
              <tr className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="py-3 px-4 pl-5">Factura / Fecha</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Detalle Compra Web</th>
                <th className="py-3 px-4 text-right">Total / Saldo</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 pr-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 px-6 text-center text-slate-400">
                    Cargando facturas de Compra en sitio web...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-6 text-center text-slate-400">
                    No se encontraron facturas del rubro <strong>COMPRA EN SITIO WEB</strong> con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const stats = getInvoiceStats(inv);
                  const itemsList = inv.invoice_items || inv.items || [];
                  const firstDesc = itemsList
                    .map(it => it.tracking_number || it.service_name)
                    .filter(Boolean)
                    .slice(0, 2)
                    .join(' · ');

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/90 transition-colors">
                      <td className="py-3 px-4 pl-5 whitespace-nowrap">
                        <Link
                          href={`/admin/facturacion/${inv.id}`}
                          className="font-mono font-bold text-brand-blue hover:underline"
                        >
                          {inv.invoice_number}
                        </Link>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {formatDisplayDate(inv.issue_date)}
                        </p>
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{inv.clients?.name || 'Cliente'}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[210px]">
                          {inv.clients?.email || 'Sin correo'}
                        </p>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase">
                          <ShoppingBag size={10} />
                          COMPRA EN SITIO WEB
                        </span>
                        {firstDesc && (
                          <p className="text-xs text-slate-500 mt-1 truncate max-w-[240px]">
                            {firstDesc}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">
                        <p className="font-black text-slate-900">
                          {formatCurrency(Number(inv.total || 0), 'USD')}
                        </p>
                        {stats.pending > 0 ? (
                          <p className="text-[11px] font-semibold text-amber-600">
                            Pendiente: {formatCurrency(stats.pending, 'USD')}
                          </p>
                        ) : (
                          <p className="text-[11px] font-semibold text-emerald-600">Liquidada</p>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                            stats.displayStatus
                          )}`}
                        >
                          {stats.displayStatus}
                        </span>
                      </td>

                      <td className="py-3 px-4 pr-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/facturacion/${inv.id}`}
                            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 inline-flex items-center gap-1 text-xs font-semibold"
                            title="Ver comprobante"
                          >
                            <Eye size={13} />
                            <span className="hidden xl:inline">Ver</span>
                          </Link>

                          {stats.pending > 0 && inv.client_id && (
                            <Link
                              href={`/admin/cuentas-por-cobrar/recibir/${inv.client_id}`}
                              className="h-8 px-2.5 rounded-lg bg-brand-blue hover:bg-[#0e354b] text-white inline-flex items-center gap-1 text-xs font-semibold"
                              title="Registrar pago"
                            >
                              <CreditCard size={13} />
                              <span className="hidden xl:inline">Pago</span>
                            </Link>
                          )}

                          <Link
                            href={`/admin/facturacion/${inv.id}/editar`}
                            className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 inline-flex items-center justify-center"
                            title="Editar factura"
                          >
                            <Pencil size={13} />
                          </Link>

                          <button
                            type="button"
                            onClick={() => openEmailModal(inv)}
                            className={`h-8 w-8 rounded-lg border inline-flex items-center justify-center cursor-pointer ${
                              inv.email_sent_at
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                            title={inv.email_sent_at ? 'Reenviar comprobante por correo' : 'Enviar por correo'}
                          >
                            {inv.email_sent_at ? <MailCheck size={13} /> : <Mail size={13} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteInvoice(inv)}
                            className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-600 inline-flex items-center justify-center cursor-pointer"
                            title="Eliminar factura"
                          >
                            <Trash2 size={13} />
                          </button>
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

      {/* Modal de envío de correo */}
      {emailModalOpen && emailInvoice && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4"
          onClick={() => setEmailModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/60">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Mail size={16} className="text-brand-blue" />
                Enviar Comprobante #{emailInvoice.invoice_number}
              </h3>
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                  Para
                </label>
                <p className="h-9 px-3 flex items-center bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-700 font-medium">
                  {emailInvoice.clients?.email}
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                  CC (Opcional)
                </label>
                <input
                  type="email"
                  value={emailCc}
                  onChange={e => setEmailCc(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-blue"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                  Asunto
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-blue"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                  Mensaje
                </label>
                <textarea
                  rows={4}
                  value={emailMessage}
                  onChange={e => setEmailMessage(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 resize-none focus:outline-none focus:border-brand-blue"
                />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/60 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="h-9 px-4 rounded-lg font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmSendEmail}
                disabled={isSendingEmail}
                className="h-9 px-5 rounded-lg font-semibold bg-brand-blue hover:bg-[#0e354b] text-white text-xs disabled:opacity-50 cursor-pointer"
              >
                {isSendingEmail ? 'Enviando...' : 'Enviar Comprobante'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
