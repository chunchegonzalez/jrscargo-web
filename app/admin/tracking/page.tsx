'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Package,
  MapPin,
  Truck,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  FileText,
  ExternalLink,
  Plus,
  Plane,
  User,
  Scale,
  Image as ImageIcon,
  Check,
  Copy,
  X,
  ChevronDown,
  ChevronUp,
  Warehouse,
  ShieldCheck
} from 'lucide-react';
import { formatPackageWeightAndRate } from '@/lib/billing';

interface TrackingEvent {
  date: string;
  status: string;
  description: string;
}

interface TrackingPackage {
  tracking?: string;
  consignatario?: string;
  consignee?: string;
  client?: string;
  name?: string;
  weight?: number;
  weightUnit?: string;
  statusLabel?: string;
  fotos?: { id?: number | string; url: string }[];
  dimensions?: string;
  origin?: string;
  destination?: string;
  description?: string;
  pieces?: number;
  volumetricWeight?: number;
  declaredValue?: number;
  currency?: string;
  carrier?: string;
  service?: string;
  createdAt?: string;
  receivedAt?: string;
}

interface LocalItem {
  id: string;
  tracking_number: string;
  client_name: string;
  status: string;
  weight: number | null;
  received_date: string | null;
  created_at: string;
}

interface MatchedInvoice {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  currency?: string;
  issue_date?: string;
  client_name?: string;
  package_amount?: number | null;
  package_weight?: string | number | null;
  package_rate?: string | number | null;
  package_service?: string;
  package_tracking?: string;
}

