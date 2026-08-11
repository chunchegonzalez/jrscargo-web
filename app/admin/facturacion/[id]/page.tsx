'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';

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
    name: string;
    email: string;
    phone?: string;
  };
  items?: InvoiceItem[];
};

export default function InvoiceViewPage() {
  const params = useParams();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('SINPE');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [isPaying, setIsPaying] = useState(false);

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

  const handleConfirmPayment = async () => {
    if (!invoice) return;
    setIsPaying(true);
    
    try {
      const currentNotes = invoice.notes || '';
      const paymentInfo = `\n\n--- PAGO REGISTRADO ---\nMétodo: ${paymentMethod}\nRef: ${paymentReference || 'N/A'}\nFecha: ${new Date().toLocaleDateString()}`;
      const newNotes = currentNotes + paymentInfo;

      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Pagada',
          notes: newNotes.trim()
        })
      });
      if (res.ok) {
        setShowPaymentModal(false);
        loadInvoice(); // reload to show updated status and notes
      } else {
        alert('Error al registrar pago');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setIsPaying(false);
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/admin/facturacion" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-black text-brand-blue">Factura {invoice.invoice_number}</h1>
        </div>
        
        <div className="flex gap-2">
          <Link href={`/admin/facturacion/${id}/editar`} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-bold shadow-sm transition-all">
            Editar Factura
          </Link>
          {invoice.status !== 'Pagada' && (
            <button onClick={() => {
              setPaymentMethod('SINPE');
              setPaymentReference('');
              setShowPaymentModal(true);
            }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-bold shadow-sm transition-all">
              Marcar Pagada
            </button>
          )}
          <button onClick={() => window.print()} className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 flex items-center gap-2 text-sm font-bold shadow-sm transition-all">
            <Printer size={18} /> Imprimir o descargar
          </button>
        </div>
      </div>

      {/* Papel A4 Blanco */}
      <div className="bg-white rounded-md shadow-lg print:shadow-none mx-auto overflow-hidden text-gray-800" style={{ maxWidth: '210mm', minHeight: '297mm' }}>
        <div className="p-12 md:p-16">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-12">
            <div>
              <h1 className="text-[2.5rem] font-light text-gray-500 tracking-wider mb-6">FACTURA</h1>
              <div className="flex gap-12 text-xs text-gray-700 leading-relaxed">
                <div>
                  <p className="font-bold text-sm mb-1">JRS CARGO S.A.</p>
                  <p>San Pablo de Heredia</p>
                  <p>Costa Rica</p>
                </div>
                <div>
                  <p>info@jrscargocr.com</p>
                  <p>+506 72601238</p>
                  <p>www.jrscargocr.com</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="JRS Cargo" className="h-28 w-auto object-contain" />
            </div>
          </div>

          <div className="border-t border-gray-100 my-8"></div>

          {/* Facturar A */}
          <div className="flex justify-between mb-8 text-sm">
            <div className="w-1/2">
              <p className="text-gray-500 mb-1">Facturar a</p>
              <p className="text-gray-800 font-medium">{invoice.clients?.name}</p>
            </div>
          </div>

          {/* Detalles de Factura */}
          <div className="mb-12 text-sm space-y-1">
            <p className="font-bold text-gray-700 mb-2">Detalles de Factura</p>
            <p className="text-gray-600">N.º de Factura: <span className="text-gray-800">{invoice.invoice_number}</span></p>
            <p className="text-gray-600">Fecha de Factura: <span className="text-gray-800">{new Date(invoice.issue_date).toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span></p>
          </div>

          {/* Tabla de Items */}
          <table className="w-full text-left text-sm mb-8">
            <thead>
              <tr className="border-b-2 border-gray-800 text-gray-800 font-bold">
                <th className="py-3 px-2 w-12 text-center">N.º</th>
                <th className="py-3 px-2">Fecha del servicio</th>
                <th className="py-3 px-2">Producto/servicio</th>
                <th className="py-3 px-2">Numero de Rastreo</th>
                <th className="py-3 px-2 text-right">Peso</th>
                <th className="py-3 px-2 text-right">Tarifa</th>
                <th className="py-3 px-2 text-right">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.items?.map((item, index) => (
                <tr key={item.id} className="text-gray-700">
                  <td className="py-4 px-2 text-center text-gray-500">{index + 1}.</td>
                  <td className="py-4 px-2">{new Date(invoice.issue_date).toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                  <td className="py-4 px-2">{item.service_name}</td>
                  <td className="py-4 px-2">{item.tracking_number || '-'}</td>
                  <td className="py-4 px-2 text-right">{item.weight ? `${item.weight}` : '-'}</td>
                  <td className="py-4 px-2 text-right">{item.rate ? `$${Number(item.rate).toFixed(2)}` : '-'}</td>
                  <td className="py-4 px-2 text-right font-medium">${Number(item.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales */}
          <div className="flex justify-end pt-6">
            <div className="w-64 space-y-3 text-sm">
              <div className="flex justify-between items-center text-gray-600">
                <span>Subtotal</span>
                <span>${Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              {Number(invoice.discount_percent) > 0 && (
                <div className="flex justify-between items-center text-gray-600">
                  <span>Descuento {invoice.discount_percent}%</span>
                  <span>-${((Number(invoice.subtotal) * Number(invoice.discount_percent)) / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-gray-200 font-bold text-gray-900">
                <span>Factura a clientes en total</span>
                <span>${Number(invoice.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="mt-16 pt-8 border-t border-gray-100 text-sm text-gray-500">
              <p className="font-bold text-gray-700 mb-1">Nota para cliente</p>
              <p className="whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}

        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-brand-blue text-lg flex items-center gap-2">
                Registrar Pago
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                &times;
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Método de Pago</label>
                <select 
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-brand-blue focus:ring-0 text-sm font-medium"
                >
                  <option value="SINPE">SINPE Móvil</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta (Datafono/En línea)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Referencia / Comprobante (Opcional)</label>
                <input 
                  type="text"
                  value={paymentReference}
                  onChange={e => setPaymentReference(e.target.value)}
                  placeholder="Ej: 902130219"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-brand-blue focus:ring-0 text-sm font-medium"
                />
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex gap-3">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmPayment}
                  disabled={isPaying} 
                  className="flex-1 py-3 font-bold bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isPaying ? 'Guardando...' : 'Confirmar Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
