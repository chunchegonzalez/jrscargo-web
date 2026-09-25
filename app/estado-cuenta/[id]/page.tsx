'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { 
  DollarSign, CheckCircle2, Clock, FileText, Printer, 
  Copy, Check, ExternalLink, ShieldCheck, AlertCircle, 
  ChevronDown, ChevronUp, Phone, Mail, Package, MessageCircle,
  HelpCircle, Building2
} from 'lucide-react';
import { formatDisplayDate } from '@/lib/billing';

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
    totalInvoicedUSD: number;
    totalPaidUSD: number;
    exchangeRate: number;
  };
  invoices: Invoice[];
  payments: Payment[];
}

export default function PublicEstadoCuentaPage() {
  const params = useParams();
  const clientId = params?.id as string;

  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pendientes' | 'todas' | 'pagos'>('pendientes');
  const [copiedSinpe, setCopiedSinpe] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [expandedInvoices, setExpandedInvoices] = useState<Record<string, boolean>>({});

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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-white/80">
            <ShieldCheck size={16} className="text-green-400" />
            <span>Portal Seguro de Consulta de Saldos • JRS CARGO S.A.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={copyShareLink}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-medium text-white"
            >
              {copiedLink ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              <span>{copiedLink ? '¡Enlace copiado!' : 'Copiar enlace'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1 bg-brand-yellow hover:bg-amber-400 text-brand-blue font-bold rounded-lg transition-colors"
            >
              <Printer size={14} />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 print:p-0 print:max-w-none">
        
        {/* Document Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm mb-6 print:border-none print:shadow-none print:p-0 print:mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-gray-100 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-bg-light rounded-2xl p-2 border border-gray-100 flex items-center justify-center shrink-0">
                <Image
                  src="/logo.png"
                  alt="JRS CARGO"
                  width={140}
                  height={60}
                  className="object-contain w-auto h-auto max-h-12"
                  priority
                />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-blue-light bg-brand-blue/5 px-2.5 py-0.5 rounded-full inline-block mb-1">
                  Estado de Cuenta Oficial
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-brand-blue">
                  {client.name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                  {client.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={13} className="text-gray-400" /> {client.email}
                    </span>
                  )}
                  {client.phone && (
                    <span className="flex items-center gap-1">
                      <Phone size={13} className="text-gray-400" /> {client.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-4 sm:p-0 rounded-2xl w-full sm:w-auto">
              <p className="text-xs text-gray-400 font-bold uppercase">Fecha de emisión</p>
              <p className="text-sm font-bold text-gray-800">
                {new Date().toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                T.C. Oficial: <span className="font-bold text-gray-700">₡{stats.exchangeRate}</span> / $1 USD
              </p>
            </div>
          </div>

          {/* Balance Spotlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Card Saldo Pendiente */}
            <div className="sm:col-span-2 bg-gradient-to-br from-brand-blue to-[#0A2636] text-white p-6 sm:p-7 rounded-2xl relative overflow-hidden shadow-md">
              <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-blue-light flex items-center gap-1.5">
                    <DollarSign size={16} /> Saldo Total Pendiente
                  </span>
                  {stats.totalBalanceUSD > 0.01 ? (
                    <span className="text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock size={12} /> {stats.pendingInvoicesCount} factura(s) pendiente(s)
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold bg-green-500/20 text-green-300 border border-green-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={12} /> ¡Cuenta al día!
                    </span>
                  )}
                </div>

                <div className="my-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black tracking-tight">
                      ${stats.totalBalanceUSD.toFixed(2)}
                    </span>
                    <span className="text-xl font-bold text-brand-blue-light">USD</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-brand-yellow mt-1">
                    ≈ ₡{stats.totalBalanceCRC.toLocaleString('es-CR')} <span className="text-xs font-semibold text-white/70">CRC</span>
                  </div>
                </div>

                <p className="text-xs text-white/70 mt-2">
                  {stats.totalBalanceUSD > 0.01 
                    ? 'Por favor cancela tu saldo para agilizar el despacho y entrega de tus paquetes.'
                    : 'No tienes saldos pendientes en este momento. ¡Muchas gracias por tu preferencia!'}
                </p>
              </div>
            </div>

            {/* Quick Summary Numbers */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100 flex flex-col justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Facturado Histórico</p>
                <p className="text-2xl font-black text-gray-800">${stats.totalInvoicedUSD.toFixed(2)} <span className="text-xs font-bold text-gray-400">USD</span></p>
              </div>
              <div className="border-t border-gray-200/80 pt-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Pagos Aplicados</p>
                <p className="text-2xl font-black text-green-600">${stats.totalPaidUSD.toFixed(2)} <span className="text-xs font-bold text-gray-400">USD</span></p>
              </div>
            </div>

          </div>

          {/* Payment Instructions Box (Only show prominently if has pending balance) */}
          {stats.totalBalanceUSD > 0.01 && (
            <div className="mt-6 p-5 sm:p-6 bg-amber-50/70 border border-amber-200/70 rounded-2xl print:border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <h2 className="text-sm font-black text-amber-900 flex items-center gap-2">
                    <Building2 size={18} className="text-amber-700" />
                    ¿Cómo pagar tu saldo pendiente?
                  </h2>
                  <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                    Puedes cancelar mediante <strong>SINPE Móvil</strong> al número oficial de JRS Cargo. Al transferir, incluye tu nombre en el detalle.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <div className="bg-white border border-amber-300 rounded-xl px-3.5 py-1.5 flex items-center gap-2 shadow-sm">
                      <span className="text-xs text-gray-500 font-bold">SINPE Móvil:</span>
                      <span className="text-sm font-black text-brand-blue tracking-wider">7260-1238</span>
                      <span className="text-[11px] text-gray-400">(JRS Cargo)</span>
                      <button
                        onClick={copySinpeNumber}
                        className="ml-2 p-1 text-gray-400 hover:text-brand-blue transition-colors"
                        title="Copiar número de SINPE Móvil"
                      >
                        {copiedSinpe ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                    {copiedSinpe && (
                      <span className="text-xs font-bold text-green-700 animate-fade-in">
                        ¡Número copiado!
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0 print:hidden">
                  <a
                    href={`https://wa.me/50672601238?text=${encodeURIComponent(whatsappPaymentMsg)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20b858] text-white px-5 py-3 rounded-xl font-black text-xs sm:text-sm shadow-md shadow-green-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    <MessageCircle size={18} />
                    <span>Reportar Comprobante</span>
                  </a>
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
              <span>Facturas Pendientes ({pendingInvoices.length})</span>
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
              <span>Todas las Facturas ({invoices.length})</span>
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
                  {activeTab === 'pendientes' ? 'Facturas Pendientes de Pago' : 'Historial Completo de Facturación'}
                </h2>
                <span className="text-xs text-gray-400">
                  Total mostradas: {activeTab === 'pendientes' ? pendingInvoices.length : invoices.length}
                </span>
              </div>

              {(activeTab === 'pendientes' ? pendingInvoices : invoices).length === 0 ? (
                <div className="p-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <CheckCircle2 size={40} className="text-green-500 mx-auto mb-2" />
                  <p className="font-bold text-gray-700">No hay facturas en esta sección</p>
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
                                  Factura #{inv.invoice_number}
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

                          <div className="flex items-center justify-between md:justify-end gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                            <div className="text-right">
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

                            {hasItems && (
                              <button
                                onClick={() => toggleInvoiceExpand(inv.id)}
                                className="p-2 text-gray-400 hover:text-brand-blue hover:bg-gray-100 rounded-xl transition-colors print:hidden"
                                title="Ver detalles de paquetes"
                              >
                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Invoice Items details (Expandable) */}
                        {hasItems && (isExpanded || typeof window === 'undefined') && (
                          <div className="bg-slate-50/80 p-4 border-t border-gray-100 rounded-b-2xl">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Package size={14} className="text-brand-blue" />
                              Paquetes y servicios incluidos:
                            </p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-400 border-b border-gray-200/60 text-left">
                                    <th className="py-1.5 font-bold">Servicio</th>
                                    <th className="py-1.5 font-bold">Tracking / Guía</th>
                                    <th className="py-1.5 font-bold text-right">Peso</th>
                                    <th className="py-1.5 font-bold text-right">Monto</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {inv.items.map((it, idx) => (
                                    <tr key={idx} className="text-gray-700">
                                      <td className="py-1.5 font-medium">{it.service_name}</td>
                                      <td className="py-1.5 font-mono text-brand-blue font-bold">
                                        {it.tracking_number ? (
                                          <a
                                            href={`/tracking?number=${encodeURIComponent(it.tracking_number)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:underline inline-flex items-center gap-1"
                                          >
                                            {it.tracking_number}
                                            <ExternalLink size={10} className="opacity-60" />
                                          </a>
                                        ) : (
                                          '—'
                                        )}
                                      </td>
                                      <td className="py-1.5 text-right font-medium">{it.weight ? `${it.weight} lbs` : '—'}</td>
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
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b border-gray-100">
                        <th className="p-3 font-bold">Fecha</th>
                        <th className="p-3 font-bold">Método</th>
                        <th className="p-3 font-bold">Referencia / Comprobante</th>
                        <th className="p-3 font-bold text-right">Monto Aplicado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payments.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50/50">
                          <td className="p-3 font-semibold text-gray-700">{formatDisplayDate(p.payment_date)}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-bold rounded-md">
                              {p.payment_method || 'Transferencia'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-gray-600">
                            {p.reference_number || p.notes || '—'}
                          </td>
                          <td className="p-3 text-right font-black text-green-600 text-sm">
                            +${Number(p.amount || 0).toFixed(2)} USD
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer info (Official disclaimer) */}
        <div className="mt-8 text-center text-xs text-gray-400 space-y-1">
          <p className="font-bold text-gray-500">JRS CARGO S.A. • Cédula Jurídica: 3-101-XXXXXX</p>
          <p>San Pablo de Heredia, Costa Rica • WhatsApp Soporte: +506 7260-1238 • info@jrscargocr.com</p>
          <p className="text-[11px] text-gray-400 pt-2">
            Este enlace es único y seguro para tu cuenta. No compartas información confidencial con terceros.
          </p>
        </div>

      </div>
    </div>
  );
}
