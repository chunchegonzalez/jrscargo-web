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

      {/* Papel A4 Premium */}
      <div className="bg-white rounded-md shadow-lg print:shadow-none mx-auto overflow-hidden text-gray-800" style={{ maxWidth: '210mm', minHeight: '297mm' }}>
        
        {/* ===== HEADER OSCURO ===== */}
        <div className="bg-[#0A2636] text-white px-12 pt-10 pb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-1">FACTURA</h1>
            <p className="text-sm text-gray-300 font-light">Documento Tributario Electrónico</p>
          </div>
          <div className="text-right">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="JRS Cargo" className="h-20 w-auto object-contain ml-auto" />
          </div>
        </div>

        {/* ===== DATOS DE EMPRESA + N° FACTURA ===== */}
        <div className="px-12 py-8 flex gap-8">
          {/* Empresa */}
          <div className="flex-1 bg-gray-50 rounded-2xl p-6 border border-gray-100">
            <p className="font-black text-brand-blue text-base mb-3">JRS CARGO S.A.</p>
            <div className="space-y-1.5 text-xs text-gray-600">
              <p className="flex items-center gap-2">📍 San Pablo de Heredia, Costa Rica</p>
              <p className="flex items-center gap-2">✉️ info@jrscargocr.com</p>
              <p className="flex items-center gap-2">📞 +506 72601238</p>
              <p className="flex items-center gap-2">🌐 www.jrscargocr.com</p>
            </div>
          </div>
          {/* N° Factura */}
          <div className="w-56 shrink-0">
            <div className="bg-[#0A2636] text-white rounded-2xl p-5 text-center mb-3">
              <p className="text-xs uppercase tracking-wider text-gray-300 mb-1">N.º de Factura</p>
              <p className="text-3xl font-black">{invoice.invoice_number}</p>
            </div>
            <div className="bg-[#C62828] text-white rounded-2xl p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-red-200 mb-0.5">Fecha de Factura</p>
              <p className="text-sm font-bold">{new Date(invoice.issue_date).toLocaleDateString('es-CR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 mx-12"></div>

        {/* ===== FACTURAR A + DETALLES ===== */}
        <div className="px-12 py-6 flex gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-brand-blue text-lg">👤</span>
              <p className="text-xs font-black text-gray-500 uppercase tracking-wider">Facturar A</p>
            </div>
            <p className="text-base font-bold text-gray-800">{invoice.clients?.name}</p>
            {invoice.clients?.email && <p className="text-xs text-gray-500 mt-1">{invoice.clients.email}</p>}
            {invoice.clients?.phone && <p className="text-xs text-gray-500">{invoice.clients.phone}</p>}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#C62828] text-lg">📋</span>
              <p className="text-xs font-black text-gray-500 uppercase tracking-wider">Detalles de Factura</p>
            </div>
            <div className="text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">N.º de Factura:</span>
                <span className="font-bold text-gray-800">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fecha de Factura:</span>
                <span className="font-bold text-gray-800">{new Date(invoice.issue_date).toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estado:</span>
                {displayStatus === 'Anulada' && (
                  <span className="bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-black">ANULADA</span>
                )}
                {displayStatus === 'Pagada' && (
                  <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-black">PAGADA</span>
                )}
                {displayStatus !== 'Anulada' && displayStatus !== 'Pagada' && (
                  <span className="bg-yellow-100 text-yellow-700 px-2.5 py-0.5 rounded-full text-xs font-black">PENDIENTE</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===== TABLA DE ITEMS ===== */}
        <div className="px-12 py-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[#0A2636] text-white text-xs uppercase tracking-wider">
                <th className="py-3 px-3 rounded-tl-xl text-center w-12">N.º</th>
                <th className="py-3 px-3">Fecha del Servicio</th>
                <th className="py-3 px-3">Producto / Servicio</th>
                <th className="py-3 px-3">Número de Rastreo</th>
                <th className="py-3 px-3 text-center">Peso</th>
                <th className="py-3 px-3 text-right">Tarifa</th>
                <th className="py-3 px-3 text-right rounded-tr-xl">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items?.map((item, index) => (
                <tr key={item.id} className="text-gray-700 hover:bg-gray-50/50">
                  <td className="py-4 px-3 text-center text-gray-400 font-bold">{index + 1}.</td>
                  <td className="py-4 px-3 whitespace-nowrap">{new Date(invoice.issue_date).toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                  <td className="py-4 px-3 font-medium">{item.service_name}</td>
                  <td className="py-4 px-3 font-mono text-xs">{item.tracking_number || '-'}</td>
                  <td className="py-4 px-3 text-center">{item.weight ? `${item.weight}` : '-'}</td>
                  <td className="py-4 px-3 text-right">{item.rate ? `$${Number(item.rate).toFixed(2)}` : '-'}</td>
                  <td className="py-4 px-3 text-right font-bold">${Number(item.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ===== TOTALES ===== */}
        <div className="px-12 py-4 flex justify-end">
          <div className="w-72">
            <div className="flex justify-between items-center py-2 text-sm text-gray-600 border-b border-gray-100">
              <span>Subtotal</span>
              <span className="font-bold text-gray-800">${Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            {Number(invoice.discount_percent) > 0 && (
              <div className="flex justify-between items-center py-2 text-sm text-gray-600 border-b border-gray-100">
                <span>Descuento {invoice.discount_percent}%</span>
                <span className="font-bold text-red-600">-${((Number(invoice.subtotal) * Number(invoice.discount_percent)) / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-3 mt-1 bg-[#C62828] text-white rounded-xl px-4">
              <span className="font-black text-xs uppercase tracking-wider">Factura a Clientes en Total</span>
              <span className="text-xl font-black">${Number(invoice.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ===== INFORMACIÓN DE PAGO ===== */}
        <div className="px-12 py-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-brand-blue text-lg">💲</span>
            <p className="text-xs font-black text-brand-blue uppercase tracking-wider">Información de Pago</p>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed max-w-md">
            Agradecemos su pago en un plazo de 15 días naturales a partir de la fecha de emisión de esta factura.
          </p>
          {invoice.notes && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs font-bold text-gray-700 mb-1">Nota para cliente:</p>
              <p className="text-xs text-gray-500 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}
          <p className="text-xs text-gray-400 italic mt-4">Si tiene alguna consulta, no dude en contactarnos.</p>
          <p className="text-sm font-black text-[#C62828] mt-1">¡Gracias por su preferencia!</p>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="mt-auto bg-[#0A2636] text-white px-12 py-5 flex justify-between items-center text-xs">
          <p className="flex items-center gap-1.5">🌐 www.jrscargocr.com</p>
          <p className="flex items-center gap-1.5">✉️ info@jrscargocr.com</p>
          <p className="flex items-center gap-1.5">📞 +506 72601238</p>
        </div>

      </div>

      {/* (Removed Payment Modal) */}
    </div>
  );
}
