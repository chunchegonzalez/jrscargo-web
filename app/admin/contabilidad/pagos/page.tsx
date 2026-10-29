'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DollarSign, Search, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDisplayDate } from '@/lib/billing';

type Payment = {
  id: string;
  amount: number;
  currency?: string;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  clients?: { id: string, name: string, email: string };
  invoice_payments?: { amount_applied: number, invoice_id: string, invoices?: { invoice_number: string, currency?: string } }[];
};

export default function HistorialPagosPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');

  // Modal States
  const [alertModal, setAlertModal] = useState<{isOpen: boolean, title: string, message: string, type: 'success'|'error', onConfirm?: () => void} | null>(null);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payments', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setPayments(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeletePayment = (paymentId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Anular Pago',
      message: '¿Estás seguro de que deseas anular este pago? El saldo de las facturas asociadas volverá a estar pendiente y esta acción no se puede deshacer.',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(`/api/payments/${paymentId}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            setAlertModal({
              isOpen: true,
              title: 'Éxito',
              message: 'Pago anulado exitosamente.',
              type: 'success',
              onConfirm: () => loadData()
            });
          } else {
            setAlertModal({ isOpen: true, title: 'Error', message: 'Error al anular el pago. Inténtalo de nuevo.', type: 'error' });
          }
        } catch {
          setAlertModal({ isOpen: true, title: 'Error', message: 'Error de red al intentar anular el pago.', type: 'error' });
        }
      }
    });
  };

  const filteredPayments = payments.filter(pay => {
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = 
      (pay.clients?.name || '').toLowerCase().includes(searchLower) ||
      (pay.reference_number || '').toLowerCase().includes(searchLower) ||
      (pay.payment_method || '').toLowerCase().includes(searchLower) ||
      (pay.invoice_payments?.some(ip => ip.invoices?.invoice_number?.toLowerCase().includes(searchLower)));
      
    const matchStartDate = !paymentStartDate || pay.payment_date >= paymentStartDate;
    const matchEndDate = !paymentEndDate || pay.payment_date <= paymentEndDate;

    return matchSearch && matchStartDate && matchEndDate;
  });

  const totalFilteredAmountUSD = filteredPayments.filter(p => p.currency !== 'CRC').reduce((acc, pay) => acc + Number(pay.amount), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Historial de Pagos</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              Cobros Recibidos
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Visualiza y administra todos los cobros realizados a clientes.</p>
        </div>
        <Link
          href="/admin/cuentas-por-cobrar"
          className="h-9 px-3.5 bg-white border border-slate-200/90 text-slate-700 hover:text-slate-900 font-semibold rounded-lg hover:bg-slate-50 shadow-2xs transition-all inline-flex items-center gap-1.5 text-xs"
        >
          <ArrowLeft size={14} className="text-slate-500" /> Volver a CxC
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Recaudado (USD)</p>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-700 tabular-nums">
                {formatCurrency(totalFilteredAmountUSD, 'USD')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Ingresos confirmados según filtro</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={19} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Transacciones Registradas</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 tabular-nums">
                {filteredPayments.length}
              </span>
              {filteredPayments.length !== payments.length && (
                <span className="text-xs font-medium text-slate-400 tabular-nums">de {payments.length}</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Recibos de pago activos</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-brand-blue flex items-center justify-center shrink-0 font-bold text-sm">
            #
          </div>
        </div>
      </div>

      {/* Lista de Pagos */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-0 lg:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
            <input 
              type="text" 
              placeholder="Buscar cliente, referencia, método o factura..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-4 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all" 
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Desde:</span>
              <input 
                type="date" 
                value={paymentStartDate}
                onChange={(e) => setPaymentStartDate(e.target.value)}
                className="h-9 px-2.5 bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-brand-blue transition-colors"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Hasta:</span>
              <input 
                type="date" 
                value={paymentEndDate}
                onChange={(e) => setPaymentEndDate(e.target.value)}
                className="h-9 px-2.5 bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-brand-blue transition-colors"
              />
            </div>
            {(paymentStartDate || paymentEndDate) && (
              <button 
                onClick={() => { setPaymentStartDate(''); setPaymentEndDate(''); }}
                className="h-9 px-3 text-xs text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/60 font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Limpiar Fechas
              </button>
            )}

            <span className="h-9 px-3 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center tabular-nums">
              {filteredPayments.length} {filteredPayments.length === 1 ? 'pago' : 'pagos'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/95 border-b border-slate-200/90">
              <tr className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                <th className="py-2.5 px-3.5 pl-5">Fecha</th>
                <th className="py-2.5 px-3.5">Cliente</th>
                <th className="py-2.5 px-3.5">Método & Ref</th>
                <th className="py-2.5 px-3.5">Facturas Aplicadas</th>
                <th className="py-2.5 px-3.5 text-right">Monto</th>
                <th className="py-2.5 px-3.5 pr-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 px-6 text-center text-slate-400">Cargando pagos...</td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-6 text-center text-slate-400">No se encontraron pagos con los filtros actuales.</td>
                </tr>
              ) : (
                filteredPayments.map(pay => (
                  <tr key={pay.id} className="hover:bg-slate-50/90 transition-colors group">
                    <td className="py-2.5 px-3.5 pl-5 text-xs text-slate-500 whitespace-nowrap tabular-nums">
                      {formatDisplayDate(pay.payment_date)}
                    </td>
                    <td className="py-2.5 px-3.5">
                      {pay.clients ? (
                        <Link href={`/admin/clientes/${pay.clients.id}`} className="font-semibold text-slate-900 hover:text-brand-blue transition-colors">
                          {pay.clients.name}
                        </Link>
                      ) : (
                        <span className="font-medium text-slate-400">Cliente Desconocido</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 rounded-md text-[11px] font-semibold text-slate-700">
                        {pay.payment_method || '-'}
                      </span>
                      {pay.reference_number && (
                        <span className="block mt-0.5 text-xs text-slate-400 font-mono">Ref: {pay.reference_number}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <div className="flex flex-col gap-1">
                        {pay.invoice_payments?.map((ip, idx) => (
                          <div key={idx} className="text-xs flex items-center justify-between gap-3 max-w-[190px]">
                            <Link href={`/admin/facturacion/${ip.invoice_id}`} className="font-mono font-bold text-brand-blue hover:underline">
                              #{ip.invoices?.invoice_number || 'Desc.'}
                            </Link>
                            <span className="text-slate-500 tabular-nums">{formatCurrency(Number(ip.amount_applied), ip.invoices?.currency || pay.currency)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap tabular-nums">
                      <p className="text-sm font-black text-emerald-700">+{formatCurrency(Number(pay.amount), pay.currency)}</p>
                    </td>
                    <td className="py-2.5 px-3.5 pr-5 text-right whitespace-nowrap">
                      <button 
                        onClick={() => handleDeletePayment(pay.id)} 
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors inline-flex cursor-pointer"
                        title="Anular Pago"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Tabla */}
        <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>
            Mostrando <strong className="font-semibold text-slate-700">{filteredPayments.length}</strong> de{' '}
            <strong className="font-semibold text-slate-700">{payments.length}</strong> pagos registrados
          </span>
        </div>
      </div>

      {/* Alert Modal */}
      {alertModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-sm overflow-hidden flex flex-col">
            <div className={`px-5 py-4 border-b ${alertModal.type === 'success' ? 'border-emerald-200/80 bg-emerald-50/70' : 'border-red-200/80 bg-red-50/70'}`}>
              <h3 className={`font-bold text-sm ${alertModal.type === 'success' ? 'text-emerald-900' : 'text-red-900'}`}>
                {alertModal.title}
              </h3>
            </div>
            <div className="p-5">
              <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">{alertModal.message}</p>
            </div>
            <div className="px-5 py-3 border-t border-slate-200/80 flex justify-end bg-slate-50/70">
              <button
                onClick={() => {
                  setAlertModal(null);
                  if (alertModal.onConfirm) alertModal.onConfirm();
                }}
                className={`h-9 px-4 rounded-lg text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer ${
                  alertModal.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-brand-blue hover:bg-[#0e354b]'
                }`}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-amber-200/80 bg-amber-50/70">
              <h3 className="font-bold text-sm text-amber-900 flex items-center gap-2">
                Atención: {confirmModal.title}
              </h3>
            </div>
            <div className="p-5">
              <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="px-5 py-3 border-t border-slate-200/80 flex justify-end gap-2 bg-slate-50/70">
              <button
                onClick={() => setConfirmModal(null)}
                className="h-9 px-4 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="h-9 px-4 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-2xs cursor-pointer"
              >
                Sí, estoy seguro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
