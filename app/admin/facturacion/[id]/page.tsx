'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Printer, Ban, Trash2 } from 'lucide-react';
import { useModal } from '@/app/components/ModalProvider';

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
    if (!(await showConfirm('Confirmación', '¿Estás seguro de que deseas ELIMINAR esta factura permanentemente? Esta acción no se puede deshacer.'))) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE'
      });
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

  if (loading) {
    return <div className="text-center p-20 text-gray-500 font-bold">Cargando factura...</div>;
  }

  if (!invoice) {
    return <div className="text-center p-20 text-red-500 font-bold">Factura no encontrada.</div>;
  }

  let displayStatus = invoice.status;
  let paidAmount = 0;
  if (invoice.status !== 'Pagada' && invoice.status !== 'Anulada') {
    if (invoice.invoice_payments && Array.isArray(invoice.invoice_payments)) {
      paidAmount = invoice.invoice_payments.reduce((acc, p) => acc + Number(p.amount_applied), 0);
    }
    const pending = Number(invoice.total) - paidAmount;
    if (pending <= 0.01) {
      displayStatus = 'Pagada';
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 print:space-y-0 print:m-0 print:p-0 print:max-w-none">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/admin/facturacion" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-black text-brand-blue">Factura {invoice.invoice_number}</h1>
        </div>
        
        <div className="flex gap-2">
          {invoice.status !== 'Anulada' && (
            <button onClick={handleVoidInvoice} className="px-4 py-2 bg-orange-100 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-200 flex items-center gap-2 text-sm font-bold shadow-sm transition-all" title="Anular Factura">
              <Ban size={18} /> Anular
            </button>
          )}
          <button onClick={handleDeleteInvoice} className="px-4 py-2 bg-red-100 text-red-700 border border-red-200 rounded-lg hover:bg-red-200 flex items-center gap-2 text-sm font-bold shadow-sm transition-all" title="Eliminar Factura">
            <Trash2 size={18} /> Eliminar
          </button>
          <Link href={`/admin/facturacion/${id}/editar`} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-bold shadow-sm transition-all">
            Editar Factura
          </Link>
          {displayStatus !== 'Pagada' && displayStatus !== 'Anulada' && (invoice.clients?.id || invoice.client_id) && (
            <Link href={`/admin/cuentas-por-cobrar/recibir/${invoice.clients?.id || invoice.client_id}`} className="px-4 py-2 bg-[#0A2636] text-white rounded-lg hover:bg-[#0A2636]/90 flex items-center gap-2 text-sm font-bold shadow-sm transition-all">
              Cobrar
            </Link>
          )}
          <button onClick={() => window.print()} className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 flex items-center gap-2 text-sm font-bold shadow-sm transition-all">
            <Printer size={18} /> Imprimir
          </button>
        </div>
      </div>

      {/* Clean Invoice PDF */}
      <div className="bg-white rounded-md shadow-lg print:shadow-none mx-auto overflow-hidden text-gray-800 flex flex-col" style={{ maxWidth: '210mm', minHeight: '297mm' }}>
        
        {/* Header */}
        <div className="px-10 pt-10 pb-6 flex justify-between items-start">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="JRS Cargo" className="h-12 w-auto object-contain mb-3" />
            <div className="text-[11px] text-gray-400 leading-relaxed">
              <p>JRS CARGO S.A.</p>
              <p>San Pablo de Heredia, Costa Rica</p>
              <p>info@jrscargocr.com &bull; +506 7260-1238</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Factura</p>
            <p className="text-2xl font-black text-brand-blue">{invoice.invoice_number}</p>
            <p className="text-xs text-gray-400 mt-2">{new Date(invoice.issue_date).toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            {displayStatus === 'Anulada' && <span className="inline-block mt-2 text-red-500 text-[10px] font-bold uppercase tracking-wider">Anulada</span>}
            {displayStatus === 'Pagada' && <span className="inline-block mt-2 text-green-600 text-[10px] font-bold uppercase tracking-wider">Pagada</span>}
            {displayStatus !== 'Anulada' && displayStatus !== 'Pagada' && <span className="inline-block mt-2 text-amber-500 text-[10px] font-bold uppercase tracking-wider">Pendiente</span>}
          </div>
        </div>

        <div className="h-px bg-gray-200 mx-10"></div>

        <div className="px-10 py-8 flex-1">
          {/* Bill to */}
          <div className="mb-8">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Facturar a</p>
            <p className="text-sm font-bold text-gray-800">{invoice.clients?.name}</p>
            {invoice.clients?.email && <p className="text-xs text-gray-400">{invoice.clients.email}</p>}
            {invoice.clients?.phone && <p className="text-xs text-gray-400">{invoice.clients.phone}</p>}
          </div>

          {/* Items */}
          <table className="w-full text-left text-xs mb-8">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] text-gray-400 uppercase tracking-wider">
                <th className="py-2.5 pr-2 font-medium">Servicio</th>
                <th className="py-2.5 px-2 font-medium">Tracking</th>
                <th className="py-2.5 px-2 text-center font-medium">Peso</th>
                <th className="py-2.5 px-2 text-right font-medium">Tarifa</th>
                <th className="py-2.5 pl-2 text-right font-medium">Importe</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-3 pr-2 text-gray-700">{item.service_name}</td>
                  <td className="py-3 px-2 font-mono text-gray-400">{item.tracking_number || '-'}</td>
                  <td className="py-3 px-2 text-center text-gray-400">{item.weight ? `${item.weight} lb` : '-'}</td>
                  <td className="py-3 px-2 text-right text-gray-400">{item.rate ? `$${Number(item.rate).toFixed(2)}` : '-'}</td>
                  <td className="py-3 pl-2 text-right font-bold text-gray-700">${Number(item.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64">
              <div className="flex justify-between items-center py-2 text-xs text-gray-400 border-b border-gray-100">
                <span>Subtotal</span>
                <span className="text-gray-700">${Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              {Number(invoice.discount_percent) > 0 && (
                <div className="flex justify-between items-center py-2 text-xs text-gray-400 border-b border-gray-100">
                  <span>Descuento {invoice.discount_percent}%</span>
                  <span className="text-green-600">-${((Number(invoice.subtotal) * Number(invoice.discount_percent)) / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 mt-1 border-t-2 border-brand-blue">
                <span className="text-xs font-bold text-brand-blue uppercase">Total USD</span>
                <span className="text-xl font-black text-brand-blue">${Number(invoice.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-[11px] text-gray-400">Total Colones</span>
                <span className="text-sm font-bold text-gray-600">₡{(Number(invoice.total) * (invoice.exchange_rate || 530)).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <p className="text-[9px] text-gray-300 text-right mt-1">
                T.C. ₡{(invoice.exchange_rate || 530).toLocaleString('es-CR')} por $1 USD
              </p>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="border-t border-gray-100 pt-5">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Notas</p>
              <p className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-10 py-4 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-300 mt-auto">
          <span>JRS CARGO S.A.</span>
          <span>info@jrscargocr.com &bull; +506 7260-1238 &bull; jrscargocr.com</span>
        </div>
      </div>
    </div>
  );
}
