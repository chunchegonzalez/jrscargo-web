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
                  <p>Heredia</p>
                  <p>Heredia, Santo Domingo 40901</p>
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
              <img src="/logo.png" alt="JRS Cargo" className="h-16 object-contain" />
            </div>
          </div>

          <div className="border-t border-gray-100 my-8"></div>

          {/* Facturar A y Enviar A */}
          <div className="flex justify-between mb-8 text-sm">
            <div className="w-1/2">
              <p className="text-gray-500 mb-1">Facturar a</p>
              <p className="text-gray-800">{invoice.clients?.name}</p>
            </div>
            <div className="w-1/2">
              <p className="text-gray-500 mb-1">Enviar a</p>
              <p className="text-gray-800">{invoice.clients?.name}</p>
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
              <p>{invoice.notes}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
