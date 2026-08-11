'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Printer, FileText, DollarSign, Mail, Phone, MapPin, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { getInvoiceStats, formatCurrency } from '@/lib/billing';
import { useModal } from '@/app/components/ModalProvider';

type Client = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  cedula?: string;
  created_at: string;
};

type Invoice = {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  currency?: string;
  issue_date: string;
  invoice_payments: { amount_applied: number }[];
};

type Payment = {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  currency?: string;
  reference_number?: string;
  invoice_payments: { invoice_id: string, amount_applied: number, invoices: { invoice_number: string, currency?: string } }[];
};

export default function ClientProfilePage({ params }: { params: { id: string } }) {
  const { showAlert, showConfirm } = useModal();
  const clientId = params.id;
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'facturas' | 'pagos'>('facturas');

  // Modal de Edición
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Client>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Filtros de fecha para historial de pagos
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');

  const loadData = useCallback(async () => {
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
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeletePayment = async (paymentId: string) => {
    if (!(await showConfirm('Confirmación', '¿Estás seguro de que deseas anular este pago? El saldo de las facturas asociadas volverá a estar pendiente.'))) return;
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        loadData();
      } else {
        await showAlert('Aviso', 'Error al anular el pago');
      }
    } catch {
      await showAlert('Aviso', 'Error de red');
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsEditing(false);
        loadData();
      } else {
        await showAlert('Aviso', 'Error: ' + (data.error || 'Ocurrió un error al guardar. Verifica si la columna cedula existe en Supabase si actualizaste la cédula.'));
      }
    } catch {
      await showAlert('Aviso', 'Error de red al actualizar');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando perfil del cliente...</div>;
  if (!client) return <div className="p-8 text-center text-red-500">Cliente no encontrado</div>;

  let totalFacturadoUSD = 0, totalFacturadoCRC = 0;
  let totalPagadoUSD = 0, totalPagadoCRC = 0;
  let totalPendienteUSD = 0, totalPendienteCRC = 0;

  invoices.forEach(inv => {
    const stats = getInvoiceStats(inv);
    if (inv.currency === 'CRC') {
      totalFacturadoCRC += stats.total;
      totalPagadoCRC += stats.paid;
      totalPendienteCRC += stats.pending;
    } else {
      totalFacturadoUSD += stats.total;
      totalPagadoUSD += stats.paid;
      totalPendienteUSD += stats.pending;
    }
  });

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
          <button 
            onClick={() => {
              setEditForm({ 
                name: client.name, 
                email: client.email, 
                phone: client.phone || '', 
                cedula: client.cedula || '',
                created_at: new Date(client.created_at).toISOString().split('T')[0] 
              });
              setIsEditing(true);
            }}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            Editar Perfil
          </button>
          {(totalPendienteUSD > 0 || totalPendienteCRC > 0) && (
            <Link 
              href={`/admin/cuentas-por-cobrar/recibir/${client.id}`}
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
              <div className="flex items-center gap-2 text-sm text-gray-500 font-medium bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                <Mail size={16} className="text-gray-400" />
                <a href={`mailto:${client.email}`} className="hover:text-brand-blue transition-colors truncate max-w-[200px]">{client.email}</a>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 font-medium bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                <Phone size={16} className="text-gray-400" />
                {client.phone ? (
                  <a href={`tel:${client.phone}`} className="hover:text-brand-blue transition-colors">{client.phone}</a>
                ) : (
                  <span>-</span>
                )}
              </div>
              {client.cedula && (
                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                  <FileText size={16} className="text-gray-400" />
                  <span>Cédula: {client.cedula}</span>
                </div>
              )}
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
              <div className="text-right">
                <span className="block text-2xl font-black text-orange-600">{formatCurrency(totalPendienteUSD, 'USD')}</span>
                <span className="block text-lg font-bold text-orange-500">{formatCurrency(totalPendienteCRC, 'CRC')}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 print:border-none print:p-2">
                <p className="text-xs font-bold text-gray-500 mb-1">Total Facturado</p>
                <p className="text-sm font-bold text-gray-900">{formatCurrency(totalFacturadoUSD, 'USD')}</p>
                <p className="text-sm font-bold text-gray-600">{formatCurrency(totalFacturadoCRC, 'CRC')}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-xl border border-green-100 print:border-none print:p-2">
                <p className="text-xs font-bold text-green-700 mb-1">Total Pagado</p>
                <p className="text-sm font-bold text-green-700">{formatCurrency(totalPagadoUSD, 'USD')}</p>
                <p className="text-sm font-bold text-green-600">{formatCurrency(totalPagadoCRC, 'CRC')}</p>
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
                    const stats = getInvoiceStats(inv);
                    const displayStatus = stats.displayStatus;
                    
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors print:hover:bg-transparent">
                        <td className="p-4 font-bold text-brand-blue print:text-black text-sm">#{inv.invoice_number}</td>
                        <td className="p-4 text-sm text-gray-600">{inv.issue_date}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold print:border print:bg-transparent print:p-0
                            ${displayStatus === 'Pagada' ? 'bg-green-100 text-green-800 print:text-green-800' : 
                              displayStatus === 'Vencida' ? 'bg-red-100 text-red-800 print:text-red-800' : 
                              'bg-orange-100 text-orange-800 print:text-orange-800'}`}>
                            {displayStatus}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-medium text-gray-600 text-right">{formatCurrency(stats.total, inv.currency)}</td>
                        <td className="p-4 text-sm font-bold text-gray-900 text-right">{formatCurrency(stats.pending, inv.currency)}</td>
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
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4 print:hidden">
            <h3 className="text-lg font-bold text-gray-800">Historial de Pagos</h3>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-500 uppercase">Desde:</span>
              <input 
                type="date" 
                value={paymentStartDate}
                onChange={(e) => setPaymentStartDate(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-brand-blue"
              />
              <span className="text-sm font-bold text-gray-500 uppercase ml-2">Hasta:</span>
              <input 
                type="date" 
                value={paymentEndDate}
                onChange={(e) => setPaymentEndDate(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-brand-blue"
              />
              {(paymentStartDate || paymentEndDate) && (
                <button 
                  onClick={() => { setPaymentStartDate(''); setPaymentEndDate(''); }}
                  className="ml-2 text-sm text-brand-blue hover:underline"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
          
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
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center print:hidden">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(() => {
                  const filteredPayments = payments.filter(pay => {
                    if (paymentStartDate && pay.payment_date < paymentStartDate) return false;
                    if (paymentEndDate && pay.payment_date > paymentEndDate) return false;
                    return true;
                  });

                  if (filteredPayments.length === 0) {
                    return <tr><td colSpan={6} className="p-8 text-center text-gray-500">No hay pagos en este rango de fechas.</td></tr>;
                  }

                  return filteredPayments.map(pay => (
                    <tr key={pay.id} className="hover:bg-gray-50/50 transition-colors print:hover:bg-transparent">
                      <td className="p-4 text-sm text-gray-800 font-medium">{pay.payment_date}</td>
                      <td className="p-4 text-sm text-gray-600">{pay.payment_method || '-'}</td>
                      <td className="p-4 text-sm text-gray-600">{pay.reference_number || '-'}</td>
                      <td className="p-4 text-sm text-gray-500">
                        {pay.invoice_payments?.map(ip => (
                          <div key={ip.invoice_id}>
                            #{ip.invoices?.invoice_number} <span className="text-xs">({formatCurrency(Number(ip.amount_applied), ip.invoices?.currency || pay.currency)})</span>
                          </div>
                        ))}
                      </td>
                      <td className="p-4 text-sm font-bold text-green-700 text-right">+{formatCurrency(Number(pay.amount), pay.currency)}</td>
                      <td className="p-4 text-center print:hidden">
                        <button 
                          onClick={() => handleDeletePayment(pay.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex" 
                          title="Anular Pago"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-black text-xl text-brand-blue">Editar Perfil del Cliente</h3>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
              >
                <Trash2 size={20} className="hidden" /> {/* Para mantener alineación si se necesita */}
                <span className="font-bold text-xl leading-none">&times;</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="edit-client-form" onSubmit={handleUpdateClient} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nombre Completo *</label>
                  <input 
                    type="text" 
                    required
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-blue focus:ring-0 text-brand-blue font-medium bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Correo Electrónico *</label>
                    <input 
                      type="email" 
                      required
                      value={editForm.email || ''}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-blue focus:ring-0 text-brand-blue font-medium bg-gray-50 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Teléfono / WhatsApp</label>
                    <input 
                      type="text" 
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-blue focus:ring-0 text-brand-blue font-medium bg-gray-50 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Cédula / Identificación</label>
                    <input 
                      type="text" 
                      value={editForm.cedula || ''}
                      onChange={(e) => setEditForm({...editForm, cedula: e.target.value})}
                      placeholder="Para facturación"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-blue focus:ring-0 text-brand-blue font-medium bg-gray-50 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Cliente Desde</label>
                    <input 
                      type="date" 
                      required
                      value={editForm.created_at || ''}
                      onChange={(e) => setEditForm({...editForm, created_at: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-blue focus:ring-0 text-brand-blue font-medium bg-gray-50 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="edit-client-form"
                disabled={isSaving}
                className="btn-primary px-8 py-3"
              >
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
