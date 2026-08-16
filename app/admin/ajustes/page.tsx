'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, Trash2, Eye, EyeOff, Edit2, Save, 
  Bot, Mail, Search, Copy, Check, 
  Calendar, RefreshCw, UserCheck
} from 'lucide-react';
import { useModal } from '@/app/components/ModalProvider';
import { formatCostaRicaDateTime } from '@/lib/billing';

interface LeadItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  created_at: string;
}

export default function AjustesPage() {
  const { showAlert, showConfirm } = useModal();
  const [users, setUsers] = useState<{id: string, username: string, role: string, password?: string}[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [showPasswordFor, setShowPasswordFor] = useState<string | null>(null);
  const [editingPasswordFor, setEditingPasswordFor] = useState<string | null>(null);
  const [editPasswordValue, setEditPasswordValue] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLeadsLoading(true);
      const [resUsers, resLeads] = await Promise.all([
        fetch('/api/users').then(res => res.json()),
        fetch('/api/bot-leads').then(res => res.json())
      ]);
      
      if (resUsers.success) setUsers(resUsers.data || []);
      if (resLeads.success) setLeads(resLeads.data || []);
    } catch (err) {
      console.error('Error loading data', err);
    } finally {
      setLeadsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole })
      });
      if (res.ok) {
        setNewUsername('');
        setNewPassword('');
        loadData();
      } else {
        const errorData = await res.json();
        await showAlert('Aviso', `Error al crear usuario: ${errorData.error}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      await showAlert('Aviso', `Error de red: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!(await showConfirm('Confirmación', '¿Estás seguro de eliminar este usuario?'))) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      }
    } catch {
      await showAlert('Aviso', 'Error eliminando usuario');
    }
  };

  const handleUpdatePassword = async (id: string) => {
    if (!editPasswordValue.trim()) return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: editPasswordValue })
      });
      if (res.ok) {
        setEditingPasswordFor(null);
        setEditPasswordValue('');
        loadData();
      } else {
        await showAlert('Aviso', 'Error actualizando contraseña');
      }
    } catch {
      await showAlert('Aviso', 'Error de red');
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!(await showConfirm('Confirmación', '¿Deseas eliminar este registro de contacto del bot?'))) return;
    try {
      const res = await fetch(`/api/bot-leads?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        setLeads(prev => prev.filter(l => l.id !== id));
      } else {
        await showAlert('Aviso', 'No se pudo eliminar el registro.');
      }
    } catch {
      await showAlert('Aviso', 'Error de red al eliminar lead.');
    }
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const filteredLeads = leads.filter(l => 
    l.name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
    l.email?.toLowerCase().includes(leadSearch.toLowerCase()) ||
    l.phone?.toLowerCase().includes(leadSearch.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-brand-blue mb-2">Ajustes del Sistema</h1>
        <p className="text-gray-500">Gestión de usuarios y registros de contactos del asistente virtual Clari.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PANEL: Registros y Contactos del Bot (Leads de Clari) */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-brand-blue/10 via-brand-blue/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-blue flex items-center justify-center text-brand-yellow shrink-0 shadow-sm">
                <Bot size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Registros del Bot (Clari)</h2>
                <p className="text-xs text-gray-400">Clientes que iniciaron chat solicitando atención</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-brand-blue/10 text-brand-blue rounded-full">
              {leads.length} {leads.length === 1 ? 'contacto' : 'contactos'}
            </span>
          </div>

          <div className="p-6 space-y-4 flex-1 flex flex-col">
            {/* Buscador de registros */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o correo..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-0 focus:border-brand-blue focus:bg-white transition-all"
                />
              </div>
              <button
                onClick={loadData}
                disabled={leadsLoading}
                className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl transition-colors"
                title="Actualizar registros"
              >
                <RefreshCw size={15} className={leadsLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Lista de Registros */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
              {filteredLeads.length === 0 && !leadsLoading && (
                <div className="text-center py-12 text-gray-400">
                  <UserCheck size={36} className="mx-auto mb-2 opacity-30 text-brand-blue" />
                  <p className="text-sm font-semibold">No hay registros del bot aún.</p>
                  <p className="text-xs mt-1">Los contactos que ingresen por Clari aparecerán aquí automáticamente.</p>
                </div>
              )}

              {filteredLeads.map((lead) => {
                const initials = (lead.name || 'US')
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                const dateDisplay = lead.created_at ? formatCostaRicaDateTime(lead.created_at) : 'Reciente';

                return (
                  <div key={lead.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:border-brand-blue/30 hover:shadow-sm transition-all flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-brand-blue text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800 text-sm truncate">{lead.name}</p>
                          <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                            <Mail size={12} className="shrink-0 text-brand-blue" />
                            <span>{lead.email}</span>
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteLead(lead.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        title="Eliminar registro"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200/50 text-xs">
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Calendar size={12} /> {dateDisplay}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyEmail(lead.email)}
                          className="px-2.5 py-1 bg-white border border-gray-200 hover:border-brand-blue rounded-lg text-[11px] font-semibold text-gray-600 hover:text-brand-blue flex items-center gap-1 transition-colors"
                        >
                          {copiedEmail === lead.email ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                          <span>{copiedEmail === lead.email ? 'Copiado' : 'Copiar'}</span>
                        </button>
                        <a
                          href={`mailto:${lead.email}?subject=Atención%20JRS%20CARGO`}
                          className="px-3 py-1 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95"
                        >
                          <Mail size={12} /> Escribir
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel de Gestión de Usuarios */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-brand-blue/5">
            <Users className="text-brand-blue" size={24} />
            <h2 className="text-xl font-bold text-gray-800">Gestión de Usuarios</h2>
          </div>
          <div className="p-6 space-y-6">
            
            {/* Formulario nuevo usuario */}
            <form onSubmit={handleCreateUser} className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4">
              <h3 className="font-bold text-brand-blue text-sm uppercase tracking-wider">Crear Nuevo Usuario</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Usuario</label>
                  <input required type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-0 focus:border-brand-blue" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Contraseña</label>
                  <div className="relative">
                    <input required type={showNewPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-3 pr-10 py-2 rounded-lg border border-gray-200 text-sm focus:ring-0 focus:border-brand-blue" />
                    <button 
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1">Rol</label>
                  <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-0 focus:border-brand-blue">
                    <option value="user">Usuario Regular</option>
                    <option value="admin">Administrador Principal</option>
                  </select>
                </div>
                <button type="submit" disabled={loading} className="px-6 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold rounded-lg transition-colors disabled:opacity-50 text-sm">
                  {loading ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>

            {/* Lista de usuarios */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wider mb-2">Usuarios Registrados</h3>
              {users.map(u => (
                <div key={u.id} className="flex flex-col gap-3 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-800">{u.username}</p>
                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-gray-200 text-gray-600'}`}>
                        {u.role === 'admin' ? 'Admin' : 'Regular'}
                      </span>
                    </div>
                    {u.username !== 'AdminJRS' && (
                      <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  
                  {/* Password Section (Only for Admins) */}
                  <div className="bg-white border border-gray-100 p-3 rounded-lg flex items-center justify-between mt-1">
                    <div className="flex-1 flex flex-col">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Contraseña</span>
                      {editingPasswordFor === u.id ? (
                        <input 
                          type="text" 
                          value={editPasswordValue}
                          onChange={(e) => setEditPasswordValue(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-brand-blue rounded focus:outline-none"
                          placeholder="Nueva contraseña"
                        />
                      ) : (
                        <span className="text-sm font-mono text-gray-600">
                          {showPasswordFor === u.id ? (u.password || '••••••••') : '••••••••'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {editingPasswordFor === u.id ? (
                        <>
                          <button 
                            onClick={() => handleUpdatePassword(u.id)} 
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                            title="Guardar"
                          >
                            <Save size={16} />
                          </button>
                          <button 
                            onClick={() => { setEditingPasswordFor(null); setEditPasswordValue(''); }} 
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                            title="Cancelar"
                          >
                            <EyeOff size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => setShowPasswordFor(showPasswordFor === u.id ? null : u.id)} 
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                            title={showPasswordFor === u.id ? "Ocultar" : "Mostrar"}
                          >
                            {showPasswordFor === u.id ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button 
                            onClick={() => {
                              setEditingPasswordFor(u.id);
                              setEditPasswordValue(u.password || '');
                            }} 
                            className="p-1.5 text-brand-blue hover:bg-blue-50 rounded"
                            title="Editar contraseña"
                          >
                            <Edit2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
