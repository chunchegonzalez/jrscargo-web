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
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus el input de escaneo siempre para la pistola
  useEffect(() => {
    const focusTimer = setInterval(() => {
      if (document.activeElement !== inputRef.current && !isLoading) {
        inputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(focusTimer);
  }, [isLoading]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedCode.trim()) return;

    setIsLoading(true);
    setPackageData(null);
    
    try {
      // 1. Buscamos el paquete en Worldbox (API)
      const res = await fetch(`/api/tracking?number=${encodeURIComponent(scannedCode)}`);
      
      if (!res.ok) {
        throw new Error('Paquete no encontrado en Worldbox');
      }

      const data = await res.json();
      
      if (data.status === 'SUCCESS' && data.rawData?.package) {
        setPackageData(data.rawData.package);
        // alert('Paquete encontrado');
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
    // Aquí conectaremos con Supabase para guardar el paquete localmente
    alert('¡Paquete registrado exitosamente en Bodega CR!');
    
    // Simular que se registró y limpiar la pantalla para el siguiente paquete
    setTimeout(() => {
      setPackageData(null);
      setScannedCode('');
      inputRef.current?.focus();
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto">
      
      <div className="mb-8">
        <h1 className="text-3xl font-black text-brand-blue mb-2">Escáner de Bodega</h1>
        <p className="text-gray-500">Escanea los paquetes entrantes para registrarlos en Costa Rica.</p>
      </div>

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

      {/* Resultados de la búsqueda */}
      {packageData && (
        <div className="bg-white rounded-3xl shadow-sm border border-brand-blue/20 overflow-hidden animate-fade-in">
          <div className="bg-brand-blue/5 p-6 border-b border-brand-blue/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package size={24} className="text-brand-blue" />
              <h3 className="text-xl font-bold text-brand-blue">
                Tracking: {packageData.tracking}
              </h3>
            </div>
            <span className="bg-brand-yellow/20 text-brand-blue font-bold px-4 py-1.5 rounded-full text-sm">
              Encontrado en Worldbox
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

            {/* Acción de Registro */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col justify-center text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <h4 className="text-lg font-bold text-brand-blue mb-2">Ingresar a Bodega CR</h4>
              <p className="text-gray-500 text-sm mb-6 text-balance">
                Al confirmar, este paquete será trasladado a tu sistema de inventario local. El cliente verá que ya está en Costa Rica.
              </p>
              
              <button 
                onClick={handleRegisterLocal}
                className="btn-primary py-4 w-full shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
              >
                Confirmar Recepción Local <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
