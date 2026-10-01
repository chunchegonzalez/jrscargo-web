'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { 
  DollarSign, CheckCircle2, Clock, FileText, Printer, 
  Copy, Check, ShieldCheck, AlertCircle, 
  ChevronDown, ChevronUp, Phone, Mail, Package, MessageCircle,
  HelpCircle, Building2, X, Send, Smartphone, Banknote, Calendar
} from 'lucide-react';
import { formatDisplayDate } from '@/lib/billing';

function getItemUnit(serviceName?: string, weight?: string | number): string {
  const wStr = String(weight || '').toLowerCase();
  if (wStr.includes('kg') || wStr.includes('kilo')) return 'kg';
  if (wStr.includes('ft') || wStr.includes('pie')) return 'ft³';
  if (wStr.includes('und') || wStr.includes('unidad')) return 'und';
  if (wStr.includes('lb')) return 'lb';

  const sUpper = String(serviceName || '').toUpperCase();
  if (sUpper.includes('COMPRA') || sUpper.includes('SITIO WEB')) return 'und';
  if (sUpper.includes('MARITIMO') || sUpper.includes('MARÍTIMO') || sUpper.includes('FT3') || sUpper.includes('PIE') || sUpper.includes('CUBIC')) return 'ft³';
  if (sUpper.includes('MAYORISTA AEREO') || sUpper.includes('MAYORISTA AÉREO') || sUpper.includes('MADRID') || sUpper.includes('KILO') || sUpper.includes('KG')) return 'kg';
  return 'lb';
}

function formatWeightWithUnit(weight?: string | number, serviceName?: string): string {
  if (weight === undefined || weight === null || weight === '') return '—';
  const wStr = String(weight).trim();
  if (!wStr || wStr === '0') return '—';
  if (/[a-zA-Z³]/.test(wStr)) {
    return wStr;
  }
  const unit = getItemUnit(serviceName, weight);
  return `${wStr} ${unit}`;
}

function getMonthKey(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatMonthName(monthKey: string): string {
  if (!monthKey || monthKey === 'all') return 'Histórico Total';
  const parts = monthKey.split('-');
  if (parts.length < 2) return monthKey;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = new Date(y, m, 1);
  const monthName = d.toLocaleDateString('es-CR', { month: 'long' });
  return monthName.charAt(0).toUpperCase() + monthName.slice(1) + ` ${y}`;
}

function formatMonthShort(monthKey: string): string {
  if (!monthKey || monthKey === 'all') return 'Total';
  const parts = monthKey.split('-');
  if (parts.length < 2) return '';
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = new Date(y, m, 1);
  const monthName = d.toLocaleDateString('es-CR', { month: 'short' });
  return monthName.charAt(0).toUpperCase() + monthName.slice(1);
}

interface InvoiceItem {
  invoice_id: string;
  service_name: string;
  tracking_number?: string;
  weight?: string | number;
  rate?: string | number;
  amount: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date?: string;
  total: number;
  paid: number;
  pending: number;
  status: 'Pendiente' | 'Parcial' | 'Pagada' | 'Anulada';
  notes?: string;
  items: InvoiceItem[];
}

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
  invoice_payments?: Array<{
    invoice_id: string;
    amount_applied: number;
    invoices?: {
      invoice_number: string;
    };
  }>;
}

interface PendingPackage {
  id: string;
  tracking_number?: string;
  service_name: string;
  weight?: number | string;
  unit?: string;
  amount?: number;
  invoice_number?: string;
  invoice_id?: string;
  status: string;
}

interface StatementData {
  client: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  stats: {
    totalBalanceUSD: number;
    totalBalanceCRC: number;
    pendingInvoicesCount: number;
    pendingPackagesCount: number;
    pendingPackagesWeight: number;
    totalInvoicedUSD: number;
    totalPaidUSD: number;
    exchangeRate: number;
  };
  pendingPackages?: PendingPackage[];
  invoices: Invoice[];
  payments: Payment[];
}

