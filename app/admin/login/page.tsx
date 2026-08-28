'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Lock, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Package, 
  Zap, 
  HelpCircle,
  CheckCircle2
} from 'lucide-react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        setError(data.error || 'Credenciales inválidas. Verifica tu usuario y contraseña.');
      }
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#0B1924] relative overflow-hidden selection:bg-brand-yellow selection:text-brand-blue">
      {/* Dynamic Background Ambient Glow Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#12435E]/60 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-[#F5A623]/20 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-[#0E354A]/50 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ 
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', 
          backgroundSize: '32px 32px' 
        }}
      ></div>

      {/* Main Login Card */}
      <div className="relative w-full max-w-5xl flex flex-col lg:flex-row overflow-hidden rounded-[2.5rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6)] border border-white/10 bg-white/95 backdrop-blur-xl z-10 transition-all duration-300">
        
        {/* Left Side: Brand Experience & Dynamic Highlights */}
        <div className="relative w-full lg:w-[48%] bg-gradient-to-br from-[#081B27] via-[#0E2F46] to-[#12435E] flex flex-col justify-between p-8 sm:p-12 overflow-hidden text-white">
          
          {/* Animated decorative shapes */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-yellow/15 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl"></div>

          {/* Micro dot pattern */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)', 
              backgroundSize: '20px 20px' 
            }}
          ></div>

          {/* Header Branding */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/95 p-2.5 rounded-2xl shadow-xl border border-white/20">
                <Image 
                  src="/logo.png" 
                  alt="JRS Cargo" 
                  width={36} 
                  height={36} 
                  className="object-contain" 
                  priority
                />
              </div>
              <div>
                <h1 className="font-black text-xl tracking-tight leading-none text-white">JRS CARGO</h1>
                <p className="text-brand-yellow text-[10px] font-extrabold uppercase tracking-[0.25em] mt-1">Costa Rica</p>
              </div>
            </div>
          </div>

          {/* Center Main Message */}
          <div className="relative z-10 my-10 sm:my-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-brand-yellow font-bold text-xs uppercase tracking-wider mb-5 shadow-sm">
              <ShieldCheck size={14} className="text-brand-yellow" />
              <span>Portal WMS &bull; Operaciones</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-black leading-[1.15] tracking-tight text-white mb-4">
              Gestión Integral <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow via-amber-300 to-orange-400">
                de Carga & Bodega
              </span>
            </h2>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-normal max-w-md">
              Controla inventario en tiempo real, procesa paquetes, emite facturas y administra cuentas por cobrar desde una sola plataforma.
            </p>

            {/* Dynamic System Badges */}
            <div className="grid grid-cols-2 gap-3 mt-8">
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-brand-yellow/15 flex items-center justify-center text-brand-yellow shrink-0">
                  <Package size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">Inventario CR</div>
                  <div className="text-[10px] text-slate-300">Escaneo rápido</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-cyan-400/15 flex items-center justify-center text-cyan-300 shrink-0">
                  <Zap size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">Facturación</div>
                  <div className="text-[10px] text-slate-300">Cobros automáticos</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="relative z-10 flex items-center justify-between text-xs text-white/50 pt-4 border-t border-white/10">
            <span>&copy; {new Date().getFullYear()} JRS Cargo S.A.</span>
            <span className="text-[11px] font-mono text-white/40">v2.4.0</span>
          </div>
        </div>

        {/* Right Side: Interactive Login Form */}
        <div className="w-full lg:w-[52%] p-8 sm:p-12 lg:p-14 flex flex-col justify-center bg-white relative">
          <div className="max-w-md w-full mx-auto">
            
            {/* Greeting Header */}
            <div className="mb-8">
              <span className="text-xs font-bold text-brand-blue/60 uppercase tracking-wider">Acceso Seguro</span>
              <h3 className="text-2xl sm:text-3xl font-black text-[#0B2535] tracking-tight mt-1">
                Iniciar Sesión
              </h3>
              <p className="text-gray-500 mt-1.5 text-sm">
                Ingresa con tu usuario y contraseña asignados.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              
              {/* Username field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block ml-1">
                  Usuario
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User size={18} className="text-gray-400 group-focus-within:text-brand-blue transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50/80 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all font-semibold text-gray-800 placeholder:text-gray-400 placeholder:font-normal text-sm shadow-sm hover:border-gray-200 outline-none"
                    placeholder="Tu nombre de usuario"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Contraseña
                  </label>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400 group-focus-within:text-brand-blue transition-colors" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3.5 bg-gray-50/80 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all font-semibold text-gray-800 placeholder:text-gray-400 placeholder:font-normal text-sm shadow-sm hover:border-gray-200 outline-none"
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-brand-blue transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 animate-fade-in">
                  <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600">
                    <Lock size={14} />
                  </div>
                  <p className="text-red-700 text-xs font-semibold">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#12435E] to-[#0A2738] hover:from-[#175375] hover:to-[#0F354D] text-white font-bold text-base shadow-[0_10px_25px_-5px_rgba(18,67,94,0.4)] hover:shadow-[0_15px_30px_-5px_rgba(18,67,94,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:hover:translate-y-0 group cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Verificando...</span>
                  </div>
                ) : (
                  <>
                    <span>Entrar al Sistema</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Help / WhatsApp Support */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500" />
                Conexión segura SSL
              </span>
              <span className="text-gray-400 font-medium flex items-center gap-1">
                <HelpCircle size={13} />
                Soporte JRS Cargo
              </span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
