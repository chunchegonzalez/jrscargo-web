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
  CheckCircle2,
  Clock,
  AlertCircle,
  Smartphone,
  RefreshCw,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

const STATUS_TICKER = [
  'Bodega CR • Escáner Listo',
  'Sincronización MIA • MAD • CHN',
  'Facturación & Correos Automáticos'
];

interface SavedDeviceProfile {
  username: string;
  token: string;
  savedAt: number;
}

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [savedProfile, setSavedProfile] = useState<SavedDeviceProfile | null>(null);
  const [useQuickAccess, setUseQuickAccess] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [crTime, setCrTime] = useState('');
  const [greeting, setGreeting] = useState('Bienvenido');
  const [focusedField, setFocusedField] = useState<'user' | 'pass' | null>(null);

  const router = useRouter();

  // 1. Auto-check active session + load saved mobile/device profile + live CR clock
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Panel de JRS';
    }

    // Check if user already has a valid session cookie -> auto-redirect to panel
    const verifyExistingSession = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            router.replace('/admin/bodega');
            return;
          }
        }
      } catch {
        // Ignore network errors and show login form
      } finally {
        setCheckingSession(false);
      }
    };

    verifyExistingSession();

    // Load saved quick-access profile or saved username
    try {
      const rawProfile = localStorage.getItem('jrs_device_quick_access');
      if (rawProfile) {
        const parsed = JSON.parse(rawProfile) as SavedDeviceProfile;
        if (parsed && parsed.username && parsed.token) {
          setSavedProfile(parsed);
          setUsername(parsed.username);
          setUseQuickAccess(true);
        }
      } else {
        const savedUser = localStorage.getItem('jrs_saved_username');
        if (savedUser) {
          setUsername(savedUser);
        }
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
    const clockTimer = setInterval(updateClock, 10000);
    const tickerTimer = setInterval(() => {
      setTickerIndex(prev => (prev + 1) % STATUS_TICKER.length);
    }, 3800);

    return () => {
      clearInterval(clockTimer);
      clearInterval(tickerTimer);
    };
  }, [router]);

  const checkCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const performLogin = async (loginUser: string, loginPass: string) => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUser.trim(),
          password: loginPass,
          remember: rememberDevice
        })
      });

      if (res.ok) {
        try {
          if (rememberDevice && loginUser.trim()) {
            localStorage.setItem('jrs_saved_username', loginUser.trim());
            const profile: SavedDeviceProfile = {
              username: loginUser.trim(),
              token: btoa(unescape(encodeURIComponent(loginPass))),
              savedAt: Date.now()
            };
            localStorage.setItem('jrs_device_quick_access', JSON.stringify(profile));
          } else {
            localStorage.removeItem('jrs_saved_username');
            localStorage.removeItem('jrs_device_quick_access');
          }
        } catch {
          // ignore storage errors
        }

        router.push('/admin/bodega');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Credenciales inválidas. Verifica tu usuario y contraseña.');
        setUseQuickAccess(false);
      }
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(username, password);
  };

  const handleQuickLogin = async () => {
    if (!savedProfile) return;
    try {
      const decodedPass = decodeURIComponent(escape(atob(savedProfile.token)));
      await performLogin(savedProfile.username, decodedPass);
    } catch {
      setUseQuickAccess(false);
    }
  };

  const handleSwitchAccount = () => {
    setUseQuickAccess(false);
    setSavedProfile(null);
    setPassword('');
    setError('');
    try {
      localStorage.removeItem('jrs_device_quick_access');
    } catch {
      // ignore
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-[#06131C] relative overflow-hidden selection:bg-brand-yellow selection:text-brand-blue">
      {/* Dynamic Ambient Glow Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#12435E]/60 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#F5A623]/15 rounded-full blur-[130px] pointer-events-none" />

      {/* Subtle Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Compact Centered Pro Card */}
      <div className="relative w-full max-w-[430px] rounded-[2rem] overflow-hidden shadow-[0_28px_80px_-12px_rgba(0,0,0,0.75)] border border-white/15 bg-white z-10 transition-all duration-300">
        {/* ==================== COMPACT DYNAMIC HEADER ==================== */}
        <div className="relative bg-gradient-to-br from-[#071824] via-[#0D2B3E] to-[#12435E] px-6 pt-6 pb-5 text-white overflow-hidden">
          <div className="absolute -top-16 -right-16 w-44 h-44 bg-brand-yellow/20 rounded-full blur-2xl pointer-events-none" />

          {/* Top Row: Brand + Live Clock */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-2xl shadow-md border border-white/20 shrink-0">
                <Image
                  src="/logo.png"
                  alt="JRS Cargo"
                  width={34}
                  height={34}
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-black text-lg tracking-tight leading-none text-white">
                    Panel de JRS
                  </h1>
                </div>
                <p className="text-brand-yellow text-[10px] font-extrabold uppercase tracking-[0.2em] mt-1">
                  JRS Cargo Costa Rica
                </p>
              </div>
            </div>

            {/* Live Status Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/45 border border-white/10 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-200">
                {crTime ? `CR ${crTime}` : 'ONLINE'}
              </span>
            </div>
          </div>

          {/* Dynamic Rotating Status Bar */}
          <div className="relative z-10 mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-200/90">
            <div className="flex items-center gap-1.5 font-semibold truncate">
              <Sparkles size={13} className="text-brand-yellow shrink-0 animate-pulse" />
              <span key={tickerIndex} className="truncate transition-opacity duration-300">
                {STATUS_TICKER[tickerIndex]}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {STATUS_TICKER.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === tickerIndex ? 'w-3.5 bg-brand-yellow' : 'w-1 bg-white/25'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ==================== LOGIN BODY ==================== */}
        <div className="p-6 sm:p-7 bg-white">
          {/* Greeting & Web Link Row */}
          <div className="flex items-center justify-between mb-5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
              <Clock size={12} className="text-brand-blue" />
              <span>{greeting}</span>
            </div>

            <Link
              href="/"
              className="text-xs font-bold text-slate-400 hover:text-brand-blue transition-colors inline-flex items-center gap-0.5"
            >
              <span>Sitio web</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>

          {checkingSession ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-slate-500">
              <div className="w-7 h-7 border-2 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
              <p className="text-xs font-bold">Verificando sesión activa...</p>
            </div>
          ) : useQuickAccess && savedProfile ? (
            /* ==================== 1-TAP MOBILE QUICK ACCESS MODE ==================== */
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-black text-[#0B2535] tracking-tight">
                  Acceso Rápido
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tu cuenta está vinculada en este dispositivo.
                </p>
              </div>

              {/* Saved User Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0B2535] to-[#12435E] text-brand-yellow font-black text-sm flex items-center justify-center shadow-sm shrink-0">
                    {getInitials(savedProfile.username)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-800 text-sm truncate">
                      {savedProfile.username}
                    </p>
                    <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                      <Smartphone size={11} /> Acceso automático listo
                    </p>
                  </div>
                </div>
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5">
                  <AlertCircle size={16} className="text-red-600 shrink-0" />
                  <p className="text-red-700 text-xs font-bold leading-snug">{error}</p>
                </div>
              )}

              {/* 1-Tap Login Button */}
              <button
                type="button"
                onClick={handleQuickLogin}
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#0B2535] via-[#12435E] to-[#0B2535] text-white font-black text-base shadow-[0_10px_25px_-5px_rgba(18,67,94,0.45)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-brand-yellow rounded-full animate-spin" />
                    <span>Ingresando...</span>
                  </div>
                ) : (
                  <>
                    <span>Continuar como {savedProfile.username.split(' ')[0]}</span>
                    <ArrowRight size={18} className="text-brand-yellow" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSwitchAccount}
                className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-brand-blue transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={12} />
                <span>Ingresar con otro usuario o contraseña</span>
              </button>
            </div>
          ) : (
            /* ==================== STANDARD SIMPLE & DYNAMIC LOGIN FORM ==================== */
            <div>
              <div className="mb-5">
                <h2 className="text-2xl font-black text-[#0B2535] tracking-tight">
                  Iniciar Sesión
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  Ingresa tus credenciales para entrar al panel.
                </p>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Username field */}
                <div className="space-y-1">
                  <label
                    htmlFor="username"
                    className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1 block"
                  >
                    Usuario
                  </label>
                  <div
                    className={`relative rounded-2xl transition-all duration-200 ${
                      focusedField === 'user' ? 'ring-4 ring-brand-blue/10' : ''
                    }`}
                  >
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User
                        size={18}
                        className={`transition-colors ${
                          focusedField === 'user' ? 'text-brand-blue' : 'text-slate-400'
                        }`}
                      />
                    </div>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      value={username}
                      onFocus={() => setFocusedField('user')}
                      onBlur={() => setFocusedField(null)}
                      onChange={e => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200/80 rounded-2xl focus:bg-white focus:border-brand-blue transition-all font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-normal text-base outline-none"
                      placeholder="Nombre de usuario"
                      autoComplete="username"
                      autoCapitalize="words"
                      enterKeyHint="next"
                      required
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center ml-1">
                    <label
                      htmlFor="password"
                      className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider"
                    >
                      Contraseña
                    </label>
                    {capsLockOn && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                        <AlertCircle size={10} /> Bloq Mayús
                      </span>
                    )}
                  </div>
                  <div
                    className={`relative rounded-2xl transition-all duration-200 ${
                      focusedField === 'pass' ? 'ring-4 ring-brand-blue/10' : ''
                    }`}
                  >
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock
                        size={18}
                        className={`transition-colors ${
                          focusedField === 'pass' ? 'text-brand-blue' : 'text-slate-400'
                        }`}
                      />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onFocus={() => setFocusedField('pass')}
                      onBlur={() => setFocusedField(null)}
                      onKeyUp={checkCapsLock}
                      onKeyDown={checkCapsLock}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-3.5 bg-slate-50 border-2 border-slate-200/80 rounded-2xl focus:bg-white focus:border-brand-blue transition-all font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-normal text-base outline-none"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      enterKeyHint="go"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-brand-blue transition-colors cursor-pointer"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Automatic Mobile Access / Remember Toggle */}
                <div className="pt-0.5">
                  <label className="inline-flex items-center gap-2.5 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      onChange={e => setRememberDevice(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                        rememberDevice
                          ? 'bg-brand-blue border-brand-blue text-white'
                          : 'bg-white border-slate-300 group-hover:border-brand-blue'
                      }`}
                    >
                      {rememberDevice && (
                        <svg viewBox="0 0 12 10" className="w-2.5 h-2.5 fill-none stroke-current stroke-[2.5]">
                          <polyline points="1.5 6 4.5 9 10.5 1" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                      Recordar acceso rápido en este celular / equipo
                    </span>
                  </label>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5">
                    <AlertCircle size={16} className="text-red-600 shrink-0" />
                    <p className="text-red-700 text-xs font-bold leading-snug">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#0B2535] via-[#12435E] to-[#0B2535] text-white font-black text-base shadow-[0_10px_25px_-5px_rgba(18,67,94,0.45)] hover:shadow-[0_15px_30px_-5px_rgba(18,67,94,0.6)] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-brand-yellow rounded-full animate-spin" />
                      <span>Ingresando...</span>
                    </div>
                  ) : (
                    <>
                      <span>Entrar al Panel</span>
                      <ArrowRight size={18} className="text-brand-yellow" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Minimal Security Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-500">
              <ShieldCheck size={13} className="text-emerald-500" />
              Acceso seguro SSL
            </span>
            <span className="font-mono text-slate-400">&copy; {new Date().getFullYear()} JRS Cargo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
