'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Lock, User } from 'lucide-react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push('/admin/bodega');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Credenciales inválidas');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-xl border border-gray-100 animate-fade-in">
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-brand-blue rounded-2xl flex items-center justify-center p-3 mb-4 shadow-md">
          <Image src="/logo.png" alt="JRS Cargo" width={60} height={60} className="w-full h-full object-contain filter brightness-0 invert" />
        </div>
        <h1 className="text-2xl font-black text-brand-blue">Acceso WMS</h1>
        <p className="text-gray-500 text-sm mt-1">Ingresa tus credenciales de operador</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Usuario</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-brand-blue focus:bg-white focus:ring-0 transition-colors font-medium text-brand-blue placeholder:text-gray-400"
              placeholder="AdminJRS"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Contraseña</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock size={18} className="text-gray-400" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-brand-blue focus:bg-white focus:ring-0 transition-colors font-medium text-brand-blue placeholder:text-gray-400"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-semibold text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn-primary py-3.5 rounded-xl shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center mt-2 disabled:opacity-50"
        >
          {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
        </button>
      </form>
    </div>
  );
}
