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
            <Printer size={18} /> Imprimir o descargar
          </button>
        </div>
      </div>

      {/* Papel A4 - Diseño Limpio */}
      <div className="bg-white rounded-md shadow-lg print:shadow-none mx-auto overflow-hidden text-gray-800 flex flex-col" style={{ maxWidth: '210mm', minHeight: '297mm' }}>
        
        {/* Header con franja de marca */}
        <div className="bg-brand-blue px-10 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-black text-white tracking-tight">FACTURA</h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="JRS Cargo" className="h-16 w-auto object-contain" />
        </div>

        {/* Contenido principal */}
        <div className="px-10 py-8 flex-1">

          {/* Fila: Empresa + Número de factura */}
          <div className="flex justify-between items-start mb-8">
            <div className="text-xs text-gray-600 leading-relaxed">
              <p className="font-black text-brand-blue text-sm mb-1">JRS CARGO S.A.</p>
              <p>San Pablo de Heredia, Costa Rica</p>
              <p>info@jrscargocr.com &bull; +506 72601238</p>
              <p>www.jrscargocr.com</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">N.º de Factura</p>
              <p className="text-2xl font-black text-brand-blue">{invoice.invoice_number}</p>
              <p className="text-xs text-gray-500 mt-2">Fecha: {new Date(invoice.issue_date).toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
              {displayStatus === 'Anulada' && (
                <span className="inline-block mt-2 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-black">ANULADA</span>
              )}
              {displayStatus === 'Pagada' && (
                <span className="inline-block mt-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black">PAGADA</span>
              )}
              {displayStatus !== 'Anulada' && displayStatus !== 'Pagada' && (
                <span className="inline-block mt-2 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-black">PENDIENTE</span>
              )}
            </div>
          </div>

          {/* Línea separadora con acento amarillo */}
          <div className="h-0.5 bg-gradient-to-r from-brand-yellow via-brand-yellow to-transparent mb-8"></div>

          {/* Facturar a */}
          <div className="mb-8">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Facturar a</p>
            <p className="text-sm font-bold text-gray-800">{invoice.clients?.name}</p>
            {invoice.clients?.email && <p className="text-xs text-gray-500">{invoice.clients.email}</p>}
            {invoice.clients?.phone && <p className="text-xs text-gray-500">{invoice.clients.phone}</p>}
          </div>

          {/* Tabla de Items */}
          <table className="w-full text-left text-sm mb-8">
            <thead>
              <tr className="border-b-2 border-brand-blue text-brand-blue text-xs uppercase tracking-wider">
                <th className="py-2.5 pr-2 w-10 text-center">N.º</th>
                <th className="py-2.5 px-2">Fecha</th>
                <th className="py-2.5 px-2">Servicio</th>
                <th className="py-2.5 px-2">Tracking</th>
                <th className="py-2.5 px-2 text-center">Peso</th>
                <th className="py-2.5 px-2 text-right">Tarifa</th>
                <th className="py-2.5 pl-2 text-right">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items?.map((item, index) => (
                <tr key={item.id} className="text-gray-700">
                  <td className="py-3 pr-2 text-center text-gray-400">{index + 1}.</td>
                  <td className="py-3 px-2 whitespace-nowrap text-xs">{new Date(invoice.issue_date).toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                  <td className="py-3 px-2 font-medium text-xs">{item.service_name}</td>
                  <td className="py-3 px-2 font-mono text-xs">{item.tracking_number || '-'}</td>
                  <td className="py-3 px-2 text-center text-xs">{item.weight ? `${item.weight}` : '-'}</td>
                  <td className="py-3 px-2 text-right text-xs">{item.rate ? `$${Number(item.rate).toFixed(2)}` : '-'}</td>
                  <td className="py-3 pl-2 text-right font-bold text-xs">${Number(item.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales */}
          <div className="flex justify-end mb-8">
            <div className="w-80">
              <div className="flex justify-between items-center py-2 text-sm text-gray-500 border-b border-gray-100">
                <span>Subtotal (USD)</span>
                <span className="font-bold text-gray-800">${Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              {Number(invoice.discount_percent) > 0 && (
                <div className="flex justify-between items-center py-2 text-sm text-gray-500 border-b border-gray-100">
                  <span>Descuento {invoice.discount_percent}%</span>
                  <span className="font-bold text-red-600">-${((Number(invoice.subtotal) * Number(invoice.discount_percent)) / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-3 bg-brand-blue text-white rounded-lg px-4 mt-2">
                <span className="font-bold text-xs uppercase">Total USD</span>
                <span className="text-lg font-black">${Number(invoice.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-brand-yellow/20 text-gray-800 rounded-lg px-4 mt-2 border border-brand-yellow/30">
                <span className="font-bold text-xs uppercase">Total Colones</span>
                <span className="text-lg font-black">₡{(Number(invoice.total) * (invoice.exchange_rate || 530)).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <p className="text-[10px] text-gray-400 text-right mt-1">
                Tipo de cambio referencia: ₡{(invoice.exchange_rate || 530).toLocaleString('es-CR')} por $1 USD
              </p>
            </div>
          </div>

          {/* Notas / Información de pago */}
          <div className="border-t border-gray-100 pt-6">
            <p className="text-xs text-gray-500 leading-relaxed">
              Agradecemos su pago en un plazo de 15 días naturales a partir de la fecha de emisión de esta factura.
            </p>
            {invoice.notes && (
              <p className="text-xs text-gray-500 mt-2 whitespace-pre-line">{invoice.notes}</p>
            )}
            <p className="text-xs text-gray-400 italic mt-3">Si tiene alguna consulta, no dude en contactarnos.</p>
            <p className="text-sm font-black text-brand-blue mt-1">¡Gracias por su preferencia!</p>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-brand-blue text-white px-10 py-4 flex justify-between items-center text-xs mt-auto">
          <span>www.jrscargocr.com</span>
          <span>info@jrscargocr.com</span>
          <span>+506 72601238</span>
        </div>

      </div>

      {/* (Removed Payment Modal) */}
    </div>
  );
}
