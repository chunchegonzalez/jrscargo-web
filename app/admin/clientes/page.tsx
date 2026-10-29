'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Search, Mail, Phone, Edit, Plus, X, DollarSign, Eye, Trash2, Filter, ArrowUpDown, Tag } from 'lucide-react';
import { getInvoiceStats, formatCurrency } from '@/lib/billing';
import { useModal } from '@/app/components/ModalProvider';

type Client = {
  id: string;
  name: string;
  email: string;
  secondary_email?: string;
  phone?: string;
  address?: string;
  cedula?: string;
  discount_percent?: number;
  created_at?: string;
  // Computed fields
  totalInvoices?: number;
  pendingBalanceUSD?: number;
  pendingBalanceCRC?: number;
};

export default function ClientesPage() {
  const { showAlert, showConfirm } = useModal();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'con_saldo' | 'con_descuento' | 'sin_facturas' | 'nuevos'>('todos');
  const [sortBy, setSortBy] = useState<'nombre' | 'saldo' | 'descuento' | 'facturas' | 'reciente'>('nombre');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<Client> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Fetch clients and invoices in parallel
      const [clientsRes, invoicesRes] = await Promise.all([
        fetch('/api/clients', { cache: 'no-store' }),
        fetch('/api/invoices', { cache: 'no-store' })
      ]);

      const clientsData = await clientsRes.json();
      const invoicesData = await invoicesRes.json();

      if (clientsData.success && invoicesData.success) {
        // Merge data to calculate stats
        const mergedClients = clientsData.data.map((c: Client) => {
          const clientInvoices = invoicesData.data.filter((i: Record<string, unknown>) => i.client_id === c.id);
          
          let pendingBalanceUSD = 0;
          let pendingBalanceCRC = 0;
          clientInvoices.forEach((curr: Record<string, unknown>) => {
            const stats = getInvoiceStats(curr);
            if (curr.currency === 'CRC') {
              pendingBalanceCRC += stats.pending;
            } else {
              pendingBalanceUSD += stats.pending;
            }
          });
          
          return {
            ...c,
            totalInvoices: clientInvoices.length,
            pendingBalanceUSD,
            pendingBalanceCRC
          };
        });

        setClients(mergedClients);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient?.name) return;

    try {
      const isEditing = !!editingClient.id;
      const url = isEditing ? `/api/clients/${editingClient.id}` : '/api/clients';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingClient)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsModalOpen(false);
        setEditingClient(null);
        await loadData();
      } else {
        await showAlert('Aviso', 'Error: ' + (data.error || 'Ocurrió un error al guardar.'));
      }
    } catch {
      await showAlert('Aviso', 'Error de red al guardar cliente.');
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!(await showConfirm('Confirmación', `¿Estás seguro de que deseas eliminar al cliente ${name}?`))) return;
    
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        await loadData();
      } else {
        await showAlert('Aviso', 'Error: ' + (data.error || 'No se pudo eliminar el cliente.'));
      }
    } catch {
      await showAlert('Aviso', 'Error de red al intentar eliminar.');
    }
  };

  const filteredClients = clients
    .filter(c => {
      // Text search
      const matchesSearch = !searchTerm || 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.secondary_email && c.secondary_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.phone && c.phone.includes(searchTerm)) ||
        (c.cedula && c.cedula.includes(searchTerm));
      
      if (!matchesSearch) return false;

      // Status filter
      switch (statusFilter) {
        case 'con_saldo':
          return (c.pendingBalanceUSD || 0) > 0 || (c.pendingBalanceCRC || 0) > 0;
        case 'con_descuento':
          return Number(c.discount_percent || 0) > 0;
        case 'sin_facturas':
          return (c.totalInvoices || 0) === 0;
        case 'nuevos': {
          if (!c.created_at) return false;
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return new Date(c.created_at) >= thirtyDaysAgo;
        }
        default:
          return true;
      }
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'saldo':
          return ((b.pendingBalanceUSD || 0) + (b.pendingBalanceCRC || 0)) - ((a.pendingBalanceUSD || 0) + (a.pendingBalanceCRC || 0));
        case 'descuento':
          return (b.discount_percent || 0) - (a.discount_percent || 0);
        case 'facturas':
          return (b.totalInvoices || 0) - (a.totalInvoices || 0);
        case 'reciente':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const withDiscountCount = clients.filter(c => Number(c.discount_percent || 0) > 0).length;
  const withBalanceCount = clients.filter(c => (c.pendingBalanceUSD || 0) > 0 || (c.pendingBalanceCRC || 0) > 0).length;
  const withoutInvoicesCount = clients.filter(c => (c.totalInvoices || 0) === 0).length;
  const newClientsCount = clients.filter(c => {
    if (!c.created_at) return false;
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return new Date(c.created_at) >= d;
  }).length;

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Directorio de Clientes</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/15 tabular-nums">
              {clients.length} registrados
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Gestiona la información de contacto, saldos y descuentos fijos de todos tus clientes.
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingClient({ name: '', email: '', phone: '', cedula: '', discount_percent: 0 });
            setIsModalOpen(true);
          }}
          className="h-9 px-3.5 rounded-lg border border-brand-blue/20 bg-brand-blue hover:bg-[#0e354b] text-white shadow-2xs inline-flex items-center gap-1.5 font-semibold text-xs transition-all active:scale-[0.98] cursor-pointer w-fit"
        >
          <Plus size={15} />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => setStatusFilter('todos')}
          className={`text-left bg-white rounded-xl p-4 border transition-all cursor-pointer flex items-center justify-between group ${
            statusFilter === 'todos'
              ? 'border-brand-blue/40 ring-2 ring-brand-blue/10 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
          }`}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Clientes</p>
            <p className="text-2xl font-black tracking-tight text-slate-900 tabular-nums mt-1">{clients.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Directorio activo</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-brand-blue flex items-center justify-center shrink-0 group-hover:bg-brand-blue/10 transition-colors">
            <Users size={18} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'con_saldo' ? 'todos' : 'con_saldo')}
          className={`text-left bg-white rounded-xl p-4 border transition-all cursor-pointer flex items-center justify-between group ${
            statusFilter === 'con_saldo'
              ? 'border-amber-500/50 ring-2 ring-amber-500/15 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
          }`}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Con Saldo Pendiente</p>
            <p className="text-2xl font-black tracking-tight text-amber-600 tabular-nums mt-1">{withBalanceCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Cuentas por cobrar</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
            <DollarSign size={18} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'con_descuento' ? 'todos' : 'con_descuento')}
          className={`text-left bg-white rounded-xl p-4 border transition-all cursor-pointer flex items-center justify-between group ${
            statusFilter === 'con_descuento'
              ? 'border-emerald-500/50 ring-2 ring-emerald-500/15 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
          }`}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Con Descuento Fijo</p>
            <p className="text-2xl font-black tracking-tight text-emerald-700 tabular-nums mt-1">{withDiscountCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Tarifa preferencial</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
            <Tag size={18} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'nuevos' ? 'todos' : 'nuevos')}
          className={`text-left bg-white rounded-xl p-4 border transition-all cursor-pointer flex items-center justify-between group ${
            statusFilter === 'nuevos'
              ? 'border-brand-blue ring-2 ring-brand-blue/15 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
          }`}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nuevos (30 días)</p>
            <p className="text-2xl font-black tracking-tight text-brand-blue tabular-nums mt-1">{newClientsCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Registros recientes</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0 group-hover:bg-brand-blue/15 transition-colors">
            <Plus size={18} />
          </div>
        </button>
      </div>

      {/* Lista de Clientes */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
        {/* Toolbar de búsqueda y filtros */}
        <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/60 space-y-2.5">
          <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between">
            <div className="relative flex-1 min-w-0 lg:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
              <input 
                type="text" 
                placeholder="Buscar por nombre, correo, teléfono o cédula..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-8 bg-white rounded-lg border border-slate-200/90 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 transition-all" 
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <ArrowUpDown size={13} className="text-slate-400" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  className="h-9 px-2.5 bg-white border border-slate-200/90 rounded-lg text-slate-700 font-medium text-xs hover:border-slate-300 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-colors"
                >
                  <option value="nombre">Ordenar: Nombre A-Z</option>
                  <option value="descuento">Mayor Descuento</option>
                  <option value="saldo">Mayor Saldo</option>
                  <option value="facturas">Más Facturas</option>
                  <option value="reciente">Más Reciente</option>
                </select>
              </div>
              <span className="h-9 px-3 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center tabular-nums">
                {filteredClients.length} resultados
              </span>
            </div>
          </div>

          {/* Filter Pills Row */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <Filter size={13} className="text-slate-400 mr-1" />
            {[
              { key: 'todos' as const, label: 'Todos', count: clients.length },
              { key: 'con_descuento' as const, label: 'Con Descuento Fijo', count: withDiscountCount },
              { key: 'con_saldo' as const, label: 'Con Saldo', count: withBalanceCount },
              { key: 'sin_facturas' as const, label: 'Sin Facturas', count: withoutInvoicesCount },
              { key: 'nuevos' as const, label: 'Nuevos (30d)', count: newClientsCount },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={'h-7 px-2.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ' + (
                  statusFilter === f.key
                    ? 'bg-brand-blue text-white shadow-2xs'
                    : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100'
                )}
              >
                <span>{f.label}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums ${
                  statusFilter === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/95 border-b border-slate-200/90">
              <tr className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                <th className="py-2.5 px-3.5 pl-5">Cliente</th>
                <th className="py-2.5 px-3.5">Contacto</th>
                <th className="py-2.5 px-3.5 text-center">Facturas Totales</th>
                <th className="py-2.5 px-3.5 text-right">Saldo Pendiente</th>
                <th className="py-2.5 px-3.5 pr-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 px-4 text-center text-slate-400">Cargando clientes...</td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 px-4 text-center text-slate-400">No se encontraron clientes.</td>
                </tr>
              ) : (
                filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-slate-50/90 transition-colors group">
                    <td className="py-2.5 px-3.5 pl-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold text-xs shrink-0 border border-brand-blue/15">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/admin/clientes/${client.id}`} className="font-semibold text-slate-900 hover:text-brand-blue transition-colors truncate">
                              {client.name}
                            </Link>
                            {Number(client.discount_percent || 0) > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-200/80">
                                <Tag size={10} /> {client.discount_percent}% desc
                              </span>
                            )}
                          </div>
                          {client.cedula && (
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              ID: <span className="text-slate-600">{client.cedula}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Mail size={13} className="text-slate-400 shrink-0" />
                          <a href={`mailto:${client.email}`} className="hover:text-brand-blue transition-colors truncate max-w-[240px]">{client.email}</a>
                        </div>
                        {client.secondary_email && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pl-4">
                            <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-1 py-0.2 rounded">2º</span>
                            <a href={`mailto:${client.secondary_email}`} className="hover:text-brand-blue transition-colors truncate max-w-[220px]">{client.secondary_email}</a>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Phone size={13} className="text-slate-400 shrink-0" />
                            <a href={`tel:${client.phone}`} className="hover:text-brand-blue transition-colors tabular-nums">{client.phone}</a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-xs tabular-nums">
                        {client.totalInvoices || 0}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap tabular-nums">
                      {((client.pendingBalanceUSD || 0) > 0 || (client.pendingBalanceCRC || 0) > 0) ? (
                        <div className="flex flex-col items-end gap-0.5">
                          {(client.pendingBalanceUSD || 0) > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200/80">
                              {formatCurrency(client.pendingBalanceUSD!, 'USD')}
                            </span>
                          )}
                          {(client.pendingBalanceCRC || 0) > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200/80">
                              {formatCurrency(client.pendingBalanceCRC!, 'CRC')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-slate-50 text-slate-400 border-slate-200/60">
                          Al día
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 pr-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Link 
                          href={`/admin/clientes/${client.id}`}
                          className="p-1.5 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/10 rounded-md transition-colors"
                          title="Ver Perfil y Estado de Cuenta"
                        >
                          <Eye size={15} />
                        </Link>
                        {((client.pendingBalanceUSD || 0) > 0 || (client.pendingBalanceCRC || 0) > 0) ? (
                          <Link 
                            href={`/admin/cuentas-por-cobrar/recibir/${client.id}`}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors inline-flex"
                            title="Recibir pago"
                          >
                            <DollarSign size={15} />
                          </Link>
                        ) : null}
                        <button 
                          onClick={() => {
                            setEditingClient(client);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit size={15} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClient(client.id, client.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
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

      {/* Modal Crear/Editar Cliente */}
      {isModalOpen && editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]">
          <div className="bg-white rounded-xl border border-slate-200/90 w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200/80 bg-slate-50/60">
              <h2 className="text-base font-bold text-slate-900">
                {editingClient.id ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveClient} className="p-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Nombre Completo</label>
                <input 
                  required 
                  value={editingClient.name || ''} 
                  onChange={e => setEditingClient({...editingClient, name: e.target.value})}
                  className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 font-medium" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Correo Electrónico</label>
                <input 
                  required 
                  type="email"
                  value={editingClient.email || ''} 
                  onChange={e => setEditingClient({...editingClient, email: e.target.value})}
                  className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Segundo Correo Electrónico <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                </label>
                <input 
                  type="email"
                  placeholder="ejemplo2@correo.com"
                  value={editingClient.secondary_email || ''} 
                  onChange={e => setEditingClient({...editingClient, secondary_email: e.target.value})}
                  className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Teléfono</label>
                  <input 
                    type="tel"
                    placeholder="8888-8888"
                    value={editingClient.phone || ''} 
                    onChange={e => setEditingClient({...editingClient, phone: e.target.value})}
                    className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Cédula / ID</label>
                  <input 
                    type="text"
                    placeholder="1-1234-5678"
                    value={editingClient.cedula || ''} 
                    onChange={e => setEditingClient({...editingClient, cedula: e.target.value})}
                    className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10" 
                  />
                </div>
              </div>

              {/* Fixed Discount Configuration */}
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                    <Tag size={13} className="text-emerald-600" /> Descuento Fijo Automático
                  </label>
                  {Number(editingClient.discount_percent || 0) > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                      {editingClient.discount_percent}% Activo
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    placeholder="0 (Sin descuento)"
                    value={editingClient.discount_percent !== undefined && editingClient.discount_percent !== null ? editingClient.discount_percent : ''} 
                    onChange={e => setEditingClient({...editingClient, discount_percent: parseFloat(e.target.value) || 0})}
                    className="w-full h-9 px-3 bg-white border border-emerald-200 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 pr-9" 
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-700 font-bold text-xs">%</span>
                </div>
                <p className="text-[11px] text-emerald-700/80 leading-tight">
                  Este porcentaje se aplicará automáticamente en el sistema de facturación al seleccionar a este cliente.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="h-9 px-4 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="h-9 px-5 bg-brand-blue text-white rounded-lg text-xs font-semibold hover:bg-[#0e354b] transition-colors shadow-2xs cursor-pointer">
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
