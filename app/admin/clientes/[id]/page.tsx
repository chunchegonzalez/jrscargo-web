'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Printer, FileText, DollarSign, Mail, Phone, Trash2, Plus, Edit3, MapPin, Tag, X } from 'lucide-react';
import Link from 'next/link';
import { getInvoiceStats, formatCurrency, formatDisplayDate, parseClientAddress } from '@/lib/billing';
import { useModal } from '@/app/components/ModalProvider';

type Client = {
  id: string;
  name: string;
  email: string;
  secondary_email?: string;
  phone?: string;
  address?: string;
  cedula?: string;
  discount_percent?: number;
  created_at: string;
};

type Invoice = {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  currency?: string;
  issue_date: string;
  invoice_payments: { amount_applied: number }[];
};

type Payment = {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  currency?: string;
  reference_number?: string;
  invoice_payments: { invoice_id: string, amount_applied: number, invoices: { invoice_number: string, currency?: string } }[];
};

export default function ClientProfilePage({ params }: { params: { id: string } }) {
  const { showAlert, showConfirm } = useModal();
  const clientId = params.id;
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'facturas' | 'pagos'>('facturas');

  // Modal de Edición
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Client>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Filtros de fecha para historial de pagos
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      const data = await res.json();
      
      if (data.success) {
        setClient(data.client);
        setInvoices(data.invoices || []);
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (client?.name) {
      document.title = `JRS CARGO CR - ${client.name}`;
    }
  }, [client?.name]);

  const handleDeletePayment = async (paymentId: string) => {
    if (!(await showConfirm('Confirmación', '¿Estás seguro de que deseas anular este pago? El saldo de las facturas asociadas volverá a estar pendiente.'))) return;
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        loadData();
      } else {
        await showAlert('Aviso', 'Error al anular el pago');
      }
    } catch {
      await showAlert('Aviso', 'Error de red');
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { 
        name: editForm.name,
        email: editForm.email,
        secondary_email: editForm.secondary_email,
        phone: editForm.phone,
        cedula: editForm.cedula,
        discount_percent: editForm.discount_percent !== undefined ? Number(editForm.discount_percent) : 0
      };
      
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsEditing(false);
        loadData();
      } else {
        await showAlert('Aviso', 'Error: ' + (data.error || 'Ocurrió un error al guardar.'));
      }
    } catch {
      await showAlert('Aviso', 'Error de red al actualizar');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400 text-sm">Cargando perfil del cliente...</div>;
  if (!client) return <div className="p-8 text-center text-red-500 text-sm">Cliente no encontrado</div>;

  const parsedExtra = parseClientAddress(client.address);
  const cleanCedula = (client.cedula && !client.cedula.trim().startsWith('{'))
    ? client.cedula.trim()
    : (parsedExtra.cedula && !parsedExtra.cedula.trim().startsWith('{') ? parsedExtra.cedula.trim() : '');
  const cleanAddress = parsedExtra.raw_address && !parsedExtra.raw_address.trim().startsWith('{')
    ? parsedExtra.raw_address.trim()
    : (client.address && !client.address.trim().startsWith('{') ? client.address.trim() : '');
  const cleanSecondaryEmail = client.secondary_email || parsedExtra.secondary_email || '';

  let totalFacturadoUSD = 0, totalFacturadoCRC = 0;
  let totalPagadoUSD = 0, totalPagadoCRC = 0;
  let totalPendienteUSD = 0, totalPendienteCRC = 0;

  invoices.forEach(inv => {
    const stats = getInvoiceStats(inv);
    if (inv.currency === 'CRC') {
      totalFacturadoCRC += stats.total;
      totalPagadoCRC += stats.paid;
      totalPendienteCRC += stats.pending;
    } else {
      totalFacturadoUSD += stats.total;
      totalPagadoUSD += stats.paid;
      totalPendienteUSD += stats.pending;
    }
  });

  const saldoAFavorUSD = Number(
    payments.reduce((sum, pay) => {
      const amt = Number(pay.amount) || 0;
      const applied = (pay.invoice_payments || []).reduce((s, ip) => s + (Number(ip.amount_applied) || 0), 0);
      const rem = amt - applied;
      return sum + (rem > 0.009 ? rem : 0);
    }, 0).toFixed(2)
  );

  return (
    <div className="space-y-5 relative font-sans print:m-0 print:p-0">
      
      {/* Header Bar (Hidden in Print) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/clientes" 
            className="w-9 h-9 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 transition-colors flex items-center justify-center shadow-2xs shrink-0"
            title="Volver a Clientes"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Perfil del Cliente</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/15">
                Expediente
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Gestión de cuenta, historial de pagos y facturación</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => {
              setEditForm({ 
                name: client.name, 
                email: client.email, 
                secondary_email: cleanSecondaryEmail,
                phone: client.phone || '', 
                cedula: cleanCedula,
                discount_percent: client.discount_percent || parsedExtra.discount_percent || 0,
                created_at: new Date(client.created_at).toISOString().split('T')[0] 
              });
              setIsEditing(true);
            }}
            className="h-9 px-3.5 bg-white border border-slate-200/90 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Edit3 size={14} className="text-slate-500" />
            <span>Editar Perfil</span>
          </button>
          
          <Link 
            href={`/admin/cuentas-por-cobrar/recibir/${client.id}`}
            className="h-9 px-3.5 bg-emerald-50 border border-emerald-200/80 text-emerald-700 font-semibold text-xs rounded-lg hover:bg-emerald-100 transition-all shadow-2xs inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <DollarSign size={14} className="text-emerald-600" />
            <span>Recibir Pago / Saldo a Favor</span>
          </Link>

          <Link 
            href={`/admin/facturacion/nueva?client_id=${client.id}&client_name=${encodeURIComponent(client.name)}`}
            className="h-9 px-3.5 bg-[#FDBF47] hover:bg-[#eab03e] text-[#0B1D2B] font-semibold text-xs rounded-lg transition-all shadow-2xs inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>Nueva Factura</span>
          </Link>

          <Link 
            href={`/admin/cuentas-por-cobrar/estado-cuenta/${client.id}`}
            className="h-9 px-3.5 bg-[#0E2942] hover:bg-[#071828] text-white font-semibold text-xs rounded-lg transition-all shadow-2xs inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Printer size={14} />
            <span>Estado de Cuenta</span>
          </Link>
        </div>
      </div>

      <div className="space-y-5 print:p-0 print:max-w-none">
        
        {/* Print Header */}
        <div className="hidden print:block mb-8 pb-4 border-b-2 border-gray-800">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">JRS CARGO COSTA RICA</h2>
              <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Estado de Cuenta</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Client Info & Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Client Details */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 print:bg-transparent print:border-none print:p-0 print:mb-6">
            <div className="flex items-center gap-3.5 mb-4 print:mb-4">
              <div className="w-12 h-12 rounded-xl bg-brand-blue/10 border border-brand-blue/15 text-brand-blue flex items-center justify-center font-black text-xl shrink-0 print:hidden">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900">{client.name}</h2>
                  {(Number(client.discount_percent || 0) > 0 || Number(parsedExtra.discount_percent || 0) > 0) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-200/80">
                      <Tag size={11} /> {client.discount_percent || parsedExtra.discount_percent}% Descuento Fijo
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Cliente desde {new Date(client.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium bg-slate-50/70 px-3.5 py-2.5 rounded-lg border border-slate-200/70">
                <Mail size={14} className="text-slate-400 shrink-0" />
                <div className="truncate">
                  <a href={`mailto:${client.email}`} className="hover:text-brand-blue transition-colors truncate max-w-[200px] font-semibold text-slate-800">{client.email}</a>
                  {cleanSecondaryEmail && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      <span className="font-bold text-brand-blue/70">2º: </span>
                      <a href={`mailto:${cleanSecondaryEmail}`} className="hover:text-brand-blue transition-colors">{cleanSecondaryEmail}</a>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium bg-slate-50/70 px-3.5 py-2.5 rounded-lg border border-slate-200/70">
                <Phone size={14} className="text-slate-400 shrink-0" />
                {client.phone ? (
                  <a href={`tel:${client.phone}`} className="hover:text-brand-blue transition-colors font-semibold text-slate-800 tabular-nums">{client.phone}</a>
                ) : (
                  <span className="text-slate-400 italic">Sin teléfono</span>
                )}
              </div>
              {cleanCedula ? (
                <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium bg-slate-50/70 px-3.5 py-2.5 rounded-lg border border-slate-200/70">
                  <FileText size={14} className="text-slate-400 shrink-0" />
                  <span>Cédula: <strong className="text-slate-900 font-mono">{cleanCedula}</strong></span>
                </div>
              ) : null}
              {cleanAddress ? (
                <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium bg-slate-50/70 px-3.5 py-2.5 rounded-lg border border-slate-200/70">
                  <MapPin size={14} className="text-slate-400 shrink-0" />
                  <span>Dirección: <strong className="text-slate-900">{cleanAddress}</strong></span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 flex items-center justify-between print:border-none print:p-2">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Saldo Pendiente</span>
                <span className="text-[11px] text-slate-400">Por cobrar</span>
              </div>
              <div className="text-right tabular-nums">
                <span className="block text-xl font-black text-amber-600">{formatCurrency(totalPendienteUSD, 'USD')}</span>
                <span className="block text-sm font-bold text-amber-500">{formatCurrency(totalPendienteCRC, 'CRC')}</span>
              </div>
            </div>
            {saldoAFavorUSD > 0 && (
              <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/80 flex items-center justify-between print:border-none print:p-2">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Saldo a Favor Disponible</span>
                  <Link href={`/admin/cuentas-por-cobrar/recibir/${client.id}`} className="text-[11px] font-semibold text-emerald-600 hover:underline print:hidden">
                    Aplicar o gestionar →
                  </Link>
                </div>
                <div className="text-right tabular-nums">
                  <span className="block text-lg font-black text-emerald-700">+{formatCurrency(saldoAFavorUSD, 'USD')}</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] print:border-none print:p-2 tabular-nums">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Facturado</p>
                <p className="text-sm font-bold text-slate-900">{formatCurrency(totalFacturadoUSD, 'USD')}</p>
                <p className="text-xs font-semibold text-slate-500">{formatCurrency(totalFacturadoCRC, 'CRC')}</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] print:border-none print:p-2 tabular-nums">
                <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider mb-1">Total Pagado</p>
                <p className="text-sm font-bold text-emerald-700">{formatCurrency(totalPagadoUSD, 'USD')}</p>
                <p className="text-xs font-semibold text-emerald-600">{formatCurrency(totalPagadoCRC, 'CRC')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Card for Tabs & Tables */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden print:border-none print:shadow-none">
          {/* Toolbar / Tabs (Hidden in Print) */}
          <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setActiveTab('facturas')}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'facturas'
                    ? 'bg-brand-blue text-white shadow-2xs'
                    : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText size={14} />
                <span>Facturas</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums ${
                  activeTab === 'facturas' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {invoices.length}
                </span>
              </button>
              <button 
                onClick={() => setActiveTab('pagos')}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'pagos'
                    ? 'bg-brand-blue text-white shadow-2xs'
                    : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <DollarSign size={14} />
                <span>Historial de Pagos</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums ${
                  activeTab === 'pagos' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {payments.length}
                </span>
              </button>
            </div>

            {activeTab === 'pagos' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Desde:</span>
                <input 
                  type="date" 
                  value={paymentStartDate}
                  onChange={(e) => setPaymentStartDate(e.target.value)}
                  className="h-9 px-2.5 bg-white border border-slate-200/90 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                />
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider ml-1">Hasta:</span>
                <input 
                  type="date" 
                  value={paymentEndDate}
                  onChange={(e) => setPaymentEndDate(e.target.value)}
                  className="h-9 px-2.5 bg-white border border-slate-200/90 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                />
                {(paymentStartDate || paymentEndDate) && (
                  <button 
                    onClick={() => { setPaymentStartDate(''); setPaymentEndDate(''); }}
                    className="h-9 px-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Tab Content: Facturas */}
          <div className={activeTab === 'facturas' ? 'block' : 'hidden print:block'}>
            <div className="hidden print:block mb-4 mt-8">
              <h3 className="text-lg font-bold text-gray-800 border-b border-gray-300 pb-2">Desglose de Facturas</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/95 border-b border-slate-200/90 text-[11px] uppercase tracking-wider text-slate-500 font-semibold print:bg-transparent print:border-gray-800">
                    <th className="py-2.5 px-3.5 pl-5 print:text-gray-800">Factura</th>
                    <th className="py-2.5 px-3.5 print:text-gray-800">Emisión</th>
                    <th className="py-2.5 px-3.5 print:text-gray-800">Estado</th>
                    <th className="py-2.5 px-3.5 text-right print:text-gray-800">Total</th>
                    <th className="py-2.5 px-3.5 pr-5 text-right print:text-gray-800">Pendiente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px]">
                  {invoices.length === 0 ? (
                    <tr><td colSpan={5} className="py-10 px-4 text-center text-slate-400">No hay facturas registradas.</td></tr>
                  ) : (
                    invoices.map(inv => {
                      const stats = getInvoiceStats(inv);
                      const displayStatus = stats.displayStatus;
                      
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/90 transition-colors print:hover:bg-transparent">
                          <td className="py-2.5 px-3.5 pl-5 font-mono font-bold text-brand-blue print:text-black">
                            <Link href={`/admin/facturacion/${inv.id}`} className="hover:underline">
                              #{inv.invoice_number}
                            </Link>
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-600 tabular-nums">{formatDisplayDate(inv.issue_date)}</td>
                          <td className="py-2.5 px-3.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border print:bg-transparent print:p-0
                              ${displayStatus === 'Pagada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 print:text-green-800' : 
                                displayStatus === 'Vencida' ? 'bg-red-50 text-red-700 border-red-200/80 print:text-red-800' : 
                                'bg-amber-50 text-amber-700 border-amber-200/80 print:text-orange-800'}`}>
                              {displayStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 font-medium text-slate-600 text-right tabular-nums">{formatCurrency(stats.total, inv.currency)}</td>
                          <td className="py-2.5 px-3.5 pr-5 font-bold text-slate-900 text-right tabular-nums">{formatCurrency(stats.pending, inv.currency)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tab Content: Historial de Pagos */}
          <div className={`${activeTab === 'pagos' ? 'block' : 'hidden'} print:block print:mt-12`}>
            <div className="hidden print:block mb-4">
              <h3 className="text-lg font-bold text-gray-800 border-b border-gray-300 pb-2">Historial de Pagos</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/95 border-b border-slate-200/90 text-[11px] uppercase tracking-wider text-slate-500 font-semibold print:bg-transparent print:border-gray-800">
                    <th className="py-2.5 px-3.5 pl-5 print:text-gray-800">Fecha</th>
                    <th className="py-2.5 px-3.5 print:text-gray-800">Método</th>
                    <th className="py-2.5 px-3.5 print:text-gray-800">Referencia</th>
                    <th className="py-2.5 px-3.5 print:text-gray-800">Facturas Aplicadas</th>
                    <th className="py-2.5 px-3.5 text-right print:text-gray-800">Monto</th>
                    <th className="py-2.5 px-3.5 pr-5 text-right print:hidden">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px]">
                  {(() => {
                    const filteredPayments = payments.filter(pay => {
                      if (paymentStartDate && pay.payment_date < paymentStartDate) return false;
                      if (paymentEndDate && pay.payment_date > paymentEndDate) return false;
                      return true;
                    });

                    if (filteredPayments.length === 0) {
                      return <tr><td colSpan={6} className="py-10 px-4 text-center text-slate-400">No hay pagos en este rango de fechas.</td></tr>;
                    }

                    return filteredPayments.map(pay => (
                      <tr key={pay.id} className="hover:bg-slate-50/90 transition-colors print:hover:bg-transparent">
                        <td className="py-2.5 px-3.5 pl-5 text-slate-800 font-medium tabular-nums">{pay.payment_date}</td>
                        <td className="py-2.5 px-3.5 text-slate-600">{pay.payment_method || '-'}</td>
                        <td className="py-2.5 px-3.5 text-slate-600 font-mono text-xs">{pay.reference_number || '-'}</td>
                        <td className="py-2.5 px-3.5 text-slate-500">
                          <div className="flex flex-wrap gap-1">
                            {pay.invoice_payments?.map(ip => (
                              <span key={ip.invoice_id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                                <span className="font-mono font-semibold text-brand-blue">#{ip.invoices?.invoice_number}</span>
                                <span className="text-[11px] text-slate-500">({formatCurrency(Number(ip.amount_applied), ip.invoices?.currency || pay.currency)})</span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-emerald-700 text-right tabular-nums">+{formatCurrency(Number(pay.amount), pay.currency)}</td>
                        <td className="py-2.5 px-3.5 pr-5 text-right print:hidden">
                          <button 
                            onClick={() => handleDeletePayment(pay.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors inline-flex cursor-pointer" 
                            title="Anular Pago"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] z-[9999] flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/60">
              <h3 className="font-bold text-base text-slate-900">Editar Perfil del Cliente</h3>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 hover:bg-slate-200/60 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto">
              <form id="edit-client-form" onSubmit={handleUpdateClient} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Nombre Completo *</label>
                  <input 
                    type="text" 
                    required
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200/90 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm text-slate-800 font-medium bg-white transition-colors"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Correo Electrónico *</label>
                    <input 
                      type="email" 
                      required
                      value={editForm.email || ''}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200/90 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm text-slate-800 bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Segundo Correo <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                    </label>
                    <input 
                      type="email" 
                      placeholder="ejemplo2@correo.com"
                      value={editForm.secondary_email || ''}
                      onChange={(e) => setEditForm({...editForm, secondary_email: e.target.value})}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200/90 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm text-slate-800 bg-white transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Teléfono / WhatsApp</label>
                    <input 
                      type="text" 
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200/90 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm text-slate-800 bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Cédula / Identificación</label>
                    <input 
                      type="text" 
                      value={editForm.cedula || ''}
                      onChange={(e) => setEditForm({...editForm, cedula: e.target.value})}
                      placeholder="Para facturación"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200/90 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm text-slate-800 bg-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Cliente Desde</label>
                  <input 
                    type="date" 
                    required
                    value={editForm.created_at || ''}
                    onChange={(e) => setEditForm({...editForm, created_at: e.target.value})}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200/90 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm text-slate-800 bg-white transition-colors"
                  />
                </div>

                {/* Descuento Fijo */}
                <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag size={13} className="text-emerald-600" /> Descuento Fijo Automático (%)
                    </label>
                    {Number(editForm.discount_percent || 0) > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                        {editForm.discount_percent}% Activo
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      placeholder="0 (Sin descuento)"
                      value={editForm.discount_percent !== undefined && editForm.discount_percent !== null ? editForm.discount_percent : ''} 
                      onChange={(e) => setEditForm({...editForm, discount_percent: parseFloat(e.target.value) || 0})}
                      className="w-full h-9 px-3 bg-white border border-emerald-200 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 pr-9"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-700 font-bold text-xs">%</span>
                  </div>
                  <p className="text-[11px] text-emerald-700/80 leading-tight">
                    Este porcentaje se aplicará automáticamente en el sistema de facturación al seleccionar a este cliente.
                  </p>
                </div>
              </form>
            </div>
            
            <div className="px-5 py-3.5 border-t border-slate-200/80 bg-slate-50/60 flex justify-end gap-2">
              <button 
                type="button"
                onClick={() => setIsEditing(false)}
                className="h-9 px-4 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="edit-client-form"
                disabled={isSaving}
                className="h-9 px-5 rounded-lg text-xs font-semibold bg-brand-blue hover:bg-[#0e354b] text-white shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
