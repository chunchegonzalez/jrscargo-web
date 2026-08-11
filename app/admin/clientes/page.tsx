'use client';

import React, { useEffect, useState } from 'react';
import { Users, Search, Mail, Phone, Edit, Plus, X } from 'lucide-react';

type Client = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  created_at?: string;
  // Computed fields
  totalInvoices?: number;
  pendingBalance?: number;
};

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
        fetch('/api/clients'),
        fetch('/api/invoices')
      ]);

      const clientsData = await clientsRes.json();
      const invoicesData = await invoicesRes.json();

      if (clientsData.success && invoicesData.success) {
        // Merge data to calculate stats
        const mergedClients = clientsData.data.map((c: Client) => {
          const clientInvoices = invoicesData.data.filter((i: { client_id: string, status: string, total: string | number }) => i.client_id === c.id);
          const pendingInvoices = clientInvoices.filter((i: { client_id: string, status: string, total: string | number }) => i.status === 'Pendiente' || i.status === 'Vencida');
          
          const pendingBalance = pendingInvoices.reduce((acc: number, curr: { client_id: string, status: string, total: string | number }) => acc + Number(curr.total), 0);
          
          return {
            ...c,
            totalInvoices: clientInvoices.length,
            pendingBalance
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
        alert('Error: ' + (data.error || 'Ocurrió un error al guardar.'));
      }
    } catch {
      alert('Error de red al guardar cliente.');
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-blue mb-2">Directorio de Clientes</h1>
          <p className="text-gray-500">Gestiona la información de contacto de todos tus clientes.</p>
        </div>
        <button 
          onClick={() => {
            setEditingClient({ name: '', email: '', phone: '', address: 'Costa Rica' });
            setIsModalOpen(true);
          }}
          className="btn-primary"
        >
          <Plus size={20} /> Nuevo Cliente
        </button>
      </div>

      {/* Lista de Clientes */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
            <Users className="text-brand-blue" size={24} /> 
            Lista Completa
          </h2>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar por nombre, correo o teléfono..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue w-full sm:w-80" 
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Facturas Totales</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Saldo Pendiente</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">Cargando clientes...</td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No se encontraron clientes.</td>
                </tr>
              ) : (
                filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold text-lg shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{client.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail size={14} className="text-gray-400" />
                          <a href={`mailto:${client.email}`} className="hover:text-brand-blue transition-colors">{client.email}</a>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone size={14} className="text-gray-400" />
                            <a href={`tel:${client.phone}`} className="hover:text-brand-blue transition-colors">{client.phone}</a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center text-sm font-bold text-gray-600">
                      {client.totalInvoices || 0}
                    </td>
                    <td className="p-4 text-right">
                      {client.pendingBalance && client.pendingBalance > 0 ? (
                        <span className="font-bold text-orange-500">${client.pendingBalance.toFixed(2)}</span>
                      ) : (
                        <span className="text-sm text-gray-400">Sin deudas</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => {
                          setEditingClient(client);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors inline-flex"
                        title="Editar cliente"
                      >
                        <Edit size={18} />
                      </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-brand-blue">
                {editingClient.id ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveClient} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre Completo</label>
                <input 
                  required 
                  value={editingClient.name} 
                  onChange={e => setEditingClient({...editingClient, name: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Correo Electrónico</label>
                <input 
                  required 
                  type="email"
                  value={editingClient.email} 
                  onChange={e => setEditingClient({...editingClient, email: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Teléfono</label>
                  <input 
                    type="tel"
                    value={editingClient.phone || ''} 
                    onChange={e => setEditingClient({...editingClient, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">País</label>
                  <select 
                    value={editingClient.address || 'Costa Rica'} 
                    onChange={e => setEditingClient({...editingClient, address: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue"
                  >
                    <option value="Costa Rica">Costa Rica</option>
                    <option value="Estados Unidos">Estados Unidos</option>
                    <option value="Nicaragua">Nicaragua</option>
                    <option value="Otro">Otro País</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="submit" className="flex-1 py-3 bg-brand-blue text-white rounded-xl font-bold hover:bg-brand-blue/90 transition-colors">
                  Guardar
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
