'use client';

import React, { useState } from 'react';
import { Search, Package, MapPin, Truck, CheckCircle2, Clock, Loader2, AlertTriangle } from 'lucide-react';

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

function formatDate(ds: string | null | undefined): string {
  if (!ds) return 'N/A';
  try {
    const d = new Date(ds);
    if (isNaN(d.getTime())) return ds;
    return d.toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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

  const handleSearch = async () => {
    const num = trackingInput.trim();
    if (!num) return;

    setLoading(true);
    setError(null);
    setPkg(null);
    setTimeline([]);
    setLocalItem(null);
    setSearched(true);

    try {
      // Fetch from tracking API
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

      // Also check local inventory
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al buscar tracking');
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-gray-400 text-sm">Consultando información del paquete...</p>
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
              {statusLabel && statusStyle && (
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                  {getTimelineIcon(statusLabel)}
                  {statusLabel}
                </div>
              )}
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
                <div className="w-8 h-8 bg-brand-blue/10 rounded-full flex items-center justify-center">
                  <Package className="w-4 h-4 text-brand-blue" />
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-blue">En nuestro inventario local</p>
                  <p className="text-[11px] text-gray-500">
                    Estado: {localItem.status} • Cliente: {localItem.client_name} • Recibido: {formatDate(localItem.received_date || localItem.created_at)}
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