export default function PublicEstadoCuentaPage() {
  const params = useParams();
  const clientId = params?.id as string;

  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pendientes' | 'paquetes' | 'todas' | 'pagos'>('pendientes');
  const [copiedSinpe, setCopiedSinpe] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [expandedInvoices, setExpandedInvoices] = useState<Record<string, boolean>>({});

  // Selected month for Quick Summary (defaults to current month: YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // States for Reenviar Comprobante modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailInvoice, setEmailInvoice] = useState<Invoice | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Extract all available months from invoices & payments
  const availableMonths = React.useMemo(() => {
    const set = new Set<string>();
    const nowKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    set.add(nowKey);

    (data?.invoices || []).forEach(inv => {
      const k = getMonthKey(inv.issue_date);
      if (k) set.add(k);
    });
    (data?.payments || []).forEach(p => {
      const k = getMonthKey(p.payment_date);
      if (k) set.add(k);
    });

    return Array.from(set).sort().reverse();
  }, [data?.invoices, data?.payments]);

  // Compute invoiced and paid for the selected month
  const { monthInvoiced, monthPaid, monthLabel } = React.useMemo(() => {
    if (!data) return { monthInvoiced: 0, monthPaid: 0, monthLabel: '' };

    if (selectedMonth === 'all') {
      return {
        monthInvoiced: data.stats.totalInvoicedUSD,
        monthPaid: data.stats.totalPaidUSD,
        monthLabel: 'Total'
      };
    }

    const invoiced = (data.invoices || [])
      .filter(inv => inv.status !== 'Anulada' && getMonthKey(inv.issue_date) === selectedMonth)
      .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

    const paid = (data.payments || [])
      .filter(p => getMonthKey(p.payment_date) === selectedMonth)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const label = formatMonthShort(selectedMonth);

    return {
      monthInvoiced: Math.round(invoiced * 100) / 100,
      monthPaid: Math.round(paid * 100) / 100,
      monthLabel: label ? `(${label})` : ''
    };
  }, [data, selectedMonth]);

  const loadStatement = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/estado-cuenta/${encodeURIComponent(clientId)}`, {
        cache: 'no-store'
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo cargar el estado de cuenta');
      }
      setData(json);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error al consultar la cuenta');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadStatement();
  }, [loadStatement]);

  const copySinpeNumber = () => {
    navigator.clipboard.writeText('72601238');
    setCopiedSinpe(true);
    setTimeout(() => setCopiedSinpe(false), 2500);
  };

  const copyShareLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const toggleInvoiceExpand = (invId: string) => {
    setExpandedInvoices(prev => ({
      ...prev,
      [invId]: !prev[invId]
    }));
  };

  const handleOpenSendModal = (inv: Invoice) => {
    setEmailInvoice(inv);
    setRecipientEmail(data?.client?.email || '');
    setEmailSuccess(false);
    setSendError(null);
    setEmailModalOpen(true);
  };

  const handleSendInvoiceEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInvoice || !recipientEmail) return;

    try {
      setIsSending(true);
      setSendError(null);

      const res = await fetch(`/api/invoices/${emailInvoice.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'No se pudo enviar el comprobante');
      }

      setEmailSuccess(true);
      setTimeout(() => {
        setEmailModalOpen(false);
        setEmailSuccess(false);
      }, 3500);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Error al enviar correo');
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin mb-4" />
        <p className="text-gray-600 font-bold text-sm">Cargando tu estado de cuenta...</p>
        <p className="text-gray-400 text-xs mt-1">JRS CARGO Costa Rica</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-gray-800 mb-2">Estado de cuenta no disponible</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            {error || 'El enlace consultado no es válido o ha expirado. Por favor contáctanos para asistirte.'}
          </p>
          <a
            href="https://wa.me/50672601238"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full py-3 inline-flex items-center justify-center gap-2"
          >
            <MessageCircle size={18} /> Contactar a Soporte JRS
          </a>
        </div>
      </div>
    );
  }

  const { client, stats, invoices, payments } = data;
  const pendingInvoices = invoices.filter(inv => inv.pending > 0.01);
  const whatsappPaymentMsg = `Hola JRS Cargo, adjunto comprobante de pago para la cuenta de *${client.name}* (Saldo pendiente: $${stats.totalBalanceUSD.toFixed(2)} USD / ₡${stats.totalBalanceCRC.toLocaleString('es-CR')}).`;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 print:bg-white print:p-0 print:pb-0">
      
      {/* Top Banner (Hidden in print) */}
      <div className="bg-[#0A2636] text-white border-b border-white/10 print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-white/80 text-center sm:text-left">
            <ShieldCheck size={16} className="text-green-400 shrink-0" />
            <span>Portal Seguro de Consulta de Saldos • JRS CARGO S.A.</span>
          </div>
          <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center gap-2">
            <button
              onClick={copyShareLink}
              className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-medium text-white"
            >
              {copiedLink ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              <span>{copiedLink ? '¡Copiado!' : 'Copiar enlace'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1 bg-brand-yellow hover:bg-amber-400 text-brand-blue font-bold rounded-lg transition-colors"
            >
              <Printer size={14} />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-4 sm:pt-8 print:p-0 print:max-w-none">
        
        {/* Document Header */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-gray-100 shadow-sm mb-4 sm:mb-6 print:border-none print:shadow-none print:p-0 print:mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 border-b border-gray-100 pb-5 sm:pb-6 mb-5 sm:mb-6">
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
              <div className="w-14 h-14 sm:w-20 sm:h-20 bg-brand-bg-light rounded-2xl p-2 border border-gray-100 flex items-center justify-center shrink-0">
                <Image
                  src="/logo.png"
                  alt="JRS CARGO"
                  width={140}
                  height={60}
                  className="object-contain w-auto h-auto max-h-10 sm:max-h-12"
                  priority
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-brand-blue bg-brand-blue/5 px-2.5 py-0.5 rounded-full inline-block mb-1">
                  Estado de Cuenta Oficial
                </span>
                <h1 className="text-xl sm:text-3xl font-black text-brand-blue break-words">
                  {client.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500 mt-1">
                  {client.email && (
                    <span className="flex items-center gap-1 truncate max-w-full">
                      <Mail size={13} className="text-gray-400 shrink-0" /> <span className="truncate">{client.email}</span>
                    </span>
                  )}
                  {client.phone && (
                    <span className="flex items-center gap-1">
                      <Phone size={13} className="text-gray-400 shrink-0" /> {client.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase">Fecha de emisión</p>
                <p className="text-xs sm:text-sm font-bold text-gray-800">
                  {new Date().toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <p className="text-xs text-gray-400 sm:mt-1">
                T.C.: <span className="font-bold text-gray-700">₡{stats.exchangeRate}</span> / $1
              </p>
            </div>
          </div>

          {/* Balance & Packages Spotlight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
            
            {/* Card Saldo Pendiente: Hero Card */}
            <div className="md:col-span-12 lg:col-span-5 bg-gradient-to-br from-brand-blue to-[#0A2636] text-white p-5 sm:p-6 rounded-2xl relative overflow-hidden shadow-md flex flex-col justify-between">
              <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-blue-light flex items-center gap-1.5">
                    <DollarSign size={16} /> Saldo Total Pendiente
                  </span>
                  {stats.totalBalanceUSD > 0.01 ? (
                    <span className="text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock size={12} /> {stats.pendingInvoicesCount} {stats.pendingInvoicesCount === 1 ? 'pend.' : 'pendientes'}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold bg-green-500/20 text-green-300 border border-green-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={12} /> ¡Al día!
                    </span>
                  )}
                </div>

                <div className="my-2">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
                      ${stats.totalBalanceUSD.toFixed(2)}
                    </span>
                    <span className="text-lg sm:text-xl font-bold text-brand-blue-light">USD</span>
                  </div>
                  <div className="text-base sm:text-lg lg:text-xl font-black text-brand-yellow mt-1">
                    ≈ ₡{stats.totalBalanceCRC.toLocaleString('es-CR')} <span className="text-xs font-semibold text-white/70">CRC</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-white/80">
                  <span>Estado de cuenta:</span>
                  <span className="font-bold text-amber-300">
                    {stats.totalBalanceUSD > 0.01 ? 'Pendiente de pago' : 'Al día / Cancelado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card Paquetes por Retirar: Prominent Package Counter */}
            {/* Card Paquetes por Retirar: Prominent Package Counter */}
            <div className={`md:col-span-6 lg:col-span-4 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border transition-all flex flex-col justify-between relative overflow-hidden ${
              stats.pendingPackagesCount > 0
                ? 'bg-gradient-to-br from-white via-amber-50/20 to-amber-50/40 border-amber-200/90 shadow-xs'
                : 'bg-gradient-to-br from-white via-slate-50/40 to-slate-100/30 border-slate-200/80 shadow-xs'
            }`}>
              <div className="relative z-10">
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      stats.pendingPackagesCount > 0
                        ? 'bg-amber-100 text-amber-800 border-amber-200/80'
                        : 'bg-blue-50 text-brand-blue border-blue-100/70'
                    }`}>
                      <Package size={17} />
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600">
                      Paquetes por Retirar
                    </span>
                  </div>

                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 border shrink-0 ${
                    stats.pendingPackagesCount > 0
                      ? 'bg-amber-100 text-amber-900 border-amber-300/80'
                      : 'bg-slate-100 text-slate-700 border-slate-200/80'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      stats.pendingPackagesCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                    }`} />
                    {stats.pendingPackagesCount > 0 ? 'Bodega CR' : 'Al día'}
                  </span>
                </div>

                {/* Counter & Status */}
                <div className="my-2.5">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={`text-4xl sm:text-5xl font-black tracking-tight ${
                      stats.pendingPackagesCount > 0 ? 'text-amber-950' : 'text-slate-800'
                    }`}>
                      {stats.pendingPackagesCount}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wide">
                      {stats.pendingPackagesCount === 1 ? 'paquete disponible' : stats.pendingPackagesCount === 0 ? 'paquetes pendientes' : 'paquetes disponibles'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed font-normal">
                    {stats.pendingPackagesCount > 0 
                      ? 'Disponibles para entrega inmediata en bodega una vez cancelado tu saldo.' 
                      : 'No tienes paquetes pendientes de entrega en este momento.'}
                  </p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3.5 mt-2 border-t border-slate-100/90 flex items-center justify-between text-xs relative z-10">
                {stats.pendingPackagesCount > 0 ? (
                  stats.pendingPackagesWeight > 0 ? (
                    <span className="text-slate-500 text-[11px]">
                      Peso reg.: <strong className="text-slate-800 font-bold">{stats.pendingPackagesWeight} lbs</strong>
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11px]">Listo en recepción</span>
                  )
                ) : (
                  <span className="text-[11px] text-emerald-700 font-bold inline-flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/80">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    Inventario al día
                  </span>
                )}

                {stats.pendingPackagesCount > 0 ? (
                  <button
                    onClick={() => setActiveTab('paquetes')}
                    className="text-xs font-black text-brand-blue hover:text-[#0c2f42] inline-flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <span>Ver detalle</span> &rarr;
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium">
                    Bodega Central JRS
                  </span>
                )}
              </div>
            </div>

            {/* Quick Summary Numbers (Mensual) */}
            <div className="md:col-span-6 lg:col-span-3 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-2.5">
              {/* Header con selector de mes */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Calendar size={13} className="text-brand-blue shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                    Resumen del Mes
                  </span>
                </div>

                <div className="relative shrink-0">
                  <select
                    value={selectedMonth}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedMonth(e.target.value)}
                    aria-label="Seleccionar mes para el resumen de comprobantes y pagos"
                    className="text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/70 border border-slate-200/80 rounded-lg pl-2 pr-5 py-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-blue appearance-none transition-colors"
                  >
                    {availableMonths.map((m: string) => (
                      <option key={m} value={m}>
                        {formatMonthName(m)}
                      </option>
                    ))}
                    <option value="all">Histórico Total</option>
                  </select>
                  <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Emitido en el mes */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex-1 flex flex-col justify-center">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 truncate">
                  Emitido {monthLabel}
                </p>
                <div className="flex items-baseline justify-between">
                  <p className="text-lg sm:text-xl font-black text-slate-800">${monthInvoiced.toFixed(2)}</p>
                  <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200/60">USD</span>
                </div>
              </div>

              {/* Pagos en el mes */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/70 flex-1 flex flex-col justify-center">
                <p className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-0.5 truncate">
                  Pagos {monthLabel}
                </p>
                <div className="flex items-baseline justify-between">
                  <p className="text-lg sm:text-xl font-black text-emerald-700">${monthPaid.toFixed(2)}</p>
                  <span className="text-[10px] font-bold text-emerald-700/80 bg-white px-1.5 py-0.5 rounded border border-emerald-200/60">USD</span>
                </div>
              </div>
            </div>

          </div>

          {/* Payment Instructions Box: Multiple Payment Options */}
          {stats.totalBalanceUSD > 0.01 && (
            <div className="mt-4 sm:mt-6 p-5 sm:p-7 bg-amber-50/70 border border-amber-200/80 rounded-2xl print:border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-amber-200/60">
                <div>
                  <h2 className="text-base font-black text-amber-950 flex items-center gap-2">
                    <Building2 size={20} className="text-amber-700 shrink-0" />
                    Formas de Pago Disponibles
                  </h2>
                  <p className="text-xs text-amber-800/90 mt-0.5">
                    Puedes cancelar tu saldo pendiente mediante cualquiera de nuestros 3 canales autorizados:
                  </p>
                </div>
                <div className="shrink-0 print:hidden">
                  <a
                    href={`https://wa.me/50672601238?text=${encodeURIComponent(whatsappPaymentMsg)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20b858] text-white px-4 py-2.5 rounded-xl font-black text-xs shadow-md shadow-green-500/20 active:scale-95 transition-all text-center"
                  >
                    <MessageCircle size={16} />
                    <span>Reportar Comprobante</span>
                  </a>
                </div>
              </div>

              {/* 3 Columns: SINPE Móvil, Transferencia, Efectivo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                
                {/* 1. SINPE Móvil */}
                <div className="bg-white p-4 rounded-xl border border-amber-200/70 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                        <Smartphone size={16} className="text-brand-blue" />
                        SINPE Móvil
                      </span>
                      <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                        Inmediato
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs mb-3">
                      Transferencia inmediata desde tu app bancaria a nuestro número oficial:
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">NÚMERO SINPE</span>
                        <span className="font-mono font-black text-brand-blue text-sm">7260-1238</span>
                        <span className="text-[10px] text-slate-500 block">JRS Cargo S.A.</span>
                      </div>
                      <button
                        onClick={copySinpeNumber}
                        className="px-2.5 py-1.5 bg-brand-blue hover:bg-[#0c2f42] text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                        title="Copiar número de SINPE Móvil"
                      >
                        {copiedSinpe ? <Check size={12} className="text-green-300" /> : <Copy size={12} />}
                        <span>{copiedSinpe ? '¡Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-amber-800/80 mt-2 italic">
                      * Por favor incluir tu nombre en el detalle del comprobante.
                    </p>
                  </div>
                </div>

                {/* 2. Transferencia Bancaria */}
                <div className="bg-white p-4 rounded-xl border border-amber-200/70 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                        <Building2 size={16} className="text-brand-blue" />
                        Transferencia
                      </span>
                      <span className="text-[10px] font-bold bg-blue-50 text-brand-blue px-2 py-0.5 rounded-full">
                        Colones / USD
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs mb-2">
                      Transferencias directas a cuentas bancarias de <strong>JRS Cargo S.A.</strong>
                    </p>
                    <div className="space-y-1 text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <p className="font-bold text-slate-800">• BAC Credomatic</p>
                      <p className="font-bold text-slate-800">• Banco de Costa Rica (BCR)</p>
                      <p className="text-slate-500 text-[10px]">Cuentas disponibles en colones y dólares.</p>
                    </div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-100">
                    <a
                      href={`https://wa.me/50672601238?text=${encodeURIComponent('Hola JRS Cargo, me gustaría solicitar las cuentas IBAN para realizar una transferencia bancaria.')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-colors"
                    >
                      <MessageCircle size={12} className="text-green-600" />
                      <span>Solicitar cuentas IBAN</span>
                    </a>
                  </div>
                </div>

                {/* 3. Efectivo en Bodega */}
                <div className="bg-white p-4 rounded-xl border border-amber-200/70 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                        <Banknote size={16} className="text-brand-blue" />
                        Efectivo
                      </span>
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                        En Bodega
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs mb-2">
                      Puedes cancelar en <strong>efectivo</strong> al momento de retirar tus paquetes en bodega o sucursal.
                    </p>
                    <div className="space-y-1 text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <p className="font-semibold text-slate-800">• Pago presencial en mostrador</p>
                      <p className="font-semibold text-slate-800">• En colones o dólares exactos</p>
                      <p className="text-slate-500 text-[10px]">Entrega inmediata contra pago.</p>
                    </div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Ubicación:</span>
                    <span className="font-bold text-slate-700">Bodega San Pablo, Heredia</span>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Invoices and Payments Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm print:border-none print:shadow-none print:p-0">
          
          {/* Tabs (Hidden in print) */}
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-6 overflow-x-auto print:hidden">
            <button
              onClick={() => setActiveTab('pendientes')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'pendientes'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
              }`}
            >
              <Clock size={16} />
              <span>Comprobantes Pendientes ({pendingInvoices.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('paquetes')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'paquetes'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
              }`}
            >
              <Package size={16} />
              <span>Paquetes por Retirar ({stats.pendingPackagesCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('todas')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'todas'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
              }`}
            >
              <FileText size={16} />
              <span>Todos los Comprobantes ({invoices.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('pagos')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'pagos'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
              }`}
            >
              <CheckCircle2 size={16} />
              <span>Historial de Pagos ({payments.length})</span>
            </button>
          </div>

          {/* ================= PENDIENTES O TODAS ================= */}
          {(activeTab === 'pendientes' || activeTab === 'todas') && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-800">
                  {activeTab === 'pendientes' ? 'Comprobantes Pendientes de Pago' : 'Historial Completo de Comprobantes'}
                </h2>
                <span className="text-xs text-gray-400">
                  Total mostrados: {activeTab === 'pendientes' ? pendingInvoices.length : invoices.length}
                </span>
              </div>

              {(activeTab === 'pendientes' ? pendingInvoices : invoices).length === 0 ? (
                <div className="p-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <CheckCircle2 size={40} className="text-green-500 mx-auto mb-2" />
                  <p className="font-bold text-gray-700">No hay comprobantes en esta sección</p>
                  <p className="text-xs text-gray-400 mt-1">Tu cuenta se encuentra al día.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(activeTab === 'pendientes' ? pendingInvoices : invoices).map((inv) => {
                    const isExpanded = !!expandedInvoices[inv.id];
                    const hasItems = inv.items && inv.items.length > 0;

                    return (
                      <div
                        key={inv.id}
                        className={`rounded-2xl border transition-all ${
                          inv.pending > 0.01 
                            ? 'bg-white border-amber-200/80 shadow-sm' 
                            : 'bg-slate-50/60 border-gray-100 text-gray-600'
                        }`}
                      >
                        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              inv.pending > 0.01 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              <FileText size={20} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-black text-gray-900 text-base">
                                  Comprobante #{inv.invoice_number}
                                </h3>
                                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                  inv.status === 'Pagada'
                                    ? 'bg-green-100 text-green-700'
                                    : inv.status === 'Parcial'
                                    ? 'bg-blue-100 text-blue-700'
                                    : inv.status === 'Anulada'
                                    ? 'bg-gray-100 text-gray-400 line-through'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {inv.status}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Emisión: <span className="font-semibold text-gray-600">{formatDisplayDate(inv.issue_date)}</span>
                                {inv.due_date && (
                                  <> • Vence: <span className="font-semibold text-gray-600">{formatDisplayDate(inv.due_date)}</span></>
                                )}
                              </p>
                              {inv.notes && (
                                <p className="text-xs text-gray-500 italic mt-1 bg-gray-50 px-2 py-1 rounded inline-block">
                                  {inv.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 flex-wrap">
                            <div className="text-left md:text-right">
                              <p className="text-[11px] text-gray-400 font-bold uppercase">Saldo a Pagar</p>
                              <p className="text-lg font-black text-brand-blue">
                                ${inv.pending.toFixed(2)} <span className="text-xs font-normal text-gray-400">USD</span>
                              </p>
                              {inv.paid > 0 && (
                                <p className="text-[11px] text-green-600 font-semibold">
                                  Abonado: ${inv.paid.toFixed(2)}
                                </p>
                              )}
                            </div>

                            {/* Actions: Reenviar Comprobante, PDF y Expandir */}
                            <div className="flex items-center gap-2 print:hidden">
                              <button
                                onClick={() => handleOpenSendModal(inv)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-brand-blue hover:bg-brand-blue hover:text-white border border-blue-200/90 transition-all shadow-2xs hover:shadow active:scale-95"
                                title="Reenviar comprobante por correo electrónico"
                              >
                                <Mail size={14} className="shrink-0" />
                                <span className="hidden sm:inline">Reenviar Comprobante</span>
                                <span className="sm:hidden">Reenviar</span>
                              </button>

                              <a
                                href={`/api/invoices/${inv.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all"
                                title="Descargar comprobante oficial en PDF"
                              >
                                <FileText size={14} className="shrink-0" />
                                <span className="hidden sm:inline">PDF</span>
                              </a>

                              {hasItems && (
                                <button
                                  onClick={() => toggleInvoiceExpand(inv.id)}
                                  className="p-2 text-gray-400 hover:text-brand-blue hover:bg-gray-100 rounded-xl transition-colors"
                                  title="Ver detalles de paquetes"
                                >
                                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Invoice Items details (Expandable) */}
                        {hasItems && (isExpanded || typeof window === 'undefined') && (
                          <div className="bg-slate-50/80 p-3 sm:p-4 border-t border-gray-100 rounded-b-2xl">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Package size={14} className="text-brand-blue" />
                              Paquetes y servicios incluidos:
                            </p>

                            {/* Mobile Items List */}
                            <div className="sm:hidden divide-y divide-gray-100 space-y-2">
                              {inv.items.map((it, idx) => (
                                <div key={idx} className="pt-2 first:pt-0 flex items-start justify-between gap-2 text-xs">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-gray-800 truncate">{it.service_name}</p>
                                    {it.tracking_number ? (
                                      <span className="text-[11px] font-mono text-slate-800 font-bold block mt-0.5 select-all truncate">
                                        {it.tracking_number}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-gray-400">Sin guía</span>
                                    )}
                                    {it.weight && (
                                      <span className="text-[11px] text-gray-500 font-medium">
                                        ({formatWeightWithUnit(it.weight, it.service_name)})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="font-black text-gray-900">${Number(it.amount || 0).toFixed(2)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Desktop Items Table */}
                            <div className="hidden sm:block overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-400 border-b border-gray-200/60 text-left">
                                    <th className="py-1.5 font-bold">Servicio</th>
                                    <th className="py-1.5 font-bold">Tracking / Guía</th>
                                    <th className="py-1.5 font-bold text-right">Peso / Medida</th>
                                    <th className="py-1.5 font-bold text-right">Monto</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {inv.items.map((it, idx) => (
                                    <tr key={idx} className="text-gray-700">
                                      <td className="py-1.5 font-medium">{it.service_name}</td>
                                      <td className="py-1.5 font-mono text-slate-800 font-bold select-all">
                                        {it.tracking_number || '—'}
                                      </td>
                                      <td className="py-1.5 text-right font-medium">
                                        {it.weight ? formatWeightWithUnit(it.weight, it.service_name) : '—'}
                                      </td>
                                      <td className="py-1.5 text-right font-black">${Number(it.amount || 0).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= PAQUETES POR RETIRAR ================= */}
          {activeTab === 'paquetes' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <Package size={18} className="text-brand-blue" />
                    Paquetes Pendientes de Retiro y Entrega
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Detalle de los paquetes que se encuentran en bodega o asociados a tus comprobantes pendientes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-brand-blue rounded-full border border-blue-200/80">
                    {stats.pendingPackagesCount} {stats.pendingPackagesCount === 1 ? 'paquete' : 'paquetes'}
                  </span>
                  {stats.pendingPackagesWeight > 0 && (
                    <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                      {stats.pendingPackagesWeight} lbs
                    </span>
                  )}
                </div>
              </div>

              {(!data.pendingPackages || data.pendingPackages.length === 0) ? (
                <div className="p-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <CheckCircle2 size={40} className="text-green-500 mx-auto mb-2" />
                  <p className="font-bold text-gray-700">No tienes paquetes pendientes por retirar</p>
                  <p className="text-xs text-gray-400 mt-1">Todos tus paquetes han sido retirados o entregados satisfactoriamente.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.pendingPackages.map((pkg, idx) => (
                    <div
                      key={pkg.id || idx}
                      className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center shrink-0 border border-blue-100 mt-0.5">
                          <Package size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-gray-900 text-sm sm:text-base">
                              {pkg.service_name}
                            </h3>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              {pkg.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5 flex-wrap">
                            {pkg.tracking_number ? (
                              <span className="flex items-center gap-1.5">
                                <span className="text-gray-400 font-medium">Tracking:</span>
                                <span className="font-mono font-bold text-slate-800 select-all tracking-wide">
                                  {pkg.tracking_number}
                                </span>
                              </span>
                            ) : (
                              <span className="text-gray-400">Sin tracking registrado</span>
                            )}

                            {pkg.weight && (
                              <span>• Peso / Medida: <strong className="text-gray-700">{formatWeightWithUnit(pkg.weight, pkg.service_name)}</strong></span>
                            )}

                            {pkg.invoice_number && (
                              <span>• Comprobante: <strong className="text-brand-blue">#{pkg.invoice_number}</strong></span>
                            )}
                          </div>
                        </div>
                      </div>

                      {pkg.amount !== undefined && pkg.amount > 0 && (
                        <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <span className="text-[10px] font-bold uppercase text-gray-400 block">Monto</span>
                          <span className="text-sm sm:text-base font-black text-brand-blue">${Number(pkg.amount).toFixed(2)} USD</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= PAGOS ================= */}
          {activeTab === 'pagos' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-800">Historial de Pagos y Abonos Registrados</h2>
                <span className="text-xs text-gray-400">Total recibidos: {payments.length}</span>
              </div>

              {payments.length === 0 ? (
                <div className="p-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <HelpCircle size={40} className="text-gray-400 mx-auto mb-2" />
                  <p className="font-bold text-gray-700">Aún no hay pagos registrados</p>
                  <p className="text-xs text-gray-400 mt-1">Tus abonos y transferencias se reflejarán aquí una vez verificados.</p>
                </div>
              ) : (
                <>
                  {/* Vista móvil de pagos */}
                  <div className="sm:hidden divide-y divide-gray-100">
                    {payments.map(p => (
                      <div key={p.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-800">{formatDisplayDate(p.payment_date)}</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-bold text-[10px] rounded">
                              {p.payment_method || 'Pago'}
                            </span>
                          </div>
                          {p.reference_number && (
                            <p className="text-[11px] text-gray-500 font-mono mt-0.5">Ref: {p.reference_number}</p>
                          )}
                          {Array.isArray(p.invoice_payments) && p.invoice_payments.length > 0 && (
                            <div className="text-[11px] text-brand-blue font-semibold mt-1 flex flex-wrap gap-1">
                              {p.invoice_payments.map(ip => (
                                <span key={ip.invoice_id} className="bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                                  #{ip.invoices?.invoice_number || 'Comprobante'} (${Number(ip.amount_applied).toFixed(2)})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-black text-green-600 text-sm">
                            +${Number(p.amount || 0).toFixed(2)}
                          </span>
                          <span className="block text-[10px] text-gray-400">USD</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Vista escritorio de pagos */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          <th className="p-3 font-bold">Fecha</th>
                          <th className="p-3 font-bold">Método</th>
                          <th className="p-3 font-bold">Referencia</th>
                          <th className="p-3 font-bold">Comprobantes Aplicados</th>
                          <th className="p-3 font-bold text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {payments.map(p => (
                          <tr key={p.id} className="hover:bg-gray-50/50">
                            <td className="p-3 font-semibold text-gray-700">{formatDisplayDate(p.payment_date)}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-bold rounded-md">
                                {p.payment_method || '—'}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-gray-600">
                              {p.reference_number || '—'}
                            </td>
                            <td className="p-3 text-gray-700">
                              {Array.isArray(p.invoice_payments) && p.invoice_payments.length > 0 ? (
                                p.invoice_payments.map((ip) => (
                                  <div key={ip.invoice_id} className="font-semibold text-brand-blue">
                                    #{ip.invoices?.invoice_number || 'Comprobante'}{' '}
                                    <span className="text-[11px] font-normal text-gray-400">
                                      (${Number(ip.amount_applied).toFixed(2)})
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="p-3 text-right font-black text-green-600 text-sm">
                              +${Number(p.amount || 0).toFixed(2)} USD
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

        </div>

        {/* Footer info (Official disclaimer) */}
        <div className="mt-8 text-center text-xs text-gray-400 space-y-1">
          <p className="font-bold text-gray-500">JRS CARGO S.A.</p>
          <p>San Pablo de Heredia, Costa Rica • WhatsApp Soporte: +506 7260-1238 • info@jrscargocr.com</p>
          <p className="text-[11px] text-gray-400 pt-2">
            Este enlace es único y seguro para tu cuenta. No compartas información confidencial con terceros.
          </p>
        </div>

      </div>

      {/* Modal para Reenviar Comprobante */}
      {emailModalOpen && emailInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative animate-fade-in">
            <button
              onClick={() => {
                if (!isSending) {
                  setEmailModalOpen(false);
                  setEmailSuccess(false);
                  setSendError(null);
                }
              }}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              title="Cerrar ventana"
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-brand-blue flex items-center justify-center shrink-0 border border-blue-100">
                <Mail size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-black text-slate-900 truncate">
                  Reenviar Comprobante
                </h3>
                <p className="text-xs text-slate-500">
                  Comprobante #{emailInvoice.invoice_number} • ${emailInvoice.total.toFixed(2)} USD
                </p>
              </div>
            </div>

            {emailSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="text-base font-black text-slate-900">
                  ¡Comprobante enviado con éxito!
                </h4>
                <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                  Hemos enviado el comprobante oficial en formato PDF a: <br />
                  <strong className="text-brand-blue font-bold break-all">{recipientEmail}</strong>
                </p>
                <p className="text-[11px] text-slate-400">
                  Por favor revisa tu bandeja de entrada o carpeta de correo no deseado (spam).
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => { setEmailModalOpen(false); setEmailSuccess(false); }}
                    className="px-6 py-2.5 rounded-xl bg-brand-blue text-white font-bold text-xs hover:bg-[#0c2f42] transition-colors"
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendInvoiceEmail} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  ¿No recibiste tu comprobante o necesitas una copia? Te lo enviaremos de inmediato con el archivo PDF oficial adjunto.
                </p>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Número de comprobante:</span>
                    <strong className="text-slate-800 font-bold">#{emailInvoice.invoice_number}</strong>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Monto total:</span>
                    <strong className="text-brand-blue font-bold">${emailInvoice.total.toFixed(2)} USD</strong>
                  </div>
                  {emailInvoice.items && emailInvoice.items.length > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Paquetes incluidos:</span>
                      <strong className="text-slate-800 font-bold">{emailInvoice.items.length} {emailInvoice.items.length === 1 ? 'paquete' : 'paquetes'}</strong>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                    Enviar al correo electrónico:
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Puedes verificar o cambiar el correo si deseas recibirlo en otra dirección.
                  </p>
                </div>

                {sendError && (
                  <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center gap-2 border border-red-100">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{sendError}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEmailModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    disabled={isSending}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSending || !recipientEmail}
                    className="px-5 py-2.5 rounded-xl bg-brand-blue hover:bg-[#0c2f42] disabled:opacity-50 text-white font-black text-xs inline-flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    {isSending ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Enviando comprobante...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Enviar por Correo</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
