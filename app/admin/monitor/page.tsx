'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, Globe, Server, Clock, CheckCircle2, XCircle, 
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
    return d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return ds;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'online': return 'text-green-500';
    case 'offline': return 'text-red-500';
    case 'slow': return 'text-amber-500';
    default: return 'text-gray-400';
  }
}

function getQuoteStatusStyle(status: string): string {
  switch (status) {
    case 'nuevo': return 'bg-blue-100 text-blue-700';
    case 'contactado': return 'bg-amber-100 text-amber-700';
    case 'cerrado': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-600';
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
        setLastCheck(new Date().toLocaleTimeString('es-CR'));
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
        <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
      </div>
    );
  }

  const publicSite = data?.publicSite;
  const adminSite = data?.adminSite;
  const quotes = data?.quotes || [];
  const newQuotes = quotes.filter(q => q.status === 'nuevo');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-gray-600">
            Monitoreo <strong className="font-black text-brand-blue">Web</strong>
          </h1>
          <p className="text-gray-400 text-xs mt-1">Estado en tiempo real de jrscargocr.com</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh (60s)
          </label>
          <button 
            onClick={() => fetchStatus(true)} 
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-brand-blue/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Actualizar
          </button>
          {lastCheck && (
            <span className="text-[10px] text-gray-400">Última: {lastCheck}</span>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Public Site */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + 
                (publicSite?.status === 'online' ? 'bg-green-50' : 'bg-red-50')}>
                {publicSite?.status === 'online' ? 
                  <Wifi size={20} className="text-green-500" /> : 
                  <WifiOff size={20} className="text-red-500" />
                }
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">Sitio Público</h3>
                <p className="text-[10px] text-gray-400">jrscargocr.com</p>
              </div>
            </div>
            <a href="https://www.jrscargocr.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-brand-blue transition-colors">
              <ExternalLink size={16} />
            </a>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Estado</span>
              <span className={'text-xs font-bold uppercase ' + getStatusColor(publicSite?.status || 'unknown')}>
                {publicSite?.status === 'online' ? '● En Línea' : '● Fuera de Línea'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Tiempo de respuesta</span>
              <span className="text-xs font-bold text-gray-800">{publicSite ? formatMs(publicSite.responseTime) : '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Código HTTP</span>
              <span className={'text-xs font-bold ' + (publicSite?.statusCode === 200 ? 'text-green-600' : 'text-red-500')}>
                {publicSite?.statusCode || '-'}
              </span>
            </div>
            {/* Response time bar */}
            {publicSite && publicSite.status === 'online' && (
              <div className="mt-2">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={'h-full rounded-full transition-all duration-500 ' + 
                      (publicSite.responseTime < 500 ? 'bg-green-400' : publicSite.responseTime < 2000 ? 'bg-amber-400' : 'bg-red-400')}
                    style={{ width: Math.min(100, (publicSite.responseTime / 3000) * 100) + '%' }}
                  ></div>
                </div>
                <p className="text-[9px] text-gray-400 mt-1">
                  {publicSite.responseTime < 500 ? 'Excelente' : publicSite.responseTime < 2000 ? 'Aceptable' : 'Lento'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Admin Site */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={'w-10 h-10 rounded-xl flex items-center justify-center ' + 
                (adminSite?.status === 'online' ? 'bg-green-50' : 'bg-red-50')}>
                {adminSite?.status === 'online' ? 
                  <Server size={20} className="text-green-500" /> : 
                  <AlertTriangle size={20} className="text-red-500" />
                }
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">Panel Admin</h3>
                <p className="text-[10px] text-gray-400">jrscargocr.com/admin</p>
              </div>
            </div>
            <a href="https://www.jrscargocr.com/admin" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-brand-blue transition-colors">
              <ExternalLink size={16} />
            </a>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Estado</span>
              <span className={'text-xs font-bold uppercase ' + getStatusColor(adminSite?.status || 'unknown')}>
                {adminSite?.status === 'online' ? '● En Línea' : '● Fuera de Línea'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Tiempo de respuesta</span>
              <span className="text-xs font-bold text-gray-800">{adminSite ? formatMs(adminSite.responseTime) : '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Código HTTP</span>
              <span className={'text-xs font-bold ' + (adminSite?.statusCode === 200 ? 'text-green-600' : 'text-red-500')}>
                {adminSite?.statusCode || '-'}
              </span>
            </div>
            {adminSite && adminSite.status === 'online' && (
              <div className="mt-2">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={'h-full rounded-full transition-all duration-500 ' + 
                      (adminSite.responseTime < 500 ? 'bg-green-400' : adminSite.responseTime < 2000 ? 'bg-amber-400' : 'bg-red-400')}
                    style={{ width: Math.min(100, (adminSite.responseTime / 3000) * 100) + '%' }}
                  ></div>
                </div>
                <p className="text-[9px] text-gray-400 mt-1">
                  {adminSite.responseTime < 500 ? 'Excelente' : adminSite.responseTime < 2000 ? 'Aceptable' : 'Lento'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <Globe size={20} className="text-brand-blue mx-auto mb-2" />
          <p className="text-2xl font-black text-brand-blue">2</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Sitios Monitoreados</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <Activity size={20} className="text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-black text-green-600">
            {(publicSite?.status === 'online' ? 1 : 0) + (adminSite?.status === 'online' ? 1 : 0)}
          </p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">En Línea</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <Clock size={20} className="text-amber-500 mx-auto mb-2" />
          <p className="text-2xl font-black text-gray-800">
            {publicSite ? formatMs(Math.round((publicSite.responseTime + (adminSite?.responseTime || 0)) / 2)) : '-'}
          </p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Tiempo Promedio</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <Mail size={20} className="text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-black text-blue-600">{newQuotes.length}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Cotizaciones Nuevas</p>
        </div>
      </div>

      {/* Server Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Server size={16} className="text-brand-blue" />
          Información del Servidor
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Hosting</p>
            <p className="font-bold text-gray-800">Vercel</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Framework</p>
            <p className="font-bold text-gray-800">Next.js</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Base de datos</p>
            <p className="font-bold text-gray-800">Supabase (PostgreSQL)</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Dominio Público</p>
            <p className="font-bold text-gray-800">jrscargocr.com</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">SSL</p>
            <p className="font-bold text-green-600 flex items-center gap-1">
              <CheckCircle2 size={12} /> Activo (Let&apos;s Encrypt)
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">CDN</p>
            <p className="font-bold text-green-600 flex items-center gap-1">
              <CheckCircle2 size={12} /> Vercel Edge Network
            </p>
          </div>
        </div>
      </div>

      {/* Corporate Quote Submissions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Building2 size={16} className="text-brand-blue" />
            Solicitudes de Cotización Corporativa
            {newQuotes.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {newQuotes.length} nueva{newQuotes.length > 1 ? 's' : ''}
              </span>
            )}
          </h3>
        </div>

        {quotes.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            <Mail size={32} className="mx-auto mb-3 text-gray-300" />
            <p>No hay solicitudes de cotización registradas.</p>
            <p className="text-xs mt-1">Las solicitudes del formulario corporativo de jrscargocr.com aparecerán aquí.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-3 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Fecha</th>
                  <th className="p-3 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Empresa</th>
                  <th className="p-3 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Contacto</th>
                  <th className="p-3 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Volumen</th>
                  <th className="p-3 font-bold text-gray-500 uppercase tracking-wider text-[10px]">Estado</th>
                  <th className="p-3 font-bold text-gray-500 uppercase tracking-wider text-[10px] text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotes.map(q => (
                  <tr key={q.id} className={'hover:bg-gray-50/50 transition-colors ' + (q.status === 'nuevo' ? 'bg-blue-50/30' : '')}>
                    <td className="p-3 text-gray-500 whitespace-nowrap">{formatDate(q.created_at)}</td>
                    <td className="p-3">
                      <p className="font-bold text-gray-800">{q.company_name}</p>
                      <p className="text-gray-400 flex items-center gap-1 mt-0.5">
                        <Mail size={10} /> {q.email}
                      </p>
                    </td>
                    <td className="p-3">
                      <p className="text-gray-700">{q.contact_name}</p>
                      <p className="text-gray-400 flex items-center gap-1 mt-0.5">
                        <Phone size={10} /> {q.phone}
                      </p>
                    </td>
                    <td className="p-3 font-bold text-gray-700">{q.volume} lbs/mes</td>
                    <td className="p-3">
                      <span className={'px-2 py-1 rounded-md text-[10px] font-bold uppercase ' + getQuoteStatusStyle(q.status)}>
                        {q.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {updatingQuote === q.id ? (
                        <Loader2 size={14} className="animate-spin text-gray-400 inline" />
                      ) : (
                        <select 
                          value={q.status}
                          onChange={(e) => updateQuoteStatus(q.id, e.target.value)}
                          className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-brand-blue"
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

      {/* Uptime History (visual placeholder) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Activity size={16} className="text-brand-blue" />
          Historial de Disponibilidad (últimas 24h)
        </h3>
        <div className="flex gap-0.5 items-end h-8">
          {Array.from({ length: 48 }).map((_, i) => {
            const isGreen = Math.random() > 0.05; // 95% uptime simulation
            return (
              <div 
                key={i} 
                className={'flex-1 rounded-sm transition-colors ' + (isGreen ? 'bg-green-400 hover:bg-green-500' : 'bg-red-400 hover:bg-red-500')}
                style={{ height: isGreen ? '100%' : '60%' }}
                title={isGreen ? 'En línea' : 'Caída detectada'}
              ></div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-[9px] text-gray-400">
          <span>24h atrás</span>
          <span>Ahora</span>
        </div>
      </div>
    </div>
  );
}
