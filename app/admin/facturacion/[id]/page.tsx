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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/facturacion" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-black text-brand-blue">Factura {invoice.invoice_number}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            invoice.status === 'Pagada' ? 'bg-green-100 text-green-700' :
            invoice.status === 'Vencida' ? 'bg-red-100 text-red-700' :
            'bg-orange-100 text-orange-700'
          }`}>
            {invoice.status}
          </span>
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="p-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-bold">
            <Printer size={18} /> Imprimir
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100 print:shadow-none print:border-none print:p-0">
        
        {/* Header Factura */}
        <div className="flex flex-col md:flex-row justify-between items-start border-b border-gray-100 pb-8 mb-8">
          <div>
            <h2 className="text-3xl font-black text-brand-blue mb-1">JRS CARGO</h2>
            <p className="text-sm text-gray-500">Recibo Comercial</p>
          </div>
          <div className="text-right mt-4 md:mt-0">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Factura Nº</p>
            <p className="text-xl font-bold text-gray-800">{invoice.invoice_number}</p>
            <p className="text-sm text-gray-500 mt-2">Fecha: {new Date(invoice.issue_date).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Cliente Info */}
        <div className="mb-10 p-6 bg-gray-50 rounded-2xl border border-gray-100">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Facturado A</h3>
          <p className="text-lg font-bold text-gray-800">{invoice.clients?.name}</p>
          <p className="text-sm text-gray-600 mt-1">{invoice.clients?.email}</p>
          {invoice.clients?.phone && <p className="text-sm text-gray-600 mt-1">{invoice.clients?.phone}</p>}
        </div>

        {/* Items Table */}
        <div className="mb-10">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Descripción</th>
                  <th className="py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.items?.map((item) => (
                  <tr key={item.id}>
                    <td className="py-4">
                      <p className="font-bold text-gray-800">{item.service_name}</p>
                      <div className="text-xs text-gray-500 flex gap-4 mt-1">
                        {item.tracking_number && <span>Tracking: {item.tracking_number}</span>}
                        {Number(item.weight) > 0 && <span>Peso: {item.weight} Lb</span>}
                        {Number(item.rate) > 0 && <span>Tarifa: ${item.rate}/Lb</span>}
                      </div>
                    </td>
                    <td className="py-4 text-right font-bold text-gray-800">
                      ${Number(item.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totales */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 pt-6 border-t border-gray-200">
          <div className="w-full md:w-1/2">
            {invoice.notes && (
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Notas</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl">{invoice.notes}</p>
              </div>
            )}
          </div>
          <div className="w-full md:w-1/3 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-500">Subtotal</span>
              <span className="text-sm font-bold text-gray-800">${Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            {Number(invoice.discount_percent) > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-green-600">Descuento ({invoice.discount_percent}%)</span>
                <span className="text-sm font-bold text-green-600">-${((Number(invoice.subtotal) * Number(invoice.discount_percent)) / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="text-lg font-black text-brand-blue uppercase tracking-wider">Total</span>
              <span className="text-2xl font-black text-brand-blue">${Number(invoice.total).toFixed(2)} USD</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
