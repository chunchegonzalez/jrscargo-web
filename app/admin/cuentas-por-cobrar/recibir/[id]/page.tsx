'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Printer, Check, Trash2, Wallet, Sparkles, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getInvoiceStats, formatCurrency, formatDisplayDate, parseLocalDate, getLocalTodayDate } from '@/lib/billing';

export default function RecibirPagoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const clientId = params.id;

  const [client, setClient] = useState<Record<string, unknown> | null>(null);
  const [invoices, setInvoices] = useState<Record<string, unknown>[]>([]);
  const [clientPayments, setClientPayments] = useState<Record<string, unknown>[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(500);
  const [loading, setLoading] = useState(true);

  // Form State
  const [paymentDate, setPaymentDate] = useState(getLocalTodayDate());
  const [paymentMethod, setPaymentMethod] = useState('');
  const [currency] = useState('USD');
  const [reference, setReference] = useState('');
  const [totalPaymentAmount, setTotalPaymentAmount] = useState<string>('');
  const [amountToApply, setAmountToApply] = useState<number>(0);
  
  // Array of { invoice_id, amount_applied, isFullyPaid }
  const [applications, setApplications] = useState<Record<string, number>>({});
  const [creditInputStr, setCreditInputStr] = useState<string>('');
  const [showCreditBox, setShowCreditBox] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApplyingCredit, setIsApplyingCredit] = useState(false);

  // Modal States
  const [alertModal, setAlertModal] = useState<{isOpen: boolean, title: string, message: string, type: 'success'|'error', onConfirm?: () => void} | null>(null);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [res, rateRes] = await Promise.all([
          fetch(`/api/clients/${clientId}`, { cache: 'no-store' }),
          fetch('/api/exchange-rate', { cache: 'no-store' })
        ]);
        const data = await res.json();

        if (rateRes.ok) {
          const rateData = await rateRes.json();
          if (rateData.success && Number(rateData.rate) > 0) {
            setExchangeRate(Number(rateData.rate));
          }
        }

        if (data.success) {
          setClient(data.client);
          setClientPayments(data.payments || []);

          // Calculate pending balance for each invoice
          const processedInvs = (data.invoices || []).map((inv: Record<string, unknown>) => {
            const stats = getInvoiceStats(inv);
            return {
              ...inv,
              pendingBalance: stats.pending,
              displayStatus: stats.displayStatus
            };
          }).filter((inv: Record<string, unknown>) => (inv.pendingBalance as number) > 0);

          setInvoices(processedInvs);

          // Check if specific invoice requested in URL query
          if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const targetInvId = urlParams.get('invoice_id');
            if (targetInvId) {
              const matched = processedInvs.find((i: Record<string, unknown>) => i.id === targetInvId);
              if (matched) {
                const bal = matched.pendingBalance as number;
                setApplications({ [targetInvId]: bal });
                setTotalPaymentAmount(bal.toFixed(2));
                setAmountToApply(bal);
              }
            } else if (processedInvs.length === 1) {
              // If only 1 invoice exists, pre-select it
              const single = processedInvs[0];
              const bal = single.pendingBalance as number;
              setApplications({ [String(single.id)]: bal });
              setTotalPaymentAmount(bal.toFixed(2));
              setAmountToApply(bal);
            }
          }
        } else {
          console.error('Error fetching client data', data.error);
        }
      } catch (error) {
        console.error('Error loading data', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [clientId]);

  const handleDeletePayment = (paymentId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Anular Pago',
      message: '¿Estás seguro de que deseas anular este pago? El saldo de las facturas asociadas volverá a estar pendiente.',
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
              onConfirm: () => window.location.reload()
            });
          } else {
            setAlertModal({ isOpen: true, title: 'Error', message: 'Error al anular el pago', type: 'error' });
          }
        } catch {
          setAlertModal({ isOpen: true, title: 'Error', message: 'Error de red al intentar anular el pago', type: 'error' });
        }
      }
    });
  };

  // User types global amount at top-right (Importe Recibido)
  const handleGlobalAmountChange = (valStr: string) => {
    setTotalPaymentAmount(valStr);
    const val = parseFloat(valStr);
    if (isNaN(val) || val <= 0) {
      setApplications({});
      setAmountToApply(0);
      setCreditInputStr('');
      return;
    }

    let remaining = val;
    const newApps: Record<string, number> = {};

    for (const inv of invoices) {
      if (remaining <= 0) break;
      const pendingBalance = Number(inv.pendingBalance) || 0;
      const invId = String(inv.id);
      
      if (remaining >= pendingBalance) {
        newApps[invId] = pendingBalance;
        remaining = Number((remaining - pendingBalance).toFixed(2));
      } else {
        newApps[invId] = Number(remaining.toFixed(2));
        remaining = 0;
      }
    }
    const applied = Number((val - remaining).toFixed(2));
    setApplications(newApps);
    setAmountToApply(applied);
    setCreditInputStr(remaining > 0.009 ? remaining.toFixed(2) : '');
  };

  // User clicks checkbox to toggle specific invoice
  const toggleInvoice = (invId: string, pendingBalance: number) => {
    setApplications(prev => {
      const next = { ...prev };
      if (next[invId]) {
        delete next[invId];
      } else {
        next[invId] = pendingBalance;
      }
      const newApplied = Number(Object.values(next).reduce((a, b) => a + (Number(b) || 0), 0).toFixed(2));
      const extraCredit = Math.max(0, parseFloat(creditInputStr) || 0);
      const totalReceived = Number((newApplied + extraCredit).toFixed(2));
      setTotalPaymentAmount(totalReceived > 0 ? totalReceived.toFixed(2) : '');
      setAmountToApply(newApplied);
      return next;
    });
  };

  // User edits individual invoice payment input
  const handleManualAmountChange = (invId: string, amountStr: string, max: number) => {
    const val = parseFloat(amountStr);
    setApplications(prev => {
      const next = { ...prev };
      let overflowCredit = 0;
      if (isNaN(val) || val <= 0) {
        delete next[invId];
      } else if (val > max) {
        next[invId] = max;
        overflowCredit = Number((val - max).toFixed(2));
      } else {
        next[invId] = val;
      }
      const newApplied = Number(Object.values(next).reduce((a, b) => a + (Number(b) || 0), 0).toFixed(2));
      const currentCredit = overflowCredit > 0 ? overflowCredit : Math.max(0, parseFloat(creditInputStr) || 0);
      if (overflowCredit > 0) {
        setCreditInputStr(overflowCredit.toFixed(2));
      }
      const totalReceived = Number((newApplied + currentCredit).toFixed(2));
      setTotalPaymentAmount(totalReceived > 0 ? totalReceived.toFixed(2) : '');
      setAmountToApply(newApplied);
      return next;
    });
  };

  // User edits the "Saldo a Favor a Generar" field directly
  const handleCreditInputChange = (valStr: string) => {
    setCreditInputStr(valStr);
    const creditVal = Math.max(0, parseFloat(valStr) || 0);
    const totalReceived = Number((amountToApply + creditVal).toFixed(2));
    setTotalPaymentAmount(totalReceived > 0 ? totalReceived.toFixed(2) : '');
  };

  // Calculate existing available credit (Saldo a Favor) from previous payments
  const availableCredit = clientPayments.reduce((sum, pay) => {
    const totalAmt = Number(pay.amount) || 0;
    const appliedList = Array.isArray(pay.invoice_payments) ? (pay.invoice_payments as Array<Record<string, unknown>>) : [];
    const usedAmt = appliedList.reduce((acc, ip) => acc + (Number(ip.amount_applied) || 0), 0);
    const rem = Number((totalAmt - usedAmt).toFixed(2));
    return rem > 0.009 ? Number((sum + rem).toFixed(2)) : sum;
  }, 0);

  const parsedReceived = Math.max(0, parseFloat(totalPaymentAmount || '0') || 0);
  const creditToGenerate = Math.max(0, Number((parsedReceived - amountToApply).toFixed(2)));

  // Apply existing Saldo a Favor to pending invoices
  const handleApplyExistingCredit = async () => {
    if (availableCredit <= 0 || invoices.length === 0) return;

    let remainingCredit = availableCredit;
    const toApplyList: Array<{ invoice_id: string; amount_applied: number; isFullyPaid: boolean }> = [];

    // Prioritize checked invoices first, or all pending invoices in order
    const targetInvs = Object.keys(applications).length > 0
      ? invoices.filter(i => applications[String(i.id)] !== undefined)
      : invoices;

    for (const inv of targetInvs) {
      if (remainingCredit <= 0.009) break;
      const pendingBal = Number(inv.pendingBalance) || 0;
      if (pendingBal <= 0) continue;
      const applyAmt = Number(Math.min(remainingCredit, pendingBal).toFixed(2));
      if (applyAmt > 0) {
        toApplyList.push({
          invoice_id: String(inv.id),
          amount_applied: applyAmt,
          isFullyPaid: Math.abs(applyAmt - pendingBal) < 0.01
        });
        remainingCredit = Number((remainingCredit - applyAmt).toFixed(2));
      }
    }

    if (toApplyList.length === 0) return;

    setIsApplyingCredit(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply_credit',
          client_id: clientId,
          appliedInvoices: toApplyList
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo aplicar el saldo a favor');
      }

      const totalUsed = toApplyList.reduce((acc, item) => acc + item.amount_applied, 0);
      setAlertModal({
        isOpen: true,
        title: '¡Saldo a Favor Aplicado!',
        message: `Se aplicaron $${totalUsed.toFixed(2)} USD del saldo a favor del cliente a sus facturas pendientes.`,
        type: 'success',
        onConfirm: () => window.location.reload()
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al aplicar saldo a favor';
      setAlertModal({ isOpen: true, title: 'Error', message: msg, type: 'error' });
    } finally {
      setIsApplyingCredit(false);
    }
  };

  const handleSave = async () => {
    const totalReceivedToSave = Number((amountToApply + creditToGenerate).toFixed(2));
    if (totalReceivedToSave <= 0) {
      setAlertModal({ isOpen: true, title: 'Atención', message: 'Debes ingresar un monto recibido o saldo a favor mayor a 0', type: 'error' });
      return;
    }
    
    setIsSaving(true);
    try {
      const appliedInvoices = Object.entries(applications)
        .filter(([, amount_applied]) => Number(amount_applied) > 0)
        .map(([invoice_id, amount_applied]) => {
          const inv = invoices.find(i => i.id === invoice_id);
          const pendingBalance = (inv?.pendingBalance as number) || 0;
          const isFullyPaid = Math.abs(amount_applied - pendingBalance) < 0.01;
          return { invoice_id, amount_applied, isFullyPaid };
        });

      const refNote = creditToGenerate > 0 && !reference.trim()
        ? `Saldo a favor (+$${creditToGenerate.toFixed(2)})`
        : reference;

      const payment = {
        client_id: clientId,
        amount: totalReceivedToSave,
        payment_date: paymentDate,
        payment_method: paymentMethod || 'SINPE',
        reference_number: refNote,
        currency
      };

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment, appliedInvoices })
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Error desconocido al guardar el pago');
      
      const successMsg = creditToGenerate > 0 && amountToApply > 0
        ? `Se aplicaron $${amountToApply.toFixed(2)} USD a las facturas y se guardaron $${creditToGenerate.toFixed(2)} USD como saldo a favor del cliente.`
        : creditToGenerate > 0
        ? `Se registraron $${creditToGenerate.toFixed(2)} USD como saldo a favor para el cliente.`
        : 'El pago ha sido registrado y aplicado a las facturas con éxito.';

      setAlertModal({
        isOpen: true,
        title: creditToGenerate > 0 ? '¡Pago y Saldo a Favor Registrados!' : '¡Pago Registrado!',
        message: successMsg,
        type: 'success',
        onConfirm: () => {
          window.location.reload();
        }
      });
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setAlertModal({ isOpen: true, title: 'Error', message: errorMessage, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando...</div>;

  const visibleInvoices = invoices.filter(inv => (inv.currency || 'USD') === currency);
  
  const currentBalance = visibleInvoices.reduce((acc, inv) => acc + (inv.pendingBalance as number), 0);
  const clientName = (client?.name as string) || 'Cliente Desconocido';
  const clientEmail = (client?.email as string) || '-';

  return (
    <div className="w-full bg-white print:m-0 print:p-0 min-h-screen relative font-sans">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50/50 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/admin/cuentas-por-cobrar" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Recibir pago</h1>
        </div>
        <button onClick={() => window.print()} className="p-2 text-gray-500 hover:text-gray-800 transition-colors" title="Imprimir">
          <Printer size={20} />
        </button>
      </div>

      {/* Main Content */}
      <div className="p-6 md:p-8 max-w-6xl mx-auto print:p-0 print:max-w-none">
        
        {/* Print Only Header */}
        <div className="hidden print:block mb-8 pb-4 border-b-2 border-gray-800">
          <h2 className="text-2xl font-black text-gray-900 mb-1">JRS CARGO COSTA RICA</h2>
          <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Recibo de Pago</p>
        </div>

        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8">
          <div className="md:col-span-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cliente</label>
                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-800">
                  {clientName}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Correo Electrónico</label>
                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                  {clientEmail}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fecha de Pago</label>
                <input 
                  type="date" 
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-brand-blue"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Método de pago</label>
                <select 
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-brand-blue"
                >
                  <option value="">Seleccionar...</option>
                  <option value="SINPE">SINPE Móvil</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta / Link</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Moneda</label>
                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600">
                  Dólares (USD)
                </div>
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nº de referencia</label>
                <input 
                  type="text" 
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-brand-blue"
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-4 bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col items-end text-right justify-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Importe Recibido</p>
            <div className="flex items-center justify-end gap-1.5 mb-1.5 w-full">
              <span className="text-2xl font-bold text-gray-400 shrink-0">{currency === 'CRC' ? '₡' : '$'}</span>
              <input 
                type="number"
                step="0.01"
                placeholder="0.00"
                value={totalPaymentAmount}
                onChange={e => handleGlobalAmountChange(e.target.value)}
                className="w-full max-w-[220px] bg-transparent text-3xl sm:text-4xl font-black text-gray-900 focus:outline-none text-right placeholder-gray-300 print:text-black print:border-none tracking-tight"
              />
            </div>
            {parseFloat(totalPaymentAmount || '0') > 0 && (
              <p className="text-xs font-extrabold text-brand-blue mb-2 bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-100">
                ≈ ₡{Math.round(parseFloat(totalPaymentAmount || '0') * exchangeRate).toLocaleString('es-CR')} CRC
              </p>
            )}
            <p className="text-xs font-bold text-gray-400">
              Cliente Saldo Pendiente: <span className="text-gray-800 font-black">{formatCurrency(currentBalance, currency)}</span>
            </p>
            <p className="text-xs font-bold text-gray-400 mt-0.5">
              Saldo en Colones: <span className="text-brand-blue font-extrabold">₡{Math.round(currentBalance * exchangeRate).toLocaleString('es-CR')} CRC</span>
            </p>
            {availableCredit > 0 && (
              <div className="mt-2.5 pt-2.5 border-t border-emerald-200/70 w-full flex flex-col items-end">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  <Wallet size={13} />
                  Saldo a Favor Disponible: +{formatCurrency(availableCredit, currency)}
                </span>
                <span className="text-[11px] font-bold text-emerald-600 mt-0.5">
                  ≈ ₡{Math.round(availableCredit * exchangeRate).toLocaleString('es-CR')} CRC
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Available Credit Banner */}
        {availableCredit > 0 && (
          <div className="mb-6 bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Wallet size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                    Cliente con Saldo a Favor Disponible
                  </h4>
                  <span className="text-xs font-black bg-emerald-600 text-white px-2.5 py-0.5 rounded-full">
                    +{formatCurrency(availableCredit, currency)} (≈ ₡{Math.round(availableCredit * exchangeRate).toLocaleString('es-CR')})
                  </span>
                </div>
                <p className="text-xs text-emerald-800 font-medium mt-0.5">
                  {visibleInvoices.length > 0
                    ? 'Puedes descontar este saldo a favor automáticamente en las facturas pendientes del cliente.'
                    : 'Este monto quedará disponible para aplicarse cuando el cliente tenga nuevas facturas.'}
                </p>
              </div>
            </div>
            {visibleInvoices.length > 0 && (
              <button
                type="button"
                onClick={handleApplyExistingCredit}
                disabled={isApplyingCredit}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm transition-colors shrink-0 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Sparkles size={15} />
                {isApplyingCredit ? 'Aplicando...' : 'Aplicar Saldo a Favor'}
              </button>
            )}
          </div>
        )}

        {/* Transactions Table */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">Transacciones pendientes en {currency} <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{visibleInvoices.length}</span></h3>
          
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 w-12 print:hidden"></th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Descripción</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Fecha de Vencimiento</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right hidden sm:table-cell">Importe Original</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Saldo Pendiente</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right w-40">Pago</th>
                </tr>
              </thead>
              <tbody>
                {visibleInvoices.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">No hay facturas pendientes en {currency}. Puedes registrar un anticipo o saldo a favor abajo.</td></tr>
                ) : (
                  visibleInvoices.map(inv => {
                    const invId = inv.id as string;
                    const pendingBalance = inv.pendingBalance as number;
                    const issueDate = inv.issue_date as string;
                    const invTotal = inv.total as number;
                    const invoiceNumber = inv.invoice_number as string;

                    const isChecked = !!applications[invId];
                    const appAmount = applications[invId] !== undefined ? applications[invId] : '';
                    
                    const dueDate = parseLocalDate(issueDate);
                    dueDate.setDate(dueDate.getDate() + 30);

                    return (
                      <tr key={invId} className={`border-b border-gray-100 last:border-0 transition-colors ${isChecked ? 'bg-green-50/30' : 'hover:bg-gray-50/50'}`}>
                        <td className="p-4 text-center cursor-pointer print:hidden" onClick={() => toggleInvoice(invId, pendingBalance)}>
                          <div className={`w-5 h-5 mx-auto rounded-md flex items-center justify-center transition-all duration-150 ${
                            isChecked 
                              ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/20 scale-105' 
                              : 'bg-white border-2 border-gray-300 hover:border-brand-blue hover:bg-brand-blue/5'
                          }`}>
                            {isChecked && <Check size={13} strokeWidth={3.5} />}
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-brand-blue text-sm">Factura #{invoiceNumber}</p>
                          <p className="text-xs text-gray-500">({formatDisplayDate(issueDate)})</p>
                        </td>
                        <td className="p-4 text-sm text-gray-600 hidden sm:table-cell">{formatDisplayDate(dueDate.toISOString().split('T')[0])}</td>
                        <td className="p-4 text-sm font-medium text-gray-600 text-right hidden sm:table-cell">
                          <div>{formatCurrency(Number(invTotal), currency)}</div>
                          <div className="text-[11px] text-gray-400 font-normal">₡{Math.round(Number(invTotal) * (Number(inv.exchange_rate) || exchangeRate)).toLocaleString('es-CR')}</div>
                        </td>
                        <td className="p-4 text-sm font-medium text-gray-800 text-right">
                          <div className="font-bold">{formatCurrency(pendingBalance, currency)}</div>
                          <div className="text-[11px] text-emerald-600 font-bold">₡{Math.round(pendingBalance * (Number(inv.exchange_rate) || exchangeRate)).toLocaleString('es-CR')}</div>
                        </td>
                        <td className="p-4 text-right">
                          <div className={`inline-flex items-center justify-end gap-1 px-2.5 py-1.5 rounded-lg border transition-colors ${isChecked ? 'bg-green-50 border-green-300 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                            <span className="font-bold text-xs">{currency === 'CRC' ? '₡' : '$'}</span>
                            <input 
                              type="number"
                              step="0.01"
                              value={appAmount}
                              onChange={(e) => handleManualAmountChange(invId, e.target.value, pendingBalance)}
                              placeholder="0.00"
                              className="w-24 bg-transparent text-right font-black text-sm focus:outline-none text-gray-800"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Saldo a Favor / Overpayment Box & Totals */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-7 print:hidden">
              {!showCreditBox && creditToGenerate <= 0 ? (
                <button
                  type="button"
                  onClick={() => setShowCreditBox(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 text-xs font-bold transition-all shadow-2xs"
                >
                  <Plus size={15} className="text-emerald-600 stroke-[2.5]" />
                  <Wallet size={14} className="text-emerald-600" />
                  <span>Generar Saldo a Favor (Pago de más / Anticipo)</span>
                </button>
              ) : (
                <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 relative">
                  <button
                    type="button"
                    onClick={() => {
                      handleCreditInputChange('');
                      setShowCreditBox(false);
                    }}
                    title="Ocultar saldo a favor"
                    className="absolute top-3 right-3 p-1 rounded-lg text-emerald-700/60 hover:text-emerald-900 hover:bg-emerald-100/70 transition-colors"
                  >
                    <X size={15} />
                  </button>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-5">
                    <div>
                      <label className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Wallet size={14} className="text-emerald-600" />
                        Generar Saldo a Favor (Pago de más / Anticipo)
                      </label>
                      <p className="text-xs text-emerald-700/90 mt-1 leading-relaxed">
                        Si el cliente pagó de más, ingresa el total recibido arriba o escribe aquí el monto excedente en USD para guardarlo como saldo a favor.
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end">
                      <div className="inline-flex items-center gap-1.5 bg-white border-2 border-emerald-300 focus-within:border-emerald-600 px-3 py-2 rounded-xl shadow-sm">
                        <span className="text-sm font-black text-emerald-700">+$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={creditInputStr !== '' ? creditInputStr : (creditToGenerate > 0 ? creditToGenerate.toFixed(2) : '')}
                          onChange={e => handleCreditInputChange(e.target.value)}
                          className="w-28 text-right font-black text-base text-emerald-900 focus:outline-none bg-transparent"
                        />
                      </div>
                      {creditToGenerate > 0 && (
                        <span className="text-[11px] font-bold text-emerald-700 mt-1">
                          ≈ +₡{Math.round(creditToGenerate * exchangeRate).toLocaleString('es-CR')} CRC
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-5 flex flex-col items-end justify-end space-y-1.5 pt-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Monto a Aplicar a Facturas: <span className="text-base font-black text-gray-800 ml-2">{formatCurrency(amountToApply, currency)}</span>
              </p>
              {creditToGenerate > 0 && (
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Saldo a Favor a Generar: <span className="text-base font-black text-emerald-700 ml-1.5">+{formatCurrency(creditToGenerate, currency)}</span>
                </p>
              )}
              <div className="pt-1.5 border-t border-gray-200 w-full flex flex-col items-end">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">
                  Total Pago Recibido: <span className="text-xl font-black text-green-600 ml-2">{formatCurrency(Number((amountToApply + creditToGenerate).toFixed(2)), currency)}</span>
                </p>
                <p className="text-xs font-bold text-gray-500 mt-1">
                  Total en Colones: <span className="text-base font-black text-brand-blue ml-1">₡{Math.round((amountToApply + creditToGenerate) * exchangeRate).toLocaleString('es-CR')} CRC</span>
                  <span className="text-[10px] text-gray-400 font-medium ml-1.5">(T.C. ₡{exchangeRate})</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Historial de Pagos Section */}
        <div className="mt-12">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">Historial de Pagos</h3>
          
          <div className="overflow-x-auto border border-gray-200 rounded-xl print:border-none print:rounded-none">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 print:bg-transparent print:border-gray-800">
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Método</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Referencia</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Facturas Aplicadas / Saldo</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Monto</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center print:hidden">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clientPayments.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">No hay pagos registrados.</td></tr>
                ) : (
                  clientPayments.map((pay: Record<string, unknown>) => {
                    const payAmt = Number(pay.amount) || 0;
                    const invPayments = Array.isArray(pay.invoice_payments) ? (pay.invoice_payments as Record<string, unknown>[]) : [];
                    const appliedSum = invPayments.reduce((acc, ip) => acc + (Number(ip.amount_applied) || 0), 0);
                    const unappliedCredit = Math.max(0, Number((payAmt - appliedSum).toFixed(2)));

                    return (
                      <tr key={pay.id as string} className="hover:bg-gray-50/50 transition-colors print:hover:bg-transparent">
                        <td className="p-4 text-sm text-gray-800 font-medium">{pay.payment_date as string}</td>
                        <td className="p-4 text-sm text-gray-600">{(pay.payment_method as string) || '-'}</td>
                        <td className="p-4 text-sm text-gray-600">{(pay.reference_number as string) || '-'}</td>
                        <td className="p-4 text-sm text-gray-500 space-y-1">
                          {invPayments.map((ip: Record<string, unknown>) => (
                            <div key={`${ip.invoice_id as string}-${ip.amount_applied as number}`}>
                              #{(ip.invoices as Record<string, unknown>)?.invoice_number as string} <span className="text-xs">(${Number(ip.amount_applied).toFixed(2)})</span>
                            </div>
                          ))}
                          {unappliedCredit > 0.009 && (
                            <div className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <Wallet size={11} />
                              Saldo a favor disp.: +${unappliedCredit.toFixed(2)}
                            </div>
                          )}
                          {invPayments.length === 0 && unappliedCredit <= 0.009 && (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-4 text-sm font-bold text-green-700 text-right">+{formatCurrency(payAmt, (pay.currency as string) || 'USD')}</td>
                        <td className="p-4 text-center print:hidden">
                          <button 
                            onClick={() => handleDeletePayment(pay.id as string)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex" 
                            title="Anular Pago"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 flex items-center justify-between z-40 print:hidden">
        <button onClick={() => router.push('/admin/cuentas-por-cobrar')} className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">
          Cancelar
        </button>
        <button onClick={() => window.print()} className="px-6 py-2.5 rounded-xl font-bold text-brand-blue hover:bg-brand-blue/10 transition-colors">
          Imprimir Reporte
        </button>
        <button 
          onClick={handleSave} 
          disabled={isSaving || (amountToApply + creditToGenerate) <= 0}
          className="px-8 py-2.5 bg-[#0A2636] text-white rounded-xl font-bold hover:bg-[#0A2636]/90 transition-colors shadow-lg shadow-[#0A2636]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving
            ? 'Guardando...'
            : creditToGenerate > 0 && amountToApply > 0
              ? `Guardar Pago y Saldo a Favor (+$${creditToGenerate.toFixed(2)})`
              : creditToGenerate > 0
                ? `Registrar Saldo a Favor (+$${creditToGenerate.toFixed(2)})`
                : 'Guardar Pago'}
        </button>
      </div>
      
      {/* Spacer for fixed footer */}
      <div className="h-24 print:hidden"></div>

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
