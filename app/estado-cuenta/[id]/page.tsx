'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import {
  CheckCircle2,
  Printer,
  Copy,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Package,
  MessageCircle,
  Building2,
  X,
  Send,
  Smartphone,
  Banknote,
  Calendar,
  Search,
  Download,
  MapPin
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
  if (
    sUpper.includes('MARITIMO') ||
    sUpper.includes('MARÍTIMO') ||
    sUpper.includes('FT3') ||
    sUpper.includes('PIE') ||
    sUpper.includes('CUBIC')
  )
    return 'ft³';
  if (
    sUpper.includes('MAYORISTA AEREO') ||
    sUpper.includes('MAYORISTA AÉREO') ||
    sUpper.includes('MADRID') ||
    sUpper.includes('TONY') ||
    sUpper.includes('KILO') ||
    sUpper.includes('KG')
  )
    return 'kg';
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

function formatUSD(amount?: number | string | null): string {
  const num = Number(amount || 0);
  if (isNaN(num)) return '$0.00';
  return (
    '$' +
    num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  );
}

function formatCRC(amount?: number | string | null): string {
  const num = Math.round(Number(amount || 0));
  if (isNaN(num)) return '₡0';
  return '₡' + num.toLocaleString('es-CR');
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
  return monthName.charAt(0).toUpperCase() + monthName.slice(1).replace('.', '');
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
    creditBalanceUSD?: number;
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

  // Welcome Splash Screen state (executes on every new entry to the portal)
  const [showSplash, setShowSplash] = useState(true);
  const [splashLogoReady, setSplashLogoReady] = useState(false);
  const [splashTextReady, setSplashTextReady] = useState(false);
  const [splashFadingOut, setSplashFadingOut] = useState(false);
  const [minSplashTimeElapsed, setMinSplashTimeElapsed] = useState(false);
  const [progressPercent, setProgressPercent] = useState(12);

  // Navigation & filter states
  const [activeTab, setActiveTab] = useState<'pendientes' | 'pagadas' | 'todas' | 'pagos' | 'paquetes'>('pendientes');
  const [historyMonthFilter, setHistoryMonthFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedSinpe, setCopiedSinpe] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [expandedInvoices, setExpandedInvoices] = useState<Record<string, boolean>>({});
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'sinpe' | 'transferencia' | 'efectivo'>('sinpe');

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

  // Choreographed Welcome Splash Screen sequence
  useEffect(() => {
    const frame1 = requestAnimationFrame(() => {
      setSplashLogoReady(true);
      setProgressPercent(42);
    });

    const textTimer = setTimeout(() => {
      setSplashTextReady(true);
      setProgressPercent(74);
    }, 180);

    const minTimer = setTimeout(() => {
      setMinSplashTimeElapsed(true);
    }, 1500);

    return () => {
      cancelAnimationFrame(frame1);
      clearTimeout(textTimer);
      clearTimeout(minTimer);
    };
  }, []);

  // Coordinate real loading completion with welcome screen fade-out
  useEffect(() => {
    if (!loading) {
      setProgressPercent(100);
    }
    if (!loading && minSplashTimeElapsed && showSplash && !splashFadingOut) {
      setSplashFadingOut(true);
      const hideTimer = setTimeout(() => {
        setShowSplash(false);
      }, 450);
      return () => clearTimeout(hideTimer);
    }
  }, [loading, minSplashTimeElapsed, showSplash, splashFadingOut]);

  // Close modal with Escape key for keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && emailModalOpen && !isSending) {
        setEmailModalOpen(false);
        setEmailSuccess(false);
        setSendError(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [emailModalOpen, isSending]);

  // Dynamic browser tab title: "JRS CARGO CR - <Nombre del Cliente>"
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (data?.client?.name) {
      document.title = `JRS CARGO CR - ${data.client.name}`;
    } else {
      document.title = 'JRS CARGO CR';
    }
  }, [data?.client?.name]);

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

  // ==================== 2. PANTALLA DE BIENVENIDA CON ANIMACIÓN DEL LOGO ====================
  const splashOverlay = showSplash ? (
    <div
      role="status"
      aria-live="polite"
      aria-label="Bienvenido a JRS Cargo, cargando estado de cuenta"
      className={`fixed inset-0 z-[100] bg-[#0B2737] flex flex-col items-center justify-center p-6 select-none print:hidden overflow-hidden transition-all duration-500 ease-out motion-reduce:transition-none ${
        splashFadingOut ? 'opacity-0 scale-[1.015] pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 42%, rgba(20, 68, 93, 0.65) 0%, rgba(11, 39, 55, 0.98) 65%, #071924 100%)'
      }}
    >
      {/* Halo ambiental sutil detrás del emblema */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-[#14445D]/35 blur-3xl transition-all duration-700 ease-out motion-reduce:transition-none ${
          splashLogoReady ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        {/* Tarjeta del Logo Oficial con revelación suave y destello de luz sutil */}
        <div
          className={`relative group transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:scale-100 motion-reduce:translate-y-0 ${
            splashLogoReady ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.94] translate-y-2.5'
          }`}
        >
          {/* Borde exterior translúcido de precisión */}
          <div className="p-1.5 rounded-[26px] bg-gradient-to-b from-white/15 to-white/5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] ring-1 ring-white/10">
            <div className="relative overflow-hidden bg-white rounded-[20px] px-9 py-7 sm:px-11 sm:py-8 flex items-center justify-center shadow-inner">
              {/* Efecto de barrido de luz sutil sobre la tarjeta */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-slate-100/70 to-transparent skew-x-[-20deg] transition-transform duration-1000 ease-out motion-reduce:hidden ${
                  splashTextReady ? 'translate-x-[200%]' : '-translate-x-full'
                }`}
              />
              <Image
                src="/logo.png"
                alt="JRS Cargo S.A."
                width={200}
                height={120}
                className="relative z-10 w-auto h-20 sm:h-24 object-contain"
                priority
              />
            </div>
          </div>
        </div>

        {/* Texto de bienvenida con entrada escalonada */}
        <div
          className={`mt-7 transition-all duration-500 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
            splashTextReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FFC44D] mb-2.5">
            Portal Oficial de Clientes
          </span>
          <h1 className="text-white text-lg sm:text-xl font-bold tracking-tight">
            Bienvenido a JRS Cargo
          </h1>
          <p className="text-slate-300/80 text-xs sm:text-[13px] mt-1 font-normal">
            {loading ? 'Verificando tu estado de cuenta en tiempo real...' : 'Estado de cuenta sincronizado'}
          </p>
        </div>

        {/* Indicador de progreso elegante sincronizado con la carga real */}
        <div
          className={`w-52 sm:w-56 mt-6 transition-all duration-500 delay-75 ease-out motion-reduce:transition-none ${
            splashTextReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5'
          }`}
        >
          <div className="h-1.5 w-full bg-[#14445D]/70 rounded-full overflow-hidden p-[1px] ring-1 ring-white/10">
            <div
              className="h-full bg-gradient-to-r from-[#FFC44D] to-[#ffd782] rounded-full transition-all duration-300 ease-out motion-reduce:transition-none shadow-[0_0_10px_rgba(255,196,77,0.5)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mt-2 px-0.5 tabular-nums">
            <span>JRS Cargo S.A.</span>
            <span>{progressPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  if (loading && !data) {
    return (
      <>
        {splashOverlay}
        <div className="min-h-screen bg-[#F8FAFC]" />
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        {splashOverlay}
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 text-[#1E293B]">
          <div className="max-w-md w-full bg-white rounded-xl p-6 sm:p-8 border border-slate-200 shadow-xs text-center">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-lg flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-lg font-bold text-[#0B2737] mb-1.5">Estado de cuenta no disponible</h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
              {error || 'El enlace consultado no es válido o no se encuentra disponible en este momento. Contáctanos para asistirte.'}
            </p>
            <a
              href="https://wa.me/50672601238"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-10 bg-[#0B2737] hover:bg-[#14445D] text-white font-semibold text-xs sm:text-sm rounded-lg inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14445D] focus-visible:ring-offset-2"
            >
              <MessageCircle size={16} />
              <span>Contactar a Soporte JRS Cargo</span>
            </a>
          </div>
        </div>
      </>
    );
  }

  const { client, stats, invoices, payments } = data;
  const activeValidInvoices = invoices.filter(inv => inv.status !== 'Anulada');
  const pendingInvoices = activeValidInvoices.filter(inv => inv.pending > 0.01);
  const paidInvoices = activeValidInvoices.filter(inv => inv.pending <= 0.01);

  const displayedInvoices = (
    activeTab === 'pendientes'
      ? pendingInvoices
      : activeTab === 'pagadas'
      ? paidInvoices
      : activeValidInvoices
  ).filter(inv => {
    if (activeTab !== 'pendientes' && historyMonthFilter !== 'all') {
      if (getMonthKey(inv.issue_date) !== historyMonthFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchNumber = String(inv.invoice_number || '').toLowerCase().includes(q);
      const matchNotes = String(inv.notes || '').toLowerCase().includes(q);
      const matchItems = (inv.items || []).some(
        it =>
          String(it.tracking_number || '').toLowerCase().includes(q) ||
          String(it.service_name || '').toLowerCase().includes(q)
      );
      if (!matchNumber && !matchNotes && !matchItems) return false;
    }
    return true;
  });

  const displayedPayments = payments.filter(p => {
    if (historyMonthFilter !== 'all') {
      if (getMonthKey(p.payment_date) !== historyMonthFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchRef = String(p.reference_number || '').toLowerCase().includes(q);
      const matchMethod = String(p.payment_method || '').toLowerCase().includes(q);
      const matchInv = (p.invoice_payments || []).some(ip =>
        String(ip.invoices?.invoice_number || '').toLowerCase().includes(q)
      );
      if (!matchRef && !matchMethod && !matchInv) return false;
    }
    return true;
  });

  const whatsappPaymentMsg = `Hola JRS Cargo, adjunto comprobante de pago para la cuenta de *${client.name}* (Saldo pendiente: ${formatUSD(stats.totalBalanceUSD)} USD / ${formatCRC(stats.totalBalanceCRC)} CRC).`;

  const isHistoryMode = activeTab === 'pagadas' || activeTab === 'todas' || activeTab === 'pagos';

  return (
    <>
      {splashOverlay}

      <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] pb-16 print:bg-white print:p-0 print:pb-0">
        {/* ==================== 3. ENCABEZADO PRINCIPAL ==================== */}
        <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 print:hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            {/* Izquierda: Logo JRS Cargo + Portal de Clientes + JRS Cargo S.A. */}
            <div className="flex items-center gap-3 min-w-0">
              <Image
                src="/logo.png"
                alt="JRS Cargo"
                width={96}
                height={42}
                className="h-9 w-auto object-contain shrink-0"
                priority
              />
              <div className="h-5 w-px bg-slate-200 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-[#0B2737] leading-tight truncate">
                  Portal de Clientes
                </p>
                <p className="text-[11px] text-slate-500 leading-tight truncate">
                  JRS Cargo S.A.
                </p>
              </div>
            </div>

            {/* Derecha: Copiar enlace + Imprimir / Descargar PDF */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={copyShareLink}
                aria-label="Copiar enlace directo al estado de cuenta"
                className="h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14445D] focus-visible:ring-offset-1"
                title="Copiar enlace directo a este estado de cuenta"
              >
                {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-slate-400" />}
                <span>{copiedLink ? 'Enlace copiado' : 'Copiar enlace'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                aria-label="Imprimir o descargar estado de cuenta en PDF"
                className="h-9 px-3.5 rounded-lg bg-[#0B2737] hover:bg-[#14445D] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14445D] focus-visible:ring-offset-1"
                title="Imprimir o guardar estado de cuenta en PDF"
              >
                <Printer size={14} className="text-[#FFC44D]" />
                <span className="hidden sm:inline">Imprimir / Descargar PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 space-y-5 print:p-0 print:max-w-none print:space-y-4">
          {/* Encabezado exclusivo para versión impresa / PDF */}
          <div className="hidden print:flex items-center justify-between border-b border-slate-300 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="JRS Cargo" width={110} height={48} className="h-10 w-auto object-contain" />
              <div>
                <p className="text-sm font-bold text-[#0B2737]">JRS Cargo S.A.</p>
                <p className="text-xs text-slate-500">Estado de Cuenta Oficial • Portal de Clientes</p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-600 tabular-nums">
              <p>Emisión: {new Date().toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              <p>Tipo de cambio oficial: ₡{stats.exchangeRate} CRC = $1.00 USD</p>
            </div>
          </div>

          {/* ==================== 4. IDENTIFICACIÓN DEL CLIENTE ==================== */}
          <section
            aria-label="Identificación del cliente"
            className="bg-white rounded-xl border border-slate-200/90 px-4 py-3.5 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#14445D]">
                  Estado de cuenta
                </span>
                <span className="text-slate-300" aria-hidden="true">•</span>
                <span className="text-[11px] text-slate-500">
                  Actualizado al {new Date().toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#0B2737] tracking-tight mt-0.5 break-words">
                {client.name}
              </h1>
              {(client.email || client.phone) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                  {client.email && (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail size={13} className="text-slate-400 shrink-0" aria-hidden="true" />
                      <span className="truncate">{client.email}</span>
                    </span>
                  )}
                  {client.phone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone size={13} className="text-slate-400 shrink-0" aria-hidden="true" />
                      <span>{client.phone}</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Tipo de cambio oficial
              </span>
              <span className="text-xs font-bold text-[#0B2737] bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/80 tabular-nums">
                ₡{stats.exchangeRate} CRC = $1.00 USD
              </span>
            </div>
          </section>

          {/* ==================== 5. RESUMEN FINANCIERO EQUILIBRADO ==================== */}
          <section
            aria-label="Resumen financiero de la cuenta"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 print:grid-cols-4"
          >
            {/* Tarjeta 1 (Protagonista): Saldo Total Pendiente (4 columnas en escritorio) */}
            <div className="sm:col-span-2 lg:col-span-4 bg-[#0B2737] text-white rounded-xl p-5 border border-[#14445D] flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Saldo total pendiente
                  </span>
                  {stats.totalBalanceUSD > 0.01 ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFC44D]/15 text-[#FFC44D] border border-[#FFC44D]/35">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FFC44D]" aria-hidden="true" />
                      Pendiente de pago
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      <CheckCircle2 size={12} aria-hidden="true" />
                      Cuenta al día
                    </span>
                  )}
                </div>

                <div className="mt-3.5">
                  <div className="flex items-baseline gap-2 flex-wrap tabular-nums">
                    <span className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                      {formatUSD(stats.totalBalanceUSD)}
                    </span>
                    <span className="text-xs font-semibold text-slate-300 uppercase">USD</span>
                  </div>
                  <p className="text-sm sm:text-base font-semibold text-[#FFC44D] mt-1 tabular-nums">
                    ≈ {formatCRC(stats.totalBalanceCRC)}{' '}
                    <span className="text-xs font-normal text-slate-300">CRC</span>
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between gap-2 text-xs text-slate-300">
                <span>
                  {stats.pendingInvoicesCount === 0
                    ? 'Sin comprobantes pendientes de pago'
                    : `${stats.pendingInvoicesCount} ${
                        stats.pendingInvoicesCount === 1
                          ? 'comprobante pendiente de pago'
                          : 'comprobantes pendientes de pago'
                      }`}
                </span>
                {stats.totalBalanceUSD > 0.01 && (
                  <a
                    href="#metodos-pago"
                    className="text-xs font-semibold text-[#FFC44D] hover:underline whitespace-nowrap print:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC44D] rounded"
                  >
                    Ver datos de pago ↓
                  </a>
                )}
              </div>
            </div>

            {/* Tarjeta 2: Comprobantes pendientes de pago (2.5 -> 3 columnas) */}
            <div className="lg:col-span-3 bg-white rounded-xl p-5 border border-slate-200/90 flex flex-col justify-between shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Comprobantes pendientes de pago
                  </span>
                  {stats.pendingInvoicesCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Pendientes de pago" />
                  )}
                </div>
                <div className="mt-2.5 flex items-baseline gap-2 tabular-nums">
                  <span className="text-2xl sm:text-3xl font-bold text-[#0B2737]">
                    {stats.pendingInvoicesCount}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {stats.pendingInvoicesCount === 1 ? 'comprobante por pagar' : 'comprobantes por pagar'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {stats.pendingInvoicesCount > 0
                    ? 'Comprobantes emitidos con saldo pendiente de cancelación.'
                    : 'Todos tus comprobantes se encuentran cancelados.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Total histórico</span>
                <span className="font-semibold text-slate-700 tabular-nums">
                  {activeValidInvoices.length} {activeValidInvoices.length === 1 ? 'emitido' : 'emitidos'}
                </span>
              </div>
            </div>

            {/* Tarjeta 3: Paquetes por retirar (2 columnas -> le damos 2 o 2.5 con proporción limpia) */}
            <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/90 flex flex-col justify-between shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Paquetes por retirar
                  </span>
                  {stats.pendingPackagesCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-[#FFC44D] shrink-0" title="Disponibles en bodega" />
                  )}
                </div>
                <div className="mt-2.5 flex items-baseline gap-1.5 tabular-nums">
                  <span className="text-2xl sm:text-3xl font-bold text-[#0B2737]">
                    {stats.pendingPackagesCount}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {stats.pendingPackagesCount === 1 ? 'paquete' : 'paquetes'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {stats.pendingPackagesCount > 0
                    ? 'Disponibles en bodega CR.'
                    : 'Sin paquetes pendientes.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                {stats.pendingPackagesCount > 0 ? (
                  <>
                    <span className="text-slate-500 font-medium tabular-nums whitespace-nowrap">
                      {stats.pendingPackagesWeight > 0 ? `${stats.pendingPackagesWeight} lbs` : 'En bodega'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('paquetes');
                        document.getElementById('seccion-comprobantes')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="font-semibold text-[#14445D] hover:underline cursor-pointer whitespace-nowrap print:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14445D] rounded"
                    >
                      Ver paquetes →
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-emerald-700 font-medium inline-flex items-center gap-1 whitespace-nowrap">
                      <CheckCircle2 size={13} /> Al día
                    </span>
                    <span className="text-slate-400 whitespace-nowrap">Bodega CR</span>
                  </>
                )}
              </div>
            </div>

            {/* Tarjeta 4: Resumen mensual (3 columnas en escritorio para evitar cortes de texto) */}
            <div className="sm:col-span-2 lg:col-span-3 bg-white rounded-xl p-5 border border-slate-200/90 flex flex-col justify-between shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Resumen mensual
                  </span>
                  <Calendar size={13} className="text-slate-400 shrink-0" />
                </div>

                <div className="relative w-full mt-2">
                  <select
                    value={selectedMonth}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedMonth(e.target.value)}
                    aria-label="Seleccionar mes del resumen"
                    className="w-full h-8 text-xs font-semibold text-[#0B2737] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg pl-3 pr-8 cursor-pointer transition-colors focus:outline-none focus:border-[#14445D] focus-visible:ring-2 focus-visible:ring-[#14445D] appearance-none"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: 'none' }}
                  >
                    {availableMonths.map((m: string) => (
                      <option key={m} value={m}>
                        {formatMonthName(m)}
                      </option>
                    ))}
                    <option value="all">Histórico Total</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      Facturado {monthLabel}
                    </span>
                    <span className="text-sm font-bold text-[#0B2737] tabular-nums whitespace-nowrap">
                      {formatUSD(monthInvoiced)} <span className="text-[11px] font-medium text-slate-400">USD</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      Pagos {monthLabel}
                    </span>
                    <span className="text-sm font-bold text-emerald-700 tabular-nums whitespace-nowrap">
                      {formatUSD(monthPaid)} <span className="text-[11px] font-medium text-emerald-600/80">USD</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Moneda base</span>
                <span className="font-semibold text-slate-600">USD / CRC (₡{stats.exchangeRate})</span>
              </div>
            </div>
          </section>

          {/* Aviso de Saldo a Favor si aplica */}
          {(stats.creditBalanceUSD || 0) > 0.01 && (
            <section
              aria-label="Saldo a favor disponible"
              className="bg-emerald-50/80 border border-emerald-200 rounded-xl px-4 py-3.5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 size={18} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    Saldo a favor disponible en tu cuenta
                  </p>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Este saldo a favor se aplicará automáticamente a tus próximos paquetes o comprobantes.
                  </p>
                </div>
              </div>
              <div className="sm:text-right tabular-nums shrink-0 pl-12 sm:pl-0">
                <p className="text-lg font-bold text-emerald-700 whitespace-nowrap">
                  +{formatUSD(stats.creditBalanceUSD)} USD
                </p>
                <p className="text-xs font-medium text-emerald-600 whitespace-nowrap">
                  ≈ {formatCRC(Number(stats.creditBalanceUSD) * (stats.exchangeRate || 500))} CRC
                </p>
              </div>
            </section>
          )}

          {/* ==================== 7. MÉTODOS DE PAGO (SELECTOR INTERACTIVO) ==================== */}
          <section
            id="metodos-pago"
            aria-label="Métodos de pago autorizados"
            className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] print:border-slate-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-[#0B2737]">Métodos de pago autorizados</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecciona el método de tu preferencia para consultar las instrucciones y reportar tu pago.
                </p>
              </div>

              <div className="shrink-0 print:hidden">
                <a
                  href={`https://wa.me/50672601238?text=${encodeURIComponent(whatsappPaymentMsg)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 px-4 rounded-lg bg-[#0B2737] hover:bg-[#14445D] text-white font-semibold text-xs inline-flex items-center justify-center gap-2 transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14445D] focus-visible:ring-offset-1"
                >
                  <MessageCircle size={15} className="text-[#FFC44D]" aria-hidden="true" />
                  <span>Reportar un pago</span>
                </a>
              </div>
            </div>

            {/* Selector de 3 opciones */}
            <div className="mt-4">
              <div
                role="tablist"
                aria-label="Opciones de pago"
                className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/90 rounded-lg border border-slate-200/70 max-w-lg print:hidden"
              >
                <button
                  type="button"
                  role="tab"
                  id="tab-sinpe"
                  aria-selected={selectedPaymentMethod === 'sinpe'}
                  aria-controls="panel-sinpe"
                  onClick={() => setSelectedPaymentMethod('sinpe')}
                  className={`h-9 px-3 rounded-md text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14445D] ${
                    selectedPaymentMethod === 'sinpe'
                      ? 'bg-white text-[#0B2737] shadow-2xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-[#0B2737]'
                  }`}
                >
                  <Smartphone size={14} aria-hidden="true" />
                  <span>SINPE Móvil</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  id="tab-transferencia"
                  aria-selected={selectedPaymentMethod === 'transferencia'}
                  aria-controls="panel-transferencia"
                  onClick={() => setSelectedPaymentMethod('transferencia')}
                  className={`h-9 px-3 rounded-md text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14445D] ${
                    selectedPaymentMethod === 'transferencia'
                      ? 'bg-white text-[#0B2737] shadow-2xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-[#0B2737]'
                  }`}
                >
                  <Building2 size={14} aria-hidden="true" />
                  <span>Transferencia</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  id="tab-efectivo"
                  aria-selected={selectedPaymentMethod === 'efectivo'}
                  aria-controls="panel-efectivo"
                  onClick={() => setSelectedPaymentMethod('efectivo')}
                  className={`h-9 px-3 rounded-md text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14445D] ${
                    selectedPaymentMethod === 'efectivo'
                      ? 'bg-white text-[#0B2737] shadow-2xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-[#0B2737]'
                  }`}
                >
                  <Banknote size={14} aria-hidden="true" />
                  <span>Efectivo</span>
                </button>
              </div>

              {/* Contenido desplegado según el método seleccionado */}
              <div className="mt-3.5">
                {selectedPaymentMethod === 'sinpe' && (
                  <div
                    id="panel-sinpe"
                    role="tabpanel"
                    aria-labelledby="tab-sinpe"
                    className="rounded-lg bg-slate-50/80 border border-slate-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#0B2737]">SINPE Móvil Oficial</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Acreditación inmediata
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Beneficiario: <strong className="font-semibold text-slate-800">JRS Cargo S.A.</strong>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Indica tu nombre en el detalle del comprobante para agilizar la aplicación de tu pago.
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 bg-white px-3.5 py-2.5 rounded-lg border border-slate-200 shrink-0">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          Número oficial
                        </span>
                        <span className="font-mono font-bold text-base text-[#0B2737] tabular-nums">
                          7260-1238
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={copySinpeNumber}
                        className="h-8 px-3 rounded-md bg-[#14445D] hover:bg-[#0B2737] text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2737]"
                      >
                        {copiedSinpe ? <Check size={13} className="text-[#FFC44D]" /> : <Copy size={13} />}
                        <span>{copiedSinpe ? 'Copiado' : 'Copiar número'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {selectedPaymentMethod === 'transferencia' && (
                  <div
                    id="panel-transferencia"
                    role="tabpanel"
                    aria-labelledby="tab-transferencia"
                    className="rounded-lg bg-slate-50/80 border border-slate-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#0B2737]">Transferencia Bancaria (CRC / USD)</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                          JRS Cargo S.A.
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Entidades disponibles: <strong className="text-slate-800">BAC Credomatic</strong> y{' '}
                        <strong className="text-slate-800">Banco de Costa Rica (BCR)</strong> en colones y dólares.
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Solicita los números de cuenta IBAN actualizados directamente por nuestro canal oficial.
                      </p>
                    </div>

                    <div className="shrink-0">
                      <a
                        href={`https://wa.me/50672601238?text=${encodeURIComponent(
                          'Hola JRS Cargo, me gustaría solicitar las cuentas IBAN para realizar una transferencia bancaria.'
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 px-3.5 rounded-lg bg-white hover:bg-slate-100 text-[#0B2737] border border-slate-200 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14445D]"
                      >
                        <MessageCircle size={14} className="text-emerald-600" />
                        <span>Solicitar cuentas IBAN</span>
                      </a>
                    </div>
                  </div>
                )}

                {selectedPaymentMethod === 'efectivo' && (
                  <div
                    id="panel-efectivo"
                    role="tabpanel"
                    aria-labelledby="tab-efectivo"
                    className="rounded-lg bg-slate-50/80 border border-slate-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#0B2737]">Pago en Efectivo en Sucursal</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          Contra retiro
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Puedes cancelar en efectivo (colones o dólares) directamente en mostrador al retirar tus paquetes.
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Tu saldo se actualiza de inmediato al emitir el recibo en bodega.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-lg border border-slate-200 shrink-0 text-xs">
                      <MapPin size={15} className="text-[#14445D] shrink-0" />
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          Ubicación oficial
                        </span>
                        <span className="font-semibold text-[#0B2737]">Bodega San Pablo, Heredia</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ==================== 6. COMPROBANTES E HISTORIAL ==================== */}
          <section
            id="seccion-comprobantes"
            aria-label="Comprobantes pendientes de pago e historial"
            className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)] print:border-none print:shadow-none"
          >
            {/* Barra de navegación de comprobantes */}
            <div className="p-4 sm:px-6 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
              <div>
                <h2 className="text-base font-bold text-[#0B2737]">
                  {activeTab === 'pendientes'
                    ? 'Comprobantes pendientes de pago'
                    : activeTab === 'paquetes'
                    ? 'Paquetes pendientes por retirar'
                    : activeTab === 'pagos'
                    ? 'Historial de pagos aplicados'
                    : 'Historial de comprobantes'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeTab === 'pendientes'
                    ? 'Detalle de comprobantes activos con saldo pendiente de cancelación.'
                    : activeTab === 'paquetes'
                    ? 'Paquetes disponibles en la bodega de Costa Rica listos para retiro.'
                    : 'Consulta tus comprobantes cancelados y los pagos aplicados a tu cuenta.'}
                </p>
              </div>

              {/* Navegación por pestañas accesible */}
              <div
                role="tablist"
                aria-label="Secciones de comprobantes y paquetes"
                className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/70 self-start md:self-auto"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'pendientes'}
                  onClick={() => {
                    setActiveTab('pendientes');
                    setSearchQuery('');
                  }}
                  className={`h-8 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14445D] ${
                    activeTab === 'pendientes'
                      ? 'bg-[#0B2737] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-[#0B2737]'
                  }`}
                >
                  <span>Pendientes</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold tabular-nums ${
                      activeTab === 'pendientes' ? 'bg-white/15 text-[#FFC44D]' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {pendingInvoices.length}
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={isHistoryMode}
                  onClick={() => {
                    if (!isHistoryMode) {
                      setActiveTab(paidInvoices.length > 0 ? 'pagadas' : 'todas');
                    }
                  }}
                  className={`h-8 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14445D] ${
                    isHistoryMode
                      ? 'bg-[#0B2737] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-[#0B2737]'
                  }`}
                >
                  <span>Pagados / Historial</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold tabular-nums ${
                      isHistoryMode ? 'bg-white/15 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {paidInvoices.length}
                  </span>
                </button>

                {stats.pendingPackagesCount > 0 && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'paquetes'}
                    onClick={() => {
                      setActiveTab('paquetes');
                      setSearchQuery('');
                    }}
                    className={`h-8 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14445D] ${
                      activeTab === 'paquetes'
                        ? 'bg-[#0B2737] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-[#0B2737]'
                    }`}
                  >
                    <span>Paquetes</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold tabular-nums ${
                        activeTab === 'paquetes' ? 'bg-white/15 text-[#FFC44D]' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {stats.pendingPackagesCount}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Barra de filtros secundaria (cuando se consulta Historial o hay varios comprobantes) */}
            {(isHistoryMode || pendingInvoices.length > 2 || searchQuery.trim() !== '') && activeTab !== 'paquetes' && (
              <div className="px-4 py-3 sm:px-6 bg-slate-50/70 border-b border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 print:hidden">
                {isHistoryMode ? (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab('pagadas')}
                      className={`h-8 px-3 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14445D] ${
                        activeTab === 'pagadas'
                          ? 'bg-[#14445D] text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                      }`}
                    >
                      Comprobantes pagados ({paidInvoices.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('todas')}
                      className={`h-8 px-3 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14445D] ${
                        activeTab === 'todas'
                          ? 'bg-[#14445D] text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                      }`}
                    >
                      Todos los emitidos ({activeValidInvoices.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('pagos')}
                      className={`h-8 px-3 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14445D] ${
                        activeTab === 'pagos'
                          ? 'bg-[#14445D] text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                      }`}
                    >
                      Pagos aplicados ({payments.length})
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">
                    Busca por número de comprobante, servicio o número de guía (tracking)
                  </span>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      aria-label={activeTab === 'pagos' ? 'Buscar referencia o método de pago' : 'Buscar comprobante o número de guía'}
                      placeholder={activeTab === 'pagos' ? 'Buscar referencia o método...' : 'Buscar comprobante o guía...'}
                      className="w-full h-8 pl-8 pr-7 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#14445D] focus:ring-2 focus:ring-[#14445D]/15"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Limpiar búsqueda"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Limpiar búsqueda"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {isHistoryMode && (
                    <div className="relative shrink-0">
                      <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <select
                        value={historyMonthFilter}
                        onChange={e => setHistoryMonthFilter(e.target.value)}
                        aria-label="Filtrar historial por mes"
                        className="w-full sm:w-auto h-8 pl-7 pr-7 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer focus:outline-none focus:border-[#14445D] appearance-none"
                      >
                        <option value="all">Todos los meses</option>
                        {availableMonths.map(m => (
                          <option key={m} value={m}>
                            {formatMonthName(m)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================= LISTADO DE COMPROBANTES (TABLA EN ESCRITORIO / TARJETAS EN MÓVIL) ================= */}
            {(activeTab === 'pendientes' || activeTab === 'pagadas' || activeTab === 'todas') && (
              <div>
                {displayedInvoices.length === 0 ? (
                  <div className="p-10 sm:p-12 text-center">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 size={20} />
                    </div>
                    <p className="font-semibold text-[#0B2737] text-sm">
                      {activeTab === 'pendientes'
                        ? 'Tu cuenta está al día'
                        : 'No se encontraron comprobantes con este criterio'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {activeTab === 'pendientes'
                        ? 'No tienes saldos ni comprobantes pendientes de pago en este momento.'
                        : 'Intenta seleccionar otro mes o limpiar el filtro de búsqueda.'}
                    </p>
                    {activeTab === 'pendientes' && activeValidInvoices.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('pagadas')}
                        className="mt-4 h-8 px-3.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-[#0B2737] transition-colors cursor-pointer"
                      >
                        Consultar historial de comprobantes ({activeValidInvoices.length})
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* 1. VISTA ESCRITORIO (>= lg) Y MODO IMPRESIÓN: Tabla semántica sin solapamientos */}
                    <div className="hidden lg:block print:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <th scope="col" className="py-3 pl-6 pr-3">Comprobante</th>
                            <th scope="col" className="py-3 px-3">Emisión</th>
                            <th scope="col" className="py-3 px-3">Paquetes</th>
                            <th scope="col" className="py-3 px-3">Estado</th>
                            <th scope="col" className="py-3 px-3 text-right">Facturado</th>
                            <th scope="col" className="py-3 pl-3 pr-5 text-right">Saldo pendiente</th>
                            <th scope="col" className="py-3 pl-3 pr-6 text-right print:hidden">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 text-xs">
                          {displayedInvoices.map(inv => {
                            const isExpanded = !!expandedInvoices[inv.id];
                            const hasItems = inv.items && inv.items.length > 0;
                            const isPending = inv.pending > 0.01 && inv.status !== 'Anulada';
                            const pendingCRC = Math.round(inv.pending * stats.exchangeRate);
                            const totalCRC = Math.round(inv.total * stats.exchangeRate);

                            return (
                              <React.Fragment key={inv.id}>
                                <tr className="hover:bg-slate-50/60 transition-colors align-middle">
                                  {/* Columna 1: Comprobante */}
                                  <td className="py-3.5 pl-6 pr-3">
                                    <div className="font-mono font-bold text-sm text-[#0B2737] whitespace-nowrap">
                                      #{inv.invoice_number}
                                    </div>
                                    {inv.notes && (
                                      <p className="text-[11px] text-slate-500 truncate max-w-[200px] mt-0.5" title={inv.notes}>
                                        {inv.notes}
                                      </p>
                                    )}
                                  </td>

                                  {/* Columna 2: Emisión */}
                                  <td className="py-3.5 px-3 whitespace-nowrap">
                                    <span className="font-medium text-slate-700 block">
                                      {formatDisplayDate(inv.issue_date)}
                                    </span>
                                    {inv.due_date && (
                                      <span className="text-[11px] text-slate-400 block mt-0.5">
                                        Vence: {formatDisplayDate(inv.due_date)}
                                      </span>
                                    )}
                                  </td>

                                  {/* Columna 3: Paquetes */}
                                  <td className="py-3.5 px-3 whitespace-nowrap">
                                    {hasItems ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100/90 text-slate-700 font-semibold">
                                        <Package size={13} className="text-[#14445D] shrink-0" aria-hidden="true" />
                                        <span>
                                          {inv.items.length} {inv.items.length === 1 ? 'paquete' : 'paquetes'}
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>

                                  {/* Columna 4: Estado */}
                                  <td className="py-3.5 px-3 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                        inv.status === 'Pagada'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : inv.status === 'Parcial'
                                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                                          : 'bg-amber-50 text-amber-800 border-amber-200'
                                      }`}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                          inv.status === 'Pagada' ? 'bg-emerald-500' : 'bg-amber-500'
                                        }`}
                                        aria-hidden="true"
                                      />
                                      {inv.status === 'Pagada'
                                        ? 'Pagado'
                                        : inv.status === 'Parcial'
                                        ? 'Abono parcial'
                                        : 'Pendiente de pago'}
                                    </span>
                                    {inv.paid > 0 && isPending && (
                                      <span className="block text-[10px] text-emerald-700 font-semibold mt-1 tabular-nums">
                                        Abonado: {formatUSD(inv.paid)} USD
                                      </span>
                                    )}
                                  </td>

                                  {/* Columna 5: Facturado */}
                                  <td className="py-3.5 px-3 text-right tabular-nums whitespace-nowrap">
                                    <span className="text-xs font-semibold text-slate-700 block">
                                      {formatUSD(inv.total)} <span className="text-[10px] text-slate-400">USD</span>
                                    </span>
                                    <span className="text-[10px] text-slate-400 block mt-0.5">
                                      ≈ {formatCRC(totalCRC)}
                                    </span>
                                  </td>

                                  {/* Columna 6: Saldo pendiente (separada claramente de Acciones) */}
                                  <td className="py-3.5 pl-3 pr-5 text-right tabular-nums whitespace-nowrap">
                                    {isPending ? (
                                      <>
                                        <span className="text-sm font-bold text-[#0B2737] block">
                                          {formatUSD(inv.pending)}{' '}
                                          <span className="text-[11px] font-semibold text-slate-500">USD</span>
                                        </span>
                                        <span className="text-[11px] font-medium text-amber-700 block mt-0.5">
                                          ≈ {formatCRC(pendingCRC)} CRC
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-sm font-bold text-emerald-700 block">
                                          $0.00 <span className="text-[11px] font-medium text-emerald-600">USD</span>
                                        </span>
                                        <span className="text-[10px] font-medium text-emerald-600 block mt-0.5">
                                          Cancelado
                                        </span>
                                      </>
                                    )}
                                  </td>

                                  {/* Columna 7: Acciones dedicadas */}
                                  <td className="py-3.5 pl-3 pr-6 text-right whitespace-nowrap print:hidden">
                                    <div className="inline-flex items-center justify-end gap-1.5">
                                      {hasItems && (
                                        <button
                                          type="button"
                                          aria-expanded={isExpanded}
                                          onClick={() => toggleInvoiceExpand(inv.id)}
                                          className={`h-8 px-2.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14445D] ${
                                            isExpanded
                                              ? 'bg-[#0B2737] text-white border-[#0B2737]'
                                              : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                                          }`}
                                        >
                                          <span>{isExpanded ? 'Ocultar' : 'Ver paquetes'}</span>
                                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                        </button>
                                      )}

                                      <a
                                        href={`/api/invoices/${inv.id}/pdf`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={`Descargar PDF del comprobante ${inv.invoice_number}`}
                                        className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14445D]"
                                        title="Descargar comprobante en PDF"
                                      >
                                        <Download size={13} className="text-[#14445D]" />
                                        <span>PDF</span>
                                      </a>

                                      <button
                                        type="button"
                                        onClick={() => handleOpenSendModal(inv)}
                                        aria-label={`Reenviar comprobante ${inv.invoice_number} por correo`}
                                        className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-[#14445D] border border-slate-200 inline-flex items-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14445D]"
                                        title="Reenviar comprobante por correo electrónico"
                                      >
                                        <Mail size={13} />
                                        <span>Reenviar</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* Fila desplegable con el detalle de paquetes */}
                                {hasItems && (
                                  <tr className={`${isExpanded ? '' : 'hidden print:table-row'} bg-slate-50/90`}>
                                    <td colSpan={7} className="px-6 py-3.5 border-t border-slate-200/60">
                                      <div className="bg-white rounded-lg border border-slate-200/90 overflow-hidden">
                                        <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200/70 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                                          <span>
                                            Desglose de paquetes del comprobante #{inv.invoice_number}
                                          </span>
                                          <span className="tabular-nums text-slate-500">
                                            {inv.items.length} {inv.items.length === 1 ? 'ítem' : 'ítems'}
                                          </span>
                                        </div>
                                        <table className="w-full text-xs text-left">
                                          <thead>
                                            <tr className="bg-slate-50/60 text-slate-500 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider">
                                              <th className="py-2 px-3.5">Servicio</th>
                                              <th className="py-2 px-3.5">Tracking / Guía</th>
                                              <th className="py-2 px-3.5 text-right">Peso / Medida</th>
                                              <th className="py-2 px-3.5 text-right">Monto</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                            {inv.items.map((it, idx) => (
                                              <tr key={idx} className="text-slate-700">
                                                <td className="py-2 px-3.5 font-medium">{it.service_name}</td>
                                                <td className="py-2 px-3.5 font-mono text-[#14445D] font-semibold select-all">
                                                  {it.tracking_number || '—'}
                                                </td>
                                                <td className="py-2 px-3.5 text-right text-slate-600 tabular-nums whitespace-nowrap">
                                                  {it.weight ? formatWeightWithUnit(it.weight, it.service_name) : '—'}
                                                </td>
                                                <td className="py-2 px-3.5 text-right font-semibold text-[#0B2737] tabular-nums whitespace-nowrap">
                                                  {formatUSD(it.amount)} USD
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* 2. VISTA MÓVIL Y TABLET (< lg): Tarjetas limpias y completas sin comprimir datos */}
                    <div className="lg:hidden print:hidden divide-y divide-slate-200/80">
                      {displayedInvoices.map(inv => {
                        const isExpanded = !!expandedInvoices[inv.id];
                        const hasItems = inv.items && inv.items.length > 0;
                        const isPending = inv.pending > 0.01 && inv.status !== 'Anulada';
                        const pendingCRC = Math.round(inv.pending * stats.exchangeRate);

                        return (
                          <div key={inv.id} className="p-4 sm:p-5 space-y-3.5 bg-white">
                            {/* Cabecera de la tarjeta: Comprobante + Estado a la izquierda, Saldo a la derecha */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-bold text-base text-[#0B2737]">
                                    #{inv.invoice_number}
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                      inv.status === 'Pagada'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        inv.status === 'Pagada' ? 'bg-emerald-500' : 'bg-amber-500'
                                      }`}
                                    />
                                    {inv.status === 'Pagada'
                                      ? 'Pagado'
                                      : inv.status === 'Parcial'
                                      ? 'Abono parcial'
                                      : 'Pendiente de pago'}
                                  </span>
                                </div>
                                {inv.notes && (
                                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{inv.notes}</p>
                                )}
                              </div>

                              <div className="text-right tabular-nums shrink-0">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                                  {isPending ? 'Saldo pendiente' : 'Total pagado'}
                                </span>
                                <span className="text-base font-bold text-[#0B2737] block whitespace-nowrap">
                                  {formatUSD(isPending ? inv.pending : inv.total)} USD
                                </span>
                                {isPending && (
                                  <span className="text-xs font-medium text-amber-700 block whitespace-nowrap">
                                    ≈ {formatCRC(pendingCRC)} CRC
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Resumen intermedio en grilla de 3 columnas */}
                            <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-lg bg-slate-50 border border-slate-200/70 text-xs">
                              <div>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                                  Emisión
                                </span>
                                <span className="font-semibold text-slate-700 tabular-nums mt-0.5 block">
                                  {formatDisplayDate(inv.issue_date)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                                  Paquetes
                                </span>
                                <span className="font-semibold text-slate-700 mt-0.5 inline-flex items-center gap-1">
                                  <Package size={12} className="text-[#14445D]" />
                                  {hasItems ? `${inv.items.length} ${inv.items.length === 1 ? 'paq.' : 'paq.'}` : '—'}
                                </span>
                              </div>
                              <div className="text-right tabular-nums">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                                  Monto facturado
                                </span>
                                <span className="font-semibold text-slate-700 mt-0.5 block">
                                  {formatUSD(inv.total)} USD
                                </span>
                              </div>
                            </div>

                            {inv.paid > 0 && isPending && (
                              <div className="flex items-center justify-between px-3 py-1.5 rounded-md bg-emerald-50/70 border border-emerald-200/70 text-xs text-emerald-800 tabular-nums">
                                <span>Pagos aplicados a este comprobante:</span>
                                <strong className="font-bold">+{formatUSD(inv.paid)} USD</strong>
                              </div>
                            )}

                            {/* Botones de acción en móvil cómodos y sin recortes */}
                            <div className="flex items-center gap-2 pt-0.5">
                              {hasItems && (
                                <button
                                  type="button"
                                  aria-expanded={isExpanded}
                                  onClick={() => toggleInvoiceExpand(inv.id)}
                                  className={`flex-1 h-9 px-3 rounded-lg text-xs font-semibold border inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                    isExpanded
                                      ? 'bg-[#0B2737] text-white border-[#0B2737]'
                                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  <span>{isExpanded ? 'Ocultar paquetes' : 'Ver paquetes'}</span>
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                              )}

                              <a
                                href={`/api/invoices/${inv.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-9 px-3.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 inline-flex items-center justify-center gap-1.5 transition-colors shrink-0"
                              >
                                <Download size={14} className="text-[#14445D]" />
                                <span>PDF</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => handleOpenSendModal(inv)}
                                className="h-9 px-3.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-[#14445D] border border-slate-200 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                              >
                                <Mail size={14} />
                                <span>Reenviar</span>
                              </button>
                            </div>

                            {/* Paquetes desplegados en móvil */}
                            {hasItems && isExpanded && (
                              <div className="pt-2 space-y-2">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                  Detalle de paquetes ({inv.items.length})
                                </p>
                                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/60 overflow-hidden">
                                  {inv.items.map((it, idx) => (
                                    <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                                      <div className="min-w-0">
                                        <p className="font-semibold text-[#0B2737] truncate">{it.service_name}</p>
                                        <p className="font-mono text-[11px] text-[#14445D] font-medium mt-0.5 break-all">
                                          {it.tracking_number || 'Sin guía'}
                                        </p>
                                      </div>
                                      <div className="text-right tabular-nums shrink-0">
                                        <span className="font-bold text-[#0B2737] block">
                                          {formatUSD(it.amount)} USD
                                        </span>
                                        <span className="text-[11px] text-slate-500 block">
                                          {it.weight ? formatWeightWithUnit(it.weight, it.service_name) : '—'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {activeTab === 'pendientes' && paidInvoices.length > 0 && (
                  <div className="px-4 py-3.5 sm:px-6 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 print:hidden">
                    <span>
                      Además, cuentas con <strong className="font-semibold text-slate-700">{paidInvoices.length}</strong>{' '}
                      {paidInvoices.length === 1
                        ? 'comprobante pagado en tu historial.'
                        : 'comprobantes pagados en tu historial.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('pagadas')}
                      className="font-semibold text-[#14445D] hover:underline cursor-pointer"
                    >
                      Ver comprobantes pagados →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ================= PAQUETES POR RETIRAR ================= */}
            {activeTab === 'paquetes' && (
              <div>
                {!data.pendingPackages || data.pendingPackages.length === 0 ? (
                  <div className="p-10 sm:p-12 text-center">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 size={20} />
                    </div>
                    <p className="font-semibold text-[#0B2737] text-sm">No tienes paquetes pendientes por retirar</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Todos tus paquetes registrados han sido entregados satisfactoriamente.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200/80">
                    {data.pendingPackages.map((pkg, idx) => (
                      <div
                        key={pkg.id || idx}
                        className="p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-[#0B2737]">{pkg.service_name}</span>
                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                              {pkg.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                            {pkg.tracking_number ? (
                              <span>
                                Guía:{' '}
                                <strong className="font-mono font-semibold text-[#14445D] select-all">
                                  {pkg.tracking_number}
                                </strong>
                              </span>
                            ) : (
                              <span>Sin guía registrada</span>
                            )}
                            {pkg.weight && (
                              <span>
                                • Peso:{' '}
                                <strong className="text-slate-700">
                                  {formatWeightWithUnit(pkg.weight, pkg.service_name)}
                                </strong>
                              </span>
                            )}
                            {pkg.invoice_number && (
                              <span>
                                • Comprobante: <strong className="text-[#0B2737]">#{pkg.invoice_number}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        {pkg.amount !== undefined && pkg.amount > 0 && (
                          <div className="sm:text-right tabular-nums shrink-0">
                            <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                              Monto facturado
                            </span>
                            <span className="text-sm font-bold text-[#0B2737]">{formatUSD(pkg.amount)} USD</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ================= HISTORIAL DE PAGOS Y ABONOS ================= */}
            {activeTab === 'pagos' && (
              <div>
                {displayedPayments.length === 0 ? (
                  <div className="p-10 sm:p-12 text-center">
                    <p className="font-semibold text-[#0B2737] text-sm">No se encontraron pagos aplicados con este filtro</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Tus pagos y transferencias se mostrarán aquí una vez conciliados en tu cuenta.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/90 text-slate-500 uppercase tracking-wider border-b border-slate-200/80 text-[11px] font-bold">
                          <th scope="col" className="py-3 px-4 sm:px-6">Fecha</th>
                          <th scope="col" className="py-3 px-4">Método</th>
                          <th scope="col" className="py-3 px-4">Referencia</th>
                          <th scope="col" className="py-3 px-4">Comprobantes aplicados</th>
                          <th scope="col" className="py-3 px-4 sm:px-6 text-right">Pago aplicado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70">
                        {displayedPayments.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/60">
                            <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-700 whitespace-nowrap">
                              {formatDisplayDate(p.payment_date)}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded border border-slate-200/80">
                                {p.payment_method || 'Pago'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                              {p.reference_number || '—'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700">
                              {Array.isArray(p.invoice_payments) && p.invoice_payments.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {p.invoice_payments.map(ip => (
                                    <span
                                      key={ip.invoice_id}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-[#0B2737] font-medium"
                                    >
                                      #{ip.invoices?.invoice_number || 'Comprobante'}
                                      <span className="text-slate-500 tabular-nums">
                                        ({formatUSD(ip.amount_applied)})
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 sm:px-6 text-right font-bold text-emerald-700 tabular-nums whitespace-nowrap">
                              +{formatUSD(p.amount)} USD
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Pie de página institucional */}
          <footer className="pt-4 text-center text-xs text-slate-400 space-y-1 print:pt-6 print:border-t print:border-slate-200">
            <p className="font-semibold text-slate-500">JRS Cargo S.A.</p>
            <p>San Pablo de Heredia, Costa Rica • WhatsApp Soporte: +506 7260-1238 • info@jrscargocr.com</p>
          </footer>
        </main>

        {/* Modal para Reenviar Comprobante */}
        {emailModalOpen && emailInvoice && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-reenviar-titulo"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[1px] print:hidden"
          >
            <div className="bg-white rounded-xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 relative animate-fade-in">
              <button
                type="button"
                aria-label="Cerrar ventana"
                onClick={() => {
                  if (!isSending) {
                    setEmailModalOpen(false);
                    setEmailSuccess(false);
                    setSendError(null);
                  }
                }}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-[#0B2737] flex items-center justify-center shrink-0 border border-slate-200">
                  <Mail size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 id="modal-reenviar-titulo" className="text-base font-bold text-[#0B2737] truncate">
                    Reenviar comprobante
                  </h3>
                  <p className="text-xs text-slate-500 tabular-nums">
                    Comprobante #{emailInvoice.invoice_number} • {formatUSD(emailInvoice.total)} USD
                  </p>
                </div>
              </div>

              {emailSuccess ? (
                <div className="py-5 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-[#0B2737]">Comprobante enviado correctamente</h4>
                  <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                    Enviamos el archivo PDF oficial a:<br />
                    <strong className="text-[#0B2737] font-semibold break-all">{recipientEmail}</strong>
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEmailModalOpen(false);
                        setEmailSuccess(false);
                      }}
                      className="h-9 px-5 rounded-lg bg-[#0B2737] text-white font-semibold text-xs hover:bg-[#14445D] transition-colors cursor-pointer"
                    >
                      Listo
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendInvoiceEmail} className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Recibirás una copia del comprobante con su documento PDF adjunto en el correo electrónico indicado.
                  </p>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-500">
                      <span>Comprobante:</span>
                      <strong className="text-[#0B2737] font-semibold">#{emailInvoice.invoice_number}</strong>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Monto facturado:</span>
                      <strong className="text-[#0B2737] font-semibold tabular-nums">
                        {formatUSD(emailInvoice.total)} USD
                      </strong>
                    </div>
                    {emailInvoice.pending > 0.01 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Saldo pendiente:</span>
                        <strong className="text-amber-700 font-semibold tabular-nums">
                          {formatUSD(emailInvoice.pending)} USD
                        </strong>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="recipient-email-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Correo electrónico de destino
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="recipient-email-input"
                        type="email"
                        required
                        value={recipientEmail}
                        onChange={e => setRecipientEmail(e.target.value)}
                        placeholder="ejemplo@correo.com"
                        className="w-full h-10 pl-9 pr-3.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#14445D] focus:ring-2 focus:ring-[#14445D]/15"
                      />
                    </div>
                  </div>

                  {sendError && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2 border border-red-100">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{sendError}</span>
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEmailModalOpen(false)}
                      className="h-9 px-4 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      disabled={isSending}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSending || !recipientEmail}
                      className="h-9 px-4 rounded-lg bg-[#0B2737] hover:bg-[#14445D] disabled:opacity-50 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isSending ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Send size={13} />
                          <span>Enviar comprobante</span>
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
    </>
  );
}
