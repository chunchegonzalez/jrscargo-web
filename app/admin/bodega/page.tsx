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

  // Auto-focus el input de escaneo para la pistola solo si el usuario no está escribiendo en otro buscador/input
  useEffect(() => {
    const focusTimer = setInterval(() => {
      const activeEl = document.activeElement;
      const isInteractiveElement =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        activeEl?.getAttribute('contenteditable') === 'true';

      if (!isInteractiveElement && activeEl !== inputRef.current && !isLoading && !packageData) {
        inputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(focusTimer);
  }, [isLoading, packageData]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = scannedCode.replace(/[\x00-\x1F\x7F]+/g, '').trim();
    if (!cleanCode) return;

    setScannedCode(cleanCode);
    setIsLoading(true);
    setPackageData(null);
    setLocalStatus(null);
    setHistory([]);
    
    try {
      // 1. Buscamos el paquete en Worldbox (API)
      const res = await fetch(`/api/tracking?number=${encodeURIComponent(cleanCode)}`);
      
      if (!res.ok) {
        throw new Error('Paquete no encontrado en Worldbox');
      }

      const data = await res.json();
      
      if (data.status === 'SUCCESS' && data.rawData?.package) {
        const pkg = data.rawData.package;
        const resolvedTracking = pkg.tracking || data.trackingNumber || cleanCode;
        const fullConsignee = pkg.consignatario || pkg.clientName || pkg.consignee || pkg.client || pkg.name || 'Desconocido';
        const { company: extractedCompany, cleanClient } = extractCompanyAndClient(
          pkg.consignatario || fullConsignee,
          pkg.tenantName || pkg.company,
          pkg.clientCode,
          pkg.clientName
        );

        const newPackageData = {
          ...pkg,
          tracking: resolvedTracking,
          consignatario: cleanClient,
          provider: pkg.company || extractedCompany
        };

        setPackageData(newPackageData);
        
        // 2. Revisamos si ya está en nuestra BD local de Supabase
        const dbRes = await fetch(`/api/inventory/${encodeURIComponent(resolvedTracking)}`);
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
    <div className="w-full max-w-5xl mx-auto space-y-5">
      {/* Encabezado compacto y elegante */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Escáner de Bodega</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/15">
              Operación Individual
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Escanea los paquetes entrantes para registrarlos o despacharlos en Costa Rica.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {packageData && (
            <button
              onClick={resetScanner}
              className="h-9 px-3.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs sm:text-sm inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              Escanear Otro Paquete
            </button>
          )}
          <Link
            href="/admin/bodega/masivo"
            className="h-9 px-3.5 rounded-lg bg-brand-blue hover:bg-[#0e354b] text-white font-semibold text-xs sm:text-sm transition-all inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Layers size={14} />
            <span>Acción Masiva</span>
          </Link>
        </div>
      </div>

      {!packageData && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-5 sm:p-6">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
              <ScanBarcode size={14} className="text-brand-blue" />
              Lectura de Código de Barras / Tracking
            </label>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Lector Activo
            </span>
          </div>
          <form onSubmit={handleScan} className="relative flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <ScanBarcode size={20} className="text-slate-400" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                disabled={isLoading}
                placeholder="Pistola de código de barras lista..."
                className="w-full h-11 pl-11 pr-4 rounded-lg bg-white border border-slate-200/90 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm font-mono font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal transition-all disabled:opacity-50"
                autoComplete="off"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !scannedCode.trim()}
              className="h-11 px-6 bg-brand-blue hover:bg-[#0e354b] text-white rounded-lg font-semibold text-xs sm:text-sm transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              {isLoading ? 'Buscando...' : 'Buscar'}
            </button>
          </form>
        </div>
      )}

      {/* Resultados de la búsqueda */}
      {packageData && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden animate-fade-in">
            <div className="bg-slate-50/95 px-5 py-3.5 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                  <Package size={16} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold leading-none">
                    Tracking Identificado
                  </p>
                  <h3 className="text-sm sm:text-base font-bold font-mono text-slate-900 mt-0.5">
                    {packageData.tracking}
                  </h3>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  localStatus?.toLowerCase().includes('entregad')
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : localStatus
                    ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/20'
                    : packageData.isManual
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-sky-50 text-sky-700 border-sky-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    localStatus?.toLowerCase().includes('entregad')
                      ? 'bg-emerald-500'
                      : localStatus
                      ? 'bg-brand-blue'
                      : packageData.isManual
                      ? 'bg-amber-500'
                      : 'bg-sky-500'
                  }`}
                />
                {localStatus?.toLowerCase().includes('entregad')
                  ? 'Entregado'
                  : localStatus
                  ? 'En Bodega'
                  : packageData.isManual
                  ? 'Registro Manual'
                  : 'Encontrado en Worldbox'}
              </span>
            </div>

            <div className="p-5 sm:p-6 grid md:grid-cols-12 gap-6">
              <div className="md:col-span-7 space-y-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                    Consignatario
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={packageData.consignatario || ''}
                      onChange={(e) => setPackageData({ ...packageData, consignatario: e.target.value })}
                      className="w-full h-10 pl-9 pr-3.5 rounded-lg border border-slate-200/90 bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm font-semibold text-slate-800 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                      Peso
                    </label>
                    {packageData.isManual ? (
                      <div className="flex h-10 bg-white rounded-lg border border-slate-200/90 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/10 transition-all overflow-hidden">
                        <input
                          type="number"
                          value={packageData.weight || ''}
                          onChange={(e) => setPackageData({ ...packageData, weight: e.target.value })}
                          className="w-full bg-transparent px-3 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none"
                          placeholder="Ej. 1.5"
                        />
                        <select
                          value={packageData.weightUnit || 'lbs'}
                          onChange={(e) => setPackageData({ ...packageData, weightUnit: e.target.value })}
                          className="bg-slate-50 border-l border-slate-200/90 px-2.5 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
                        >
                          <option value="lbs">lbs</option>
                          <option value="kgs">kgs</option>
                        </select>
                      </div>
                    ) : (
                      <div className="h-10 px-3.5 rounded-lg border border-slate-200/80 bg-slate-50/70 flex items-center text-xs sm:text-sm font-semibold text-slate-800 font-mono">
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
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                      Empresa
                    </label>
                    <select
                      value={packageData.provider || 'JRS CARGO'}
                      onChange={(e) => setPackageData({ ...packageData, provider: e.target.value })}
                      className="w-full h-10 px-3 bg-white rounded-lg border border-slate-200/90 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm font-medium text-slate-800 cursor-pointer transition-all"
                    >
                      <option value="JRS CARGO">JRS CARGO</option>
                      <option value="ATLANTIC IMPORTS">ATLANTIC IMPORTS</option>
                      <option value="JR LOGISTICS">JR LOGISTICS</option>
                      <option value="TRINITY BOX">TRINITY BOX</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                    Descripción
                  </label>
                  {packageData.isManual ? (
                    <textarea
                      value={packageData.description || ''}
                      onChange={(e) => setPackageData({ ...packageData, description: e.target.value })}
                      className="w-full p-3 bg-white rounded-lg border border-slate-200/90 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm text-slate-800 transition-all"
                      rows={2}
                      placeholder="Agrega una descripción o contenido del paquete..."
                    />
                  ) : (
                    <div className="min-h-[42px] px-3.5 py-2.5 rounded-lg border border-slate-200/80 bg-slate-50/70 text-xs sm:text-sm text-slate-700">
                      {packageData.description || 'Sin descripción registrada'}
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="md:col-span-5 flex flex-col">
                {!localStatus && (
                  <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200/80 flex-1 flex flex-col justify-center text-center">
                    <div className="w-11 h-11 bg-white rounded-lg border border-slate-200/80 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                      <CheckCircle2 size={22} className="text-brand-blue" />
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 mb-1">Ingresar a Bodega CR</h4>
                    <p className="text-slate-500 text-xs mb-5 text-balance leading-relaxed">
                      Al confirmar, este paquete será trasladado a tu sistema de inventario local. El cliente verá que ya está en Costa Rica.
                    </p>
                    <button
                      onClick={handleRegisterLocal}
                      className="h-10 px-4 w-full bg-brand-blue hover:bg-[#0e354b] text-white rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                    >
                      Confirmar Recepción <ArrowRight size={16} />
                    </button>
                  </div>
                )}

                {localStatus && !localStatus.toLowerCase().includes('entregad') && (
                  <div className="bg-emerald-50/60 rounded-xl p-5 border border-emerald-200/80 flex-1 flex flex-col justify-center text-center">
                    <div className="w-11 h-11 bg-white rounded-lg border border-emerald-200/80 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                      <CheckCircle2 size={22} className="text-emerald-600" />
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-emerald-950 mb-1">Paquete en Bodega</h4>
                    <p className="text-emerald-700/80 text-xs mb-5 text-balance leading-relaxed">
                      El paquete está listo para ser entregado al cliente.
                    </p>
                    <button
                      onClick={handleDeliver}
                      className="h-10 px-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                    >
                      Entregar al Cliente <ArrowRight size={16} />
                    </button>
                  </div>
                )}

                {localStatus?.includes('Entregado') && (
                  <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200/80 flex-1 flex flex-col justify-center text-center">
                    <div className="w-11 h-11 bg-white rounded-lg border border-slate-200/80 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                      <CheckCircle2 size={22} className="text-slate-400" />
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-700 mb-1">Paquete Entregado</h4>
                    <p className="text-slate-500 text-xs mb-5 text-balance leading-relaxed">
                      Este paquete ya fue entregado al cliente.
                    </p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={resetScanner}
                        className="h-9 px-4 w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium text-xs sm:text-sm transition-colors flex items-center justify-center cursor-pointer"
                      >
                        Escanear Nuevo
                      </button>
                      <button
                        onClick={handleRevertDeliver}
                        className="bg-transparent text-brand-red text-xs font-semibold py-1.5 hover:underline transition-colors cursor-pointer"
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
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden animate-fade-in">
              <div className="bg-slate-50/95 border-b border-slate-200/90 px-5 py-3 flex items-center justify-between">
                <h4 className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Historial Local ({history.length})
                </h4>
              </div>
              <div className="divide-y divide-slate-100">
                {history.map((event, i) => (
                  <div
                    key={i}
                    className="py-2.5 px-5 hover:bg-slate-50/90 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13px]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-brand-blue shrink-0" />
                      <span className="font-semibold text-slate-800">{event.action}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-500 sm:shrink-0 pl-4 sm:pl-0">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/70 font-mono text-[11px] text-slate-600">
                        {event.date}
                      </span>
                      <span className="font-medium text-slate-600">👤 {event.user}</span>
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
