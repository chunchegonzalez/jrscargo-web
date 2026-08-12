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

  const exchangeRate = invoice.exchange_rate || 530;
  const totalColones = (Number(invoice.total) * exchangeRate).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const issueDate = new Date(invoice.issue_date).toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="max-w-5xl mx-auto space-y-6 print:space-y-0 print:m-0 print:p-0 print:max-w-none">
      {/* Action bar - hidden on print */}
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
          <Link href={`/admin/facturacion/${id}/editar`} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-bold shadow-sm transition-all">
            Editar
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

      {/* ======================== INVOICE DOCUMENT ======================== */}
      <div className="bg-white shadow-lg print:shadow-none mx-auto flex flex-col" style={{ maxWidth: '210mm', minHeight: '297mm' }}>
        
        {/* Top accent line */}
        <div className="h-1.5 bg-brand-blue"></div>

        <div className="px-12 pt-8 pb-10 flex-1 flex flex-col">
          
          {/* ---- HEADER ROW: Logo + Invoice info ---- */}
          <div className="flex justify-between items-start mb-8">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="JRS Cargo" className="h-14 w-auto object-contain mb-3" />
              <p className="text-xs font-bold text-brand-blue tracking-wide">JRS CARGO S.A.</p>
              <p className="text-[10px] text-gray-400 mt-0.5">San Pablo de Heredia, Costa Rica</p>
              <p className="text-[10px] text-gray-400">Tel: +506 7260-1238</p>
              <p className="text-[10px] text-gray-400">info@jrscargocr.com</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-brand-blue font-bold uppercase tracking-widest">Factura</p>
              <p className="text-3xl font-black text-brand-blue mt-1">{invoice.invoice_number}</p>
            </div>
          </div>

          {/* ---- INFO TABLE: Client + Invoice details ---- */}
          <table className="w-full text-xs mb-8 border border-gray-200">
            <tbody>
              <tr>
                <td className="bg-gray-50 px-3 py-2 font-bold text-brand-blue border border-gray-200 w-28">Cliente:</td>
                <td className="px-3 py-2 border border-gray-200">{invoice.clients?.name}</td>
                <td className="bg-gray-50 px-3 py-2 font-bold text-brand-blue border border-gray-200 w-32">Fecha Emisión:</td>
                <td className="px-3 py-2 border border-gray-200">{issueDate}</td>
              </tr>
              <tr>
                <td className="bg-gray-50 px-3 py-2 font-bold text-brand-blue border border-gray-200">Email:</td>
                <td className="px-3 py-2 border border-gray-200">{invoice.clients?.email}</td>
                <td className="bg-gray-50 px-3 py-2 font-bold text-brand-blue border border-gray-200">Condición:</td>
                <td className="px-3 py-2 border border-gray-200">
                  {displayStatus === 'Pagada' && <span className="text-green-600 font-bold">Pagada</span>}
                  {displayStatus === 'Anulada' && <span className="text-red-500 font-bold">Anulada</span>}
                  {displayStatus !== 'Pagada' && displayStatus !== 'Anulada' && <span className="text-amber-600 font-bold">Pendiente</span>}
                </td>
              </tr>
              <tr>
                <td className="bg-gray-50 px-3 py-2 font-bold text-brand-blue border border-gray-200">Teléfono:</td>
                <td className="px-3 py-2 border border-gray-200">{invoice.clients?.phone || '-'}</td>
                <td className="bg-gray-50 px-3 py-2 font-bold text-brand-blue border border-gray-200">Moneda:</td>
                <td className="px-3 py-2 border border-gray-200">Dólar US</td>
              </tr>
            </tbody>
          </table>

          {/* ---- ITEMS TABLE ---- */}
          <table className="w-full text-xs mb-6 border-collapse">
            <thead>
              <tr className="bg-brand-blue text-white">
                <th className="py-2.5 px-3 text-left font-bold text-[10px] uppercase tracking-wider border border-brand-blue">N.º</th>
                <th className="py-2.5 px-3 text-left font-bold text-[10px] uppercase tracking-wider border border-brand-blue">Servicio</th>
                <th className="py-2.5 px-3 text-left font-bold text-[10px] uppercase tracking-wider border border-brand-blue">Tracking</th>
                <th className="py-2.5 px-3 text-center font-bold text-[10px] uppercase tracking-wider border border-brand-blue">Peso</th>
                <th className="py-2.5 px-3 text-right font-bold text-[10px] uppercase tracking-wider border border-brand-blue">Tarifa</th>
                <th className="py-2.5 px-3 text-right font-bold text-[10px] uppercase tracking-wider border border-brand-blue">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="py-2.5 px-3 border border-gray-200 text-gray-400 text-center">{String(index + 1).padStart(2, '0')}</td>
                  <td className="py-2.5 px-3 border border-gray-200 text-gray-800 font-medium">{item.service_name}</td>
                  <td className="py-2.5 px-3 border border-gray-200 font-mono text-gray-500">{item.tracking_number || '-'}</td>
                  <td className="py-2.5 px-3 border border-gray-200 text-center text-gray-500">{item.weight ? item.weight + ' lb' : '-'}</td>
                  <td className="py-2.5 px-3 border border-gray-200 text-right text-gray-500">{item.rate ? '$' + Number(item.rate).toFixed(2) : '-'}</td>
                  <td className="py-2.5 px-3 border border-gray-200 text-right font-bold text-gray-800">${Number(item.amount).toFixed(2)}</td>
                </tr>
              ))}
              {/* Empty rows to fill space if few items */}
              {(invoice.items?.length || 0) < 3 && Array.from({ length: 3 - (invoice.items?.length || 0) }).map((_, i) => (
                <tr key={'empty-' + i}>
                  <td className="py-2.5 px-3 border border-gray-200">&nbsp;</td>
                  <td className="py-2.5 px-3 border border-gray-200"></td>
                  <td className="py-2.5 px-3 border border-gray-200"></td>
                  <td className="py-2.5 px-3 border border-gray-200"></td>
                  <td className="py-2.5 px-3 border border-gray-200"></td>
                  <td className="py-2.5 px-3 border border-gray-200"></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ---- NOTES + TOTALS ROW ---- */}
          <div className="flex gap-8 mb-8">
            {/* Notes - left side */}
            <div className="flex-1">
              {invoice.notes && (
                <div className="border border-gray-200 rounded p-3 h-full">
                  <p className="text-[10px] text-brand-blue font-bold uppercase tracking-wider mb-1">Observaciones</p>
                  <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">{invoice.notes}</p>
                </div>
              )}
            </div>

            {/* Totals - right side */}
            <div className="w-72">
              <table className="w-full text-xs border-collapse">
                <tbody>
                  <tr>
                    <td className="py-2 px-3 border border-gray-200 bg-gray-50 font-bold text-gray-600">Sub-Total:</td>
                    <td className="py-2 px-3 border border-gray-200 text-right font-medium text-gray-800">${Number(invoice.subtotal).toFixed(2)}</td>
                  </tr>
                  {Number(invoice.discount_percent) > 0 && (
                    <tr>
                      <td className="py-2 px-3 border border-gray-200 bg-gray-50 font-bold text-gray-600">Descuento ({invoice.discount_percent}%):</td>
                      <td className="py-2 px-3 border border-gray-200 text-right font-medium text-green-600">-${((Number(invoice.subtotal) * Number(invoice.discount_percent)) / 100).toFixed(2)}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-2.5 px-3 border border-brand-blue bg-brand-blue font-bold text-white text-sm">Total USD:</td>
                    <td className="py-2.5 px-3 border border-brand-blue bg-brand-blue text-right font-black text-white text-lg">${Number(invoice.total).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 border border-gray-200 bg-gray-50 font-bold text-gray-600">Total Colones:</td>
                    <td className="py-2 px-3 border border-gray-200 text-right font-bold text-gray-700">₡{totalColones}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-[9px] text-gray-400 text-right mt-1.5">
                Tipo de cambio: ₡{exchangeRate.toLocaleString('es-CR')} por $1 USD
              </p>
            </div>
          </div>

          {/* Spacer to push footer down */}
          <div className="flex-1"></div>

          {/* ---- FOOTER ---- */}
          <div className="border-t border-gray-200 pt-4 text-center">
            <p className="text-[10px] font-bold text-brand-blue">JRS CARGO S.A.</p>
            <p className="text-[9px] text-gray-400 mt-0.5">info@jrscargocr.com | +506 7260-1238 | www.jrscargocr.com</p>
            <p className="text-[9px] text-gray-400">San Pablo de Heredia, Costa Rica</p>
          </div>

        </div>
      </div>
    </div>
  );
}
