'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { formatDisplayDate, parseLocalDate } from '@/lib/billing';

type LedgerEntry = {
  id: string;
  date: string;
  description: string;
  amount: number;
  balance?: number;
};

export default function EstadoDeCuentaPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Record<string, unknown> | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [aging, setAging] = useState({
    current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90Plus: 0, total: 0
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use the single client endpoint that returns client, invoices, and payments
      const res = await fetch('/api/clients/' + clientId);
      const data = await res.json();
      
      if (!data.success) {
        console.error('Error loading client data');
        return;
      }

      setClient(data.client || { name: 'Cliente Desconocido', email: '' });

      const entries: LedgerEntry[] = [];
      const now = new Date();
      const newAging = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90Plus: 0, total: 0 };

      // Process Invoices
      const invoices = data.invoices || [];
      if (Array.isArray(invoices)) {
        invoices.forEach((inv: Record<string, unknown>) => {
          if (inv.status === 'Anulada') return;
          entries.push({
            id: 'inv-' + String(inv.id),
            date: inv.issue_date as string,
            description: 'Factura N.º ' + String(inv.invoice_number),
            amount: Number(inv.total)
          });

          // Calculate aging for pending invoices
          const total = Number(inv.total);
          let paid = 0;
          if (inv.invoice_payments && Array.isArray(inv.invoice_payments)) {
            paid = (inv.invoice_payments as Record<string, unknown>[]).reduce(
              (acc: number, p: Record<string, unknown>) => acc + Number(p.amount_applied), 0
            );
          }
          const pending = total - paid;

          if (pending > 0.01) {
            newAging.total += pending;
            const dueDate = parseLocalDate(inv.issue_date as string);
            dueDate.setDate(dueDate.getDate() + 30);
            const diffDays = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) newAging.current += pending;
            else if (diffDays <= 30) newAging.days1to30 += pending;
            else if (diffDays <= 60) newAging.days31to60 += pending;
            else if (diffDays <= 90) newAging.days61to90 += pending;
            else newAging.days90Plus += pending;
          }
        });
      }

      // Process Payments
      const payments = data.payments || [];
      if (Array.isArray(payments)) {
        payments.forEach((pay: Record<string, unknown>) => {
          entries.push({
            id: 'pay-' + String(pay.id),
            date: pay.payment_date as string,
            description: pay.reference_number ? 'Pago - Ref: ' + String(pay.reference_number) : 'Pago Recibido',
            amount: -Number(pay.amount)
          });
        });
      }

      // Sort chronologically
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate running balance
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

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando estado de cuenta...</div>;

  const todayStr = new Date().toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const clientName = String(client?.name || 'Cliente');
  const clientEmail = String(client?.email || '');
  const clientPhone = String(client?.phone || '');

  // Filter ledger by date
  let filteredLedger = ledger;
  let previousBalance = 0;
  let hasPreviousEntries = false;

  if (startDate || endDate) {
    filteredLedger = [];
    ledger.forEach(entry => {
      if (startDate && entry.date < startDate) {
        previousBalance = entry.balance || 0;
        hasPreviousEntries = true;
        return;
      }
      if (endDate && entry.date > endDate) return;
      filteredLedger.push(entry);
    });
  }

  return (
    <div className="w-full bg-white print:m-0 print:p-0 min-h-screen">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50/50 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/admin/cuentas-por-cobrar" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Estado de Cuenta</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push('/admin/cuentas-por-cobrar/recibir/' + clientId)} className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-bold rounded-lg text-sm shadow-sm">
            Recibir Pago
          </button>
          <button onClick={() => window.print()} className="px-4 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold rounded-lg text-sm shadow-sm flex items-center gap-2">
            <Printer size={16} /> Imprimir PDF
          </button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="max-w-4xl mx-auto px-8 py-4 print:hidden flex items-center gap-4 border-b border-gray-100 mb-4">
        <span className="text-sm font-bold text-gray-600">Filtrar:</span>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue" />
        <span className="text-gray-400">—</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue" />
        {(startDate || endDate) && (
          <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-sm text-brand-blue hover:underline font-medium">Limpiar</button>
        )}
      </div>

      {/* ========== PRINTABLE DOCUMENT ========== */}
      <div className="max-w-4xl mx-auto px-8 pb-12 print:px-0 bg-white">
        
        {/* Header */}
        <div className="flex justify-between items-start pt-8 mb-2">
          <div>
            <p className="text-lg tracking-wide text-gray-600 uppercase">Estado de Cuenta</p>
            <p className="text-sm font-bold text-gray-700 mt-1">JRS CARGO S.A.</p>
            <p className="text-xs text-gray-400">San Pablo de Heredia, Costa Rica</p>
            <p className="text-xs text-gray-400">+506 7260-1238</p>
            <p className="text-xs text-gray-400">info@jrscargocr.com</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="JRS Cargo" className="h-14 w-auto object-contain" />
        </div>

        <div className="h-px bg-gray-200 my-6"></div>

        {/* Client + Summary */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-sm font-bold text-gray-800">{clientName}</p>
            {clientEmail && <p className="text-xs text-gray-400">{clientEmail}</p>}
            {clientPhone && <p className="text-xs text-gray-400">{clientPhone}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Fecha: {todayStr}</p>
            <p className="text-sm font-bold text-gray-800 mt-1">Saldo Pendiente</p>
            <p className="text-2xl font-black text-brand-blue">${aging.total.toFixed(2)}</p>
          </div>
        </div>

        <div className="h-px bg-gray-200 my-6"></div>

        {/* Ledger Table */}
        <p className="text-sm font-bold text-gray-700 mb-3">Movimientos</p>
        <table className="w-full text-xs mb-10">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="py-2 text-left font-bold text-gray-600 w-24">Fecha</th>
              <th className="py-2 text-left font-bold text-gray-600">Descripción</th>
              <th className="py-2 text-right font-bold text-gray-600 w-24">Monto</th>
              <th className="py-2 text-right font-bold text-gray-600 w-24">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {hasPreviousEntries && startDate && (
              <tr className="border-b border-gray-100 bg-gray-50">
                <td className="py-2.5 text-gray-500 italic">{formatDisplayDate(startDate)}</td>
                <td className="py-2.5 text-gray-600 italic font-medium">Saldo Anterior</td>
                <td className="py-2.5 text-right text-gray-400">—</td>
                <td className="py-2.5 text-right font-bold text-gray-800">${previousBalance.toFixed(2)}</td>
              </tr>
            )}
            {filteredLedger.map((entry) => (
              <tr key={entry.id} className="border-b border-gray-100">
                <td className="py-2.5 text-gray-500">{formatDisplayDate(entry.date)}</td>
                <td className="py-2.5 text-gray-700">{entry.description}</td>
                <td className={'py-2.5 text-right font-medium ' + (entry.amount < 0 ? 'text-green-600' : 'text-gray-700')}>
                  {entry.amount < 0 ? '-' : ''}${Math.abs(entry.amount).toFixed(2)}
                </td>
                <td className="py-2.5 text-right font-bold text-gray-800">${(entry.balance || 0).toFixed(2)}</td>
              </tr>
            ))}
            {filteredLedger.length === 0 && !hasPreviousEntries && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-400 italic">No hay movimientos registrados.</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Aging Summary */}
        <p className="text-sm font-bold text-gray-700 mb-3">Antigüedad de Saldo</p>
        <table className="w-full text-xs border-collapse mb-6">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="py-2 font-bold text-gray-600 text-center">Al día</th>
              <th className="py-2 font-bold text-gray-600 text-center">1–30 días</th>
              <th className="py-2 font-bold text-gray-600 text-center">31–60 días</th>
              <th className="py-2 font-bold text-gray-600 text-center">61–90 días</th>
              <th className="py-2 font-bold text-gray-600 text-center">+90 días</th>
              <th className="py-2 font-bold text-gray-800 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-3 text-center text-gray-600">${aging.current.toFixed(2)}</td>
              <td className="py-3 text-center text-gray-600">${aging.days1to30.toFixed(2)}</td>
              <td className="py-3 text-center text-gray-600">${aging.days31to60.toFixed(2)}</td>
              <td className={'py-3 text-center ' + (aging.days61to90 > 0 ? 'text-amber-600 font-bold' : 'text-gray-600')}>${aging.days61to90.toFixed(2)}</td>
              <td className={'py-3 text-center ' + (aging.days90Plus > 0 ? 'text-red-600 font-bold' : 'text-gray-600')}>${aging.days90Plus.toFixed(2)}</td>
              <td className="py-3 text-right font-black text-gray-900 text-sm">${aging.total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-4 text-center text-[10px] text-gray-300 mt-8">
          <p>JRS CARGO S.A. | info@jrscargocr.com | +506 7260-1238 | www.jrscargocr.com</p>
        </div>

      </div>
    </div>
  );
}
