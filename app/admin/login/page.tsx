'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

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
    <div className="relative w-full max-w-5xl mx-auto min-h-[600px] h-full sm:h-[80vh] flex flex-col sm:flex-row overflow-hidden rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/20 animate-fade-in bg-white">
      
      {/* Left side - Dynamic Brand Background */}
      <div className="relative w-full sm:w-1/2 bg-brand-blue flex flex-col justify-between p-10 overflow-hidden text-white">
        {/* Animated Shapes */}
        <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-brand-yellow/20 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-72 h-72 bg-brand-red/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white p-2 rounded-xl shadow-lg">
            <Image src="/logo.png" alt="JRS Cargo" width={40} height={40} className="object-contain" />
          </div>
          <div>
            <h1 className="font-black text-2xl tracking-tight leading-none text-white">JRS CARGO</h1>
            <p className="text-brand-yellow text-xs font-bold uppercase tracking-[0.2em] mt-1">Costa Rica</p>
          </div>
        </div>

        <div className="relative z-10 mt-16 sm:mt-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-brand-yellow font-bold text-xs uppercase tracking-wider mb-6">
            <ShieldCheck size={16} /> Portal Administrativo
          </div>
          <h2 className="text-4xl sm:text-5xl font-black mb-6 leading-[1.1] tracking-tight">
            Gestión <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow to-brand-red">Inteligente</span> <br/>de Bodega
          </h2>
          <p className="text-white/70 text-lg max-w-sm">
            Accede al sistema WMS para controlar el inventario, rastrear paquetes y administrar las entregas locales.
          </p>
        </div>
        
        <div className="relative z-10 text-xs font-medium text-white/40 mt-8 sm:mt-0">
          &copy; {new Date().getFullYear()} JRS Cargo. Todos los derechos reservados.
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full sm:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-gray-50/50 relative">
        <div className="max-w-sm w-full mx-auto">
          <div className="mb-10 text-center sm:text-left">
            <h3 className="text-3xl font-black text-brand-blue tracking-tight">Bienvenido de nuevo</h3>
            <p className="text-gray-500 mt-2 font-medium">Ingresa tus credenciales para continuar.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Usuario de operador</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={20} className="text-gray-400 group-focus-within:text-brand-blue transition-colors" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all font-bold text-brand-blue placeholder:text-gray-300 placeholder:font-medium shadow-sm hover:border-gray-200"
                  placeholder="Ej: AdminJRS"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contraseña</label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={20} className="text-gray-400 group-focus-within:text-brand-blue transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-100 rounded-2xl focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all font-bold text-brand-blue placeholder:text-gray-300 placeholder:font-medium shadow-sm hover:border-gray-200"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-brand-red/10 border border-brand-red/20 rounded-2xl flex items-center gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-brand-red/20 flex items-center justify-center shrink-0">
                  <Lock size={16} className="text-brand-red" />
                </div>
                <p className="text-brand-red text-sm font-bold">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(18,67,94,0.3)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:hover:translate-y-0 text-lg group"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>Ingresar al Sistema <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
