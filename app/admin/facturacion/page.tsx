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

  const calculateStats = useCallback((data: Invoice[]) => {
    let pending = 0;
    let paid = 0;
    
    data.forEach(inv => {
      if (inv.status === 'Pendiente' || inv.status === 'Vencida') {
        pending += Number(inv.total);
      } else if (inv.status === 'Pagada') {
        paid += Number(inv.total);
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

  const handleSendEmail = async (id: string) => {
    if (!confirm('¿Seguro que deseas enviar la factura por correo al cliente?')) return;
    try {
      const res = await fetch(`/api/invoices/${id}/send`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('¡Correo enviado con éxito!');
      } else {
        alert(`Error al enviar correo: ${data.error}`);
      }
    } catch {
      alert('Error de red');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Pagada' ? 'Pendiente' : 'Pagada';
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
                          <button onClick={() => handleSendEmail(inv.id)} className="p-2 text-gray-400 hover:text-brand-blue transition-colors rounded-lg hover:bg-gray-50" title="Enviar al cliente">
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
    </div>
  );
}
