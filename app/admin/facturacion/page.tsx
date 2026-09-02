'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, AlertCircle, CheckCircle2, DollarSign, Mail, MailCheck, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, Filter, X } from 'lucide-react';
import { getInvoiceStats, formatCurrency, formatDisplayDate, parseClientAddress } from '@/lib/billing';
import { useModal } from '@/app/components/ModalProvider';

type Invoice = {
  id: string;
  invoice_number: string;
  issue_date: string;
  total: number | string;
  status: string;
  client_id: string;
  currency?: string;
  email_sent_at?: string | null;
  clients?: { id?: string; name: string; email: string; address?: string; secondary_email?: string };
  invoice_payments?: { amount_applied: number | string }[];
};

type SortField = 'date' | 'number' | 'client' | 'amount' | 'status' | 'email';

export default function FacturacionDashboard() {
  const { showAlert } = useModal();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [filterStatus, setFilterStatus] = useState<string>('Todas');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterEmail, setFilterEmail] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Sorting State
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Email Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailInvoice, setEmailInvoice] = useState<Invoice | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/invoices');
      const data = await res.json();
      if (data.success) {
        setInvoices(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const openEmailModal = (inv: Invoice) => {
    setEmailInvoice(inv);
    setEmailSubject('Factura #' + inv.invoice_number + ' de JRS CARGO S.A.');
    setEmailMessage('Adjunto a este correo encontrarás los detalles de tu factura reciente. Por favor, revisa la información a continuación.');
    setEmailModalOpen(true);
  };

  const confirmSendEmail = async () => {
    if (!emailInvoice) return;
    setIsSendingEmail(true);
    try {
      const res = await fetch('/api/invoices/' + emailInvoice.id + '/send', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject, message: emailMessage })
      });
      const data = await res.json();
      if (data.success) {
        setInvoices(prev => prev.map(inv => 
          inv.id === emailInvoice.id ? { ...inv, email_sent_at: data.email_sent_at || new Date().toISOString() } : inv
        ));
        showAlert('Éxito', '¡Correo enviado con éxito!', 'success');
        setEmailModalOpen(false);
      } else {
        showAlert('Error', 'Error al enviar correo: ' + data.error, 'error');
      }
    } catch {
      showAlert('Error', 'Error de red al enviar el correo.', 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Filtered invoices (Dynamic calculation)
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const stats = getInvoiceStats(inv);
      const effectiveStatus = stats.displayStatus;
      const matchStatus = filterStatus === 'Todas' || effectiveStatus === filterStatus;
      
      const invDate = inv.issue_date ? inv.issue_date.split('T')[0] : '';
      const matchDate = filterDate === '' || invDate === filterDate;
      
      const matchEmail = filterEmail === 'Todos' ||
        (filterEmail === 'Enviado' && !!inv.email_sent_at) ||
        (filterEmail === 'No enviado' && !inv.email_sent_at);
        
      const searchLower = searchTerm.toLowerCase().trim();
      const matchSearch = !searchLower || 
        (inv.clients?.name || '').toLowerCase().includes(searchLower) || 
        (inv.clients?.email || '').toLowerCase().includes(searchLower) || 
        (inv.invoice_number || '').toLowerCase().includes(searchLower);

      return matchStatus && matchDate && matchEmail && matchSearch;
    });
  }, [invoices, filterStatus, filterDate, filterEmail, searchTerm]);

  // Sorted invoices based on active column header sort
  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        const da = new Date(a.issue_date).getTime() || 0;
        const db = new Date(b.issue_date).getTime() || 0;
        comparison = da - db;
      } else if (sortField === 'number') {
        comparison = a.invoice_number.localeCompare(b.invoice_number, undefined, { numeric: true });
      } else if (sortField === 'client') {
        const na = (a.clients?.name || '').toLowerCase();
        const nb = (b.clients?.name || '').toLowerCase();
        comparison = na.localeCompare(nb);
      } else if (sortField === 'amount') {
        const ta = Number(a.total) || 0;
        const tb = Number(b.total) || 0;
        comparison = ta - tb;
      } else if (sortField === 'status') {
        const sa = getInvoiceStats(a).displayStatus;
        const sb = getInvoiceStats(b).displayStatus;
        comparison = sa.localeCompare(sb);
      } else if (sortField === 'email') {
        const ea = a.email_sent_at ? 1 : 0;
        const eb = b.email_sent_at ? 1 : 0;
        comparison = ea - eb;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredInvoices, sortField, sortOrder]);

  // Dynamically calculated stats that react to ANY active filter
  const { totalPendingUSD, totalPaidUSD, totalFacturadoUSD } = useMemo(() => {
    let pendingUSD = 0, paidUSD = 0, facturadoUSD = 0;
    filteredInvoices.forEach(inv => {
      const stats = getInvoiceStats(inv);
      if (stats.currency !== 'CRC') {
        pendingUSD += stats.pending;
        paidUSD += stats.paid;
        facturadoUSD += Number(inv.total) || 0;
      }
    });
    return { totalPendingUSD: pendingUSD, totalPaidUSD: paidUSD, totalFacturadoUSD: facturadoUSD };
  }, [filteredInvoices]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'date' || field === 'amount' ? 'desc' : 'asc');
    }
  };

  const hasActiveFilters = filterStatus !== 'Todas' || filterDate !== '' || filterEmail !== 'Todos' || searchTerm !== '';

  const clearAllFilters = () => {
    setFilterStatus('Todas');
    setFilterDate('');
    setFilterEmail('Todos');
    setSearchTerm('');
  };

  const formatEmailDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica', day: '2-digit', month: '2-digit', year: 'numeric' }) + 
      ' ' + d.toLocaleTimeString('es-CR', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit' });
  };

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

      {/* Tarjetas de Resumen Dinámicas (se recalculan con cualquier filtro) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-brand-blue shrink-0">
            <DollarSign size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Facturado</p>
              <span className="px-2 py-0.5 bg-blue-50 text-brand-blue text-[10px] font-black rounded-md">
                {filteredInvoices.length} {filteredInvoices.length === 1 ? 'factura' : 'facturas'}
              </span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-black text-brand-blue">{formatCurrency(totalFacturadoUSD, 'USD')}</h2>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
            <AlertCircle size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Pendiente</p>
            <h2 className="text-2xl lg:text-3xl font-black text-orange-600">{formatCurrency(totalPendingUSD, 'USD')}</h2>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-500 shrink-0">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Pagado</p>
            <h2 className="text-2xl lg:text-3xl font-black text-green-700">{formatCurrency(totalPaidUSD, 'USD')}</h2>
          </div>
        </div>
      </div>

      {/* Lista de Facturas */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="text-brand-blue shrink-0" size={24} /> 
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Últimas Facturas
              </h2>
              <p className="text-xs text-gray-400">
                Mostrando {filteredInvoices.length} de {invoices.length} facturas registradas
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue font-medium text-gray-700"
            >
              <option value="Todas">Todos los estados</option>
              <option value="Pendiente">Pendientes</option>
              <option value="Pagada">Pagadas</option>
              <option value="Vencida">Vencidas</option>
            </select>

            <select 
              value={filterEmail}
              onChange={(e) => setFilterEmail(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue font-medium text-gray-700"
            >
              <option value="Todos">Todos los correos</option>
              <option value="Enviado">Correo Enviado</option>
              <option value="No enviado">Correo No Enviado</option>
            </select>
            
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue text-gray-600 font-medium"
            />

            <div className="relative">
              <input 
                type="text" 
                placeholder="Buscar cliente, correo o n.º..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue w-full sm:w-64" 
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
                title="Restablecer todos los filtros"
              >
                <X size={14} /> Limpiar
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider select-none">
                <th 
                  className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors"
                  onClick={() => handleSort('date')}
                  title="Ordenar por fecha"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Fecha</span>
                    {sortField === 'date' ? (
                      sortOrder === 'asc' ? <ArrowUp size={14} className="text-brand-blue" /> : <ArrowDown size={14} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={14} className="text-gray-300" />
                    )}
                  </div>
                </th>
                <th 
                  className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors"
                  onClick={() => handleSort('number')}
                  title="Ordenar por número de factura"
                >
                  <div className="flex items-center gap-1.5">
                    <span>N.º Factura</span>
                    {sortField === 'number' ? (
                      sortOrder === 'asc' ? <ArrowUp size={14} className="text-brand-blue" /> : <ArrowDown size={14} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={14} className="text-gray-300" />
                    )}
                  </div>
                </th>
                <th 
                  className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors"
                  onClick={() => handleSort('client')}
                  title="Ordenar por nombre de cliente"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Cliente</span>
                    {sortField === 'client' ? (
                      sortOrder === 'asc' ? <ArrowUp size={14} className="text-brand-blue" /> : <ArrowDown size={14} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={14} className="text-gray-300" />
                    )}
                  </div>
                </th>
                <th 
                  className="p-4 text-right cursor-pointer hover:bg-gray-100/80 transition-colors"
                  onClick={() => handleSort('amount')}
                  title="Ordenar por importe total"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Importe</span>
                    {sortField === 'amount' ? (
                      sortOrder === 'asc' ? <ArrowUp size={14} className="text-brand-blue" /> : <ArrowDown size={14} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={14} className="text-gray-300" />
                    )}
                  </div>
                </th>
                <th 
                  className="p-4 cursor-pointer hover:bg-gray-100/80 transition-colors"
                  onClick={() => handleSort('status')}
                  title="Ordenar por estado"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Estado</span>
                    {sortField === 'status' ? (
                      sortOrder === 'asc' ? <ArrowUp size={14} className="text-brand-blue" /> : <ArrowDown size={14} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={14} className="text-gray-300" />
                    )}
                  </div>
                </th>
                <th 
                  className="p-4 text-center cursor-pointer hover:bg-gray-100/80 transition-colors"
                  onClick={() => handleSort('email')}
                  title="Ordenar por estado de envío de correo"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Correo</span>
                    {sortField === 'email' ? (
                      sortOrder === 'asc' ? <ArrowUp size={14} className="text-brand-blue" /> : <ArrowDown size={14} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={14} className="text-gray-300" />
                    )}
                  </div>
                </th>
                <th className="p-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">Cargando facturas...</td>
                </tr>
              ) : sortedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">No se encontraron facturas con esos filtros.</td>
                </tr>
              ) : (
                sortedInvoices.map(inv => {
                  const stats = getInvoiceStats(inv);
                  const displayStatus = stats.displayStatus;

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-sm text-gray-600 font-medium">
                        {formatDisplayDate(inv.issue_date)}
                      </td>
                      <td className="p-4 text-sm font-bold text-brand-blue">
                        {inv.invoice_number}
                      </td>
                      <td className="p-4 text-sm text-gray-800 font-medium">
                        {inv.clients?.name}
                        <span className="block text-xs text-gray-400 font-normal">{inv.clients?.email}</span>
                      </td>
                      <td className="p-4 text-sm font-bold text-gray-800 text-right">
                        {formatCurrency(Number(inv.total), stats.currency)}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                            displayStatus === 'Pagada' ? 'bg-green-100 text-green-700' :
                            displayStatus === 'Vencida' ? 'bg-red-100 text-red-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {displayStatus}
                          </span>
                          {stats.paid > 0 && stats.pending > 0 && (
                            <span className="text-xs text-gray-500">
                              Pagado parcialmente, <span className="font-bold text-gray-700">{formatCurrency(stats.pending, stats.currency)}</span> pendiente
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Email status column */}
                      <td className="p-4 text-center">
                        {inv.email_sent_at ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1 text-green-600">
                              <MailCheck size={14} />
                              <span className="text-[10px] font-bold uppercase">Enviado</span>
                            </div>
                            <span className="text-[10px] text-gray-400">{formatEmailDate(inv.email_sent_at)}</span>
                            <button 
                              onClick={() => openEmailModal(inv)} 
                              className="flex items-center gap-1 text-[10px] text-brand-blue hover:underline font-bold mt-0.5"
                            >
                              <RefreshCw size={10} />
                              Reenviar
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1 text-gray-400">
                              <Mail size={14} />
                              <span className="text-[10px] font-medium">No enviado</span>
                            </div>
                            <button 
                              onClick={() => openEmailModal(inv)} 
                              className="flex items-center gap-1 text-[10px] text-brand-blue hover:underline font-bold mt-0.5"
                            >
                              Enviar
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link href={'/admin/facturacion/' + inv.id} className="text-sm font-bold text-brand-blue hover:underline">
                            Ver detalle
                          </Link>
                          {displayStatus !== 'Pagada' && displayStatus !== 'Anulada' && (inv.clients?.id || inv.client_id) && (
                            <Link 
                              href={'/admin/cuentas-por-cobrar/recibir/' + (inv.clients?.id || inv.client_id) + '?invoice_id=' + inv.id} 
                              className="text-sm font-bold px-3 py-1.5 rounded-lg text-white bg-[#0A2636] hover:bg-[#0A2636]/90 transition-colors shadow-sm"
                            >
                              Cobrar
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email Modal */}
      {emailModalOpen && emailInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="font-bold text-brand-blue text-lg flex items-center gap-2">
                {emailInvoice.email_sent_at ? (
                  <>
                    <RefreshCw size={20} />
                    Reenviar Factura por Correo
                  </>
                ) : (
                  <>
                    <Mail size={20} />
                    Enviar Factura por Correo
                  </>
                )}
              </h3>
              <button onClick={() => setEmailModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
                &times;
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              {emailInvoice.email_sent_at && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-700">
                  <MailCheck size={16} />
                  <span>Último envío: <strong>{formatEmailDate(emailInvoice.email_sent_at)}</strong></span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Destinatario (Para)</label>
                <p className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 font-medium">{emailInvoice.clients?.email}</p>
              </div>

              {(() => {
                const extra = parseClientAddress(emailInvoice.clients?.address);
                const secondary = emailInvoice.clients?.secondary_email || extra.secondary_email;
                if (!secondary) return null;
                return (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">En Copia (CC)</label>
                    <p className="px-4 py-3 bg-blue-50/70 border border-blue-200 rounded-xl text-sm text-brand-blue font-semibold flex items-center justify-between">
                      <span>{secondary}</span>
                      <span className="text-[11px] bg-white text-brand-blue px-2 py-0.5 rounded-md border border-blue-200 font-bold">2º Correo</span>
                    </p>
                  </div>
                );
              })()}

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
                <p className="text-xs text-gray-400 mt-2">Este mensaje aparecerá en el cuerpo del correo. La factura se adjuntará automáticamente.</p>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex gap-3">
                <button type="button" onClick={() => setEmailModalOpen(false)} className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button 
                  onClick={confirmSendEmail}
                  disabled={isSendingEmail} 
                  className="flex-1 py-3 font-bold bg-brand-blue text-white rounded-xl hover:bg-brand-blue/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {isSendingEmail ? 'Enviando...' : emailInvoice.email_sent_at ? 'Reenviar Correo' : 'Enviar Correo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
