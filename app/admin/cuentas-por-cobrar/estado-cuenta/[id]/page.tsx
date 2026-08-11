'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';

type LedgerEntry = {
  id: string;
  date: string;
  description: string;
  amount: number;
  balance?: number;
};

export default function EstadoDeCuentaPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const clientId = params.id;
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Record<string, unknown> | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [aging, setAging] = useState({
    current: 0,
    days1to30: 0,
    days31to60: 0,
    days61to90: 0,
    days90Plus: 0,
    total: 0
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [clientsRes, invoicesRes, paymentsRes] = await Promise.all([
        fetch('/api/clients'),
        fetch(`/api/clients/${clientId}/invoices`),
        fetch(`/api/clients/${clientId}/payments`)
      ]);

      const clientsData = await clientsRes.json();
      const invoicesData = await invoicesRes.json();
      const paymentsData = await paymentsRes.json();

      const currentClient = clientsData.data?.find((c: Record<string, unknown>) => c.id === clientId);
      setClient(currentClient || { name: 'Cliente Desconocido', email: '' });

      const entries: LedgerEntry[] = [];
      const now = new Date();
      const newAging = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90Plus: 0, total: 0 };

      // Procesar Facturas
      if (invoicesData.success && invoicesData.data) {
        invoicesData.data.forEach((inv: Record<string, unknown>) => {
          entries.push({
            id: `inv-${inv.id}`,
            date: inv.issue_date as string,
            description: `Factura A Clientes N.º ${inv.invoice_number}`,
            amount: Number(inv.total)
          });

          // Calcular Aging para facturas pendientes
          const total = Number(inv.total);
          let paid = 0;
          if (inv.invoice_payments && Array.isArray(inv.invoice_payments)) {
            paid = inv.invoice_payments.reduce((acc: number, p: Record<string, unknown>) => acc + Number(p.amount_applied), 0);
          }
          const pending = total - paid;

          if (pending > 0.01) {
            newAging.total += pending;
            const dueDate = new Date(inv.issue_date as string);
            dueDate.setDate(dueDate.getDate() + 30); // Vencimiento estándar 30 días
            
            const diffTime = now.getTime() - dueDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) newAging.current += pending;
            else if (diffDays <= 30) newAging.days1to30 += pending;
            else if (diffDays <= 60) newAging.days31to60 += pending;
            else if (diffDays <= 90) newAging.days61to90 += pending;
            else newAging.days90Plus += pending;
          }
        });
      }

      // Procesar Pagos
      if (paymentsData.success && paymentsData.data) {
        paymentsData.data.forEach((pay: Record<string, unknown>) => {
          entries.push({
            id: `pay-${pay.id}`,
            date: pay.payment_date as string,
            description: pay.reference_number ? `Pago - Ref: ${pay.reference_number}` : 'Pago',
            amount: -Number(pay.amount) // Los pagos restan al saldo
          });
        });
      }

      // Ordenar cronológicamente
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calcular saldo arrastrado
      let currentBalance = 0;
      entries.forEach(entry => {
        currentBalance += entry.amount;
        entry.balance = currentBalance;
      });

      setLedger(entries);
      setAging(newAging);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Cargando estado de cuenta...</div>;

  const todayStr = new Date().toLocaleDateString('es-CR');

  return (
    <div className="w-full bg-white print:m-0 print:p-0 min-h-screen relative font-sans">
      
      {/* Header Bar para la vista web */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50/50 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/admin/cuentas-por-cobrar" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Estado de Cuenta</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push(`/admin/cuentas-por-cobrar/recibir/${clientId}`)} className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-bold rounded-lg text-sm transition-colors shadow-sm">
            Recibir Pago
          </button>
          <button onClick={() => window.print()} className="px-4 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2">
            <Printer size={16} /> Imprimir PDF
          </button>
        </div>
      </div>

      {/* A4 Print Area */}
      <div className="max-w-4xl mx-auto p-8 print:p-0 bg-white">
        
        {/* Header del Reporte */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-xl font-black text-gray-900 leading-tight">JRS CARGO S.A.</h2>
            <p className="text-sm text-gray-800">Heredia</p>
            <p className="text-sm text-gray-800">Heredia, Santo Domingo 40901</p>
            <p className="text-sm text-gray-800">info@jrscargocr.com</p>
            <p className="text-sm text-gray-800">www.jrscargocr.com</p>
            <h1 className="text-4xl font-light text-[#2F4770] mt-6">Extracto</h1>
          </div>
          <div className="text-right">
            <div className="flex justify-end mb-4">
              <span className="text-4xl font-black italic text-[#D32F2F] tracking-tighter pr-1">JRS</span>
              <span className="text-4xl font-black italic text-[#1A365D] tracking-tighter">CARGO</span>
            </div>
          </div>
        </div>

        {/* Info del Cliente y Resumen */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-sm font-bold text-gray-900 mb-1">PARA</p>
            <p className="text-sm text-gray-800 font-medium">{client?.name as string}</p>
            {(client?.email as string) ? <p className="text-sm text-gray-800">{client?.email as string}</p> : null}
          </div>
          <div className="text-right">
            <table className="text-sm ml-auto">
              <tbody>
                <tr>
                  <td className="font-bold pr-4 text-gray-900 uppercase text-right">Fecha</td>
                  <td className="text-gray-800 text-right">{todayStr}</td>
                </tr>
                <tr>
                  <td className="font-bold pr-4 text-gray-900 uppercase text-right">Total A Pagar</td>
                  <td className="text-gray-800 text-right">USD {aging.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla Libro Mayor (Ledger) */}
        <table className="w-full text-sm mb-12">
          <thead>
            <tr className="bg-[#DDE2EB] text-[#2F4770]">
              <th className="py-2 px-3 text-left font-bold">FECHA</th>
              <th className="py-2 px-3 text-left font-bold">DESCRIPCIÓN</th>
              <th className="py-2 px-3 text-right font-bold w-28">TOTAL</th>
              <th className="py-2 px-3 text-right font-bold w-28">SALDO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ledger.map((entry, index) => (
              <tr key={index} className="border-b border-transparent hover:bg-gray-50/30 print:hover:bg-transparent">
                <td className="py-2 px-3 text-gray-800 align-top whitespace-nowrap">
                  {new Date(entry.date).toLocaleDateString('es-CR')}
                </td>
                <td className="py-2 px-3 text-gray-800 align-top">
                  {entry.description}
                </td>
                <td className="py-2 px-3 text-gray-800 align-top text-right whitespace-nowrap">
                  {entry.amount < 0 ? entry.amount.toFixed(2) : entry.amount.toFixed(2)}
                </td>
                <td className="py-2 px-3 text-gray-800 align-top text-right whitespace-nowrap">
                  {entry.balance?.toFixed(2)}
                </td>
              </tr>
            ))}
            {ledger.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500 italic">No hay movimientos registrados.</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer Aging Buckets */}
        <div className="mt-8 pt-4 border-t border-gray-100">
          <table className="w-full text-sm text-center border-collapse">
            <thead>
              <tr className="bg-[#DDE2EB] text-[#2F4770]">
                <th className="py-3 px-2 font-bold border-r border-white/50">Deuda Actual</th>
                <th className="py-3 px-2 font-bold border-r border-white/50">1 a 30 días<br/>de retraso</th>
                <th className="py-3 px-2 font-bold border-r border-white/50">31 a 60 días<br/>de retraso</th>
                <th className="py-3 px-2 font-bold border-r border-white/50">61 a 90 días<br/>de retraso</th>
                <th className="py-3 px-2 font-bold border-r border-white/50">Más de 90 días<br/>de retraso</th>
                <th className="py-3 px-2 font-bold text-right bg-[#C3C9D6]">Importe<br/>pendiente</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-gray-50/50 print:bg-transparent">
                <td className="py-3 px-2 text-gray-800 border-r border-gray-200">{aging.current.toFixed(2)}</td>
                <td className="py-3 px-2 text-gray-800 border-r border-gray-200">{aging.days1to30.toFixed(2)}</td>
                <td className="py-3 px-2 text-gray-800 border-r border-gray-200">{aging.days31to60.toFixed(2)}</td>
                <td className="py-3 px-2 text-gray-800 border-r border-gray-200">{aging.days61to90.toFixed(2)}</td>
                <td className="py-3 px-2 text-gray-800 border-r border-gray-200">{aging.days90Plus.toFixed(2)}</td>
                <td className="py-3 px-2 font-bold text-gray-900 text-right bg-gray-100/80">USD {aging.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
