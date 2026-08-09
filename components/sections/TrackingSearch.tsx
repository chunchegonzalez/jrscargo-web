'use client';

import { useState, useRef } from 'react';
import { Search, MapPin, Calendar, AlertCircle, MessageCircle, Package, Plane, CheckCircle2, Warehouse, Image as ImageIcon, ChevronRight } from 'lucide-react';
import Image from 'next/image';

interface PackagePhoto {
  id: number;
  url: string;
}

interface PackageInfo {
  tracking: string;
  status: string;
  statusLabel: string;
  weight: number;
  weightUnit: string;
  description: string;
  provider: string;
  consignatario: string;
  fotos?: PackagePhoto[];
  manifestCode?: string;
  manifestAwb?: string;
}

interface TimelineEvent {
  date: string;
  status: string;
  description: string;
  icon: string;
}

interface TrackingData {
  trackingNumber: string;
  status: 'PENDING_INTEGRATION' | 'SUCCESS' | 'NOT_FOUND';
  rawData?: {
    package?: PackageInfo;
    timeline?: TimelineEvent[];
  };
}

export default function TrackingSearch() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TrackingData | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/tracking?number=${encodeURIComponent(trackingNumber)}`);
      const data = await response.json();
      
      if (!response.ok || data.error) {
        setResult({
          trackingNumber,
          status: 'PENDING_INTEGRATION'
        });
      } else {
        setResult(data);
      }
      
      // Auto-scroll to results after a short delay for DOM to render
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
      
    } catch (error) {
      console.error('Error fetching tracking:', error);
      setResult({
        trackingNumber,
        status: 'PENDING_INTEGRATION',
      });
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } finally {
      setIsLoading(false);
    }
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'plane': return <Plane size={20} />;
      case 'warehouse': return <Warehouse size={20} />;
      case 'package': return <Package size={20} />;
      case 'circle': return <CheckCircle2 size={20} />;
      default: return <CheckCircle2 size={20} />;
    }
  };

  // Format date helper
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('es-CR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <section id="tracking" className="section-padding bg-gray-50 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full pointer-events-none">
        <div className="absolute top-20 left-0 w-72 h-72 bg-brand-blue/5 rounded-full blur-3xl mix-blend-multiply animate-blob"></div>
        <div className="absolute top-20 right-0 w-72 h-72 bg-brand-red/5 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-72 h-72 bg-brand-yellow/10 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-4000"></div>
      </div>

      <div className="container-max max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm border border-gray-100 text-brand-blue font-bold text-sm mb-6">
            <Package size={16} className="text-brand-red" /> Rastrear Envío
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-brand-blue mb-4 tracking-tight">
            ¿Dónde está mi <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-red to-brand-yellow">paquete?</span>
          </h2>
          <p className="text-brand-text-gray text-lg max-w-2xl mx-auto text-balance">
            Consulta el estado de tu envío en tiempo real. Solo necesitas tu número de tracking.
          </p>
        </div>

        {/* Premium Search Form */}
        <div className="relative max-w-3xl mx-auto mb-16 group">
          {/* Glow Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-brand-blue via-brand-red to-brand-yellow rounded-[2.5rem] blur-lg opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          
          <form onSubmit={handleSearch} className="relative bg-white/90 backdrop-blur-xl flex flex-col sm:flex-row gap-3 p-3 rounded-[2rem] shadow-xl items-center border border-white">
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <Search size={24} className="text-brand-text-light group-focus-within:text-brand-blue transition-colors" />
              </div>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Ingresa tu número de tracking..."
                className="w-full pl-16 pr-6 py-4 rounded-2xl bg-transparent border-transparent text-brand-blue font-bold text-lg placeholder:text-gray-400 placeholder:font-medium focus:ring-0 focus:outline-none"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !trackingNumber.trim()}
              className="w-full sm:w-auto btn-primary py-4 px-8 text-lg rounded-xl shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group/btn hover:scale-[1.02] transition-transform"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>Rastrear <ChevronRight size={20} className="group-hover/btn:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>
        </div>

        {/* Results Area */}
        {result && (
          <div ref={resultsRef} className="animate-fade-in scroll-mt-28">
            {result.status === 'PENDING_INTEGRATION' && (
              <div className="bg-white border border-gray-100 rounded-3xl p-8 sm:p-10 text-center max-w-2xl mx-auto shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-yellow via-brand-red to-brand-blue"></div>
                
                <div className="w-20 h-20 bg-gray-50 border border-gray-100 text-brand-text-gray rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm relative">
                  <Package size={36} className="opacity-40" />
                  <div className="absolute -bottom-2 -right-2 bg-brand-yellow text-white w-8 h-8 rounded-full flex items-center justify-center border-4 border-white">
                    <AlertCircle size={16} strokeWidth={3} />
                  </div>
                </div>
                
                <h3 className="text-2xl font-black text-brand-blue mb-4">Aún no registramos tu paquete</h3>
                
                <p className="text-brand-text-gray mb-6 text-balance text-lg">
                  El paquete <strong>{result.trackingNumber}</strong> aún no ha llegado a nuestras bodegas en Miami.
                </p>
                
                <div className="bg-brand-blue/5 border border-brand-blue/10 rounded-2xl p-4 sm:px-6 mb-8 inline-block max-w-md mx-auto">
                  <p className="text-sm text-brand-blue font-semibold flex items-start sm:items-center gap-3 text-left">
                    <Calendar size={24} className="shrink-0 text-brand-blue/60" /> 
                    El registro dura aproximadamente 72h en visualizarse en nuestro sistema.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <p className="text-brand-text-light text-sm font-medium">
                    O bien, consulta con un ejecutivo para averiguar sobre el paquete:
                  </p>
                  <a
                    href={`https://wa.me/50672601238?text=Hola,%20me%20gustar%C3%ADa%20averiguar%20sobre%20mi%20paquete%20con%20tracking:%20${result.trackingNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-whatsapp inline-flex w-full sm:w-auto text-base shadow-lg hover:shadow-xl wa-pulse"
                  >
                    <MessageCircle size={22} />
                    Consultar por WhatsApp
                  </a>
                </div>
              </div>
            )}

            {result.status === 'SUCCESS' && result.rawData?.package && (
              <div className="grid lg:grid-cols-3 gap-8">
                
                {/* Timeline Column */}
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden">
                  {/* Header info */}
                  <div className="bg-brand-blue p-6 text-white grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="col-span-2 md:col-span-2">
                      <p className="text-brand-light/70 text-xs mb-1 uppercase font-semibold">Tracking</p>
                      <p className="font-bold truncate text-lg" title={result.rawData.package.tracking}>{result.rawData.package.tracking}</p>
                    </div>
                    <div className="col-span-2 md:col-span-2">
                      <p className="text-brand-light/70 text-xs mb-1 uppercase font-semibold">Estado Actual</p>
                      <p className="font-bold flex items-center gap-2 text-lg text-brand-yellow">
                        <span className="w-2 h-2 rounded-full bg-brand-yellow animate-pulse"></span>
                        {result.rawData.package.statusLabel}
                      </p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="p-6 sm:p-10">
                    <h4 className="text-xl font-black text-brand-blue mb-8">Historial de eventos</h4>
                    <div className="relative border-l-2 border-gray-100 ml-4 space-y-8">
                      {result.rawData.timeline?.map((event, index) => {
                        const isLatest = index === 0;
                        return (
                          <div key={index} className="relative pl-10">
                            {/* Icon / Dot */}
                            <div className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${
                              isLatest 
                                ? 'bg-brand-blue text-white' 
                                : 'bg-gray-100 text-gray-400'
                            }`}>
                              {renderIcon(event.icon)}
                            </div>
                            
                            <div className={`${isLatest ? 'text-brand-blue' : 'text-brand-text-light'} bg-gray-50/50 p-4 rounded-2xl border border-gray-50`}>
                              <p className="font-bold text-lg mb-1">{event.status}</p>
                              <p className="text-sm opacity-80 mb-3">{event.description}</p>
                              
                              <div className="flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-wider opacity-70">
                                <span className="flex items-center gap-1">
                                  <Calendar size={14} /> {formatDate(event.date)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Package Details Sidebar */}
                <div className="space-y-6">
                  {/* Package Info */}
                  <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-6">
                    <h4 className="font-bold text-brand-blue mb-4 flex items-center gap-2">
                      <Package size={20} className="text-brand-red" />
                      Detalles del paquete
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-brand-text-light uppercase font-semibold">Consignatario</p>
                        <p className="font-medium text-brand-text-gray">{result.rawData.package.consignatario}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-brand-text-light uppercase font-semibold">Peso</p>
                          <p className="font-medium text-brand-text-gray">{result.rawData.package.weight} {result.rawData.package.weightUnit}</p>
                        </div>
                        <div>
                          <p className="text-xs text-brand-text-light uppercase font-semibold">Proveedor</p>
                          <p className="font-medium text-brand-text-gray">{result.rawData.package.provider}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-brand-text-light uppercase font-semibold">Descripción</p>
                        <p className="font-medium text-brand-text-gray">{result.rawData.package.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Photos */}
                  {result.rawData.package.fotos && result.rawData.package.fotos.length > 0 && (
                    <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-6">
                      <h4 className="font-bold text-brand-blue mb-4 flex items-center gap-2">
                        <ImageIcon size={20} className="text-brand-blue" />
                        Evidencia fotográfica
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {result.rawData.package.fotos.map((foto) => (
                          <a 
                            key={foto.id} 
                            href={foto.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 block group hover:shadow-md transition-all"
                          >
                            <Image 
                              src={foto.url} 
                              alt={`Foto de paquete ${foto.id}`}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
