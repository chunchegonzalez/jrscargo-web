'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Package, Search, Eye, MapPin, Truck, CheckCircle2, Clock, X, Loader2 } from 'lucide-react';

interface LocalInventoryItem {
  id: string;
  tracking_number: string;
  client_name: string;
  status: string;
  weight: number | null;
  received_date: string | null;
  created_at: string;
  updated_at: string | null;
}

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
  fotos?: string[];
}

interface TrackingData {
  trackingNumber: string;
  status: string;
  rawData?: {
    package?: TrackingPackage;
    timeline?: TrackingEvent[];
  };
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'En Bodega MIA': return 'bg-blue-100 text-blue-700';
    case 'En Tránsito': return 'bg-orange-100 text-orange-700';
    case 'En Bodega CR': return 'bg-blue-50 text-[#12435E]';
    case 'Entregado': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('es-CR', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'N/A';
  }
}

function getTimelineIcon(status?: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('transit') || s.includes('camino')) return <Truck className="w-4 h-4" />;
  if (s.includes('bodega') || s.includes('warehouse')) return <MapPin className="w-4 h-4" />;
  if (s.includes('entregado') || s.includes('delivered')) return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  return <Package className="w-4 h-4" />;
}

const STATUS_FILTERS = ['Todos', 'En Bodega MIA', 'En Tránsito', 'En Bodega CR', 'Entregado'];

export default function TrackingPage() {
  const [inventory, setInventory] = useState<LocalInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const [selectedItem, setSelectedItem] = useState<LocalInventoryItem | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/inventory');
        if (!res.ok) throw new Error('Error al cargar inventario');
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          setInventory(result.data.filter((item: LocalInventoryItem) => item.status !== 'Eliminado'));
        } else {
          setInventory([]);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleOpenDetails = async (item: LocalInventoryItem) => {
    setSelectedItem(item);
    setTrackingData(null);
    setTrackingError(null);
    setTrackingLoading(true);

    try {
      const res = await fetch(`/api/tracking?number=${encodeURIComponent(item.tracking_number)}`);
      if (!res.ok) throw new Error('Error al obtener datos de tracking');
      const data = await res.json();
      if (data && data.status === 'SUCCESS') {
        setTrackingData(data);
      } else {
        throw new Error('No se encontraron datos de tracking');
      }
    } catch (err: unknown) {
      setTrackingError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setTrackingLoading(false);
    }
  };

  const filteredInventory = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return inventory.filter(item => {
      const tracking = (item.tracking_number || '').toLowerCase();
      const client = (item.client_name || '').toLowerCase();
      const matchesSearch = !q || tracking.includes(q) || client.includes(q);
      const matchesStatus = statusFilter === 'Todos' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [inventory, searchQuery, statusFilter]);

  const pkg = trackingData?.rawData?.package;
  const timeline = trackingData?.rawData?.timeline;
  const fotos = pkg?.fotos || [];
  const consignatario = pkg?.consignatario || pkg?.consignee || pkg?.client || pkg?.name || 'N/A';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl text-center">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-light text-gray-600">
          Tracking de <strong className="font-black text-brand-blue">Paquetes</strong>
        </h1>
        <p className="text-gray-400 text-xs mt-1">{filteredInventory.length} paquetes encontrados</p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por tracking o cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:border-transparent"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                statusFilter === f ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInventory.map(item => (
          <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
                <span className="text-gray-400 text-[11px] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(item.received_date || item.created_at)}
                </span>
              </div>
              <h3 className="font-bold text-gray-800 mb-0.5 flex items-center gap-2 font-mono text-sm">
                <Package className="w-4 h-4 text-gray-400 shrink-0" />
                {item.tracking_number}
              </h3>
              <p className="text-gray-500 text-sm ml-6">{item.client_name || 'Sin asignar'}</p>
              {item.weight ? <p className="text-xs text-gray-400 mt-1 ml-6">{item.weight} lbs</p> : null}
            </div>
            <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-2.5">
              <button
                onClick={() => handleOpenDetails(item)}
                className="w-full flex items-center justify-center gap-2 text-brand-blue text-xs font-bold hover:text-brand-yellow transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                Ver Detalles del API
              </button>
            </div>
          </div>
        ))}
        {filteredInventory.length === 0 && (
          <div className="col-span-full py-16 text-center text-gray-400 text-sm">
            No se encontraron paquetes.
          </div>
        )}
      </div>

      {/* Slide-over panel */}
      {selectedItem && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelectedItem(null)} />
          <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white shadow-2xl z-50 flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-brand-blue">Detalle de Tracking</h2>
              <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Local info */}
              <div>
                <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase mb-3 ${getStatusColor(selectedItem.status)}`}>
                  {selectedItem.status}
                </span>
                <h3 className="text-2xl font-black text-gray-800 font-mono break-all">{selectedItem.tracking_number}</h3>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Cliente:</span>
                  <span className="font-bold text-gray-800">{selectedItem.client_name || 'Sin asignar'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Peso:</span>
                  <span className="font-bold text-gray-800">{selectedItem.weight || 0} lbs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha:</span>
                  <span className="font-bold text-gray-800">{formatDate(selectedItem.received_date || selectedItem.created_at)}</span>
                </div>
              </div>

              {/* API data */}
              <div className="border-t border-gray-100 pt-5">
                <h4 className="font-bold text-gray-700 text-sm mb-4">Datos del API (Worldbox)</h4>

                {trackingLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-blue" />
                    <span className="text-xs">Consultando API...</span>
                  </div>
                ) : trackingError ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-xl text-xs">
                    <p className="font-bold mb-1">No se pudo obtener tracking externo</p>
                    <p>{trackingError}</p>
                  </div>
                ) : trackingData?.rawData ? (
                  <div className="space-y-6">
                    {/* API package info */}
                    {pkg && (
                      <div className="bg-blue-50/60 rounded-xl p-4 text-xs space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Estado API:</span>
                          <span className="font-bold">{pkg.statusLabel || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Consignatario:</span>
                          <span className="font-bold">{consignatario}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Peso API:</span>
                          <span className="font-bold">{pkg.weight ? `${pkg.weight} ${pkg.weightUnit || 'lbs'}` : 'N/A'}</span>
                        </div>
                      </div>
                    )}

                    {/* Photos */}
                    {fotos.length > 0 && (
                      <div>
                        <h5 className="font-bold text-gray-700 text-xs mb-3">Fotos ({fotos.length})</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {fotos.map((url: string, idx: number) => (
                            <div key={idx} className="bg-gray-100 rounded-lg overflow-hidden aspect-square border border-gray-200">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    {timeline && timeline.length > 0 && (
                      <div>
                        <h5 className="font-bold text-gray-700 text-xs mb-3">Historial de Eventos</h5>
                        <div className="relative pl-6 space-y-4">
                          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />
                          {timeline.map((event: TrackingEvent, idx: number) => (
                            <div key={idx} className="relative">
                              <div className="absolute -left-6 bg-white p-0.5 rounded-full border border-gray-200 text-gray-400">
                                {getTimelineIcon(event.status)}
                              </div>
                              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                <p className="font-bold text-gray-800 text-xs">{event.status}</p>
                                {event.description && <p className="text-gray-500 text-[11px] mt-0.5">{event.description}</p>}
                                <p className="text-gray-400 text-[10px] mt-1 flex items-center gap-1">
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
                ) : (
                  <div className="text-center py-8 text-gray-400 text-xs">
                    No hay datos adicionales disponibles.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
