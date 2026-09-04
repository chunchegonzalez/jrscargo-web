'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ScanBarcode, Package, User, CheckCircle2, ArrowRight, Layers } from 'lucide-react';
import { useModal } from '@/app/components/ModalProvider';
import { formatCostaRicaDateTime, extractCompanyAndClient } from '@/lib/billing';

interface PackageData {
  tracking: string;
  consignatario: string;
  weight: string;
  weightUnit: string;
  provider: string;
  description: string;
  isManual?: boolean;
}

export default function BodegaScanner() {
  const { showAlert, showConfirm } = useModal();
  const [scannedCode, setScannedCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [packageData, setPackageData] = useState<PackageData | null>(null);
  
  const [localStatus, setLocalStatus] = useState<string | null>(null);
  const [history, setHistory] = useState<{date: string, action: string, user: string}[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus el input de escaneo siempre para la pistola
  useEffect(() => {
    const focusTimer = setInterval(() => {
      if (document.activeElement !== inputRef.current && !isLoading && !packageData) {
        inputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(focusTimer);
  }, [isLoading, packageData]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedCode.trim()) return;

    setIsLoading(true);
    setPackageData(null);
    setLocalStatus(null);
    setHistory([]);
    
    try {
      // 1. Buscamos el paquete en Worldbox (API)
      const res = await fetch(`/api/tracking?number=${encodeURIComponent(scannedCode)}`);
      
      if (!res.ok) {
        throw new Error('Paquete no encontrado en Worldbox');
      }

      const data = await res.json();
      
      if (data.status === 'SUCCESS' && data.rawData?.package) {
        const pkg = data.rawData.package;
        const fullConsignee = pkg.consignatario || pkg.clientName || pkg.consignee || pkg.client || pkg.name || 'Desconocido';
        const { company: extractedCompany, cleanClient } = extractCompanyAndClient(
          pkg.consignatario || fullConsignee,
          pkg.tenantName || pkg.company,
          pkg.clientCode,
          pkg.clientName
        );

        const newPackageData = {
          ...pkg,
          consignatario: cleanClient,
          provider: pkg.company || extractedCompany
        };

        setPackageData(newPackageData);
        
        // 2. Revisamos si ya está en nuestra BD local de Supabase
        const dbRes = await fetch(`/api/inventory/${encodeURIComponent(scannedCode)}`);
        if (dbRes.ok) {
          const dbData = await dbRes.json();
          if (dbData.success && dbData.data) {
            setLocalStatus(dbData.data.status);
            setHistory(dbData.data.history || []);
          } else {
            setLocalStatus(null);
          }
        } else {
          setLocalStatus(null); 
        }
      } else {
        throw new Error('No se encontraron datos del paquete');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error al buscar paquete';
      if (errorMsg === 'Paquete no encontrado en Worldbox' || errorMsg === 'No se encontraron datos del paquete') {
        const wantsManual = await showConfirm(
          'Paquete no encontrado', 
          'El paquete no existe en Worldbox. ¿Deseas ingresarlo manualmente a tu base local?'
        );
        if (wantsManual) {
          setPackageData({
            tracking: scannedCode,
            consignatario: '',
            weight: '',
            weightUnit: 'lbs',
            provider: 'JRS CARGO',
            description: '',
            isManual: true
          });
          setLocalStatus(null);
          setIsLoading(false);
          return;
        }
      } else {
        await showAlert('Aviso', errorMsg);
      }
      // Limpiamos el input para que vuelva a intentar
      setScannedCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterLocal = async () => {
    const formattedDate = formatCostaRicaDateTime();
    
    const newEvent = {
      date: formattedDate,
      action: 'Paquete Recibido en Bodega Costa Rica',
      user: 'Operador Bodega'
    };

    const newHistory = [newEvent, ...history];

    setLocalStatus('En Bodega');
    setHistory(newHistory);

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: packageData?.tracking,
          client: packageData?.consignatario || 'Desconocido',
          company: packageData?.provider || 'N/A',
          weight: `${packageData?.weight || '0'} ${packageData?.weightUnit || 'lbs'}`,
          status: 'En Bodega',
          history: newHistory
        })
      });
      if (!res.ok) {
        await showAlert('Aviso', 'Error: No se pudo guardar el paquete en la base de datos.');
        setLocalStatus(null);
      }
    } catch (e) {
      console.error('Error guardando en BD', e);
      await showAlert('Aviso', 'Error de conexión al guardar el paquete.');
      setLocalStatus(null);
    }
  };

  const handleDeliver = async () => {
    const formattedDate = formatCostaRicaDateTime();
    
    const newEvent = {
      date: formattedDate,
      action: 'Paquete Entregado al Cliente',
      user: 'Operador Bodega'
    };

    const newHistory = [newEvent, ...history];

    setLocalStatus('Entregado');
    setHistory(newHistory);

    try {
      await fetch(`/api/inventory/${packageData?.tracking}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Entregado',
          history: newHistory
        })
      });
    } catch (e) {
      console.error('Error actualizando en BD', e);
    }
  };

  const handleRevertDeliver = async () => {
    const formattedDate = formatCostaRicaDateTime();
    
    const newEvent = {
      date: formattedDate,
      action: 'Reversión: Paquete devuelto a Bodega',
      user: 'Operador Bodega'
    };

    const newHistory = [newEvent, ...history];

    setLocalStatus('En Bodega');
    setHistory(newHistory);

    try {
      await fetch(`/api/inventory/${packageData?.tracking}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'En Bodega',
          history: newHistory
        })
      });
    } catch (e) {
      console.error('Error actualizando en BD', e);
    }
  };

  const resetScanner = () => {
    setPackageData(null);
    setScannedCode('');
    setLocalStatus(null);
    setHistory([]);
    inputRef.current?.focus();
  };

  return (
    <div className="max-w-4xl mx-auto">
      
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-blue mb-1">Escáner de Bodega</h1>
          <p className="text-gray-500 text-sm">Escanea los paquetes entrantes para registrarlos en Costa Rica.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/bodega/masivo"
            className="px-4 py-2.5 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-brand-blue/90 transition-all flex items-center gap-2 shadow-sm"
          >
            <Layers size={15} />
            <span>Acción Masiva</span>
          </Link>
          {packageData && (
            <button onClick={resetScanner} className="px-3 py-2 text-xs font-bold text-brand-red hover:underline">
              Escanear Otro Paquete
            </button>
          )}
        </div>
      </div>

      {!packageData && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-8">
          <form onSubmit={handleScan} className="relative">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <ScanBarcode size={28} className="text-brand-blue" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={scannedCode}
              onChange={(e) => setScannedCode(e.target.value)}
              disabled={isLoading}
              placeholder="Pistola de código de barras lista..."
              className="w-full pl-16 pr-6 py-5 rounded-2xl bg-gray-50 border-2 border-gray-200 text-brand-blue font-bold text-2xl placeholder:text-gray-400 focus:border-brand-blue focus:ring-0 focus:bg-white transition-all disabled:opacity-50"
              autoComplete="off"
              autoFocus
            />
            <button 
              type="submit"
              disabled={isLoading || !scannedCode.trim()}
              className="absolute right-3 top-3 bottom-3 bg-brand-blue text-white px-6 rounded-xl font-bold hover:bg-brand-red disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Buscando...' : 'Buscar'}
            </button>
          </form>
        </div>
      )}

      {/* Resultados de la búsqueda */}
      {packageData && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-brand-blue/20 overflow-hidden animate-fade-in">
            <div className="bg-brand-blue/5 p-6 border-b border-brand-blue/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package size={24} className="text-brand-blue" />
                <h3 className="text-xl font-bold text-brand-blue">
                  Tracking: {packageData.tracking}
                </h3>
              </div>
              <span className={`font-bold px-4 py-1.5 rounded-full text-sm ${localStatus?.toLowerCase().includes('entregad') ? 'bg-green-100 text-green-700' : localStatus ? 'bg-brand-blue text-white' : packageData.isManual ? 'bg-orange-100 text-orange-700' : 'bg-brand-yellow/20 text-brand-blue'}`}>
                {localStatus?.toLowerCase().includes('entregad') ? 'Entregado' : localStatus ? 'En Bodega' : (packageData.isManual ? 'Registro Manual' : 'Encontrado en Worldbox')}
              </span>
            </div>

            <div className="p-8 grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="mb-4 relative">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Consignatario</p>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={packageData.consignatario || ''}
                        onChange={(e) => setPackageData({ ...packageData, consignatario: e.target.value })}
                        className="w-full pl-10 pr-4 py-4 rounded-xl border border-gray-100 bg-gray-50 text-brand-blue font-bold focus:border-brand-blue focus:ring-0 focus:bg-white transition-colors"
                      />
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Peso</p>
                    {packageData.isManual ? (
                      <div className="flex bg-gray-50 rounded-xl border border-gray-100 focus-within:border-brand-blue transition-colors overflow-hidden">
                        <input
                          type="number"
                          value={packageData.weight || ''}
                          onChange={(e) => setPackageData({ ...packageData, weight: e.target.value })}
                          className="w-full bg-transparent p-4 font-medium text-brand-blue focus:outline-none"
                          placeholder="Ej. 1.5"
                        />
                        <select
                          value={packageData.weightUnit || 'lbs'}
                          onChange={(e) => setPackageData({ ...packageData, weightUnit: e.target.value })}
                          className="bg-transparent border-l border-gray-100 px-4 font-medium text-brand-blue focus:outline-none cursor-pointer"
                        >
                          <option value="lbs">lbs</option>
                          <option value="kgs">kgs</option>
                        </select>
                      </div>
                    ) : (
                      <p className="text-brand-text-gray font-medium bg-gray-50 p-4 rounded-xl border border-gray-100">
                        {(() => {
                          const num = parseFloat(String(packageData.weight));
                          const unit = (packageData.weightUnit || 'lbs').toLowerCase();
                          if (isNaN(num)) return `${packageData.weight} ${packageData.weightUnit || 'lbs'}`;
                          if (unit.includes('kg')) {
                            const lbs = (num * 2.20462).toFixed(2);
                            return `${num} kg (${lbs} lbs)`;
                          } else {
                            const kg = (num * 0.453592).toFixed(2);
                            return `${num} lbs (${kg} kg)`;
                          }
                        })()}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Empresa</p>
                    <select
                      value={packageData.provider || 'JRS CARGO'}
                      onChange={(e) => setPackageData({ ...packageData, provider: e.target.value })}
                      className="w-full text-brand-text-gray font-medium bg-gray-50 p-4 rounded-xl border border-gray-100 focus:border-brand-blue focus:ring-0 cursor-pointer"
                    >
                      <option value="JRS CARGO">JRS CARGO</option>
                      <option value="ATLANTIC IMPORTS">ATLANTIC IMPORTS</option>
                      <option value="JR LOGISTICS">JR LOGISTICS</option>
                      <option value="TRINITY BOX">TRINITY BOX</option>
                    </select>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Descripción</p>
                  {packageData.isManual ? (
                    <textarea
                      value={packageData.description || ''}
                      onChange={(e) => setPackageData({ ...packageData, description: e.target.value })}
                      className="w-full text-brand-blue font-medium bg-gray-50 p-4 rounded-xl border border-gray-100 focus:border-brand-blue focus:outline-none focus:ring-0 transition-colors"
                      rows={2}
                      placeholder="Agrega una descripción o contenido del paquete..."
                    />
                  ) : (
                    <p className="text-brand-text-gray bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
                      {packageData.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-col gap-4">
                {!localStatus && (
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex-1 flex flex-col justify-center text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <CheckCircle2 size={32} className="text-gray-400" />
                    </div>
                    <h4 className="text-lg font-bold text-brand-blue mb-2">Ingresar a Bodega CR</h4>
                    <p className="text-gray-500 text-sm mb-6 text-balance">
                      Al confirmar, este paquete será trasladado a tu sistema de inventario local. El cliente verá que ya está en Costa Rica.
                    </p>
                    <button 
                      onClick={handleRegisterLocal}
                      className="btn-primary py-4 w-full shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                    >
                      Confirmar Recepción <ArrowRight size={20} />
                    </button>
                  </div>
                )}

                {localStatus && !localStatus.toLowerCase().includes('entregad') && (
                  <div className="bg-green-50 rounded-2xl p-6 border border-green-100 flex-1 flex flex-col justify-center text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <CheckCircle2 size={32} className="text-green-500" />
                    </div>
                    <h4 className="text-lg font-bold text-green-800 mb-2">Paquete en Bodega</h4>
                    <p className="text-green-600/80 text-sm mb-6 text-balance">
                      El paquete está listo para ser entregado al cliente.
                    </p>
                    <button 
                      onClick={handleDeliver}
                      className="bg-green-600 text-white font-bold rounded-xl py-4 w-full shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                    >
                      Entregar al Cliente <ArrowRight size={20} />
                    </button>
                  </div>
                )}

                {localStatus?.includes('Entregado') && (
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex-1 flex flex-col justify-center text-center opacity-90">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-200">
                      <CheckCircle2 size={32} className="text-gray-400" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-500 mb-2">Paquete Entregado</h4>
                    <p className="text-gray-400 text-sm mb-6 text-balance">
                      Este paquete ya fue entregado al cliente.
                    </p>
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={resetScanner}
                        className="bg-white border-2 border-gray-200 text-gray-500 font-bold rounded-xl py-3 w-full hover:border-brand-blue hover:text-brand-blue transition-colors flex items-center justify-center"
                      >
                        Escanear Nuevo
                      </button>
                      <button 
                        onClick={handleRevertDeliver}
                        className="bg-transparent text-brand-red text-xs font-bold py-2 hover:underline transition-colors"
                      >
                        ¿Fue un error? Devolver a Inventario
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Historial (Solo si hay acciones locales) */}
          {history.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in p-6">
              <h4 className="font-bold text-brand-blue mb-6">Historial Local</h4>
              <div className="space-y-4">
                {history.map((event, i) => (
                  <div key={i} className="flex gap-4 items-start relative pb-4">
                    {i !== history.length - 1 && (
                      <div className="absolute top-8 bottom-0 left-[11px] w-0.5 bg-gray-100"></div>
                    )}
                    <div className="w-6 h-6 rounded-full bg-brand-blue flex-shrink-0 z-10 border-4 border-white shadow-sm mt-1"></div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex-1">
                      <p className="font-bold text-brand-blue">{event.action}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-gray-500">
                        <span className="bg-white px-2 py-1 rounded border border-gray-200">{event.date}</span>
                        <span>👤 {event.user}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
