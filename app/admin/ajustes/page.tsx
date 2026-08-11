'use client';

import React, { useEffect, useState } from 'react';
import { Users, Trash2, CheckCircle, XCircle, ShieldAlert, Eye, EyeOff, Edit2, Save } from 'lucide-react';
import { useModal } from '@/app/components/ModalProvider';

export default function AjustesPage() {
  const { showAlert, showConfirm } = useModal();
  const [users, setUsers] = useState<{id: string, username: string, role: string, password?: string}[]>([]);
  const [requests, setRequests] = useState<{id: string, package_id: string, requested_by: string, reason: string, status: string}[]>([]);
  
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
      const [resUsers, resReqs] = await Promise.all([
        fetch('/api/users').then(res => res.json()),
        fetch('/api/deletion-requests').then(res => res.json())
      ]);
      
      if (resUsers.success) setUsers(resUsers.data || []);
      if (resReqs.success) setRequests(resReqs.data || []);
    } catch (err) {
      console.error('Error loading data', err);
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

  const handleRequestStatus = async (id: string, packageId: string, status: 'approved' | 'rejected') => {
    if (!(await showConfirm('Confirmación', `¿Estás seguro de ${status === 'approved' ? 'aprobar' : 'rechazar'} esta solicitud?`))) return;
    
    try {
      const res = await fetch(`/api/deletion-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, package_id: packageId })
      });
      if (res.ok) {
        loadData();
      } else {
        await showAlert('Aviso', 'Error procesando solicitud');
      }
    } catch {
      await showAlert('Aviso', 'Error de red');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-brand-blue mb-2">Ajustes del Sistema</h1>
        <p className="text-gray-500">Gestión de usuarios y aprobaciones de bodega.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Panel de Solicitudes de Eliminación */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-red-50/50">
            <ShieldAlert className="text-red-500" size={24} />
            <h2 className="text-xl font-bold text-gray-800">Aprobaciones de Eliminación</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {requests.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">No hay solicitudes pendientes.</p>
              )}
              {requests.map(req => (
                <div key={req.id} className={`p-4 rounded-xl border ${req.status === 'pending' ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Tracking</span>
                      <p className="font-bold text-brand-blue">{req.package_id}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Solicitado por</span>
                      <p className="font-medium text-gray-700">{req.requested_by}</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-1">Motivo / Justificación</span>
                    <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-gray-200">{req.reason}</p>
                  </div>

                  {req.status === 'pending' ? (
                    <div className="flex gap-2 pt-2 border-t border-gray-200/50">
                      <button onClick={() => handleRequestStatus(req.id, req.package_id, 'approved')} className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                        <CheckCircle size={16} /> Aprobar
                      </button>
                      <button onClick={() => handleRequestStatus(req.id, req.package_id, 'rejected')} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                        <XCircle size={16} /> Rechazar
                      </button>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-gray-200/50">
                      <span className={`text-sm font-bold flex items-center gap-2 ${req.status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>
                        {req.status === 'approved' ? <><CheckCircle size={16}/> Aprobado (Eliminado)</> : <><XCircle size={16}/> Rechazado</>}
                      </span>
                    </div>
                  )}
                </div>
              ))}
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
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-700 tracking-wider font-mono">
                          {showPasswordFor === u.id ? (u.password || '••••••••') : '••••••••'}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 ml-4">
                      {editingPasswordFor === u.id ? (
                        <button 
                          onClick={() => handleUpdatePassword(u.id)}
                          className="p-1.5 text-white bg-green-500 hover:bg-green-600 rounded-md transition-colors"
                          title="Guardar"
                        >
                          <Save size={16} />
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={() => setShowPasswordFor(showPasswordFor === u.id ? null : u.id)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                            title={showPasswordFor === u.id ? "Ocultar" : "Mostrar"}
                          >
                            {showPasswordFor === u.id ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button 
                            onClick={() => {
                              setEditingPasswordFor(u.id);
                              setEditPasswordValue(u.password || '');
                            }}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
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
