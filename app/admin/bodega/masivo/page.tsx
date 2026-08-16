'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Layers, Play, CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatCostaRicaDateTime, extractCompanyAndClient } from '@/lib/billing';

interface Result {
  tracking: string;
  status: 'success' | 'error';
  message: string;
}

export default function BodegaMasivo() {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleProcess = async () => {
    const trackings = text
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (trackings.length === 0) return;

    setIsProcessing(true);
    setResults([]);
    
    const newResults: Result[] = [];
    
    for (const tracking of trackings) {
      try {
        // RECEPCIÓN MASIVA: Buscar en Worldbox y guardar como "En Bodega"
        const wbRes = await fetch(`/api/tracking?number=${encodeURIComponent(tracking)}`);
        const wbData = await wbRes.json();
        
        let client = 'Desconocido';
        let company = 'JRS CARGO';
        let weightStr = '0 lbs';
        
        if (wbData.status === 'SUCCESS' && wbData.rawData?.package) {
          const pkg = wbData.rawData.package;
          const fullConsignee = pkg.clientName || pkg.consignatario || pkg.consignee || pkg.client || pkg.name || 'Desconocido';
          const extracted = extractCompanyAndClient(
            fullConsignee,
            pkg.tenantName || pkg.company,
            pkg.clientCode
          );
          company = pkg.company || extracted.company;
          client = extracted.cleanClient;
          weightStr = `${pkg.weight || '0'} ${pkg.weightUnit || 'lbs'}`;
        }

        if (wbData.status !== 'SUCCESS' || !wbData.rawData?.package) {
          newResults.push({ tracking, status: 'error', message: 'No encontrado en Worldbox' });
          setResults([...newResults]);
          continue;
        }

        const formattedDate = formatCostaRicaDateTime();
        
        const res = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: tracking,
            client: client,
            company: company,
            weight: weightStr,
            status: 'En Bodega',
            history: [{
              date: formattedDate,
              action: 'Paquete Recibido en Bodega Costa Rica (Recepción Masiva)',
              user: 'Operador Bodega'
            }]
          })
        });

        if (res.ok) {
          newResults.push({ tracking, status: 'success', message: 'Ingresado a Bodega CR con éxito' });
        } else {
          newResults.push({ tracking, status: 'error', message: 'Error al guardar en Base de Datos' });
        }
      } catch {
        newResults.push({ tracking, status: 'error', message: 'Error de red o servidor' });
      }
      
      setResults([...newResults]);
    }

    setIsProcessing(false);
    setText('');
    textareaRef.current?.focus();
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const detectedCount = text.split('\n').filter(t => t.trim().length > 0).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-blue mb-1">
            Recepción Masiva
          </h1>
          <p className="text-gray-500 text-sm">
            Escanea múltiples trackings a la vez para ingresarlos a la Bodega CR.
          </p>
        </div>
        <Link 
          href="/admin/bodega" 
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-blue hover:text-brand-blue/80 bg-white border border-gray-200 px-3.5 py-2 rounded-xl shadow-sm transition-colors"
        >
          <ArrowLeft size={14} /> Volver a escáner individual
        </Link>
      </div>

      {/* Rectángulo Fijo de Escaneo Masivo */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <label className="block text-sm font-bold text-gray-700">
          Escanea los paquetes aquí (uno por línea):
        </label>
        
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isProcessing}
            placeholder="Ejemplo:
9400109205568123456789
1Z9999999999999999
TBA123456789000..."
            className="w-full h-56 p-4 rounded-2xl bg-gray-50 border-2 border-brand-blue/80 text-brand-blue font-mono font-bold text-sm focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:bg-white transition-all disabled:opacity-50 resize-none outline-none leading-relaxed"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-1">
          <p className="text-sm text-gray-600 font-bold">
            Total detectados: <span className="text-brand-blue font-black">{detectedCount}</span>
          </p>
          <button 
            onClick={handleProcess}
            disabled={isProcessing || detectedCount === 0}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 bg-brand-blue hover:bg-brand-blue/90 shadow-brand-blue/20"
          >
            {isProcessing ? (
              <><Loader2 className="animate-spin" size={18} /> Procesando...</>
            ) : (
              <><Play size={18} /> Procesar Todos</>
            )}
          </button>
        </div>
      </div>

      {/* Log de Resultados */}
      {results.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
            <h3 className="font-bold text-brand-blue flex items-center gap-2">
              <Layers size={18} />
              Resultados del Proceso
            </h3>
            <div className="flex gap-3 text-xs font-bold">
              <span className="text-green-700 bg-green-100 px-3 py-1 rounded-xl">Exitosos: {successCount}</span>
              <span className="text-red-700 bg-red-100 px-3 py-1 rounded-xl">Errores: {errorCount}</span>
            </div>
          </div>
          <div className="p-6">
            <div className="grid gap-2.5 max-h-80 overflow-y-auto pr-1">
              {results.map((res, i) => (
                <div key={i} className={`flex items-center justify-between p-3.5 rounded-xl border text-xs ${res.status === 'success' ? 'bg-green-50/70 border-green-200' : 'bg-red-50/70 border-red-200'}`}>
                  <div className="flex items-center gap-2.5">
                    {res.status === 'success' ? (
                      <CheckCircle2 className="text-green-600 shrink-0" size={16} />
                    ) : (
                      <XCircle className="text-red-600 shrink-0" size={16} />
                    )}
                    <span className="font-bold font-mono text-gray-800">{res.tracking}</span>
                  </div>
                  <span className={`font-bold ${res.status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                    {res.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
