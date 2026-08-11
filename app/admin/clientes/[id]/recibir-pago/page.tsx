'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Search, Save, Printer, CheckSquare, Square, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RecibirPagoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const clientId = params.id;

  const [client, setClient] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [reference, setReference] = useState('');
  const [totalPaymentAmount, setTotalPaymentAmount] = useState<string>('');
  const [amountToApply, setAmountToApply] = useState<number>(0);
  
  // Array of { invoice_id, amount_applied, isFullyPaid }
  const [applications, setApplications] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [clientId]);

  const loadData = async () => {
    try {
      const [clientRes, invoicesRes] = await Promise.all([
        fetch(`/api/clients`), // Fetch all to find one (inefficient but safe for now)
        fetch('/api/invoices')
      ]);

      const clientsData = await clientRes.json();
      const invoicesData = await invoicesRes.json();

      const currentClient = clientsData.find((c: any) => c.id === clientId);
      setClient(currentClient);

      // Filter invoices for this client that are not 'Pagada'
      const clientInvs = invoicesData.data.filter((inv: any) => 
        inv.client_id === clientId && inv.status !== 'Pagada'
      );
      
      // Calculate pending balance for each
      const processedInvs = clientInvs.map((inv: any) => {
        const total = Number(inv.total);
        let paid = 0;
        if (inv.invoice_payments && Array.isArray(inv.invoice_payments)) {
          paid = inv.invoice_payments.reduce((acc: number, p: any) => acc + Number(p.amount_applied), 0);
        }
        return {
          ...inv,
          pendingBalance: total - paid
        };
      }).filter((inv: any) => inv.pendingBalance > 0);

      setInvoices(processedInvs);
    } catch (error) {
      console.error('Error loading data', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-distribute payment amount across invoices
  useEffect(() => {
    const val = parseFloat(totalPaymentAmount);
    if (isNaN(val) || val <= 0) {
      setApplications({});
      setAmountToApply(0);
      return;
    }

    let remaining = val;
    const newApps: Record<string, number> = {};

    for (const inv of invoices) {
      if (remaining <= 0) break;
      if (remaining >= inv.pendingBalance) {
        newApps[inv.id] = inv.pendingBalance;
        remaining -= inv.pendingBalance;
      } else {
        newApps[inv.id] = remaining;
        remaining = 0;
      }
    }
    setApplications(newApps);
    setAmountToApply(val - remaining);
  }, [totalPaymentAmount, invoices]);

  const toggleInvoice = (invId: string, pendingBalance: number) => {
    const newApps = { ...applications };
    if (newApps[invId]) {
      delete newApps[invId];
    } else {
      newApps[invId] = pendingBalance;
    }
    setApplications(newApps);
    
    // Update total payment amount based on manual selection
    const total = Object.values(newApps).reduce((a, b) => a + b, 0);
    setTotalPaymentAmount(total.toFixed(2));
    setAmountToApply(total);
  };

  const handleManualAmountChange = (invId: string, amount: string, max: number) => {
    const val = parseFloat(amount);
    const newApps = { ...applications };
    
    if (isNaN(val) || val <= 0) {
      delete newApps[invId];
    } else {
      newApps[invId] = Math.min(val, max);
    }
    
    setApplications(newApps);
    const total = Object.values(newApps).reduce((a, b) => a + b, 0);
    setTotalPaymentAmount(total.toFixed(2));
    setAmountToApply(total);
  };

  const handleSave = async () => {
    if (amountToApply <= 0) return alert('Debes aplicar un monto mayor a 0');
    
    setIsSaving(true);
    try {
      const appliedInvoices = Object.entries(applications).map(([invoice_id, amount_applied]) => {
        const inv = invoices.find(i => i.id === invoice_id);
        const isFullyPaid = Math.abs(amount_applied - (inv?.pendingBalance || 0)) < 0.01;
        return { invoice_id, amount_applied, isFullyPaid };
      });

      const payment = {
        client_id: clientId,
        amount: amountToApply,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_number: reference
      };

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment, appliedInvoices })
      });

      if (!res.ok) throw new Error('Error al guardar el pago');
      
      alert('Pago registrado con éxito');
      router.push('/admin/clientes');
    } catch (error) {
      console.error(error);
      alert('Error al guardar el pago');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando...</div>;

  const currentBalance = invoices.reduce((acc, inv) => acc + inv.pendingBalance, 0);

  return (
    <div className="w-full bg-white print:m-0 print:p-0 min-h-screen relative font-sans">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50/50 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/admin/clientes" className="text-gray-400 hover:text-gray-600 transition-colors">
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
                  {client?.name || 'Cliente Desconocido'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Correo Electrónico</label>
                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                  {client?.email || '-'}
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
              <div className="col-span-2">
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
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-medium text-gray-400">$</span>
              <input 
                type="number"
                placeholder="0.00"
                value={totalPaymentAmount}
                onChange={e => setTotalPaymentAmount(e.target.value)}
                className="w-32 bg-transparent text-4xl font-black text-gray-900 focus:outline-none text-right placeholder-gray-300 print:text-black print:border-none"
              />
            </div>
            <p className="text-xs font-bold text-gray-400">Cliente Saldo: <span className="text-gray-800">${currentBalance.toFixed(2)}</span></p>
          </div>
        </div>

        {/* Transactions Table */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">Transacciones pendientes <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{invoices.length}</span></h3>
          
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 w-12 print:hidden"></th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Descripción</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Fecha de Vencimiento</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right hidden sm:table-cell">Importe Original</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Saldo Pendiente</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right w-32">Pago</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">No hay facturas pendientes.</td></tr>
                ) : (
                  invoices.map(inv => {
                    const isChecked = !!applications[inv.id];
                    const appAmount = applications[inv.id] || '';
                    
                    // Simple logic to show a due date 30 days after issue (if we don't have due_date)
                    const dueDate = new Date(inv.issue_date);
                    dueDate.setDate(dueDate.getDate() + 30);

                    return (
                      <tr key={inv.id} className={`border-b border-gray-100 last:border-0 transition-colors ${isChecked ? 'bg-green-50/30' : 'hover:bg-gray-50/50'}`}>
                        <td className="p-4 text-center cursor-pointer print:hidden" onClick={() => toggleInvoice(inv.id, inv.pendingBalance)}>
                          {isChecked ? <CheckSquare className="text-green-600 mx-auto" size={20} /> : <Square className="text-gray-300 mx-auto" size={20} />}
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-brand-blue text-sm">Factura #{inv.invoice_number}</p>
                          <p className="text-xs text-gray-500">({inv.issue_date})</p>
                        </td>
                        <td className="p-4 text-sm text-gray-600 hidden sm:table-cell">{dueDate.toISOString().split('T')[0]}</td>
                        <td className="p-4 text-sm font-medium text-gray-600 text-right hidden sm:table-cell">${Number(inv.total).toFixed(2)}</td>
                        <td className="p-4 text-sm font-medium text-gray-800 text-right">${inv.pendingBalance.toFixed(2)}</td>
                        <td className="p-4 text-right">
                          <div className={`flex items-center justify-end gap-1 ${isChecked ? 'text-green-700' : 'text-gray-400'}`}>
                            <span className="font-bold">$</span>
                            <input 
                              type="number"
                              value={appAmount}
                              onChange={(e) => handleManualAmountChange(inv.id, e.target.value, inv.pendingBalance)}
                              placeholder="0.00"
                              className={`w-20 bg-transparent text-right focus:outline-none focus:border-b focus:border-green-500 ${isChecked ? 'font-bold' : ''}`}
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
          
          <div className="mt-4 flex justify-end">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Monto a Aplicar: <span className="text-xl font-black text-green-600 ml-2">${amountToApply.toFixed(2)}</span></p>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 flex items-center justify-between z-40 print:hidden">
        <button onClick={() => router.push('/admin/clientes')} className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">
          Cancelar
        </button>
        <button onClick={() => window.print()} className="px-6 py-2.5 rounded-xl font-bold text-brand-blue hover:bg-brand-blue/10 transition-colors">
          Imprimir Reporte
        </button>
        <button 
          onClick={handleSave} 
          disabled={isSaving || amountToApply <= 0}
          className="px-8 py-2.5 bg-[#0A2636] text-white rounded-xl font-bold hover:bg-[#0A2636]/90 transition-colors shadow-lg shadow-[#0A2636]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving ? 'Guardando...' : 'Guardar Pago'}
        </button>
      </div>
      
      {/* Spacer for fixed footer */}
      <div className="h-24 print:hidden"></div>
    </div>
  );
}
