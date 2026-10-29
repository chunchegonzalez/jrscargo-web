'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, Trash2, Eye, EyeOff, Edit2, Save, 
  Bot, Mail, Search, Copy, Check, 
  Calendar, RefreshCw, UserCheck, Phone, Shield, Plus
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ajustes del Sistema</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/15">
              Administración
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Gestión de usuarios administrativos y registros de contactos del asistente virtual Clari.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={leadsLoading}
          className="h-9 px-3.5 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer w-fit"
        >
          <RefreshCw size={14} className={leadsLoading ? 'animate-spin text-brand-blue' : 'text-slate-500'} />
          <span>Actualizar Datos</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Usuarios del Sistema</p>
            <p className="text-2xl font-black text-slate-900 tabular-nums mt-1">{users.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Cuentas con acceso al panel</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Administradores</p>
            <p className="text-2xl font-black text-brand-blue tabular-nums mt-1">
              {users.filter(u => u.role === 'admin').length}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Permisos completos</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Shield size={18} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Contactos Bot (Clari)</p>
            <p className="text-2xl font-black text-slate-900 tabular-nums mt-1">{leads.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Prospectos capturados</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Bot size={18} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        
        {/* PANEL: Registros y Contactos del Bot (Leads de Clari) */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/60 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center text-brand-yellow shrink-0 shadow-2xs">
                  <Bot size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Registros del Bot (Clari)</h2>
                  <p className="text-[11px] text-slate-500">Clientes que iniciaron chat solicitando atención</p>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-brand-blue/[0.08] text-brand-blue border-brand-blue/15 tabular-nums">
                {leads.length} {leads.length === 1 ? 'contacto' : 'contactos'}
              </span>
            </div>

            {/* Buscador de registros */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, teléfono o correo..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                />
              </div>
              <button
                onClick={loadData}
                disabled={leadsLoading}
                className="h-9 w-9 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Actualizar registros"
              >
                <RefreshCw size={14} className={leadsLoading ? 'animate-spin text-brand-blue' : ''} />
              </button>
            </div>
          </div>

          {/* Lista de Registros */}
          <div className="divide-y divide-slate-100 text-[13px] max-h-[540px] overflow-y-auto">
            {filteredLeads.length === 0 && !leadsLoading && (
              <div className="text-center py-12 px-4 text-slate-400">
                <UserCheck size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">No hay registros del bot aún.</p>
                <p className="text-xs mt-0.5">Los contactos que ingresen por Clari aparecerán aquí automáticamente.</p>
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
                <div key={lead.id} className="py-2.5 px-3.5 hover:bg-slate-50/90 transition-colors flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-brand-blue/10 border border-brand-blue/15 text-brand-blue flex items-center justify-center font-bold text-xs shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 truncate">{lead.name}</p>
                          {lead.address && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md shrink-0">
                              {lead.address}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                          <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                            <Mail size={11} className="shrink-0 text-slate-400" />
                            <span>{lead.email}</span>
                          </p>
                          {lead.phone && (
                            <p className="text-xs text-slate-500 truncate flex items-center gap-1 tabular-nums">
                              <Phone size={11} className="shrink-0 text-emerald-600" />
                              <span>{lead.phone}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteLead(lead.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0 cursor-pointer"
                      title="Eliminar registro"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pl-10 text-xs">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 tabular-nums">
                      <Calendar size={11} /> {dateDisplay}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => copyEmail(lead.email)}
                        className="h-7 px-2.5 bg-white border border-slate-200/90 hover:border-brand-blue rounded-md text-[11px] font-semibold text-slate-600 hover:text-brand-blue inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedEmail === lead.email ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        <span>{copiedEmail === lead.email ? 'Copiado' : 'Copiar'}</span>
                      </button>
                      <a
                        href={`mailto:${lead.email}?subject=Atención%20JRS%20CARGO`}
                        className="h-7 px-2.5 bg-brand-blue hover:bg-[#0e354b] text-white rounded-md text-[11px] font-semibold inline-flex items-center gap-1 transition-all shadow-2xs"
                      >
                        <Mail size={11} /> Escribir
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel de Gestión de Usuarios */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-blue/10 border border-brand-blue/15 text-brand-blue flex items-center justify-center shrink-0">
                <Users size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Gestión de Usuarios</h2>
                <p className="text-[11px] text-slate-500">Accesos y contraseñas del equipo</p>
              </div>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-slate-100 text-slate-700 border-slate-200/80 tabular-nums">
              {users.length} activos
            </span>
          </div>

          <div className="p-4 border-b border-slate-200/80 bg-slate-50/30">
            {/* Formulario nuevo usuario */}
            <form onSubmit={handleCreateUser} className="space-y-3">
              <h3 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Plus size={13} className="text-brand-blue" /> Crear Nuevo Usuario
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Usuario</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. OperadorBodega"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    className="w-full h-9 px-3 bg-white rounded-lg border border-slate-200/90 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Contraseña</label>
                  <div className="relative">
                    <input
                      required
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full h-9 pl-3 pr-9 bg-white rounded-lg border border-slate-200/90 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Rol</label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                    className="w-full h-9 px-2.5 bg-white rounded-lg border border-slate-200/90 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                  >
                    <option value="user">Usuario Regular</option>
                    <option value="admin">Administrador Principal</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-9 px-4 bg-brand-blue hover:bg-[#0e354b] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 text-xs shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>{loading ? 'Creando...' : 'Crear Usuario'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Lista de usuarios */}
          <div className="divide-y divide-slate-100 text-[13px]">
            <div className="bg-slate-50/95 border-b border-slate-200/90 py-2 px-3.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Usuarios Registrados
            </div>
            {users.map(u => (
              <div key={u.id} className="py-2.5 px-3.5 hover:bg-slate-50/90 transition-colors flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-slate-900">{u.username}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      u.role === 'admin'
                        ? 'bg-brand-blue/[0.08] text-brand-blue border-brand-blue/15'
                        : 'bg-slate-100 text-slate-600 border-slate-200/80'
                    }`}>
                      {u.role === 'admin' ? 'Admin' : 'Regular'}
                    </span>
                  </div>
                  {u.username !== 'AdminJRS' && (
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      title="Eliminar usuario"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                
                {/* Password Section */}
                <div className="bg-slate-50/80 border border-slate-200/70 px-3 py-2 rounded-lg flex items-center justify-between gap-2">
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">Clave:</span>
                    {editingPasswordFor === u.id ? (
                      <input 
                        type="text" 
                        value={editPasswordValue}
                        onChange={(e) => setEditPasswordValue(e.target.value)}
                        className="w-full h-8 px-2.5 bg-white text-xs sm:text-sm text-slate-800 border border-slate-200/90 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                        placeholder="Nueva contraseña"
                      />
                    ) : (
                      <span className="text-xs font-mono text-slate-600 truncate">
                        {showPasswordFor === u.id ? (u.password || '••••••••') : '••••••••'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {editingPasswordFor === u.id ? (
                      <>
                        <button 
                          onClick={() => handleUpdatePassword(u.id)} 
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                          title="Guardar"
                        >
                          <Save size={14} />
                        </button>
                        <button 
                          onClick={() => { setEditingPasswordFor(null); setEditPasswordValue(''); }} 
                          className="p-1.5 text-slate-400 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
                          title="Cancelar"
                        >
                          <EyeOff size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => setShowPasswordFor(showPasswordFor === u.id ? null : u.id)} 
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
                          title={showPasswordFor === u.id ? "Ocultar" : "Mostrar"}
                        >
                          {showPasswordFor === u.id ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button 
                          onClick={() => {
                            setEditingPasswordFor(u.id);
                            setEditPasswordValue(u.password || '');
                          }} 
                          className="p-1.5 text-brand-blue hover:bg-brand-blue/10 rounded-md transition-colors cursor-pointer"
                          title="Editar contraseña"
                        >
                          <Edit2 size={14} />
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
  );
}
