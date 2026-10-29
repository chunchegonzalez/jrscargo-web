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

  if (loading) return <div className="p-12 text-center text-slate-400 text-sm">Cargando datos del cliente...</div>;

  const visibleInvoices = invoices.filter(inv => (inv.currency || 'USD') === currency);
  
  const currentBalance = visibleInvoices.reduce((acc, inv) => acc + (inv.pendingBalance as number), 0);
  const clientName = (client?.name as string) || 'Cliente Desconocido';
  const clientEmail = (client?.email as string) || '-';

  return (
    <div className="max-w-6xl mx-auto space-y-5 print:space-y-0 print:m-0 print:p-0 print:max-w-none relative font-sans">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/cuentas-por-cobrar"
            className="h-9 w-9 inline-flex items-center justify-center bg-white border border-slate-200/90 rounded-lg hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors"
            title="Volver a Cuentas por Cobrar"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Recibir Pago</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/15">
                {clientName}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Aplica cobros a facturas pendientes o genera saldo a favor.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-2xs inline-flex items-center gap-1.5 font-semibold text-xs transition-all cursor-pointer"
            title="Imprimir"
          >
            <Printer size={14} className="text-slate-500" />
            <span>Imprimir</span>
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving || (amountToApply + creditToGenerate) <= 0}
            className="h-9 px-3.5 bg-brand-blue hover:bg-[#0e354b] text-white rounded-lg text-xs font-semibold transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 cursor-pointer"
          >
            {isSaving
              ? 'Guardando...'
              : creditToGenerate > 0 && amountToApply > 0
                ? `Guardar Pago y Saldo (+$${creditToGenerate.toFixed(2)})`
                : creditToGenerate > 0
                  ? `Registrar Saldo a Favor (+$${creditToGenerate.toFixed(2)})`
                  : 'Guardar Pago'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-5 print:p-0 print:max-w-none">
        
        {/* Print Only Header */}
        <div className="hidden print:block mb-8 pb-4 border-b-2 border-gray-800">
          <h2 className="text-2xl font-black text-gray-900 mb-1">JRS CARGO COSTA RICA</h2>
          <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Recibo de Pago</p>
        </div>

        {/* Top Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 bg-white rounded-xl p-5 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Cliente</label>
                <div className="w-full h-9 px-3.5 bg-slate-50 border border-slate-200/90 rounded-lg text-xs sm:text-sm font-bold text-slate-800 flex items-center truncate">
                  {clientName}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
                <div className="w-full h-9 px-3.5 bg-slate-50 border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-600 flex items-center truncate">
                  {clientEmail}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha de Pago</label>
                <input 
                  type="date" 
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Método de pago</label>
                <select 
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                >
                  <option value="">Seleccionar...</option>
                  <option value="SINPE">SINPE Móvil</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta / Link</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Moneda</label>
                <div className="w-full h-9 px-3 bg-slate-50 border border-slate-200/90 rounded-lg text-xs sm:text-sm font-semibold text-slate-600 flex items-center">
                  Dólares (USD)
                </div>
              </div>
              <div className="col-span-1">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nº de referencia</label>
                <input 
                  type="text" 
                  placeholder="Comprobante..."
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col items-end text-right justify-center">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Importe Recibido</p>
            <div className="flex items-center justify-end gap-1.5 mb-1.5 w-full">
              <span className="text-2xl font-bold text-slate-400 shrink-0">{currency === 'CRC' ? '₡' : '$'}</span>
              <input 
                type="number"
                step="0.01"
                placeholder="0.00"
                value={totalPaymentAmount}
                onChange={e => handleGlobalAmountChange(e.target.value)}
                className="w-full max-w-[200px] bg-transparent text-3xl sm:text-4xl font-black text-slate-900 focus:outline-none text-right placeholder-slate-300 print:text-black print:border-none tracking-tight tabular-nums"
              />
            </div>
            {parseFloat(totalPaymentAmount || '0') > 0 && (
              <p className="text-xs font-bold text-brand-blue mb-2 bg-brand-blue/[0.08] px-2 py-0.5 rounded-md border border-brand-blue/15 tabular-nums">
                ≈ ₡{Math.round(parseFloat(totalPaymentAmount || '0') * exchangeRate).toLocaleString('es-CR')} CRC
              </p>
            )}
            <p className="text-xs font-medium text-slate-500">
              Saldo Pendiente: <span className="text-slate-900 font-bold tabular-nums">{formatCurrency(currentBalance, currency)}</span>
            </p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Saldo en Colones: <span className="text-brand-blue font-bold tabular-nums">₡{Math.round(currentBalance * exchangeRate).toLocaleString('es-CR')} CRC</span>
            </p>
            {availableCredit > 0 && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 w-full flex flex-col items-end">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-md tabular-nums">
                  <Wallet size={12} />
                  Saldo a Favor: +{formatCurrency(availableCredit, currency)}
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 mt-0.5 tabular-nums">
                  ≈ ₡{Math.round(availableCredit * exchangeRate).toLocaleString('es-CR')} CRC
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Available Credit Banner */}
        {availableCredit > 0 && (
          <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 print:hidden">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Wallet size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    Cliente con Saldo a Favor Disponible
                  </h4>
                  <span className="text-xs font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full tabular-nums">
                    +{formatCurrency(availableCredit, currency)} (≈ ₡{Math.round(availableCredit * exchangeRate).toLocaleString('es-CR')})
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-0.5">
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
                className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={14} />
                {isApplyingCredit ? 'Aplicando...' : 'Aplicar Saldo a Favor'}
              </button>
            )}
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              Transacciones pendientes en {currency}
              <span className="text-[11px] font-bold bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-md tabular-nums">{visibleInvoices.length}</span>
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/95 border-b border-slate-200/90 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="py-2.5 px-3.5 w-12 print:hidden"></th>
                  <th className="py-2.5 px-3.5">Descripción</th>
                  <th className="py-2.5 px-3.5 hidden sm:table-cell">Fecha de Vencimiento</th>
                  <th className="py-2.5 px-3.5 text-right hidden sm:table-cell">Importe Original</th>
                  <th className="py-2.5 px-3.5 text-right">Saldo Pendiente</th>
                  <th className="py-2.5 px-3.5 pr-5 text-right w-40">Pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {visibleInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 px-6 text-center text-slate-400">
                      No hay facturas pendientes en {currency}. Puedes registrar un anticipo o saldo a favor abajo.
                    </td>
                  </tr>
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
                      <tr key={invId} className={`transition-colors ${isChecked ? 'bg-emerald-50/30' : 'hover:bg-slate-50/90'}`}>
                        <td className="py-2.5 px-3.5 text-center cursor-pointer print:hidden" onClick={() => toggleInvoice(invId, pendingBalance)}>
                          <div className={`w-4 h-4 mx-auto rounded flex items-center justify-center transition-all duration-150 ${
                            isChecked 
                              ? 'bg-emerald-600 text-white shadow-2xs ring-2 ring-emerald-400/20' 
                              : 'bg-white border border-slate-300 hover:border-brand-blue'
                          }`}>
                            {isChecked && <Check size={11} strokeWidth={3.5} />}
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <p className="font-mono font-bold text-slate-900 text-xs sm:text-sm">Factura #{invoiceNumber}</p>
                          <p className="text-xs text-slate-400 tabular-nums">Emitida: {formatDisplayDate(issueDate)}</p>
                        </td>
                        <td className="py-2.5 px-3.5 text-xs text-slate-500 hidden sm:table-cell tabular-nums">{formatDisplayDate(dueDate.toISOString().split('T')[0])}</td>
                        <td className="py-2.5 px-3.5 text-right hidden sm:table-cell tabular-nums">
                          <div className="font-medium text-slate-700">{formatCurrency(Number(invTotal), currency)}</div>
                          <div className="text-[11px] text-slate-400">₡{Math.round(Number(invTotal) * (Number(inv.exchange_rate) || exchangeRate)).toLocaleString('es-CR')}</div>
                        </td>
                        <td className="py-2.5 px-3.5 text-right tabular-nums">
                          <div className="font-bold text-slate-900">{formatCurrency(pendingBalance, currency)}</div>
                          <div className="text-[11px] text-emerald-600 font-semibold">₡{Math.round(pendingBalance * (Number(inv.exchange_rate) || exchangeRate)).toLocaleString('es-CR')}</div>
                        </td>
                        <td className="py-2.5 px-3.5 pr-5 text-right">
                          <div className={`inline-flex items-center justify-end gap-1 px-2.5 h-8 rounded-lg border transition-colors ${isChecked ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200/90 text-slate-400'}`}>
                            <span className="font-bold text-xs">{currency === 'CRC' ? '₡' : '$'}</span>
                            <input 
                              type="number"
                              step="0.01"
                              value={appAmount}
                              onChange={(e) => handleManualAmountChange(invId, e.target.value, pendingBalance)}
                              placeholder="0.00"
                              className="w-20 bg-transparent text-right font-bold text-xs sm:text-sm focus:outline-none text-slate-900 tabular-nums"
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
          <div className="p-4 bg-slate-50/60 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            <div className="md:col-span-7 print:hidden">
              {!showCreditBox && creditToGenerate <= 0 ? (
                <button
                  type="button"
                  onClick={() => setShowCreditBox(true)}
                  className="h-9 px-3.5 inline-flex items-center gap-2 rounded-lg bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Plus size={14} className="text-emerald-600" />
                  <Wallet size={14} className="text-emerald-600" />
                  <span>Generar Saldo a Favor (Pago de más / Anticipo)</span>
                </button>
              ) : (
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 relative">
                  <button
                    type="button"
                    onClick={() => {
                      handleCreditInputChange('');
                      setShowCreditBox(false);
                    }}
                    title="Ocultar saldo a favor"
                    className="absolute top-3 right-3 p-1 rounded-lg text-emerald-700/60 hover:text-emerald-900 hover:bg-emerald-100/70 transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-5">
                    <div>
                      <label className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Wallet size={14} className="text-emerald-600" />
                        Generar Saldo a Favor (Pago de más / Anticipo)
                      </label>
                      <p className="text-xs text-emerald-700/90 mt-1 leading-relaxed">
                        Si el cliente pagó de más, ingresa el total recibido arriba o escribe aquí el monto excedente en USD para guardarlo como saldo a favor.
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end">
                      <div className="inline-flex items-center gap-1.5 bg-white border border-emerald-300 focus-within:border-emerald-600 px-3 h-9 rounded-lg shadow-2xs">
                        <span className="text-xs font-bold text-emerald-700">+$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={creditInputStr !== '' ? creditInputStr : (creditToGenerate > 0 ? creditToGenerate.toFixed(2) : '')}
                          onChange={e => handleCreditInputChange(e.target.value)}
                          className="w-24 text-right font-bold text-sm text-emerald-900 focus:outline-none bg-transparent tabular-nums"
                        />
                      </div>
                      {creditToGenerate > 0 && (
                        <span className="text-[11px] font-semibold text-emerald-700 mt-1 tabular-nums">
                          ≈ +₡{Math.round(creditToGenerate * exchangeRate).toLocaleString('es-CR')} CRC
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-5 flex flex-col items-end justify-end space-y-1.5">
              <p className="text-xs font-medium text-slate-500">
                Monto a Aplicar a Facturas: <span className="text-sm font-bold text-slate-900 ml-2 tabular-nums">{formatCurrency(amountToApply, currency)}</span>
              </p>
              {creditToGenerate > 0 && (
                <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/80 tabular-nums">
                  Saldo a Favor a Generar: <span className="font-bold ml-1">+{formatCurrency(creditToGenerate, currency)}</span>
                </p>
              )}
              <div className="pt-2 border-t border-slate-200/80 w-full flex flex-col items-end">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Total Pago Recibido: <span className="text-lg font-black text-emerald-600 ml-2 tabular-nums">{formatCurrency(Number((amountToApply + creditToGenerate).toFixed(2)), currency)}</span>
                </p>
                <p className="text-xs font-medium text-slate-500 mt-0.5 tabular-nums">
                  Total en Colones: <span className="text-sm font-bold text-brand-blue ml-1">₡{Math.round((amountToApply + creditToGenerate) * exchangeRate).toLocaleString('es-CR')} CRC</span>
                  <span className="text-[10px] text-slate-400 ml-1.5">(T.C. ₡{exchangeRate})</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Historial de Pagos Section */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden print:border-none print:rounded-none print:shadow-none">
          <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between print:bg-transparent print:px-0">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              Historial de Pagos del Cliente
              <span className="text-[11px] font-bold bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-md tabular-nums">{clientPayments.length}</span>
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/95 border-b border-slate-200/90 text-[11px] uppercase tracking-wider text-slate-500 font-semibold print:bg-transparent print:border-gray-800">
                  <th className="py-2.5 px-3.5 pl-5">Fecha</th>
                  <th className="py-2.5 px-3.5">Método</th>
                  <th className="py-2.5 px-3.5">Referencia</th>
                  <th className="py-2.5 px-3.5">Facturas Aplicadas / Saldo</th>
                  <th className="py-2.5 px-3.5 text-right">Monto</th>
                  <th className="py-2.5 px-3.5 pr-5 text-center print:hidden">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {clientPayments.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 px-6 text-center text-slate-400">No hay pagos registrados.</td></tr>
                ) : (
                  clientPayments.map((pay: Record<string, unknown>) => {
                    const payAmt = Number(pay.amount) || 0;
                    const invPayments = Array.isArray(pay.invoice_payments) ? (pay.invoice_payments as Record<string, unknown>[]) : [];
                    const appliedSum = invPayments.reduce((acc, ip) => acc + (Number(ip.amount_applied) || 0), 0);
                    const unappliedCredit = Math.max(0, Number((payAmt - appliedSum).toFixed(2)));

                    return (
                      <tr key={pay.id as string} className="hover:bg-slate-50/90 transition-colors print:hover:bg-transparent">
                        <td className="py-2.5 px-3.5 pl-5 text-xs text-slate-500 tabular-nums">{pay.payment_date as string}</td>
                        <td className="py-2.5 px-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                            {(pay.payment_method as string) || '-'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-xs text-slate-600">{(pay.reference_number as string) || '-'}</td>
                        <td className="py-2.5 px-3.5 text-slate-600 space-y-1">
                          {invPayments.map((ip: Record<string, unknown>) => (
                            <div key={`${ip.invoice_id as string}-${ip.amount_applied as number}`} className="text-xs font-medium">
                              <span className="font-mono font-bold text-slate-800">#{(ip.invoices as Record<string, unknown>)?.invoice_number as string}</span>{' '}
                              <span className="text-slate-500 tabular-nums">(${Number(ip.amount_applied).toFixed(2)})</span>
                            </div>
                          ))}
                          {unappliedCredit > 0.009 && (
                            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md tabular-nums">
                              <Wallet size={11} />
                              Saldo a favor disp.: +${unappliedCredit.toFixed(2)}
                            </div>
                          )}
                          {invPayments.length === 0 && unappliedCredit <= 0.009 && (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-emerald-700 text-right tabular-nums">+{formatCurrency(payAmt, (pay.currency as string) || 'USD')}</td>
                        <td className="py-2.5 px-3.5 pr-5 text-center print:hidden">
                          <button 
                            onClick={() => handleDeletePayment(pay.id as string)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors inline-flex cursor-pointer" 
                            title="Anular Pago"
                          >
                            <Trash2 size={15} />
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
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xs border-t border-slate-200/80 px-6 py-3 flex items-center justify-between z-40 print:hidden">
        <button onClick={() => router.push('/admin/cuentas-por-cobrar')} className="h-9 px-4 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
          Cancelar
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer">
            Imprimir Reporte
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving || (amountToApply + creditToGenerate) <= 0}
            className="h-9 px-5 bg-brand-blue text-white rounded-lg text-xs font-semibold hover:bg-[#0e354b] transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 cursor-pointer"
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
      </div>
      
      {/* Spacer for fixed footer */}
      <div className="h-20 print:hidden"></div>

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
