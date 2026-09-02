'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Printer, Ban, Trash2 } from 'lucide-react';
import { useModal } from '@/app/components/ModalProvider';
import { formatDisplayDate } from '@/lib/billing';

type InvoiceItem = {
  id: string;
  service_name: string;
  tracking_number?: string;
  weight?: string | number;
  rate?: string | number;
  amount: string | number;
};

type InvoiceDetail = {
  invoice_number: string;
  status: string;
  issue_date: string;
  notes?: string;
  subtotal: string | number;
  discount_percent: string | number;
  total: string | number;
  exchange_rate?: number;
  clients?: {
    id?: string;
    name: string;
    email: string;
    phone?: string;
  };
  client_id?: string;
  items?: InvoiceItem[];
  invoice_payments?: { amount_applied: number | string }[];
};

export default function InvoiceViewPage() {
  const { showAlert, showConfirm } = useModal();
  const params = useParams();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const loadInvoice = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices/${id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setInvoice(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleVoidInvoice = async () => {
    if (!(await showConfirm('Confirmación', '¿Estás seguro de que deseas anular esta factura?'))) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Anulada' })
      });
      if (res.ok) {
        loadInvoice();
      } else {
        await showAlert('Aviso', 'Error al anular la factura');
      }
    } catch {
      await showAlert('Aviso', 'Error de red');
    }
  };

  const handleDeleteInvoice = async () => {
    if (!(await showConfirm('Confirmación', '¿Estás seguro de que deseas ELIMINAR esta factura permanentemente?'))) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        window.location.href = '/admin/facturacion';
      } else {
        await showAlert('Aviso', 'Error al eliminar la factura');
      }
    } catch {
      await showAlert('Aviso', 'Error de red');
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  if (loading) return <div className="text-center p-20 text-gray-500">Cargando factura...</div>;
  if (!invoice) return <div className="text-center p-20 text-red-500">Factura no encontrada.</div>;

  let displayStatus = invoice.status;
  let paidAmount = 0;
  if (invoice.status !== 'Pagada' && invoice.status !== 'Anulada') {
    if (invoice.invoice_payments && Array.isArray(invoice.invoice_payments)) {
      paidAmount = invoice.invoice_payments.reduce((acc, p) => acc + Number(p.amount_applied), 0);
    }
    if (Number(invoice.total) - paidAmount <= 0.01) displayStatus = 'Pagada';
  }

  const exchangeRate = invoice.exchange_rate || 530;
  const totalColones = (Number(invoice.total) * exchangeRate).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="max-w-5xl mx-auto space-y-6 print:space-y-0 print:m-0 print:p-0 print:max-w-none">
      {/* Actions - hidden on print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/admin/facturacion" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-black text-brand-blue">Factura {invoice.invoice_number}</h1>
        </div>
        <div className="flex gap-2">
          {invoice.status !== 'Anulada' && (
            <button onClick={handleVoidInvoice} className="px-4 py-2 bg-orange-100 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-200 flex items-center gap-2 text-sm font-bold shadow-sm transition-all">
              <Ban size={18} /> Anular
            </button>
          )}
          <button onClick={handleDeleteInvoice} className="px-4 py-2 bg-red-100 text-red-700 border border-red-200 rounded-lg hover:bg-red-200 flex items-center gap-2 text-sm font-bold shadow-sm transition-all">
            <Trash2 size={18} /> Eliminar
          </button>
          <Link href={`/admin/facturacion/${id}/editar`} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-bold shadow-sm transition-all">
            Editar
          </Link>
          {displayStatus !== 'Pagada' && displayStatus !== 'Anulada' && (invoice.clients?.id || invoice.client_id) && (
            <Link href={`/admin/cuentas-por-cobrar/recibir/${invoice.clients?.id || invoice.client_id}`} className="px-4 py-2 bg-[#0A2636] text-white rounded-lg text-sm font-bold shadow-sm transition-all">
              Cobrar
            </Link>
          )}
          <button onClick={() => window.print()} className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 flex items-center gap-2 text-sm font-bold shadow-sm transition-all">
            <Printer size={18} /> Imprimir
          </button>
        </div>
      </div>

      {/* ========== INVOICE DOCUMENT ========== */}
      <div className="bg-white shadow-lg print:shadow-none mx-auto flex flex-col" style={{ maxWidth: '210mm', minHeight: '297mm' }}>
        
        <div className="px-12 pt-10 pb-8 flex-1 flex flex-col">
          
          {/* HEADER: Company info + Logo */}
          <div className="flex justify-between items-start mb-2 gap-4">
            <div>
              <p className="text-2xl font-black text-gray-800 tracking-wide uppercase">Factura</p>
              <p className="text-sm font-bold text-gray-700 mt-1">JRS CARGO S.A.</p>
              <p className="text-xs text-gray-400">San Pablo de Heredia, Costa Rica</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="JRS Cargo" className="h-28 md:h-32 print:h-32 w-auto object-contain shrink-0" />
          </div>

          {/* Separator */}
          <div className="h-px bg-gray-200 my-6"></div>

          {/* Client info */}
          <div className="flex justify-between mb-1">
            <div>
              <p className="text-sm font-bold text-gray-800">{invoice.clients?.name}</p>
              <p className="text-xs text-gray-500">Facturar a</p>
              <p className="text-xs text-gray-400">{invoice.clients?.name}</p>
              {invoice.clients?.email && <p className="text-xs text-gray-400">{invoice.clients.email}</p>}
              {invoice.clients?.phone && <p className="text-xs text-gray-400">{invoice.clients.phone}</p>}
            </div>
            <div className="text-right">
              {displayStatus === 'Anulada' && <p className="text-xs font-bold text-red-500 uppercase">Anulada</p>}
              {displayStatus === 'Pagada' && <p className="text-xs font-bold text-green-600 uppercase">Pagada</p>}
              {displayStatus !== 'Anulada' && displayStatus !== 'Pagada' && <p className="text-xs font-bold text-amber-500 uppercase">Pendiente</p>}
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-gray-200 my-6"></div>

          {/* Invoice Details */}
          <div className="mb-8">
            <p className="text-sm font-bold text-gray-700 mb-1">Detalles de Factura</p>
            <p className="text-xs text-gray-500">N.º de Factura: {invoice.invoice_number}</p>
            <p className="text-xs text-gray-500">Fecha de Factura: {formatDisplayDate(invoice.issue_date)}</p>
          </div>

          {/* Items Table - simple, no colored header */}
          <table className="w-full text-xs mb-8">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="py-2 text-left font-bold text-gray-600 w-8">N.º</th>
                <th className="py-2 text-left font-bold text-gray-600">Producto/servicio</th>
                <th className="py-2 text-left font-bold text-gray-600">Numero de Rastreo</th>
                <th className="py-2 text-right font-bold text-gray-600">Peso</th>
                <th className="py-2 text-right font-bold text-gray-600">Tarifa</th>
                <th className="py-2 text-right font-bold text-gray-600">Importe</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, index) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-3 text-gray-400">{index + 1}.</td>
                  <td className="py-3 text-gray-700">{item.service_name}</td>
                  <td className="py-3 text-gray-500 font-mono">{item.tracking_number || '-'}</td>
                  <td className="py-3 text-gray-500 text-right">{item.weight || '-'}</td>
                  <td className="py-3 text-gray-500 text-right">{item.rate ? '$' + Number(item.rate).toFixed(2) : '-'}</td>
                  <td className="py-3 text-gray-800 text-right font-bold">${Number(item.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals - simple right-aligned */}
          <div className="flex justify-end mb-6">
            <div className="w-64">
              {(() => {
                const subtotalVal = Number(invoice.subtotal || invoice.total || 0);
                const totalVal = Number(invoice.total || 0);
                const rawDiscPercent = Number(invoice.discount_percent) || 0;
                const rawDiscAmt = Number(invoice.discount_amount) || 0;

                let computedDiscountPercent = 0;
                let computedDiscountAmount = 0;

                if (rawDiscPercent > 0) {
                  computedDiscountPercent = rawDiscPercent;
                  computedDiscountAmount = (subtotalVal * rawDiscPercent) / 100;
                } else if (rawDiscAmt > 0) {
                  computedDiscountAmount = rawDiscAmt;
                  computedDiscountPercent = subtotalVal > 0 ? Math.round((rawDiscAmt / subtotalVal) * 100 * 10) / 10 : 0;
                } else if (subtotalVal > totalVal && subtotalVal > 0) {
                  computedDiscountAmount = subtotalVal - totalVal;
                  computedDiscountPercent = Math.round(((subtotalVal - totalVal) / subtotalVal) * 100 * 10) / 10;
                }

                return (
                  <>
                    <div className="flex justify-between py-1 text-xs text-gray-500">
                      <span>Subtotal</span>
                      <span className="text-gray-700 font-medium">${subtotalVal.toFixed(2)}</span>
                    </div>
                    {computedDiscountAmount > 0 && (
                      <div className="flex justify-between py-1 text-xs text-gray-500">
                        <span>Descuento {computedDiscountPercent > 0 ? `(${computedDiscountPercent}%)` : ''}</span>
                        <span className="text-green-600 font-bold">-${computedDiscountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-t border-gray-200 text-sm mt-1">
                      <span className="font-bold text-gray-700">Total</span>
                      <span className="font-black text-gray-900 text-lg">${totalVal.toFixed(2)}</span>
                    </div>
                  </>
                );
              })()}
              <div className="flex justify-between py-1 text-xs text-gray-400">
                <span>Total Colones</span>
                <span className="text-gray-500">₡{totalColones}</span>
              </div>
              <p className="text-[9px] text-gray-300 text-right mt-1">
                T.C. ₡{exchangeRate.toLocaleString('es-CR')} por $1 USD
              </p>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-4 mb-8">
              <p className="text-xs text-gray-400 mb-1">Observaciones:</p>
              <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">{invoice.notes}</p>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Footer */}
          <div className="border-t border-gray-100 pt-4 text-center text-[10px] text-gray-300">
            <p>JRS CARGO S.A. | info@jrscargocr.com | +506 7260-1238 | www.jrscargocr.com</p>
          </div>

        </div>
      </div>
    </div>
  );
}
