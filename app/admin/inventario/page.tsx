'use client';

import React, { useEffect, useState } from 'react';
import { Package, Search, Filter, X } from 'lucide-react';

interface InventoryItem {
  id: string;
  client: string;
  company?: string;
  weight: string;
  status: string;
  date: string;
}

export default function BodegaInventario() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState('Todas');

  useEffect(() => {
    setMounted(true);
    const loadInventory = async () => {
      try {
        const res = await fetch('/api/inventory', { cache: 'no-store' });
        if (res.ok) {
          const { data } = await res.json();
          // Transform from DB format
          const formatted = data.map((item: { id: string, client: string, weight: string, status: string, company?: string, created_at: string }) => ({
            id: item.id,
            client: item.client,
            company: item.company || 'N/A',
            weight: item.weight,
            status: item.status,
            date: new Date(item.created_at).toLocaleString('es-CR')
          }));
          setInventory(formatted);
        }
      } catch (error) {
        console.error('Error fetching inventory', error);
      }
    };
    loadInventory();
  }, []);

  const activePackages = inventory.filter(p => p.status === 'En Bodega CR').length;

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.client.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompany = filterCompany === 'Todas' || item.company === filterCompany;
    return matchesSearch && matchesCompany;
  });

  if (!mounted) return null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-blue mb-2">Inventario Local</h1>
          <p className="text-gray-500">Gestión de paquetes físicos en la bodega de Costa Rica.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <span className="font-bold text-brand-blue">{activePackages} Paquetes Activos</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Barra de herramientas */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por tracking, cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-blue focus:ring-0 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-brand-blue font-semibold text-sm hover:bg-gray-50 transition-colors focus:ring-0 focus:border-brand-blue"
            >
              <option value="Todas">Todas las Empresas</option>
              <option value="JRS CARGO">JRS CARGO</option>
              <option value="ATLANTIC IMPORTS">ATLANTIC IMPORTS</option>
              <option value="ASI">ASI</option>
              <option value="Independiente">Independiente</option>
              <option value="N/A">N/A (Sin asignar)</option>
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                <th className="p-4 pl-6">Tracking</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Empresa</th>
                <th className="p-4">Peso</th>
                <th className="p-4">Fecha de Ingreso</th>
                <th className="p-4">Estado Interno</th>
                <th className="p-4 pr-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {filteredInventory.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">No hay paquetes que coincidan con la búsqueda.</td>
                </tr>
              )}
              {filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-4 pl-6 font-bold text-brand-blue flex items-center gap-3">
                    <Package size={16} className="text-gray-400" />
                    {item.id}
                  </td>
                  <td className="p-4 font-medium text-gray-700">{item.client}</td>
                  <td className="p-4 text-gray-500">{item.company}</td>
                  <td className="p-4 text-gray-500 whitespace-nowrap">{item.weight}</td>
                  <td className="p-4 text-gray-500 whitespace-nowrap">{item.date}</td>
                  <td className="p-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                      item.status === 'En Bodega CR' 
                        ? 'bg-brand-blue/10 text-brand-blue'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <button onClick={() => setEditingItem(item)} className="text-brand-blue font-bold text-xs hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Footer Tabla */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 text-center font-medium">
          Mostrando {filteredInventory.length} de {inventory.length} paquetes totales
        </div>
      </div>

      {/* Modal de Edición */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-brand-blue text-lg">Editar Paquete</h3>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSaving(true);
              try {
                const res = await fetch(`/api/inventory/${editingItem.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    client: editingItem.client,
                    weight: editingItem.weight,
                    company: editingItem.company,
                    status: editingItem.status
                  })
                });
                if (res.ok) {
                  setInventory(prev => prev.map(p => p.id === editingItem.id ? editingItem : p));
                  setEditingItem(null);
                } else {
                  alert('Error al guardar los cambios');
                }
              } catch {
                alert('Error de conexión al guardar');
              } finally {
                setIsSaving(false);
              }
            }} className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tracking</label>
                <input type="text" value={editingItem.id} disabled className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 font-mono text-sm" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cliente</label>
                <input 
                  type="text" 
                  value={editingItem.client} 
                  onChange={e => setEditingItem({...editingItem, client: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-brand-blue focus:ring-0 text-sm font-medium" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Empresa / Proveedor</label>
                <input 
                  type="text" 
                  value={editingItem.company || ''} 
                  onChange={e => setEditingItem({...editingItem, company: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-brand-blue focus:ring-0 text-sm font-medium" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Peso</label>
                  <input 
                    type="text" 
                    value={editingItem.weight} 
                    onChange={e => setEditingItem({...editingItem, weight: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-brand-blue focus:ring-0 text-sm font-medium" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Estado</label>
                  <select 
                    value={editingItem.status} 
                    onChange={e => setEditingItem({...editingItem, status: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-brand-blue focus:ring-0 text-sm font-medium"
                  >
                    <option value="En Bodega CR">En Bodega CR</option>
                    <option value="Entregado">Entregado</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex gap-3">
                <button type="button" onClick={() => setEditingItem(null)} className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="flex-1 py-3 font-bold bg-brand-blue text-white rounded-xl hover:bg-brand-blue/90 disabled:opacity-50 transition-colors">
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
