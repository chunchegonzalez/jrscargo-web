'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Package, MapPin, Truck, CheckCircle2, Clock, Loader2, AlertTriangle, FileText, ExternalLink, Plus } from 'lucide-react';

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
}

function formatDate(ds: string | null | undefined): string {
  if (!ds) return 'N/A';
  try {
    const d = new Date(ds);
    if (isNaN(d.getTime())) return ds;
    return d.toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'N/A';
  }
}

function getStatusStyle(status: string): { bg: string; text: string; border: string } {
  const s = status.toLowerCase();
  if (s.includes('entregado') || s.includes('delivered')) return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
  if (s.includes('tránsito') || s.includes('transit') || s.includes('camino')) return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
  if (s.includes('bodega') || s.includes('warehouse') || s.includes('miami') || s.includes('mia')) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
  return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
}

function getTimelineIcon(status?: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('entregado') || s.includes('delivered')) return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (s.includes('transit') || s.includes('camino') || s.includes('tránsito')) return <Truck className="w-4 h-4 text-orange-500" />;
  if (s.includes('bodega') || s.includes('warehouse') || s.includes('recib')) return <MapPin className="w-4 h-4 text-blue-500" />;
  return <Package className="w-4 h-4 text-gray-400" />;
}

export default function TrackingPage() {
  const [trackingInput, setTrackingInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const [pkg, setPkg] = useState<TrackingPackage | null>(null);
  const [timeline, setTimeline] = useState<TrackingEvent[]>([]);
  const [localItem, setLocalItem] = useState<LocalItem | null>(null);
  const [matchedInvoice, setMatchedInvoice] = useState<MatchedInvoice | null>(null);

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
      // 1. Fetch from tracking API
      const res = await fetch(`/api/tracking?number=${encodeURIComponent(num)}`);
      if (!res.ok) {
        throw new Error('No se encontraron datos para este tracking');
      }
      const data = await res.json();

      if (data.status === 'SUCCESS' && data.rawData) {
        setPkg(data.rawData.package || null);
        setTimeline(data.rawData.timeline || []);
      } else {
        throw new Error('No se encontraron datos para este tracking');
      }

      // 2. Check local inventory in parallel
      try {
        const localRes = await fetch(`/api/inventory/${encodeURIComponent(num)}`);
        if (localRes.ok) {
          const localData = await localRes.json();
          if (localData.success && localData.data) {
            setLocalItem(localData.data);
          }
        }
      } catch {
        // Local lookup is optional
      }

      // 3. Check for associated invoices with this tracking number
      try {
        const invRes = await fetch('/api/invoices');
        if (invRes.ok) {
          const invData = await invRes.json();
          if (invData.success && Array.isArray(invData.data)) {
            const cleanSearch = num.toUpperCase();
            const found = invData.data.find((inv: Record<string, unknown>) => {
              const items = inv.invoice_items as Array<Record<string, unknown>> | undefined;
              if (!items || !Array.isArray(items)) return false;
              return items.some((it) => {
                const itTrack = String(it.tracking_number || '').trim().toUpperCase();
                return itTrack && (itTrack === cleanSearch || cleanSearch.includes(itTrack) || itTrack.includes(cleanSearch));
              });
            });

            if (found) {
              const clientObj = found.clients as Record<string, unknown> | undefined;
              setMatchedInvoice({
                id: String(found.id),
                invoice_number: String(found.invoice_number || ''),
                status: String(found.status || 'Pendiente'),
                total: Number(found.total) || 0,
                currency: String(found.currency || 'USD'),
                issue_date: String(found.issue_date || ''),
                client_name: String(clientObj?.name || '')
              });
            }
          }
        }
      } catch {
        // Invoice lookup is optional
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al buscar tracking');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const fotos = pkg?.fotos || [];
  const fotoUrls = fotos.map(f => typeof f === 'string' ? f : f.url).filter(Boolean);
  const consignatario = pkg?.consignatario || pkg?.consignee || pkg?.client || pkg?.name || '';
  const statusLabel = pkg?.statusLabel || localItem?.status || '';
  const statusStyle = statusLabel ? getStatusStyle(statusLabel) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-light text-gray-600">
          Rastrear <strong className="font-black text-brand-blue">Paquete</strong>
        </h1>
        <p className="text-gray-400 text-xs mt-1">Consulta el estado de cualquier envío en tiempo real</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ingresa tu número de tracking..."
              className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !trackingInput.trim()}
            className="px-8 py-3.5 bg-brand-blue text-white rounded-xl font-bold text-sm hover:bg-brand-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Rastrear
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
          <p className="text-gray-400 text-sm">Consultando información del paquete y facturas...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700 text-sm">No se encontró el paquete</p>
            <p className="text-red-600 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && searched && pkg && (
        <div className="space-y-6">
          {/* Status + Tracking header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Número de Tracking</p>
                <h2 className="text-2xl font-black text-gray-800 font-mono">{pkg.tracking || trackingInput}</h2>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {matchedInvoice && (
                  <Link
                    href={`/admin/facturacion/${matchedInvoice.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black bg-brand-blue text-white hover:bg-brand-blue/90 transition-all shadow-sm group"
                    title="Ver Factura Asociada"
                  >
                    <FileText size={14} className="text-brand-yellow" />
                    <span>Factura: #{matchedInvoice.invoice_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${matchedInvoice.status === 'Pagada' ? 'bg-green-500 text-white' : 'bg-amber-400 text-amber-950'}`}>
                      {matchedInvoice.status}
                    </span>
                    <ExternalLink size={12} className="opacity-70 group-hover:opacity-100" />
                  </Link>
                )}

                {statusLabel && statusStyle && (
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                    {getTimelineIcon(statusLabel)}
                    {statusLabel}
                  </div>
                )}
              </div>
            </div>

            {/* Package details grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {consignatario && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Consignatario</p>
                  <p className="text-sm font-bold text-gray-800">{consignatario}</p>
                </div>
              )}
              {pkg.weight && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Peso</p>
                  <p className="text-sm font-bold text-gray-800">{pkg.weight} {pkg.weightUnit || 'lbs'}</p>
                </div>
              )}
              {pkg.volumetricWeight && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Peso Volumétrico</p>
                  <p className="text-sm font-bold text-gray-800">{pkg.volumetricWeight} {pkg.weightUnit || 'lbs'}</p>
                </div>
              )}

              {/* Factura asociada card in grid */}
              {matchedInvoice ? (
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3">
                  <p className="text-[10px] text-brand-blue uppercase font-black mb-1 flex items-center gap-1">
                    <FileText size={12} /> Factura Asociada
                  </p>
                  <div className="flex items-center justify-between gap-1">
                    <Link
                      href={`/admin/facturacion/${matchedInvoice.id}`}
                      className="text-sm font-black text-brand-blue hover:underline inline-flex items-center gap-1"
                    >
                      #{matchedInvoice.invoice_number}
                      <ExternalLink size={12} className="text-gray-400" />
                    </Link>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${matchedInvoice.status === 'Pagada' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>
                      {matchedInvoice.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 font-medium">
                    Total: <strong className="text-gray-800">${matchedInvoice.total.toFixed(2)} {matchedInvoice.currency || 'USD'}</strong>
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-3 border border-dashed border-gray-200 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1">
                      <FileText size={12} /> Factura
                    </p>
                    <p className="text-xs text-gray-400 font-medium">Sin facturar aún</p>
                  </div>
                  <Link
                    href={`/admin/facturacion/nueva?tracking=${encodeURIComponent(pkg.tracking || trackingInput)}`}
                    className="mt-2 text-[11px] font-bold text-brand-blue hover:underline inline-flex items-center gap-1"
                  >
                    <Plus size={11} /> Crear Factura
                  </Link>
                </div>
              )}

              {pkg.dimensions && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Dimensiones</p>
                  <p className="text-sm font-bold text-gray-800">{pkg.dimensions}</p>
                </div>
              )}
              {pkg.pieces && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Piezas</p>
                  <p className="text-sm font-bold text-gray-800">{pkg.pieces}</p>
                </div>
              )}
              {pkg.declaredValue && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Valor Declarado</p>
                  <p className="text-sm font-bold text-gray-800">${pkg.declaredValue} {pkg.currency || 'USD'}</p>
                </div>
              )}
              {pkg.carrier && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Carrier</p>
                  <p className="text-sm font-bold text-gray-800">{pkg.carrier}</p>
                </div>
              )}
              {pkg.description && (
                <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Descripción</p>
                  <p className="text-sm font-bold text-gray-800">{pkg.description}</p>
                </div>
              )}
            </div>

            {/* Local inventory badge */}
            {localItem && (
              <div className="mt-4 p-3 bg-brand-blue/5 border border-brand-blue/10 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-blue/10 rounded-full flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-brand-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-xs font-bold text-brand-blue">En nuestro inventario local</p>
                    {matchedInvoice && (
                      <Link
                        href={`/admin/facturacion/${matchedInvoice.id}`}
                        className="text-[11px] font-black text-brand-blue bg-white px-2.5 py-0.5 rounded-lg border border-brand-blue/20 hover:bg-brand-blue hover:text-white transition-colors inline-flex items-center gap-1"
                      >
                        <FileText size={11} /> Factura #{matchedInvoice.invoice_number} ({matchedInvoice.status})
                      </Link>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Estado: <span className="font-semibold text-gray-700">{localItem.status}</span>
                    {matchedInvoice ? ` • Factura: #${matchedInvoice.invoice_number}` : ''}
                    {localItem.client_name ? ` • Cliente: ${localItem.client_name}` : ''}
                    {` • Recibido: ${formatDate(localItem.received_date || localItem.created_at)}`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Photos */}
          {fotoUrls.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Fotos del Paquete ({fotoUrls.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {fotoUrls.map((url: string, idx: number) => (
                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="bg-gray-100 rounded-xl overflow-hidden aspect-square border border-gray-200 hover:shadow-md transition-shadow block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-6">Historial de Eventos</h3>
              <div className="relative pl-8 space-y-6">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-200" />
                {timeline.map((event: TrackingEvent, idx: number) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-8 bg-white p-1 rounded-full border border-gray-200">
                      {getTimelineIcon(event.status)}
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                      <p className="font-bold text-gray-800 text-sm">{event.status}</p>
                      {event.description && <p className="text-gray-500 text-xs mt-1">{event.description}</p>}
                      <p className="text-gray-400 text-[11px] mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(event.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !searched && (
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Ingresa un número de tracking para consultar su estado</p>
        </div>
      )}
    </div>
  );
}
