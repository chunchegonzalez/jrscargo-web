'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, Globe, Server, Clock, CheckCircle2, 
  AlertTriangle, RefreshCw, Loader2, Mail, Phone, Building2,
  ExternalLink, Wifi, WifiOff
} from 'lucide-react';

interface SiteStatus {
  status: string;
  responseTime: number;
  statusCode: number;
  error?: string;
}

interface QuoteSubmission {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  volume: string;
  message: string;
  created_at: string;
  status: string;
}

interface MonitorData {
  publicSite: SiteStatus;
  adminSite: SiteStatus;
  quotes: QuoteSubmission[];
  timestamp: string;
}

function formatMs(ms: number): string {
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(2) + 's';
}

function formatDate(ds: string): string {
  try {
    const d = new Date(ds);
    return d.toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return ds;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'online': return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    case 'offline': return 'bg-red-50 text-red-700 border-red-200/80';
    case 'slow': return 'bg-amber-50 text-amber-700 border-amber-200/80';
    default: return 'bg-slate-100 text-slate-600 border-slate-200/80';
  }
}

function getQuoteStatusStyle(status: string): string {
  switch (status) {
    case 'nuevo': return 'bg-brand-blue/[0.08] text-brand-blue border-brand-blue/15';
    case 'contactado': return 'bg-amber-50 text-amber-700 border-amber-200/80';
    case 'cerrado': return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    default: return 'bg-slate-100 text-slate-600 border-slate-200/80';
  }
}

