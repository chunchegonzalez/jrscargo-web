'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DollarSign, Search, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/billing';

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
      const res = await fetch('/api/payments');
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
  const totalFilteredAmountCRC = filteredPayments.filter(p => p.currency === 'CRC').reduce((acc, pay) => acc + Number(pay.amount), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-blue mb-2">Historial de Pagos</h1>
          <p className="text-gray-500">Visualiza y administra todos los cobros realizados a clientes.</p>
        </div>
        <Link href="/admin/cuentas-por-cobrar" className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2">
          <ArrowLeft size={18} /> Volver a CxC
        </Link>
      </div>

      <div className="bg-gradient-to-br from-[#0A2636] to-brand-blue rounded-3xl p-6 md:p-8 shadow-lg text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-brand-blue-light font-bold uppercase tracking-wider mb-2 text-sm flex items-center gap-2">
              <DollarSign size={18} /> Total Recaudado (USD)
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-white">{formatCurrency(totalFilteredAmountUSD, 'USD')}</h2>
          </div>
        </div>
        </div>
      </div>

      {/* Lista de Pagos */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
            <DollarSign className="text-brand-blue" size={24} /> 
            Registro de Transacciones
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Desde:</span>
              <input 
                type="date" 
                value={paymentStartDate}
                onChange={(e) => setPaymentStartDate(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-brand-blue"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Hasta:</span>
              <input 
                type="date" 
                value={paymentEndDate}
                onChange={(e) => setPaymentEndDate(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-brand-blue"
              />
            </div>
            {(paymentStartDate || paymentEndDate) && (
              <button 
                onClick={() => { setPaymentStartDate(''); setPaymentEndDate(''); }}
                className="px-3 py-2 text-sm text-brand-blue font-bold hover:bg-brand-blue/5 rounded-lg transition-colors"
              >
                Limpiar Fechas
              </button>
            )}

            <div className="relative w-full sm:w-64">
              <input 
                type="text" 
                placeholder="Buscar cliente, ref o factura..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue" 
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Método & Ref</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Facturas Aplicadas</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Monto</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 font-medium">Cargando pagos...</td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 font-medium">No se encontraron pagos con los filtros actuales.</td>
                </tr>
              ) : (
                filteredPayments.map(pay => (
                  <tr key={pay.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-sm font-medium text-gray-600">
                      {new Date(pay.payment_date).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      {pay.clients ? (
                        <Link href={`/admin/clientes/${pay.clients.id}`} className="font-bold text-gray-800 hover:text-brand-blue transition-colors">
                          {pay.clients.name}
                        </Link>
                      ) : (
                        <span className="font-bold text-gray-500">Cliente Desconocido</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-600">
                        {pay.payment_method || '-'}
                      </span>
                      {pay.reference_number && (
                        <span className="block mt-1 text-xs text-gray-500 font-mono">Ref: {pay.reference_number}</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {pay.invoice_payments?.map((ip, idx) => (
                          <div key={idx} className="text-sm flex items-center justify-between gap-4 max-w-[200px]">
                            <Link href={`/admin/facturacion/${ip.invoice_id}`} className="font-bold text-brand-blue hover:underline">
                              #{ip.invoices?.invoice_number || 'Desc.'}
                            </Link>
                            <span className="text-gray-500">{formatCurrency(Number(ip.amount_applied), ip.invoices?.currency || pay.currency)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <p className="text-lg font-black text-green-600">+{formatCurrency(Number(pay.amount), pay.currency)}</p>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleDeletePayment(pay.id)} 
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                        title="Anular Pago"
                      >
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Alert Modal */}
      {alertModal?.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all">
            <div className={`p-6 border-b ${alertModal.type === 'success' ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'}`}>
              <h3 className={`font-bold text-lg ${alertModal.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                {alertModal.title}
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 font-medium">{alertModal.message}</p>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50">
              <button
                onClick={() => {
                  setAlertModal(null);
                  if (alertModal.onConfirm) alertModal.onConfirm();
                }}
                className={`px-6 py-2 rounded-xl font-bold text-white shadow-sm transition-colors ${
                  alertModal.type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-brand-blue hover:bg-brand-blue/90'
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform transition-all">
            <div className="p-6 border-b border-orange-100 bg-orange-50">
              <h3 className="font-bold text-lg text-orange-800 flex items-center gap-2">
                Atención: {confirmModal.title}
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 font-medium leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
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
