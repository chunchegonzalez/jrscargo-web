'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Package, Search, Eye, MapPin, Truck, CheckCircle2, Image as ImageIcon, Clock, ChevronDown, X, Loader2 } from 'lucide-react';

interface LocalInventoryItem {
  id: string;
  tracking_number: string;
  client_name: string;
  status: string;
  weight: number;
  received_date: string;
  created_at: string;
  updated_at: string;
}

interface TrackingEvent {
  date: string;
  status: string;
  description: string;
  icon?: string;
}

interface TrackingPackage {
  tracking: string;
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

export default function TrackingPage() {
  const [inventory, setInventory] = useState<LocalInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  
  const [selectedItem, setSelectedItem] = useState<LocalInventoryItem | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/inventory');
      if (!res.ok) throw new Error('Error al cargar inventario');
      const result = await res.json();
      if (result.success && result.data) {
        const filtered = result.data.filter((item: LocalInventoryItem) => item.status !== 'Eliminado');
        setInventory(filtered);
      } else {
        throw new Error('Formato de datos inv\u00e1lido');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleOpenDetails = async (item: LocalInventoryItem) => {
    setSelectedItem(item);
    setTrackingData(null);
    setTrackingError(null);
    setTrackingLoading(true);

    try {
      const res = await fetch(`/api/tracking?number=${item.tracking_number}`);
      if (!res.ok) throw new Error('Error al obtener datos de tracking');
      const data = await res.json();
      if (data && data.status === 'SUCCESS') {
        setTrackingData(data);
      } else {
        throw new Error('No se encontraron datos de tracking o la API fall\u00f3');
      }
    } catch (err: unknown) {
      setTrackingError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setTrackingLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedItem(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'En Bodega MIA': return 'bg-blue-100 text-blue-700';
      case 'En Tr\u00e1nsito': return 'bg-orange-100 text-orange-700';
      case 'En Bodega CR': return 'bg-blue-50 text-[#12435E]';
      case 'Entregado': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  const getTimelineIcon = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('transit') || s.includes('camino')) return <Truck className="w-5 h-5" />;
    if (s.includes('bodega') || s.includes('warehouse')) return <MapPin className="w-5 h-5" />;
    if (s.includes('entregado') || s.includes('delivered')) return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    return <Package className="w-5 h-5" />;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('es-CR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.client_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'Todos' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [inventory, searchQuery, statusFilter]);

  const stats = [
    { label: 'Todos', value: 'Todos' },
    { label: 'En Bodega MIA', value: 'En Bodega MIA' },
    { label: 'En Tr\u00e1nsito', value: 'En Tr\u00e1nsito' },
    { label: 'En Bodega CR', value: 'En Bodega CR' },
    { label: 'Entregado', value: 'Entregado' }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24 relative min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#12435E]">Tracking de Paquetes</h1>
          <p className="text-gray-500 mt-1">Gestión y rastreo de inventario ({filteredInventory.length} paquetes)</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar por tracking o cliente..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5A623] focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {stats.map(stat => (
            <button
              key={stat.value}
              onClick={() => setStatusFilter(stat.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                statusFilter === stat.value 
                  ? 'bg-[#12435E] text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {stat.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-[#12435E] animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInventory.map(item => (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col transition-shadow hover:shadow-md">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                  <span className="text-gray-400 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(item.received_date || item.created_at)}
                  </span>
                </div>
                
                <h3 className="font-semibold text-lg text-gray-900 mb-1 flex items-center gap-2">
                  <Package className="w-5 h-5 text-gray-400" />
                  {item.tracking_number}
                </h3>
                <p className="text-gray-600 font-medium">{item.client_name}</p>
                <p className="text-sm text-gray-500 mt-2">Peso: {item.weight} lbs</p>
              </div>
              <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
                <button 
                  onClick={() => handleOpenDetails(item)}
                  className="w-full flex items-center justify-center gap-2 text-[#12435E] font-medium hover:text-[#F5A623] transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Ver Detalles
                </button>
              </div>
            </div>
          ))}
          {filteredInventory.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500">
              No se encontraron paquetes que coincidan con la búsqueda.
            </div>
          )}
        </div>
      )}

      {/* Slide-over detail panel */}
      {selectedItem && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={closeDetails} />
          <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xl font-bold text-[#12435E]">Detalle de Tracking</h2>
              <button onClick={closeDetails} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-8">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-4 ${getStatusColor(selectedItem.status)}`}>
                  {selectedItem.status} (Local)
                </span>
                <h3 className="text-3xl font-bold text-gray-900 break-all mb-2">
                  {selectedItem.tracking_number}
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cliente:</span>
                    <span className="font-medium text-gray-900">{selectedItem.client_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Peso Local:</span>
                    <span className="font-medium text-gray-900">{selectedItem.weight} lbs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fecha Recepción:</span>
                    <span className="font-medium text-gray-900">{formatDate(selectedItem.received_date || selectedItem.created_at)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ChevronDown className="w-5 h-5 text-[#F5A623]" />
                  Datos de API (Worldbox)
                </h4>
                
                {trackingLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
                    <Loader2 className="w-8 h-8 text-[#12435E] animate-spin" />
                    <span>Obteniendo datos de tracking...</span>
                  </div>
                ) : trackingError ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm">
                    <p className="font-medium mb-1">Nota: No se pudo obtener el tracking externo.</p>
                    <p>{trackingError}</p>
                  </div>
                ) : trackingData?.rawData ? (
                  <div className="space-y-8">
                    {/* Package Info from API */}
                    {trackingData.rawData.package && (
                      <div className="bg-blue-50/50 rounded-xl p-4 text-sm space-y-2">
                        <p><span className="text-gray-500">Estado API:</span> <span className="font-medium">{trackingData.rawData.package.statusLabel || 'N/A'}</span></p>
                        <p><span className="text-gray-500">Consignatario:</span> <span className="font-medium">{trackingData.rawData.package.consignatario || trackingData.rawData.package.consignee || trackingData.rawData.package.client || trackingData.rawData.package.name || 'N/A'}</span></p>
                        <p><span className="text-gray-500">Peso API:</span> <span className="font-medium">{trackingData.rawData.package.weight ? `${trackingData.rawData.package.weight} ${trackingData.rawData.package.weightUnit || 'lbs'}` : 'N/A'}</span></p>
                      </div>
                    )}

                    {/* Photos */}
                    {trackingData.rawData.package?.fotos && trackingData.rawData.package.fotos.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" /> Fotos ({trackingData.rawData.package.fotos.length})
                        </h5>
                        <div className="grid grid-cols-2 gap-2">
                          {trackingData.rawData.package.fotos.map((url, idx) => (
                            <div key={idx} className="bg-gray-100 rounded-lg overflow-hidden aspect-square flex items-center justify-center border border-gray-200">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={`Foto ${idx+1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    {trackingData.rawData.timeline && trackingData.rawData.timeline.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-4">Historial</h5>
                        <div className="relative pl-6 space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-gray-200">
                          {trackingData.rawData.timeline.map((event, idx) => (
                            <div key={idx} className="relative">
                              <div className="absolute -left-6 bg-white p-1 rounded-full border border-gray-200 text-gray-500">
                                {getTimelineIcon(event.status)}
                              </div>
                              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                <p className="font-medium text-gray-900 text-sm">{event.status}</p>
                                <p className="text-gray-500 text-xs mt-1">{event.description}</p>
                                <p className="text-gray-400 text-xs mt-2 flex items-center gap-1">
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
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No hay información adicional disponible.
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
