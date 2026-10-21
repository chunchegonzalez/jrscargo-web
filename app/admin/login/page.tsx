'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Package,
  Zap,
  CheckCircle2,
  Plane,
  Ship,
  ScanBarcode,
  Globe,
  Clock,
  AlertCircle,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

const SHOWCASE_SLIDES = [
  {
    id: 'wms',
    badge: 'WMS • Escáner en Tiempo Real',
    title: 'Control Total de',
    highlight: 'Bodega & Paquetes',
    description:
      'Recepción masiva con lector de código de barras, sincronización directa con Miami y trazabilidad completa hasta la entrega en Costa Rica.',
    metrics: [
      { label: 'Lectura Pistola', value: '< 0.2s', sub: 'Detección USPS / UPS / FedEx' },
      { label: 'Sincronización', value: '100% Live', sub: 'Worldbox + Inventario CR' }
    ]
  },
  {
    id: 'billing',
    badge: 'Finanzas • Cobros Inteligentes',
    title: 'Facturación &',
    highlight: 'Cuentas por Cobrar',
    description:
      'Emisión instantánea de comprobantes en PDF, envío automático a los 4 días, control de saldos a favor y estados de cuenta interactivos.',
    metrics: [
      { label: 'Automatización', value: 'Regla 4 Días', sub: 'Envío inteligente por correo' },
      { label: 'Multimoneda', value: 'USD / CRC', sub: 'Conversión automática T.C.' }
    ]
  },
  {
    id: 'routes',
    badge: 'Red Logística • 4 Orígenes',
    title: 'Operación Global',
    highlight: 'Miami, España & China',
    description:
      'Monitoreo centralizado de carga aérea y marítima consolidada con notificaciones automáticas y portal de estado de cuenta para clientes.',
    metrics: [
      { label: 'Rutas Activas', value: 'MIA • MAD • CHN', sub: 'Aéreo y Marítimo Semanal' },
      { label: 'Seguridad', value: 'SSL 256-bit', sub: 'Acceso encriptado por rol' }
    ]
  }
];

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberUser, setRememberUser] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [crTime, setCrTime] = useState('');
  const [greeting, setGreeting] = useState('Bienvenido');
  const [focusedField, setFocusedField] = useState<'user' | 'pass' | null>(null);

  const router = useRouter();

  // Load remembered username & set Costa Rica live clock
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Panel de JRS';
    }
    try {
      const savedUser = localStorage.getItem('jrs_saved_username');
      if (savedUser) {
        setUsername(savedUser);
      }
    } catch {
      // ignore storage errors
    }

    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-CR', {
        timeZone: 'America/Costa_Rica',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      setCrTime(timeStr);

      const hourStr = now.toLocaleTimeString('en-US', {
        timeZone: 'America/Costa_Rica',
        hour: 'numeric',
        hour12: false
      });
      const hour = parseInt(hourStr, 10);
      if (hour >= 5 && hour < 12) setGreeting('Buenos días');
      else if (hour >= 12 && hour < 19) setGreeting('Buenas tardes');
      else setGreeting('Buenas noches');
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-advance showcase slides every 5 seconds
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % SHOWCASE_SLIDES.length);
    }, 5000);
    return () => clearInterval(slideTimer);
  }, []);

  const checkCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (rememberUser && username.trim()) {
        localStorage.setItem('jrs_saved_username', username.trim());
      } else {
        localStorage.removeItem('jrs_saved_username');
      }
    } catch {
      // ignore storage errors
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
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

  const currentSlide = SHOWCASE_SLIDES[activeSlide];

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#06131C] relative overflow-hidden selection:bg-brand-yellow selection:text-brand-blue">
      {/* Dynamic Ambient Mesh Background */}
      <div className="absolute -top-48 -left-48 w-[520px] h-[520px] bg-[#12435E]/55 rounded-full blur-[135px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/3 -right-44 w-[460px] h-[460px] bg-[#F5A623]/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute -bottom-48 left-1/4 w-[580px] h-[580px] bg-[#0D3148]/60 rounded-full blur-[160px] pointer-events-none" />

      {/* Subtle Tech Grid Overlay */}
      <div
        className="absolute inset-0 opacity-[0.045] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '44px 44px'
        }}
      />

      {/* Main Container Card */}
      <div className="relative w-full max-w-[1100px] flex flex-col lg:flex-row overflow-hidden rounded-[2.5rem] shadow-[0_32px_90px_-15px_rgba(0,0,0,0.75)] border border-white/15 bg-white/95 backdrop-blur-2xl z-10">
        {/* ==================== LEFT PANEL: DYNAMIC COMMAND CENTER ==================== */}
        <div className="relative w-full lg:w-[51%] bg-gradient-to-br from-[#071824] via-[#0C293D] to-[#12435E] flex flex-col justify-between p-8 sm:p-11 lg:p-12 overflow-hidden text-white">
          {/* Decorative glowing arcs */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-brand-yellow/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 -left-28 w-72 h-72 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />

          {/* Animated SVG Route Lines in Background */}
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.12] pointer-events-none"
            viewBox="0 0 600 600"
            fill="none"
          >
            <path
              d="M-40 420 C 140 380, 240 160, 640 120"
              stroke="url(#gradLine1)"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
            <path
              d="M-20 500 C 200 460, 340 280, 640 260"
              stroke="url(#gradLine2)"
              strokeWidth="1.5"
            />
            <circle cx="195" cy="315" r="4" fill="#F5A623" />
            <circle cx="420" cy="168" r="5" fill="#38BDF8" />
            <defs>
              <linearGradient id="gradLine1" x1="0" y1="0" x2="600" y2="0" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F5A623" stopOpacity="0" />
                <stop offset="0.5" stopColor="#F5A623" />
                <stop offset="1" stopColor="#38BDF8" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="gradLine2" x1="0" y1="0" x2="600" y2="0" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38BDF8" stopOpacity="0" />
                <stop offset="0.5" stopColor="#38BDF8" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Top Bar: Logo + Live Status Telemetry */}
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="bg-white p-2.5 rounded-2xl shadow-[0_8px_25px_rgba(0,0,0,0.25)] border border-white/30">
                <Image
                  src="/logo.png"
                  alt="JRS Cargo"
                  width={38}
                  height={38}
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-black text-xl tracking-tight leading-none text-white">JRS CARGO</h1>
                  <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-brand-yellow/20 text-brand-yellow rounded border border-brand-yellow/30">
                    PRO
                  </span>
                </div>
                <p className="text-brand-yellow text-[10px] font-extrabold uppercase tracking-[0.25em] mt-1">
                  Costa Rica
                </p>
              </div>
            </div>

            {/* Live Status & CR Clock */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/40 border border-white/10 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-200 tracking-wide">
                {crTime ? `SJO ${crTime}` : 'ONLINE'}
              </span>
            </div>
          </div>

          {/* Center Dynamic Carousel Showcase */}
          <div className="relative z-10 my-8 sm:my-10">
            {/* Dynamic Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-brand-yellow font-bold text-[11px] uppercase tracking-wider mb-5 shadow-sm">
              <Sparkles size={13} className="text-brand-yellow" />
              <span>{currentSlide.badge}</span>
            </div>

            {/* Dynamic Headline */}
            <div className="min-h-[165px] sm:min-h-[155px] transition-all duration-500">
              <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-black leading-[1.12] tracking-tight text-white mb-3.5">
                {currentSlide.title} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow via-amber-300 to-orange-400">
                  {currentSlide.highlight}
                </span>
              </h2>

              <p className="text-slate-300/95 text-sm sm:text-[15px] leading-relaxed font-normal max-w-md">
                {currentSlide.description}
              </p>
            </div>

            {/* Dynamic Telemetry Metric Cards */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              {currentSlide.metrics.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-md hover:bg-white/[0.1] transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                      {m.label}
                    </span>
                    {idx === 0 ? (
                      <ScanBarcode size={14} className="text-brand-yellow" />
                    ) : (
                      <Zap size={14} className="text-sky-300" />
                    )}
                  </div>
                  <div className="text-base sm:text-lg font-black text-white tracking-tight">{m.value}</div>
                  <div className="text-[11px] text-slate-300/80 truncate mt-0.5">{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Live Route Activity Strip */}
            <div className="mt-4 p-3 rounded-2xl bg-slate-950/35 border border-white/10 backdrop-blur-md flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-brand-yellow/15 border border-brand-yellow/30 flex items-center justify-center text-brand-yellow shrink-0">
                  <Plane size={15} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-white truncate">
                      Hubs Activos: MIA • MAD • CHN
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 truncate">
                    Sincronización automática de paquetes y facturación
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                  Activo
                </span>
              </div>
            </div>

            {/* Interactive Slide Selector Dots */}
            <div className="flex items-center gap-2 mt-6">
              {SHOWCASE_SLIDES.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  aria-label={`Ver módulo ${s.badge}`}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    activeSlide === idx
                      ? 'w-8 bg-brand-yellow shadow-[0_0_10px_rgba(245,166,35,0.6)]'
                      : 'w-2.5 bg-white/25 hover:bg-white/45'
                  }`}
                />
              ))}
              <span className="ml-auto text-[11px] text-white/50 font-medium">
                0{activeSlide + 1} / 0{SHOWCASE_SLIDES.length}
              </span>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="relative z-10 flex items-center justify-between text-xs text-white/50 pt-4 border-t border-white/10">
            <span className="font-medium">&copy; {new Date().getFullYear()} JRS Cargo S.A.</span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300/90 font-semibold">
                <ShieldCheck size={13} /> WMS Cloud
              </span>
              <span className="text-[11px] font-mono text-white/40">v2.5 Pro</span>
            </div>
          </div>
        </div>

        {/* ==================== RIGHT PANEL: PRO LOGIN FORM ==================== */}
        <div className="w-full lg:w-[49%] p-8 sm:p-12 lg:p-14 flex flex-col justify-between bg-white relative">
          {/* Top Subtle Navigation Link */}
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
              <Clock size={12} className="text-brand-blue" />
              <span>{greeting}</span>
            </div>

            <Link
              href="/"
              className="text-xs font-bold text-slate-400 hover:text-brand-blue transition-colors inline-flex items-center gap-1"
            >
              <span>Ir al sitio web</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>

          <div className="max-w-md w-full mx-auto my-auto">
            {/* Greeting Header */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-brand-blue uppercase tracking-widest mb-1.5">
                <ShieldCheck size={14} className="text-brand-yellow" />
                <span>Panel de JRS • Acceso Autorizado</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-[#0B2535] tracking-tight">
                Iniciar Sesión
              </h3>
              <p className="text-gray-500 mt-1.5 text-sm">
                Ingresa tus credenciales operativas para acceder al sistema.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Username field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                    Usuario
                  </label>
                  {username.trim().length > 0 && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Listo
                    </span>
                  )}
                </div>
                <div
                  className={`relative rounded-2xl transition-all duration-200 ${
                    focusedField === 'user' ? 'ring-4 ring-brand-blue/10' : ''
                  }`}
                >
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User
                      size={18}
                      className={`transition-colors ${
                        focusedField === 'user' ? 'text-brand-blue' : 'text-gray-400'
                      }`}
                    />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onFocus={() => setFocusedField('user')}
                    onBlur={() => setFocusedField(null)}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50/90 border-2 border-slate-200/80 rounded-2xl focus:bg-white focus:border-brand-blue transition-all font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-normal text-sm outline-none"
                    placeholder="Ej. Jose Gonzalez"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                    Contraseña
                  </label>
                  {capsLockOn && (
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                      <AlertCircle size={11} /> Bloq Mayús activo
                    </span>
                  )}
                </div>
                <div
                  className={`relative rounded-2xl transition-all duration-200 ${
                    focusedField === 'pass' ? 'ring-4 ring-brand-blue/10' : ''
                  }`}
                >
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock
                      size={18}
                      className={`transition-colors ${
                        focusedField === 'pass' ? 'text-brand-blue' : 'text-gray-400'
                      }`}
                    />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onFocus={() => setFocusedField('pass')}
                    onBlur={() => setFocusedField(null)}
                    onKeyUp={checkCapsLock}
                    onKeyDown={checkCapsLock}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3.5 bg-slate-50/90 border-2 border-slate-200/80 rounded-2xl focus:bg-white focus:border-brand-blue transition-all font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-normal text-sm outline-none"
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-brand-blue transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember Username Toggle */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={rememberUser}
                    onChange={e => setRememberUser(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                      rememberUser
                        ? 'bg-brand-blue border-brand-blue text-white'
                        : 'bg-white border-slate-300 group-hover:border-brand-blue'
                    }`}
                  >
                    {rememberUser && (
                      <svg viewBox="0 0 12 10" className="w-2.5 h-2.5 fill-none stroke-current stroke-[2.5]">
                        <polyline points="1.5 6 4.5 9 10.5 1" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                    Recordar mi usuario en este equipo
                  </span>
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 animate-fade-in">
                  <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0 text-red-600">
                    <AlertCircle size={16} />
                  </div>
                  <p className="text-red-700 text-xs font-bold leading-snug">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="relative overflow-hidden w-full py-4 rounded-2xl bg-gradient-to-r from-[#0B2535] via-[#12435E] to-[#0B2535] bg-[length:200%_100%] hover:bg-right text-white font-black text-sm sm:text-base shadow-[0_12px_30px_-6px_rgba(18,67,94,0.45)] hover:shadow-[0_18px_35px_-6px_rgba(18,67,94,0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2.5 mt-4 disabled:opacity-70 disabled:hover:translate-y-0 group cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-brand-yellow rounded-full animate-spin" />
                    <span>Autenticando acceso...</span>
                  </div>
                ) : (
                  <>
                    <span>Entrar al Panel de JRS</span>
                    <ArrowRight
                      size={18}
                      className="text-brand-yellow group-hover:translate-x-1 transition-transform"
                    />
                  </>
                )}
              </button>
            </form>

            {/* Quick Modules Pills Preview */}
            <div className="mt-7 pt-6 border-t border-slate-100">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-3 text-center">
                Módulos Integrados en tu Sesión
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-600">
                  <Package size={13} className="text-brand-blue shrink-0" />
                  <span className="truncate">Bodega CR</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-600">
                  <Zap size={13} className="text-amber-500 shrink-0" />
                  <span className="truncate">Facturación</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-600">
                  <Globe size={13} className="text-emerald-600 shrink-0" />
                  <span className="truncate">Tracking</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security Footer */}
          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-slate-500">
              <CheckCircle2 size={14} className="text-emerald-500" />
              Conexión encriptada SSL
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
              <Ship size={13} className="text-brand-blue/70" />
              JRS Logistics System
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
