'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Tag } from 'lucide-react';
import { useModal } from '@/app/components/ModalProvider';

type Service = {
  id: string;
  name: string;
  default_rate: number;
};

export default function ServiciosPage() {
  const { showAlert, showConfirm } = useModal();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Nuevo servicio
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState('');

  // Edición
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRate, setEditRate] = useState('');

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      if (res.ok && data.success) {
        setServices(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, default_rate: Number(newRate) || 0 })
      });
      if (res.ok) {
        setNewName('');
        setNewRate('');
        setShowNewForm(false);
        loadServices();
      } else {
        await showAlert('Aviso', 'Asegúrate de haber creado la tabla en Supabase.');
      }
    } catch {
      await showAlert('Aviso', 'Error de red');
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await showConfirm('Confirmación', '¿Estás seguro de que deseas eliminar este servicio?'))) return;
    try {
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadServices();
      }
    } catch {
      await showAlert('Aviso', 'Error al eliminar');
    }
  };

  const startEditing = (s: Service) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditRate(s.default_rate.toString());
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, default_rate: Number(editRate) || 0 })
      });
      if (res.ok) {
        setEditingId(null);
        loadServices();
      }
    } catch {
      await showAlert('Aviso', 'Error al actualizar');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-blue mb-2">Servicios y Tarifas</h1>
          <p className="text-gray-500">Gestiona tu catálogo de servicios y sus tarifas predeterminadas.</p>
        </div>
        {!showNewForm && (
          <button onClick={() => setShowNewForm(true)} className="btn-primary shrink-0 flex items-center gap-2">
            <Plus size={20} /> Nuevo Servicio
          </button>
        )}
      </div>

      {showNewForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end animate-fade-in">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre del Servicio</label>
            <input 
              required
              autoFocus
              placeholder="Ej: MARITIMO"
              value={newName}
              onChange={e => setNewName(e.target.value.toUpperCase())}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue"
            />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tarifa ($)</label>
            <input 
              type="number"
              step="0.01"
              required
              placeholder="Ej: 7.00"
              value={newRate}
              onChange={e => setNewRate(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button type="submit" className="flex-1 px-6 py-2.5 bg-brand-blue text-white font-bold rounded-xl hover:bg-brand-blue/90 transition-colors">Guardar</button>
            <button type="button" onClick={() => setShowNewForm(false)} className="px-4 py-2.5 bg-gray-100 text-gray-500 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
            <Tag className="text-brand-blue" size={24} /> 
            Catálogo de Servicios
          </h2>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-gray-400 font-medium">Cargando servicios...</div>
        ) : services.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium">No hay servicios registrados. Haz clic en &quot;Nuevo Servicio&quot; para agregar uno.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Servicio</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tarifa Predeterminada</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      {editingId === s.id ? (
                        <input 
                          autoFocus
                          value={editName}
                          onChange={e => setEditName(e.target.value.toUpperCase())}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue"
                        />
                      ) : (
                        <span className="text-sm font-bold text-gray-800">{s.name}</span>
                      )}
                    </td>
                    <td className="p-4">
                      {editingId === s.id ? (
                        <input 
                          type="number"
                          step="0.01"
                          value={editRate}
                          onChange={e => setEditRate(e.target.value)}
                          className="w-32 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue"
                        />
                      ) : (
                        <span className="text-sm font-bold text-brand-blue">${Number(s.default_rate).toFixed(2)}</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === s.id ? (
                          <>
                            <button onClick={() => handleUpdate(s.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Guardar">
                              <Check size={18} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="Cancelar">
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditing(s)} className="p-2 text-gray-400 hover:text-brand-blue hover:bg-gray-50 rounded-lg transition-colors" title="Editar">
                              <Edit2 size={18} />
                            </button>
                            <button onClick={() => handleDelete(s.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
