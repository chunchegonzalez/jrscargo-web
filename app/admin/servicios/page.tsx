'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Tag, DollarSign } from 'lucide-react';
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

  const avgRate = services.length > 0
    ? services.reduce((acc, s) => acc + (Number(s.default_rate) || 0), 0) / services.length
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Servicios y Tarifas</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/15 tabular-nums">
              {services.length} activos
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Gestiona tu catálogo de servicios logísticos y sus tarifas predeterminadas por libra o unidad.
          </p>
        </div>
        {!showNewForm && (
          <button
            onClick={() => setShowNewForm(true)}
            className="h-9 px-3.5 rounded-lg border border-brand-blue/20 bg-brand-blue hover:bg-[#0e354b] text-white shadow-2xs inline-flex items-center gap-1.5 font-semibold text-xs transition-all active:scale-[0.98] cursor-pointer w-fit"
          >
            <Plus size={15} />
            <span>Nuevo Servicio</span>
          </button>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Servicios Registrados</p>
            <p className="text-2xl font-black text-slate-900 tabular-nums mt-1">{services.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Disponibles en facturación</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
            <Tag size={18} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tarifa Promedio Base</p>
            <p className="text-2xl font-black text-emerald-700 tabular-nums mt-1">${avgRate.toFixed(2)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">En dólares (USD)</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={18} />
          </div>
        </div>
      </div>

      {showNewForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] border border-slate-200/80 flex flex-col sm:flex-row gap-3 items-end animate-fade-in">
          <div className="flex-1 w-full">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Nombre del Servicio</label>
            <input 
              required
              autoFocus
              placeholder="Ej: MARITIMO"
              value={newName}
              onChange={e => setNewName(e.target.value.toUpperCase())}
              className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
            />
          </div>
          <div className="w-full sm:w-44">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Tarifa ($)</label>
            <input 
              type="number"
              step="0.01"
              required
              placeholder="Ej: 7.00"
              value={newRate}
              onChange={e => setNewRate(e.target.value)}
              className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button type="submit" className="h-9 px-4 bg-brand-blue text-white text-xs font-semibold rounded-lg hover:bg-[#0e354b] transition-colors shadow-2xs cursor-pointer">
              Guardar
            </button>
            <button type="button" onClick={() => setShowNewForm(false)} className="h-9 px-3.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors cursor-pointer">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] border border-slate-200/80 overflow-hidden">
        <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Tag className="text-brand-blue" size={15} /> 
            <span>Catálogo de Servicios</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium tabular-nums">{services.length} registros</span>
        </div>
        
        {loading ? (
          <div className="py-10 px-4 text-center text-slate-400 text-sm">Cargando servicios...</div>
        ) : services.length === 0 ? (
          <div className="py-10 px-4 text-center text-slate-400 text-sm">No hay servicios registrados. Haz clic en &quot;Nuevo Servicio&quot; para agregar uno.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/95 border-b border-slate-200/90 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="py-2.5 px-3.5 pl-5">Servicio</th>
                  <th className="py-2.5 px-3.5">Tarifa Predeterminada</th>
                  <th className="py-2.5 px-3.5 pr-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {services.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/90 transition-colors">
                    <td className="py-2.5 px-3.5 pl-5">
                      {editingId === s.id ? (
                        <input 
                          autoFocus
                          value={editName}
                          onChange={e => setEditName(e.target.value.toUpperCase())}
                          className="w-full max-w-xs h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                        />
                      ) : (
                        <span className="font-semibold text-slate-900">{s.name}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5">
                      {editingId === s.id ? (
                        <input 
                          type="number"
                          step="0.01"
                          value={editRate}
                          onChange={e => setEditRate(e.target.value)}
                          className="w-32 h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                        />
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-brand-blue/[0.08] text-brand-blue border-brand-blue/15 tabular-nums">
                          ${Number(s.default_rate).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 pr-5 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        {editingId === s.id ? (
                          <>
                            <button onClick={() => handleUpdate(s.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer" title="Guardar">
                              <Check size={15} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md transition-colors cursor-pointer" title="Cancelar">
                              <X size={15} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditing(s)} className="p-1.5 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/10 rounded-md transition-colors cursor-pointer" title="Editar">
                              <Edit2 size={15} />
                            </button>
                            <button onClick={() => handleDelete(s.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer" title="Eliminar">
                              <Trash2 size={15} />
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
