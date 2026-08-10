'use client';

import React, { useEffect, useState } from 'react';
import { Package, Search, Filter, X, Pencil, Trash2, AlertTriangle, AlertCircle } from 'lucide-react';

interface InventoryItem {
  id: string;
  client: string;
  company?: string;
  weight: string;
  status: string;
  date: string;
  createdAt: string;
}

export default function BodegaInventario() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [originalTracking, setOriginalTracking] = useState<string>('');
  const [trackingJustification, setTrackingJustification] = useState('');
  
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  
  const [currentUser, setCurrentUser] = useState<{username: string, role: string} | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setCurrentUser(data.user);
        }
      })
      .catch(console.error);
  }, []);
  
  const [viewingPhotos, setViewingPhotos] = useState<{ id: string, photos: { id?: number | string, url: string }[] } | null>(null);
  const [loadingPhotosFor, setLoadingPhotosFor] = useState<string | null>(null);

  const handleViewPhotos = async (trackingId: string) => {
    setLoadingPhotosFor(trackingId);
    try {
      const res = await fetch(`/api/tracking?number=${trackingId}`);
      if (res.ok) {
        const { rawData } = await res.json();
        const photos = rawData?.package?.fotos || [];
        setViewingPhotos({ id: trackingId, photos });
      } else {
        alert('Error al cargar fotos desde el API');
      }
    } catch {
      alert('Error de conexión al cargar fotos');
    } finally {
      setLoadingPhotosFor(null);
    }
  };
  
  const openEditModal = (item: InventoryItem) => {
    setEditingItem({...item});
    setOriginalTracking(item.id);
    setTrackingJustification('');
  };
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterDate, setFilterDate] = useState('');

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
            date: new Date(item.created_at).toLocaleDateString('es-CR'),
            createdAt: item.created_at
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
    // Note: Since 'Entregado' might be saved as 'Entregado al Cliente' or 'Entregado', we check includes just in case
    const matchesStatus = filterStatus === 'Todos' || item.status.includes(filterStatus.replace(' al Cliente', ''));
    
    // Compare YYYY-MM-DD
    const itemDate = new Date(item.createdAt);
    const itemDateString = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`;
    const matchesDate = !filterDate || itemDateString === filterDate;

    return matchesSearch && matchesCompany && matchesStatus && matchesDate;
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
          <div className="bg-gradient-to-r from-brand-blue to-[#0A2636] px-5 py-2.5 rounded-2xl shadow-[0_4px_15px_-3px_rgba(18,67,94,0.3)] border border-brand-blue/20 flex items-center gap-3 hover:scale-105 transition-transform cursor-default select-none">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-yellow opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-yellow"></span>
            </div>
            <span className="font-black text-white uppercase tracking-wider text-sm">{activePackages} Paquetes en Bodega</span>
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
          <div className="flex flex-wrap items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 font-semibold text-sm hover:bg-gray-50 transition-colors focus:ring-0 focus:border-brand-blue"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-brand-blue font-semibold text-sm hover:bg-gray-50 transition-colors focus:ring-0 focus:border-brand-blue"
            >
              <option value="Todos">Todos los Estados</option>
              <option value="En Bodega CR">En Bodega CR</option>
              <option value="Entregado">Entregados</option>
            </select>

            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-brand-blue font-semibold text-sm hover:bg-gray-50 transition-colors focus:ring-0 focus:border-brand-blue"
            >
              <option value="Todas">Todas las Empresas</option>
              <option value="JRS CARGO">JRS CARGO</option>
              <option value="ATLANTIC IMPORTS">ATLANTIC IMPORTS</option>
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
                    <button 
                      onClick={() => handleViewPhotos(item.id)} 
                      disabled={loadingPhotosFor === item.id}
                      className="p-1.5 hover:bg-brand-blue/10 rounded-md transition-colors shrink-0"
                      title="Ver fotos del paquete"
                    >
                      {loadingPhotosFor === item.id ? (
                        <div className="w-4 h-4 rounded-full border-2 border-brand-blue border-t-transparent animate-spin"></div>
                      ) : (
                        <Package size={16} className="text-brand-blue cursor-pointer" />
                      )}
                    </button>
                    {item.id}
                  </td>
                  <td className="p-4 font-medium text-gray-700">{item.client}</td>
                  <td className="p-4 text-gray-500">{item.company}</td>
                  <td className="p-4 text-gray-500 whitespace-nowrap">
                    {item.weight} {item.weight && !item.weight.includes('kg') ? `/ ${(parseFloat(item.weight) * 0.453592).toFixed(2)} kg` : ''}
                  </td>
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
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(item)} className="p-2 text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors" title="Editar">
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => setDeletingItem(item)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                        <Trash2 size={18} />
                      </button>
                    </div>
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
              
              const updates = {
                id: editingItem.id !== originalTracking ? editingItem.id : undefined,
                client: editingItem.client,
                weight: editingItem.weight,
                company: editingItem.company,
                status: editingItem.status,
                updated_at: new Date().toISOString()
              };

              try {
                const res = await fetch(`/api/inventory/${originalTracking}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updates)
                });
                if (res.ok) {
                  setInventory(prev => prev.map(p => p.id === originalTracking ? editingItem : p));
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
                <input 
                  type="text" 
                  value={editingItem.id} 
                  onChange={e => setEditingItem({...editingItem, id: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-brand-blue focus:ring-0 text-sm font-mono" 
                />
              </div>

              {originalTracking !== editingItem.id && (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl space-y-3">
                  <div className="flex gap-2 items-center text-orange-800">
                    <AlertTriangle size={16} />
                    <span className="text-sm font-bold">Justificación de Cambio de Tracking</span>
                  </div>
                  <textarea
                    required
                    value={trackingJustification}
                    onChange={(e) => setTrackingJustification(e.target.value)}
                    placeholder="¿Por qué se está modificando el número de tracking original?"
                    className="w-full text-sm px-4 py-2 rounded-lg border border-orange-200 focus:ring-0 focus:border-orange-400 bg-white"
                    rows={2}
                  />
                </div>
              )}
              
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

      {/* Modal de Eliminación */}
      {deletingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <h3 className="font-bold text-red-600 text-lg flex items-center gap-2">
                <AlertCircle size={20} /> Eliminar Paquete
              </h3>
              <button onClick={() => setDeletingItem(null)} className="text-red-400 hover:text-red-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSaving(true);
              try {
                if (currentUser?.role === 'admin') {
                  // Direct deletion for admin
                  const res = await fetch(`/api/inventory/${deletingItem.id}`, {
                    method: 'DELETE',
                  });
                  if (res.ok) {
                    setInventory(prev => prev.filter(p => p.id !== deletingItem.id));
                    setDeletingItem(null);
                    setDeleteReason('');
                  } else {
                    alert('Error al eliminar');
                  }
                } else {
                  // Request deletion for regular user
                  const res = await fetch('/api/deletion-requests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      package_id: deletingItem.id,
                      requested_by: currentUser?.username || 'user',
                      reason: deleteReason
                    })
                  });
                  if (res.ok) {
                    alert('Solicitud enviada al Administrador Principal para su aprobación.');
                    setDeletingItem(null);
                    setDeleteReason('');
                  } else {
                    alert('Error al enviar la solicitud');
                  }
                }
              } catch {
                alert('Error de conexión');
              } finally {
                setIsSaving(false);
              }
            }} className="p-6 space-y-4">
              
              <p className="text-sm text-gray-600">
                {currentUser?.role === 'admin' 
                  ? `¿Estás seguro de que deseas eliminar permanentemente el paquete con tracking `
                  : `¿Estás seguro de solicitar la eliminación del paquete con tracking `}
                <strong className="text-gray-900">{deletingItem.id}</strong>? 
                {currentUser?.role === 'admin' ? ' Esta acción no se puede deshacer.' : ' El Administrador Principal deberá aprobar esta solicitud.'}
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Motivo / Justificación</label>
                <textarea 
                  required
                  value={deleteReason} 
                  onChange={e => setDeleteReason(e.target.value)}
                  placeholder="Por favor, indica el motivo de la eliminación..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-red-400 focus:ring-0 text-sm" 
                  rows={3}
                />
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex gap-3">
                <button type="button" onClick={() => setDeletingItem(null)} className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving || !deleteReason.trim()} className="flex-1 py-3 font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">
                  {isSaving ? (currentUser?.role === 'admin' ? 'Eliminando...' : 'Enviando...') : (currentUser?.role === 'admin' ? 'Eliminar Paquete' : 'Solicitar Eliminación')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Fotos */}
      {viewingPhotos && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewingPhotos(null)}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="font-bold text-brand-blue text-lg flex items-center gap-2">
                <Package size={20} /> Fotos del Paquete {viewingPhotos.id}
              </h3>
              <button onClick={() => setViewingPhotos(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {viewingPhotos.photos.length === 0 ? (
                <p className="text-center text-gray-500 py-12">No hay fotos disponibles para este paquete en Worldbox.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {viewingPhotos.photos.map((foto, index) => (
                    <div key={foto.id || index} className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={foto.url} alt={`Evidencia ${index + 1}`} className="w-full h-auto object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
