'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ScanBarcode, Package, User, CheckCircle2, ArrowRight } from 'lucide-react';

interface PackageData {
  tracking: string;
  consignatario: string;
  weight: string;
  weightUnit: string;
  provider: string;
  description: string;
}

export default function BodegaScanner() {
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
        const fullConsignee = pkg.consignatario || pkg.consignee || pkg.client || pkg.name || 'Desconocido';
        const upperConsignee = fullConsignee.toUpperCase();
        let extractedCompany = 'Independiente';
        let cleanClient = fullConsignee;

        if (upperConsignee.includes('JRS CARGO')) {
          extractedCompany = 'JRS CARGO';
          cleanClient = fullConsignee.replace(/jrs\s*cargo/i, '').trim();
        } else if (upperConsignee.includes('AT IMPORTS')) {
          extractedCompany = 'AT IMPORTS';
          cleanClient = fullConsignee.replace(/at\s*imports/i, '').trim();
        } else if (/\basi\b/i.test(fullConsignee)) {
          extractedCompany = 'ASI';
          cleanClient = fullConsignee.replace(/\basi\b/i, '').trim();
        }

        const newPackageData = {
          ...pkg,
          consignatario: cleanClient,
          provider: extractedCompany
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
      alert(errorMsg);
      // Limpiamos el input para que vuelva a intentar
      setScannedCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterLocal = async () => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('es-CR') + ' ' + now.toLocaleTimeString('es-CR');
    
    const newEvent = {
      date: formattedDate,
      action: 'Paquete Recibido en Bodega Costa Rica',
      user: 'Operador Bodega'
    };

    const newHistory = [newEvent, ...history];

    setLocalStatus('En Bodega CR');
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
          status: 'En Bodega CR',
          history: newHistory
        })
      });
      if (!res.ok) {
        alert('Error: No se pudo guardar el paquete en la base de datos.');
        setLocalStatus(null);
      }
    } catch (e) {
      console.error('Error guardando en BD', e);
      alert('Error de conexión al guardar el paquete.');
      setLocalStatus(null);
    }
  };

  const handleDeliver = async () => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('es-CR') + ' ' + now.toLocaleTimeString('es-CR');
    
    const newEvent = {
      date: formattedDate,
      action: 'Paquete Entregado al Cliente',
      user: 'Operador Bodega'
    };

    const newHistory = [newEvent, ...history];

    setLocalStatus('Entregado al Cliente');
    setHistory(newHistory);

    try {
      await fetch(`/api/inventory/${packageData?.tracking}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Entregado al Cliente',
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
      
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-brand-blue mb-2">Escáner de Bodega</h1>
          <p className="text-gray-500">Escanea los paquetes entrantes para registrarlos en Costa Rica.</p>
        </div>
        {packageData && (
          <button onClick={resetScanner} className="text-sm font-bold text-brand-red hover:underline">
            Escanear Otro Paquete
          </button>
        )}
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
              <span className={`font-bold px-4 py-1.5 rounded-full text-sm ${localStatus === 'Entregado' ? 'bg-green-100 text-green-700' : localStatus === 'En Bodega CR' ? 'bg-brand-blue text-white' : 'bg-brand-yellow/20 text-brand-blue'}`}>
                {localStatus || 'Encontrado en Worldbox'}
              </span>
            </div>

            <div className="p-8 grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Consignatario</p>
                  <div className="flex items-center gap-3 text-brand-blue font-medium text-lg bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <User size={20} className="text-brand-text-light" />
                    {packageData.consignatario?.replace(/jrs\s*cargo/i, '').trim()}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Peso</p>
                    <p className="text-brand-text-gray font-medium bg-gray-50 p-4 rounded-xl border border-gray-100">
                      {packageData.weight} {packageData.weightUnit}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Proveedor</p>
                    <p className="text-brand-text-gray font-medium bg-gray-50 p-4 rounded-xl border border-gray-100 truncate">
                      {packageData.provider || 'N/A'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Descripción</p>
                  <p className="text-brand-text-gray bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
                    {packageData.description}
                  </p>
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

                {localStatus === 'En Bodega CR' && (
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

                {localStatus === 'Entregado' && (
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex-1 flex flex-col justify-center text-center opacity-70">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-200">
                      <CheckCircle2 size={32} className="text-gray-400" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-500 mb-2">Paquete Entregado</h4>
                    <p className="text-gray-400 text-sm mb-6 text-balance">
                      Este paquete ya no está en tu inventario activo.
                    </p>
                    <button 
                      onClick={resetScanner}
                      className="bg-white border-2 border-gray-200 text-gray-500 font-bold rounded-xl py-4 w-full hover:border-brand-blue hover:text-brand-blue transition-colors flex items-center justify-center gap-2"
                    >
                      Escanear Nuevo
                    </button>
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