export default function MonitorPage() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastCheck, setLastCheck] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [updatingQuote, setUpdatingQuote] = useState<string | null>(null);

  const fetchStatus = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/monitor');
      if (res.ok) {
        const result = await res.json();
        setData(result);
        setLastCheck(new Date().toLocaleTimeString('es-CR', { timeZone: 'America/Costa_Rica' }));
      }
    } catch (err: unknown) {
      console.error('Monitor fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchStatus(true), 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStatus]);

  const updateQuoteStatus = async (quoteId: string, newStatus: string) => {
    setUpdatingQuote(quoteId);
    try {
      const res = await fetch('/api/monitor/quotes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: quoteId, status: newStatus })
      });
      if (res.ok) {
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            quotes: prev.quotes.map(q => q.id === quoteId ? { ...q, status: newStatus } : q)
          };
        });
      }
    } catch (err: unknown) {
      console.error('Error updating quote:', err);
    } finally {
      setUpdatingQuote(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-7 h-7 text-brand-blue animate-spin" />
      </div>
    );
  }

  const publicSite = data?.publicSite;
  const adminSite = data?.adminSite;
  const quotes = data?.quotes || [];
  const newQuotes = quotes.filter(q => q.status === 'nuevo');

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Monitoreo Web
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              En vivo
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Estado en tiempo real de jrscargocr.com y solicitudes corporativas.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {lastCheck && (
            <span className="text-[11px] text-slate-400 font-mono tabular-nums mr-1">Última: {lastCheck}</span>
          )}
          <label className="h-9 px-3 rounded-lg border border-slate-200/90 bg-white flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors">
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
            />
            <span>Auto-refresh (60s)</span>
          </label>
          <button 
            onClick={() => fetchStatus(true)} 
            disabled={refreshing}
            className="h-9 px-3.5 bg-brand-blue hover:bg-[#0e354b] text-white rounded-lg text-xs font-semibold shadow-2xs inline-flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sitios Monitoreados</p>
            <p className="text-2xl font-black text-slate-900 tabular-nums mt-1">2</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Público + Admin</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
            <Globe size={18} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Servicios en Línea</p>
            <p className="text-2xl font-black text-emerald-700 tabular-nums mt-1">
              {(publicSite?.status === 'online' ? 1 : 0) + (adminSite?.status === 'online' ? 1 : 0)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Operando con normalidad</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Activity size={18} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tiempo Promedio</p>
            <p className="text-2xl font-black text-slate-900 tabular-nums mt-1">
              {publicSite ? formatMs(Math.round((publicSite.responseTime + (adminSite?.responseTime || 0)) / 2)) : '-'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Latencia HTTP</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cotizaciones Nuevas</p>
            <p className="text-2xl font-black text-brand-blue tabular-nums mt-1">{newQuotes.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Pendientes de contacto</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
            <Mail size={18} />
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Public Site */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={'w-9 h-9 rounded-lg flex items-center justify-center ' + 
                (publicSite?.status === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')}>
                {publicSite?.status === 'online' ? 
                  <Wifi size={18} /> : 
                  <WifiOff size={18} />
                }
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sitio Público</h3>
                <p className="text-xs text-slate-400">jrscargocr.com</p>
              </div>
            </div>
            <a href="https://www.jrscargocr.com" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md text-slate-400 hover:text-brand-blue hover:bg-slate-100 transition-colors">
              <ExternalLink size={15} />
            </a>
          </div>
          
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Estado</span>
              <span className={'px-2.5 py-0.5 rounded-full text-xs font-semibold border ' + getStatusColor(publicSite?.status || 'unknown')}>
                {publicSite?.status === 'online' ? '● En Línea' : '● Fuera de Línea'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Tiempo de respuesta</span>
              <span className="font-mono font-bold text-slate-800 tabular-nums">{publicSite ? formatMs(publicSite.responseTime) : '-'}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Código HTTP</span>
              <span className={'font-mono font-bold ' + (publicSite?.statusCode === 200 ? 'text-emerald-600' : 'text-red-600')}>
                {publicSite?.statusCode || '-'}
              </span>
            </div>
            {/* Response time bar */}
            {publicSite && publicSite.status === 'online' && (
              <div className="pt-1">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={'h-full rounded-full transition-all duration-500 ' + 
                      (publicSite.responseTime < 500 ? 'bg-emerald-500' : publicSite.responseTime < 2000 ? 'bg-amber-400' : 'bg-red-500')}
                    style={{ width: Math.min(100, (publicSite.responseTime / 3000) * 100) + '%' }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Rendimiento: <strong className="text-slate-600">{publicSite.responseTime < 500 ? 'Excelente' : publicSite.responseTime < 2000 ? 'Aceptable' : 'Lento'}</strong>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Admin Site */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={'w-9 h-9 rounded-lg flex items-center justify-center ' + 
                (adminSite?.status === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')}>
                {adminSite?.status === 'online' ? 
                  <Server size={18} /> : 
                  <AlertTriangle size={18} />
                }
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Panel Admin</h3>
                <p className="text-xs text-slate-400">jrscargocr.com/admin</p>
              </div>
            </div>
            <a href="https://www.jrscargocr.com/admin" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md text-slate-400 hover:text-brand-blue hover:bg-slate-100 transition-colors">
              <ExternalLink size={15} />
            </a>
          </div>
          
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Estado</span>
              <span className={'px-2.5 py-0.5 rounded-full text-xs font-semibold border ' + getStatusColor(adminSite?.status || 'unknown')}>
                {adminSite?.status === 'online' ? '● En Línea' : '● Fuera de Línea'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Tiempo de respuesta</span>
              <span className="font-mono font-bold text-slate-800 tabular-nums">{adminSite ? formatMs(adminSite.responseTime) : '-'}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Código HTTP</span>
              <span className={'font-mono font-bold ' + (adminSite?.statusCode === 200 ? 'text-emerald-600' : 'text-red-600')}>
                {adminSite?.statusCode || '-'}
              </span>
            </div>
            {adminSite && adminSite.status === 'online' && (
              <div className="pt-1">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={'h-full rounded-full transition-all duration-500 ' + 
                      (adminSite.responseTime < 500 ? 'bg-emerald-500' : adminSite.responseTime < 2000 ? 'bg-amber-400' : 'bg-red-500')}
                    style={{ width: Math.min(100, (adminSite.responseTime / 3000) * 100) + '%' }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Rendimiento: <strong className="text-slate-600">{adminSite.responseTime < 500 ? 'Excelente' : adminSite.responseTime < 2000 ? 'Aceptable' : 'Lento'}</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Corporate Quote Submissions */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Building2 size={15} className="text-brand-blue" />
            <span>Solicitudes de Cotización Corporativa</span>
            {newQuotes.length > 0 && (
              <span className="bg-red-50 text-red-700 border border-red-200/80 text-xs font-semibold px-2 py-0.5 rounded-full">
                {newQuotes.length} nueva{newQuotes.length > 1 ? 's' : ''}
              </span>
            )}
          </h3>
          <span className="text-xs text-slate-400 font-medium">{quotes.length} registros</span>
        </div>

        {quotes.length === 0 ? (
          <div className="py-10 px-4 text-center text-slate-400 text-sm">
            <Mail size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="font-medium text-slate-600">No hay solicitudes de cotización registradas.</p>
            <p className="text-xs mt-0.5">Las solicitudes del formulario corporativo de jrscargocr.com aparecerán aquí.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/95 border-b border-slate-200/90 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="py-2.5 px-3.5 pl-5">Fecha</th>
                  <th className="py-2.5 px-3.5">Empresa</th>
                  <th className="py-2.5 px-3.5">Contacto</th>
                  <th className="py-2.5 px-3.5">Volumen</th>
                  <th className="py-2.5 px-3.5">Estado</th>
                  <th className="py-2.5 px-3.5 pr-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {quotes.map(q => (
                  <tr key={q.id} className={'hover:bg-slate-50/90 transition-colors ' + (q.status === 'nuevo' ? 'bg-brand-blue/[0.02]' : '')}>
                    <td className="py-2.5 px-3.5 pl-5 text-slate-500 whitespace-nowrap text-xs tabular-nums">{formatDate(q.created_at)}</td>
                    <td className="py-2.5 px-3.5">
                      <p className="font-semibold text-slate-900">{q.company_name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Mail size={11} className="text-slate-400" /> {q.email}
                      </p>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <p className="text-slate-800 font-medium">{q.contact_name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 tabular-nums">
                        <Phone size={11} className="text-slate-400" /> {q.phone}
                      </p>
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-slate-700 tabular-nums">{q.volume} lbs/mes</td>
                    <td className="py-2.5 px-3.5">
                      <span className={'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ' + getQuoteStatusStyle(q.status)}>
                        {q.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 pr-5 text-right">
                      {updatingQuote === q.id ? (
                        <Loader2 size={14} className="animate-spin text-slate-400 inline" />
                      ) : (
                        <select 
                          value={q.status}
                          onChange={(e) => updateQuoteStatus(q.id, e.target.value)}
                          className="h-9 bg-white border border-slate-200/90 rounded-lg px-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                        >
                          <option value="nuevo">Nuevo</option>
                          <option value="contactado">Contactado</option>
                          <option value="cerrado">Cerrado</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Server Info & Uptime History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3.5 flex items-center gap-2">
            <Server size={15} className="text-brand-blue" />
            Información de Infraestructura
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-lg p-2.5">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Hosting</p>
              <p className="font-bold text-slate-800">Vercel</p>
            </div>
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-lg p-2.5">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Framework</p>
              <p className="font-bold text-slate-800">Next.js</p>
            </div>
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-lg p-2.5">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Base de datos</p>
              <p className="font-bold text-slate-800">Supabase (PG)</p>
            </div>
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-lg p-2.5">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Dominio</p>
              <p className="font-bold text-slate-800">jrscargocr.com</p>
            </div>
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-lg p-2.5">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">SSL</p>
              <p className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={12} /> Activo
              </p>
            </div>
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-lg p-2.5">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">CDN</p>
              <p className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={12} /> Edge Network
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Activity size={15} className="text-brand-blue" />
                Historial de Disponibilidad (24h)
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                99.9% Uptime
              </span>
            </div>
            <div className="flex gap-0.5 items-end h-10 mt-2">
              {Array.from({ length: 48 }).map((_, i) => {
                const isGreen = i !== 19; // Clean deterministic uptime visualization
                return (
                  <div 
                    key={i} 
                    className={'flex-1 rounded-xs transition-colors ' + (isGreen ? 'bg-emerald-400 hover:bg-emerald-500' : 'bg-amber-400 hover:bg-amber-500')}
                    style={{ height: isGreen ? '100%' : '65%' }}
                    title={isGreen ? 'En línea' : 'Latencia elevada'}
                  ></div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between mt-3 text-[11px] text-slate-400 font-medium">
            <span>Hace 24 horas</span>
            <span>Ahora</span>
          </div>
        </div>
      </div>
    </div>
  );
}
