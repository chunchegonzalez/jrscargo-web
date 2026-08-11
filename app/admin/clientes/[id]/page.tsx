'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Printer, FileText, DollarSign, Mail, Phone, MapPin } from 'lucide-react';
import Link from 'next/link';

type Client = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  created_at: string;
};

type Invoice = {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  issue_date: string;
  invoice_payments: { amount_applied: number }[];
};

type Payment = {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  invoice_payments: { invoice_id: string, amount_applied: number, invoices: { invoice_number: string } }[];
};

export default function ClientProfilePage({ params }: { params: { id: string } }) {
  const clientId = params.id;
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'facturas' | 'pagos'>('facturas');

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}`);
        const data = await res.json();
        
        if (data.success) {
          setClient(data.client);
          setInvoices(data.invoices || []);
          setPayments(data.payments || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [clientId]);

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando perfil del cliente...</div>;
  if (!client) return <div className="p-8 text-center text-red-500">Cliente no encontrado</div>;

  // Calculos
  const totalFacturado = invoices.reduce((acc, inv) => acc + Number(inv.total), 0);
  const totalPagado = invoices.reduce((acc, inv) => {
    const paid = inv.invoice_payments?.reduce((sum, p) => sum + Number(p.amount_applied), 0) || 0;
    return acc + paid;
  }, 0);
  const totalPendiente = totalFacturado - totalPagado;

  return (
    <div className="w-full bg-white min-h-screen relative font-sans print:m-0 print:p-0">
      
      {/* Header Bar (Hidden in Print) */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50/50 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/admin/clientes" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Perfil del Cliente</h1>
        </div>
        <div className="flex items-center gap-3">
          {totalPendiente > 0 && (
            <Link 
              href={`/admin/clientes/${client.id}/recibir-pago`}
              className="px-4 py-2 bg-green-50 text-green-700 font-bold rounded-lg hover:bg-green-100 transition-colors flex items-center gap-2"
            >
              <DollarSign size={18} /> Recibir Pago
            </Link>
          )}
          <button 
            onClick={() => {
              setActiveTab('facturas');
              setTimeout(() => window.print(), 100);
            }} 
            className="px-4 py-2 bg-[#0A2636] text-white font-bold rounded-lg hover:bg-[#0A2636]/90 transition-colors flex items-center gap-2 shadow-lg shadow-[#0A2636]/20"
          >
            <Printer size={18} /> Estado de Cuenta
          </button>
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-6xl mx-auto print:p-0 print:max-w-none">
        
        {/* Print Header */}
        <div className="hidden print:block mb-8 pb-4 border-b-2 border-gray-800">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">JRS CARGO COSTA RICA</h2>
              <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Estado de Cuenta</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Client Info & Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Client Details */}
          <div className="lg:col-span-2 bg-gray-50 rounded-2xl p-6 border border-gray-100 print:bg-transparent print:border-none print:p-0 print:mb-6">
            <div className="flex items-center gap-4 mb-6 print:mb-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center font-black text-3xl shrink-0 print:hidden">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
                <p className="text-sm text-gray-500">Cliente desde {new Date(client.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Mail size={16} className="text-gray-400" />
                <span>{client.email || '-'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Phone size={16} className="text-gray-400" />
                <span>{client.phone || '-'}</span>
              </div>
              {client.address && (
                <div className="flex items-center gap-3 text-sm text-gray-600 sm:col-span-2">
                  <MapPin size={16} className="text-gray-400" />
                  <span>{client.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="flex flex-col gap-4">
            <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 flex items-center justify-between print:border-none print:p-2">
              <span className="text-sm font-bold text-orange-800 uppercase tracking-wider">Saldo Pendiente</span>
              <span className="text-2xl font-black text-orange-600">${totalPendiente.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 print:border-none print:p-2">
                <p className="text-xs font-bold text-gray-500 mb-1">Total Facturado</p>
                <p className="text-lg font-bold text-gray-900">${totalFacturado.toFixed(2)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-xl border border-green-100 print:border-none print:p-2">
                <p className="text-xs font-bold text-green-700 mb-1">Total Pagado</p>
                <p className="text-lg font-bold text-green-700">${totalPagado.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs (Hidden in Print) */}
        <div className="flex items-center gap-4 mb-6 border-b border-gray-200 print:hidden">
          <button 
            onClick={() => setActiveTab('facturas')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'facturas' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            <FileText size={16} /> Facturas ({invoices.length})
          </button>
          <button 
            onClick={() => setActiveTab('pagos')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'pagos' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            <DollarSign size={16} /> Historial de Pagos ({payments.length})
          </button>
        </div>

        {/* Tab Content: Facturas */}
        <div className={activeTab === 'facturas' ? 'block' : 'hidden print:block'}>
          <div className="hidden print:block mb-4 mt-8">
            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-300 pb-2">Desglose de Facturas</h3>
          </div>
          
          <div className="overflow-x-auto border border-gray-200 rounded-xl print:border-none print:rounded-none">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 print:bg-transparent print:border-gray-800">
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider print:text-gray-800">Factura</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider print:text-gray-800">Emisión</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider print:text-gray-800">Estado</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right print:text-gray-800">Total</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right print:text-gray-800">Pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">No hay facturas registradas.</td></tr>
                ) : (
                  invoices.map(inv => {
                    const paid = inv.invoice_payments?.reduce((sum, p) => sum + Number(p.amount_applied), 0) || 0;
                    const pending = Number(inv.total) - paid;
                    
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors print:hover:bg-transparent">
                        <td className="p-4 font-bold text-brand-blue print:text-black text-sm">#{inv.invoice_number}</td>
                        <td className="p-4 text-sm text-gray-600">{inv.issue_date}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold print:border print:bg-transparent print:p-0
                            ${inv.status === 'Pagada' ? 'bg-green-100 text-green-800 print:text-green-800' : 
                              inv.status === 'Vencida' ? 'bg-red-100 text-red-800 print:text-red-800' : 
                              'bg-orange-100 text-orange-800 print:text-orange-800'}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-medium text-gray-600 text-right">${Number(inv.total).toFixed(2)}</td>
                        <td className="p-4 text-sm font-bold text-gray-900 text-right">${pending.toFixed(2)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tab Content: Historial de Pagos (Hidden in print for state of account, or we can show it below) */}
        <div className={`${activeTab === 'pagos' ? 'block' : 'hidden'} print:block print:mt-12`}>
          <div className="hidden print:block mb-4">
            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-300 pb-2">Historial de Pagos</h3>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl print:border-none print:rounded-none">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 print:bg-transparent print:border-gray-800">
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider print:text-gray-800">Fecha</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider print:text-gray-800">Método</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider print:text-gray-800">Referencia</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider print:text-gray-800">Facturas Aplicadas</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right print:text-gray-800">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">No hay pagos registrados.</td></tr>
                ) : (
                  payments.map(pay => (
                    <tr key={pay.id} className="hover:bg-gray-50/50 transition-colors print:hover:bg-transparent">
                      <td className="p-4 text-sm text-gray-800 font-medium">{pay.payment_date}</td>
                      <td className="p-4 text-sm text-gray-600">{pay.payment_method || '-'}</td>
                      <td className="p-4 text-sm text-gray-600">{pay.reference_number || '-'}</td>
                      <td className="p-4 text-sm text-gray-500">
                        {pay.invoice_payments?.map(ip => (
                          <div key={ip.invoice_id}>
                            #{ip.invoices?.invoice_number} <span className="text-xs">(${Number(ip.amount_applied).toFixed(2)})</span>
                          </div>
                        ))}
                      </td>
                      <td className="p-4 text-sm font-bold text-green-700 text-right">+${Number(pay.amount).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