function formatDate(ds: string | null | undefined): string {
  if (!ds) return 'N/A';
  try {
    const d = new Date(ds);
    if (isNaN(d.getTime())) return ds;
    return d.toLocaleDateString('es-CR', {
      timeZone: 'America/Costa_Rica',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'N/A';
  }
}

function formatShortStepDate(ds: string | null | undefined): string {
  if (!ds) return '';
  try {
    const d = new Date(ds);
    if (isNaN(d.getTime())) {
      return ds.length > 16 ? ds.slice(0, 16) : ds;
    }
    const day = d.toLocaleDateString('es-CR', {
      timeZone: 'America/Costa_Rica',
      day: 'numeric',
      month: 'short'
    }).replace('.', '');
    const time = d.toLocaleTimeString('es-CR', {
      timeZone: 'America/Costa_Rica',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return `${day}, ${time}`;
  } catch {
    return '';
  }
}

function getStatusStyle(status: string): { bg: string; text: string; border: string; dot: string; isDelivered: boolean } {
  const s = status.toLowerCase();
  if (s.includes('entregado') && !s.includes('por entregar')) {
    return {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200/90',
      dot: 'bg-emerald-500',
      isDelivered: true
    };
  }
  if (s.includes('por entregar')) {
    return {
      bg: 'bg-sky-50',
      text: 'text-brand-blue',
      border: 'border-sky-200/90',
      dot: 'bg-brand-blue',
      isDelivered: false
    };
  }
  if (s.includes('tránsito') || s.includes('transit') || s.includes('camino') || s.includes('aduana')) {
    return {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200/90',
      dot: 'bg-amber-500',
      isDelivered: false
    };
  }
  if (
    s.includes('bodega') ||
    s.includes('warehouse') ||
    s.includes('miami') ||
    s.includes('mia') ||
    s.includes('madrid') ||
    s.includes('españa') ||
    s.includes('china')
  ) {
    return {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200/90',
      dot: 'bg-blue-500',
      isDelivered: false
    };
  }
  return {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
    isDelivered: false
  };
}

function getTimelineIcon(status?: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('entregado') && !s.includes('por entregar')) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (s.includes('por entregar')) return <MapPin className="w-4 h-4 text-brand-blue" />;
  if (s.includes('transit') || s.includes('camino') || s.includes('tránsito')) return <Truck className="w-4 h-4 text-amber-500" />;
  if (s.includes('bodega') || s.includes('warehouse') || s.includes('recib')) return <MapPin className="w-4 h-4 text-blue-500" />;
  return <Package className="w-4 h-4 text-slate-400" />;
}

export default function TrackingPage() {
  const [trackingInput, setTrackingInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [showFullTimeline, setShowFullTimeline] = useState(false);
  const [recentTrackings, setRecentTrackings] = useState<string[]>([]);

  const [pkg, setPkg] = useState<TrackingPackage | null>(null);
  const [timeline, setTimeline] = useState<TrackingEvent[]>([]);
  const [localItem, setLocalItem] = useState<LocalItem | null>(null);
  const [matchedInvoice, setMatchedInvoice] = useState<MatchedInvoice | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jrs_recent_admin_trackings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setRecentTrackings(parsed.slice(0, 5));
        }
      } catch {
        // Ignore storage errors
      }
    }
  }, []);

  const saveRecentTracking = useCallback((num: string) => {
    if (typeof window === 'undefined' || !num) return;
    try {
      setRecentTrackings(prev => {
        const next = [num, ...prev.filter(item => item.toLowerCase() !== num.toLowerCase())].slice(0, 5);
        localStorage.setItem('jrs_recent_admin_trackings', JSON.stringify(next));
        return next;
      });
    } catch {
      // Ignore storage errors
    }
  }, []);

  const executeSearch = useCallback(async (searchNumber: string) => {
    const num = searchNumber.trim();
    if (!num) return;

    setLoading(true);
    setError(null);
    setPkg(null);
    setTimeline([]);
    setLocalItem(null);
    setMatchedInvoice(null);
    setSearched(true);

    try {
      // Fetch ALL 3 sources in PARALLEL instead of sequential waterfall
      const [trackingResult, localResult, invoiceResult] = await Promise.allSettled([
        fetch(`/api/tracking?number=${encodeURIComponent(num)}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
        fetch(`/api/inventory/${encodeURIComponent(num)}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
        fetch(`/api/invoices/by-tracking?tracking=${encodeURIComponent(num)}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null)
      ]);

      // Process tracking API result
      const trackingData = trackingResult.status === 'fulfilled' ? trackingResult.value : null;
      if (trackingData?.status === 'SUCCESS' && trackingData.rawData) {
        setPkg(trackingData.rawData.package || null);
        setTimeline(trackingData.rawData.timeline || []);
        saveRecentTracking(trackingData.rawData.package?.tracking || num);
      } else {
        throw new Error('No se encontraron datos para este tracking');
      }

      // Process local inventory result
      const localData = localResult.status === 'fulfilled' ? localResult.value : null;
      if (localData?.success && localData.data) {
        setLocalItem(localData.data);
      } else if (trackingData?.localItem) {
        setLocalItem(trackingData.localItem);
      }

      // Process invoice lookup result
      const invoiceData = invoiceResult.status === 'fulfilled' ? invoiceResult.value : null;
      if (invoiceData?.success && invoiceData.data) {
        setMatchedInvoice(invoiceData.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al buscar tracking');
    } finally {
      setLoading(false);
    }
  }, [saveRecentTracking]);

  const handleSearch = () => {
    executeSearch(trackingInput);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const queryNumber = urlParams.get('number') || urlParams.get('tracking');
      if (queryNumber) {
        setTrackingInput(queryNumber);
        executeSearch(queryNumber);
      }
    }
  }, [executeSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleCopyTracking = (val: string) => {
    if (!val || typeof navigator === 'undefined') return;
    navigator.clipboard.writeText(val);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const fotos = pkg?.fotos || [];
  const fotoUrls = fotos.map(f => typeof f === 'string' ? f : f.url).filter(Boolean);
  const consignatario = pkg?.consignatario || pkg?.consignee || pkg?.client || pkg?.name || localItem?.client_name || '';
  const statusLabel = pkg?.statusLabel || localItem?.status || '';
  const statusStyle = statusLabel ? getStatusStyle(statusLabel) : null;

  const invWeightInfo = matchedInvoice ? formatPackageWeightAndRate({
    weight: matchedInvoice.package_weight,
    serviceName: matchedInvoice.package_service,
    rate: matchedInvoice.package_rate,
    pkgWeight: pkg?.weight,
    pkgUnit: pkg?.weightUnit
  }) : null;

  // Compute the 4-stage delivery progress from real timeline & localItem data
  const deliveryProgress = useMemo(() => {
    const s = (statusLabel || '').toLowerCase();
    const localStatus = (localItem?.status || '').toLowerCase();

    const isDelivered =
      (s.includes('entregado') && !s.includes('por entregar')) ||
      (localStatus.includes('entregad') && !localStatus.includes('por entregar'));
    const isInCR =
      isDelivered ||
      !!localItem ||
      s.includes('por entregar') ||
      s.includes('bodega costa rica') ||
      s.includes('reparto');
    const isInTransit =
      isInCR ||
      s.includes('tránsito') ||
      s.includes('transito') ||
      s.includes('aduana') ||
      s.includes('nacionalizado') ||
      s.includes('camino') ||
      timeline.some(ev => {
        const t = `${ev.status} ${ev.description}`.toLowerCase();
        return t.includes('tránsito') || t.includes('transito') || t.includes('aduana') || t.includes('nacionalizado') || t.includes('vuelo');
      });
    const isReceived = Boolean(pkg || timeline.length > 0 || isInTransit);

    // Find timestamps from real events
    const receivedEvent = [...timeline].reverse().find(ev => {
      const t = `${ev.status} ${ev.description}`.toLowerCase();
      return (
        t.includes('miami') ||
        t.includes('madrid') ||
        t.includes('españa') ||
        t.includes('china') ||
        t.includes('recibido') ||
        t.includes('bodega origen') ||
        t.includes('registrado') ||
        t.includes('warehouse')
      );
    }) || timeline[timeline.length - 1];

    const transitEvent = [...timeline].reverse().find(ev => {
      const t = `${ev.status} ${ev.description}`.toLowerCase();
      return t.includes('tránsito') || t.includes('transito') || t.includes('aduana') || t.includes('nacionalizado') || t.includes('vuelo');
    });

    const crEvent = timeline.find(ev => {
      const t = `${ev.status} ${ev.description}`.toLowerCase();
      return t.includes('por entregar') || t.includes('bodega costa rica');
    });

    const deliveredEvent = timeline.find(ev => {
      const t = `${ev.status} ${ev.description}`.toLowerCase();
      return t.includes('paquete entregado') || (t.includes('entregado') && !t.includes('por entregar'));
    });

    const receivedDateStr = formatShortStepDate(receivedEvent?.date || pkg?.receivedAt || pkg?.createdAt);
    const transitDateStr = formatShortStepDate(transitEvent?.date || (isInTransit ? receivedEvent?.date : ''));
    const crDateStr = formatShortStepDate(localItem?.received_date || localItem?.created_at || crEvent?.date);
    const deliveredDateStr = formatShortStepDate(deliveredEvent?.date || (isDelivered ? localItem?.received_date || localItem?.created_at : ''));

    const activeStepIndex = isDelivered ? 3 : isInCR ? 2 : isInTransit ? 1 : isReceived ? 0 : -1;

    return {
      activeStepIndex,
      isDelivered,
      steps: [
        {
          key: 'recibido',
          label: 'Recibido',
          sublabel: receivedDateStr || (isReceived ? 'En origen' : 'Pendiente'),
          completed: activeStepIndex >= 0,
          current: activeStepIndex === 0,
          icon: Package
        },
        {
          key: 'transito',
          label: 'En tránsito',
          sublabel: transitDateStr || (activeStepIndex >= 1 ? 'Hacia CR' : 'Pendiente'),
          completed: activeStepIndex >= 1,
          current: activeStepIndex === 1,
          icon: Plane
        },
        {
          key: 'reparto',
          label: 'En reparto',
          sublabel: crDateStr || (activeStepIndex >= 2 ? 'Bodega CR' : 'Pendiente'),
          completed: activeStepIndex >= 2,
          current: activeStepIndex === 2,
          icon: Truck
        },
        {
          key: 'entregado',
          label: 'Entregado',
          sublabel: deliveredDateStr || (isDelivered ? 'Completado' : 'Pendiente'),
          completed: activeStepIndex >= 3,
          current: activeStepIndex === 3,
          icon: Check
        }
      ]
    };
  }, [statusLabel, localItem, timeline, pkg]);

  const formattedWeightDisplay = useMemo(() => {
    const effWeight =
      pkg?.weight ||
      localItem?.weight ||
      (invWeightInfo?.unit === 'Kg' && invWeightInfo.cleanNum
        ? (Number(invWeightInfo.cleanNum) * 2.20462).toFixed(2)
        : invWeightInfo?.cleanNum);
    if (!effWeight) return null;
    const num = parseFloat(String(effWeight));
    const unit = (pkg?.weightUnit || 'lbs').toLowerCase();
    if (isNaN(num)) return `${effWeight} ${unit}`;
    if (unit.includes('kg')) {
      const lbs = (num * 2.20462).toFixed(2);
      return `${num} kg (${lbs} lbs)`;
    } else {
      const kg = (num * 0.453592).toFixed(2);
      return `${num} lbs (${kg} kg)`;
    }
  }, [pkg?.weight, pkg?.weightUnit, localItem?.weight, invWeightInfo]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 animate-fade-in">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Rastrear paquete</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/15">
              Tiempo Real
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Consulta el estado, inventario local y facturación de cualquier envío en tiempo real.
          </p>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-3.5 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Número de tracking"
              placeholder="Ingresa tu número de tracking..."
              className="w-full h-11 pl-10 pr-9 bg-slate-50/60 focus:bg-white rounded-lg border border-slate-200/90 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 focus:outline-none text-xs sm:text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 transition-all font-mono"
            />
            {trackingInput && (
              <button
                type="button"
                onClick={() => {
                  setTrackingInput('');
                  setSearched(false);
                  setPkg(null);
                  setError(null);
                }}
                aria-label="Limpiar número de tracking"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading || !trackingInput.trim()}
            className="h-11 px-6 bg-[#0B2737] hover:bg-brand-blue text-white rounded-lg font-semibold text-xs sm:text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-2xs"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Rastrear</span>
          </button>
        </div>
      </div>

      {/* Estado de Carga */}
      {loading && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col items-center justify-center py-16 px-4 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-slate-800 text-sm font-bold">Consultando envío en tiempo real...</p>
            <p className="text-slate-400 text-xs mt-0.5">
              Verificando tracking internacional, bodega local y facturación asociada.
            </p>
          </div>
        </div>
      )}

      {/* Estado de Error */}
      {error && !loading && (
        <div className="bg-white border border-red-200/90 rounded-xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">No se encontró información para este tracking</p>
              <p className="text-red-600 text-xs mt-0.5">{error}</p>
              <p className="text-slate-400 text-xs mt-1">
                Verifica que el código esté escrito sin espacios adicionales o intenta con otra guía.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearched(false);
              setError(null);
            }}
            className="h-9 px-3.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 shrink-0 cursor-pointer"
          >
            Volver
          </button>
        </div>
      )}

      {/* ==================== ESTADO 1: SIN BÚSQUEDA (ESTADO VACÍO INTENCIONAL) ==================== */}
      {!loading && !searched && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="px-6 pt-12 pb-10 text-center max-w-md mx-auto">
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100/90 border border-slate-200/80 text-[#12435e] flex items-center justify-center shadow-2xs">
                <Package className="w-8 h-8 stroke-[1.75]" />
              </div>
              {/* Detalle visual de actividad en esquina superior derecha */}
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-brand-blue" />
              </span>
            </div>

            <h2 className="text-lg font-bold text-slate-900">Sin consulta activa</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Ingresa un número de tracking arriba para consultar su estado y facturación.
            </p>

            {/* Búsquedas recientes del operador (si existen en este navegador) */}
            {recentTrackings.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Consultas recientes
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {recentTrackings.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setTrackingInput(code);
                        executeSearch(code);
                      }}
                      className="px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-xs font-mono font-semibold text-slate-700 hover:text-brand-blue transition-colors cursor-pointer"
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Franja informativa inferior para equilibrar el espacio sin inventar datos */}
          <div className="bg-slate-50/70 border-t border-slate-200/70 px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 text-brand-blue flex items-center justify-center shrink-0 shadow-2xs">
                <Plane className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Progreso del envío</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Trazabilidad desde recepción en origen, tránsito aéreo/marítimo y entrega.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Warehouse className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Inventario local CR</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Verificación de ingreso físico en bodega de Costa Rica y registro fotográfico.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Facturación vinculada</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Detalle de tarifa, peso facturado, costo individual y estado de pago.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ESTADO 2: CON RESULTADO (PAQUETE ENCONTRADO) ==================== */}
      {!loading && searched && pkg && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 sm:p-6 space-y-6">
          {/* 1. Cabecera del Tracking: Número, Estado de Entrega y Acceso Rápido a Factura */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-5 border-b border-slate-200/80">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                Número de Tracking
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <h2 className="text-lg sm:text-2xl font-black text-slate-900 font-mono tracking-tight break-all">
                  {pkg.tracking || trackingInput}
                </h2>
                <button
                  type="button"
                  onClick={() => handleCopyTracking(pkg.tracking || trackingInput)}
                  title="Copiar número de tracking"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                >
                  {copiedTracking ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {statusLabel && statusStyle && (
                <div
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}
                >
                  {statusStyle.isDelivered ? (
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
                  )}
                  <span>{statusLabel}</span>
                </div>
              )}

              {statusLabel && <div className="h-6 w-px bg-slate-200 hidden sm:block" />}

              {matchedInvoice ? (
                <Link
                  href={`/admin/facturacion/${matchedInvoice.id}`}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100/90 hover:bg-slate-200/70 text-slate-800 border border-slate-200/90 transition-all group"
                  title="Ver detalle de la factura asociada"
                >
                  <FileText size={14} className="text-brand-blue" />
                  <span>
                    Factura: <strong className="font-bold text-slate-900">#{matchedInvoice.invoice_number}</strong>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      matchedInvoice.status === 'Pagada'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {matchedInvoice.status}
                  </span>
                </Link>
              ) : (
                <Link
                  href={`/admin/facturacion/nueva?tracking=${encodeURIComponent(pkg.tracking || trackingInput)}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-brand-blue/10 hover:bg-brand-blue hover:text-white text-brand-blue border border-brand-blue/20 transition-all"
                >
                  <Plus size={13} />
                  <span>Crear Factura</span>
                </Link>
              )}
            </div>
          </div>

          {/* 2. Barra de Progreso del Envío (4 etapas claras) */}
          <div className="py-2 px-1 sm:px-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-0 relative">
              {deliveryProgress.steps.map((step, index) => {
                const IconComponent = step.icon;
                const isLast = index === deliveryProgress.steps.length - 1;
                const nextCompleted =
                  !isLast && deliveryProgress.steps[index + 1]?.completed;

                return (
                  <div key={step.key} className="relative flex flex-col items-center text-center">
                    {/* Línea conectora en escritorio */}
                    {!isLast && (
                      <div
                        aria-hidden="true"
                        className={`hidden sm:block absolute top-5 left-1/2 w-full h-0.5 transition-colors ${
                          nextCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                    )}

                    {/* Círculo del paso */}
                    <div
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        step.current && deliveryProgress.isDelivered
                          ? 'bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-50'
                          : step.current
                          ? 'bg-brand-blue text-white shadow-sm ring-4 ring-brand-blue/10'
                          : step.completed
                          ? 'bg-white border-2 border-emerald-500 text-emerald-600'
                          : 'bg-slate-50 border-2 border-slate-200 text-slate-400'
                      }`}
                    >
                      <IconComponent className="w-4 h-4 stroke-[2.2]" />
                    </div>

                    {/* Etiqueta y fecha */}
                    <p
                      className={`text-xs font-bold mt-2 ${
                        step.completed ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                      {step.sublabel}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Sección de Datos: Destinatario, Peso y Descripción (izquierda) + Factura (derecha) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
            {/* Columna izquierda: Consignatario, Peso y Descripción */}
            <div className="lg:col-span-7 flex flex-col gap-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Tarjeta Consignatario */}
                <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200/80 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                      Consignatario
                    </p>
                    <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5 break-words">
                      {consignatario || 'No especificado'}
                    </p>
                  </div>
                </div>

                {/* Tarjeta Peso */}
                <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200/80 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                      Peso
                    </p>
                    <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5 tabular-nums">
                      {formattedWeightDisplay || 'Sin registro'}
                    </p>
                    {invWeightInfo && invWeightInfo.weightFormatted && (
                      <p className="text-xs text-brand-blue font-semibold mt-0.5 tabular-nums">
                        Facturado: {invWeightInfo.weightFull}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tarjeta Descripción y metadatos adicionales del paquete */}
              <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 p-4 flex-1 flex flex-col justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200/80 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                      Descripción
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 mt-1 leading-relaxed">
                      {pkg.description || 'Paquete registrado sin descripción detallada.'}
                    </p>
                  </div>
                </div>

                {(pkg.dimensions || pkg.pieces || pkg.volumetricWeight || pkg.declaredValue || pkg.carrier) && (
                  <div className="pt-3 border-t border-slate-200/70 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600">
                    {pkg.carrier && (
                      <span>
                        Carrier: <strong className="text-slate-800">{pkg.carrier}</strong>
                      </span>
                    )}
                    {pkg.pieces && (
                      <span>
                        Piezas: <strong className="text-slate-800">{pkg.pieces}</strong>
                      </span>
                    )}
                    {pkg.dimensions && (
                      <span>
                        Dimensiones: <strong className="text-slate-800">{pkg.dimensions}</strong>
                      </span>
                    )}
                    {pkg.volumetricWeight && (
                      <span>
                        Volumétrico: <strong className="text-slate-800">{pkg.volumetricWeight} {pkg.weightUnit || 'lbs'}</strong>
                      </span>
                    )}
                    {pkg.declaredValue && (
                      <span>
                        Valor declarado: <strong className="text-slate-800">${pkg.declaredValue} {pkg.currency || 'USD'}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Columna derecha: Tarjeta de Factura */}
            <div className="lg:col-span-5">
              {matchedInvoice ? (
                <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 p-4 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 text-brand-blue flex items-center justify-center shrink-0 mt-0.5">
                          <FileText size={15} />
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                            Factura
                          </p>
                          <Link
                            href={`/admin/facturacion/${matchedInvoice.id}`}
                            className="text-sm sm:text-base font-black text-slate-900 hover:text-brand-blue inline-flex items-center gap-1 transition-colors"
                          >
                            <span>#{matchedInvoice.invoice_number}</span>
                            <ExternalLink size={13} className="text-slate-400" />
                          </Link>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          matchedInvoice.status === 'Pagada'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                            : 'bg-amber-50 text-amber-800 border-amber-200/80'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            matchedInvoice.status === 'Pagada' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        {matchedInvoice.status}
                      </span>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-slate-200/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-600 font-medium">Costo paquete:</span>
                        <span className="text-sm font-black text-emerald-700 tabular-nums">
                          {matchedInvoice.package_amount !== undefined && matchedInvoice.package_amount !== null
                            ? `$${matchedInvoice.package_amount.toFixed(2)} ${matchedInvoice.currency || 'USD'}`
                            : `$${matchedInvoice.total.toFixed(2)} ${matchedInvoice.currency || 'USD'}`}
                        </span>
                      </div>

                      {invWeightInfo && invWeightInfo.weightFormatted && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500">Peso paquete:</span>
                          <span className="font-bold text-slate-800 tabular-nums">
                            {invWeightInfo.weightFull}
                          </span>
                        </div>
                      )}

                      {invWeightInfo && invWeightInfo.rateFormatted && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500">Tarifa:</span>
                          <span className="font-semibold text-slate-800 tabular-nums">
                            {invWeightInfo.rateFormatted}
                          </span>
                        </div>
                      )}

                      {matchedInvoice.package_service && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 shrink-0">Servicio:</span>
                          <span
                            className="font-semibold text-slate-800 truncate text-right"
                            title={matchedInvoice.package_service}
                          >
                            {matchedInvoice.package_service}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Total factura:</span>
                    <strong className="text-sm sm:text-base font-black text-slate-900 tabular-nums">
                      ${matchedInvoice.total.toFixed(2)} {matchedInvoice.currency || 'USD'}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50/70 rounded-xl p-5 border border-dashed border-slate-200/90 h-full flex flex-col items-center justify-center text-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Sin Factura Asociada</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Este número de tracking aún no está vinculado a un comprobante.
                    </p>
                  </div>
                  <Link
                    href={`/admin/facturacion/nueva?tracking=${encodeURIComponent(pkg.tracking || trackingInput)}`}
                    className="mt-1 h-8 px-3.5 rounded-lg bg-[#0B2737] hover:bg-brand-blue text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Plus size={13} /> Crear Factura
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* 4. Banner de Inventario Local (sin repetir datos ya visibles de factura) */}
          {localItem && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 bg-emerald-100/80 border border-emerald-200/80 rounded-xl flex items-center justify-center shrink-0 text-emerald-700">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">En inventario local</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Recibido: <span className="font-medium text-slate-800">{formatDate(localItem.received_date || localItem.created_at)}</span>
                    {localItem.client_name && localItem.client_name !== consignatario
                      ? ` • Registrado a: ${localItem.client_name}`
                      : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white text-emerald-800 border border-emerald-200/90 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {(localItem.status || '').toLowerCase().includes('entregad')
                    ? 'Entregado desde Bodega CR'
                    : 'Disponible en Bodega CR'}
                </span>
              </div>
            </div>
          )}

          {/* 5. Galería de Fotos del Paquete */}
          {fotoUrls.length > 0 && (
            <div className="pt-2 border-t border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-slate-500" />
                  <span>Fotos del paquete ({fotoUrls.length})</span>
                </h3>
                <span className="text-[11px] text-slate-400">Haz clic en una imagen para ampliar</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {fotoUrls.map((url: string, idx: number) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-100 rounded-xl overflow-hidden aspect-[4/3] border border-slate-200/80 hover:border-brand-blue/50 hover:shadow-sm transition-all block group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Foto ${idx + 1} del paquete ${pkg.tracking || trackingInput}`}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 6. Historial detallado de eventos (desplegable para mantener la vista limpia sin perder detalle) */}
          {timeline.length > 0 && (
            <div className="pt-2 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => setShowFullTimeline(prev => !prev)}
                aria-expanded={showFullTimeline}
                className="w-full py-1.5 flex items-center justify-between text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Historial detallado de eventos ({timeline.length})</span>
                </span>
                <span className="inline-flex items-center gap-1 text-brand-blue font-semibold">
                  {showFullTimeline ? 'Ocultar detalle' : 'Ver bitácora completa'}
                  {showFullTimeline ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </button>

              {showFullTimeline && (
                <div className="mt-3 pl-6 relative space-y-2.5">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-200" />
                  {timeline.map((event: TrackingEvent, idx: number) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-6 bg-white p-1 rounded-full border border-slate-200 shadow-2xs">
                        {getTimelineIcon(event.status)}
                      </div>
                      <div className="bg-slate-50/70 hover:bg-slate-50 transition-colors border border-slate-200/80 rounded-lg py-2.5 px-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-800 text-xs sm:text-[13px]">{event.status}</p>
                          {event.description &&
                            event.description.trim().toLowerCase() !== event.status.trim().toLowerCase() && (
                              <p className="text-slate-500 text-xs mt-0.5">{event.description}</p>
                            )}
                        </div>
                        <p className="text-slate-400 text-[11px] font-mono flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {formatDate(event.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
