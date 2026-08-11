'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, AlertCircle, CheckCircle2, Mail } from 'lucide-react';

type Invoice = {
  id: string;
  invoice_number: string;
  issue_date: string;
  total: number | string;
  status: string;
  clients?: { name: string; email: string };
  invoice_payments?: { amount_applied: number | string }[];
};

export default function FacturacionDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>('Todas');
  const [filterDate, setFilterDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Resumen stats
  const [totalPending, setTotalPending] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);

  // Payment Modal State
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('SINPE');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [isPaying, setIsPaying] = useState(false);

  // Email Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailInvoice, setEmailInvoice] = useState<Invoice | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const calculateStats = useCallback((data: Invoice[]) => {
    let pending = 0;
    let paid = 0;
    
    data.forEach(inv => {
      const invTotal = Number(inv.total);
      let invPaid = 0;
      
      if (inv.invoice_payments && Array.isArray(inv.invoice_payments)) {
        invPaid = inv.invoice_payments.reduce((acc, p) => acc + Number(p.amount_applied), 0);
      }
      
      if (inv.status === 'Pagada') {
        paid += invTotal; // Se asume pagado al 100% si su estado es Pagada
      } else {
        paid += invPaid;
        pending += (invTotal - invPaid);
      }
    });

    setTotalPending(pending);
    setTotalPaid(paid);
  }, []);

  const loadInvoices = useCallback(async () => {
    try {
      const res = await fetch('/api/invoices');
      const data = await res.json();
      if (data.success) {
        setInvoices(data.data);
        calculateStats(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [calculateStats]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const openEmailModal = (inv: Invoice) => {
    setEmailInvoice(inv);
    setEmailSubject(`Factura #${inv.invoice_number} de JRS CARGO S.A.`);
    setEmailMessage('Adjunto a este correo encontrarás los detalles de tu factura reciente. Por favor, revisa la información a continuación.');
    setEmailModalOpen(true);
  };

  const confirmSendEmail = async () => {
    if (!emailInvoice) return;
    setIsSendingEmail(true);
    try {
      const res = await fetch(`/api/invoices/${emailInvoice.id}/send`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject, message: emailMessage })
      });
      const data = await res.json();
      if (data.success) {
        alert('¡Correo enviado con éxito!');
        setEmailModalOpen(false);
      } else {
        alert(`Error al enviar correo: ${data.error}`);
      }
    } catch {
      alert('Error de red');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (currentStatus === 'Pagada') {
      const newStatus = 'Pendiente';
      if (!confirm(`¿Cambiar estado de la factura a ${newStatus.toUpperCase()}?`)) return;
      try {
        const res = await fetch(`/api/invoices/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
          loadInvoices();
        }
      } catch {
        alert('Error actualizando estado');
      }
    } else {
      // Abrir modal de pago
      setPayingInvoiceId(id);
      setPaymentMethod('SINPE');
      setPaymentReference('');
    }
  };

  const handleConfirmPayment = async () => {
    if (!payingInvoiceId) return;
    setIsPaying(true);
    
    let currentNotes = '';
    
    try {
      // Intentamos obtener las notas actuales (idealmente deberíamos hacer un fetch para tener las más recientes, 
      // pero para simplificar podemos hacer un fetch al detalle)
      const resInv = await fetch(`/api/invoices/${payingInvoiceId}`);
      if (resInv.ok) {
        const data = await resInv.json();
        currentNotes = data.data?.notes || '';
      }
      
      const paymentInfo = `\n\n--- PAGO REGISTRADO ---\nMétodo: ${paymentMethod}\nRef: ${paymentReference || 'N/A'}\nFecha: ${new Date().toLocaleDateString()}`;
      const newNotes = currentNotes + paymentInfo;

      const res = await fetch(`/api/invoices/${payingInvoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Pagada',
          notes: newNotes.trim()
        })
      });
      if (res.ok) {
        loadInvoices();
        setPayingInvoiceId(null);
      } else {
        alert('Error al registrar pago');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setIsPaying(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchStatus = filterStatus === 'Todas' || inv.status === filterStatus;
    const matchDate = filterDate === '' || new Date(inv.issue_date).toISOString().split('T')[0] === filterDate;
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = inv.clients?.name.toLowerCase().includes(searchLower) || inv.invoice_number.toLowerCase().includes(searchLower);
    return matchStatus && matchDate && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-blue mb-2">Facturación y Cobros</h1>
          <p className="text-gray-500">Gestiona las cuentas por cobrar, envía facturas y registra pagos.</p>
        </div>
        <Link href="/admin/facturacion/nueva" className="btn-primary shrink-0">
          <Plus size={20} /> Crear Factura
        </Link>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
            <AlertCircle size={32} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Total Pendiente</p>
            <h2 className="text-4xl font-black text-brand-blue">${totalPending.toFixed(2)} USD</h2>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center text-green-500 shrink-0">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Total Pagado</p>
            <h2 className="text-4xl font-black text-brand-blue">${totalPaid.toFixed(2)} USD</h2>
          </div>
        </div>
      </div>

      {/* Lista de Facturas */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
            <FileText className="text-brand-blue" size={24} /> 
            Últimas Facturas
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue"
            >
              <option value="Todas">Todas las facturas</option>
              <option value="Pendiente">Pendientes</option>
              <option value="Pagada">Pagadas</option>
              <option value="Vencida">Vencidas</option>
            </select>
            
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue text-gray-600"
            />

            <div className="relative">
              <input 
                type="text" 
                placeholder="Buscar cliente o n.º..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue w-full sm:w-64" 
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">N.º Factura</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Importe</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">Cargando facturas...</td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">No se encontraron facturas con esos filtros.</td>
                </tr>
              ) : (
                filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-sm text-gray-600 font-medium">
                      {new Date(inv.issue_date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm font-bold text-brand-blue">
                      {inv.invoice_number}
                    </td>
                    <td className="p-4 text-sm text-gray-800 font-medium">
                      {inv.clients?.name}
                      <span className="block text-xs text-gray-400 font-normal">{inv.clients?.email}</span>
                    </td>
                    <td className="p-4 text-sm font-bold text-gray-800 text-right">
                      ${Number(inv.total).toFixed(2)}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                        inv.status === 'Pagada' ? 'bg-green-100 text-green-700' :
                        inv.status === 'Vencida' ? 'bg-red-100 text-red-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link href={`/admin/facturacion/${inv.id}`} className="text-sm font-bold text-brand-blue hover:underline">
                            Ver detalle
                          </Link>
                          <button onClick={() => handleToggleStatus(inv.id, inv.status)} className={`text-sm font-bold px-2 py-1 rounded-lg ${inv.status === 'Pagada' ? 'text-orange-600 hover:text-orange-700 bg-orange-50' : 'text-green-600 hover:text-green-700 bg-green-50'}`}>
                            {inv.status === 'Pagada' ? 'Marcar Pendiente' : 'Marcar Pagada'}
                          </button>
                          <button onClick={() => openEmailModal(inv)} className="p-2 text-gray-400 hover:text-brand-blue transition-colors rounded-lg hover:bg-gray-50" title="Enviar al cliente">
                            <Mail size={18} />
                          </button>
                        </div>
                      </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {payingInvoiceId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-brand-blue text-lg flex items-center gap-2">
                Registrar Pago
              </h3>
              <button onClick={() => setPayingInvoiceId(null)} className="text-gray-400 hover:text-gray-600">
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
                <button type="button" onClick={() => setPayingInvoiceId(null)} className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">
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

      {/* Email Modal */}
      {emailModalOpen && emailInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="font-bold text-brand-blue text-lg flex items-center gap-2">
                Enviar Factura por Correo
              </h3>
              <button onClick={() => setEmailModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                &times;
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Asunto del Correo</label>
                <input 
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-brand-blue focus:ring-0 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mensaje Adicional</label>
                <textarea 
                  value={emailMessage}
                  onChange={e => setEmailMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-brand-blue focus:ring-0 text-sm font-medium resize-none"
                />
                <p className="text-xs text-gray-400 mt-2">Este mensaje aparecerá en el cuerpo del correo. Los detalles y tabla de la factura se agregarán automáticamente debajo del mensaje.</p>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex gap-3">
                <button type="button" onClick={() => setEmailModalOpen(false)} className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button 
                  onClick={confirmSendEmail}
                  disabled={isSendingEmail} 
                  className="flex-1 py-3 font-bold bg-brand-blue text-white rounded-xl hover:bg-brand-blue/90 disabled:opacity-50 transition-colors"
                >
                  {isSendingEmail ? 'Enviando...' : 'Enviar Correo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
