'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Layers, Play, CheckCircle2, XCircle, Loader2, ArrowLeft, PackageCheck, PackagePlus } from 'lucide-react';
import Link from 'next/link';
import { formatCostaRicaDateTime, extractCompanyAndClient } from '@/lib/billing';

interface Result {
  tracking: string;
  status: 'success' | 'error';
  message: string;
}

export default function BodegaMasivo() {
  const [mode, setMode] = useState<'recepcion' | 'entrega'>('recepcion');
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [mode]);

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
        const formattedDate = formatCostaRicaDateTime();

        if (mode === 'recepcion') {
          // ==================== RECEPCIÓN MASIVA ====================
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

        } else {
          // ==================== ENTREGA MASIVA ====================
          // 1. Intentar actualizar en inventario existente
          const invRes = await fetch(`/api/inventory/${encodeURIComponent(tracking)}`);
          if (invRes.ok) {
            const invData = await invRes.json();
            const existingPkg = invData.data;
            const oldHistory = Array.isArray(existingPkg?.history) ? existingPkg.history : [];
            const newHistory = [
              {
                date: formattedDate,
                action: 'Paquete Entregado al Cliente (Entrega Masiva)',
                user: 'Operador Bodega'
              },
              ...oldHistory
            ];

            const patchRes = await fetch(`/api/inventory/${encodeURIComponent(tracking)}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: 'Entregado',
                history: newHistory
              })
            });

            if (patchRes.ok) {
              newResults.push({ tracking, status: 'success', message: 'Marcado como Entregado' });
            } else {
              newResults.push({ tracking, status: 'error', message: 'Error al actualizar estado en BD' });
            }
          } else {
            // 2. Si no está en inventario local, buscar en Worldbox y registrar como Entregado
            const wbRes = await fetch(`/api/tracking?number=${encodeURIComponent(tracking)}`);
            const wbData = await wbRes.json();
            
            if (wbData.status === 'SUCCESS' && wbData.rawData?.package) {
              const pkg = wbData.rawData.package;
              const fullConsignee = pkg.clientName || pkg.consignatario || pkg.consignee || pkg.client || pkg.name || 'Desconocido';
              const extracted = extractCompanyAndClient(
                fullConsignee,
                pkg.tenantName || pkg.company,
                pkg.clientCode
              );

              const createRes = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: tracking,
                  client: extracted.cleanClient,
                  company: pkg.company || extracted.company,
                  weight: `${pkg.weight || '0'} ${pkg.weightUnit || 'lbs'}`,
                  status: 'Entregado',
                  history: [{
                    date: formattedDate,
                    action: 'Paquete Entregado al Cliente (Entrega Masiva)',
                    user: 'Operador Bodega'
                  }]
                })
              });

              if (createRes.ok) {
                newResults.push({ tracking, status: 'success', message: 'Registrado y Marcado como Entregado' });
              } else {
                newResults.push({ tracking, status: 'error', message: 'Error al registrar en BD' });
              }
            } else {
              newResults.push({ tracking, status: 'error', message: 'No encontrado en inventario ni en Worldbox' });
            }
          }
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
            {mode === 'recepcion' ? 'Recepción Masiva' : 'Entrega Masiva'}
          </h1>
          <p className="text-gray-500 text-sm">
            {mode === 'recepcion' 
              ? 'Escanea múltiples trackings a la vez para ingresarlos a la Bodega CR.' 
              : 'Escanea múltiples trackings a la vez para marcar los paquetes como Entregados al cliente.'}
          </p>
        </div>
        <Link 
          href="/admin/bodega" 
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-blue hover:text-brand-blue/80 bg-white border border-gray-200 px-3.5 py-2 rounded-xl shadow-sm transition-colors"
        >
          <ArrowLeft size={14} /> Volver a escáner individual
        </Link>
      </div>

      {/* Tabs Selector de Modo: Recepción Masiva vs Entrega Masiva */}
      <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200 inline-flex w-full sm:w-auto gap-1">
        <button
          onClick={() => { setMode('recepcion'); setResults([]); }}
          disabled={isProcessing}
          className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
            mode === 'recepcion'
              ? 'bg-brand-blue text-white shadow-md'
              : 'text-gray-500 hover:text-brand-blue hover:bg-gray-50'
          }`}
        >
          <PackagePlus size={18} />
          <span>Recepción Masiva</span>
        </button>
        <button
          onClick={() => { setMode('entrega'); setResults([]); }}
          disabled={isProcessing}
          className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
            mode === 'entrega'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-500 hover:text-emerald-700 hover:bg-gray-50'
          }`}
        >
          <PackageCheck size={18} />
          <span>Entrega Masiva</span>
        </button>
      </div>

      {/* Rectángulo Fijo de Escaneo Masivo */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-gray-700">
            Escanea los paquetes para {mode === 'recepcion' ? 'ingreso' : 'entrega'} (uno por línea):
          </label>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            mode === 'recepcion' ? 'bg-blue-50 text-brand-blue' : 'bg-emerald-50 text-emerald-700'
          }`}>
            Modo: {mode === 'recepcion' ? 'Recepción a Bodega' : 'Entrega a Cliente'}
          </span>
        </div>
        
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
            className={`w-full h-56 p-4 rounded-2xl bg-gray-50 border-2 font-mono font-bold text-sm focus:ring-2 focus:bg-white transition-all disabled:opacity-50 resize-none outline-none leading-relaxed ${
              mode === 'recepcion' 
                ? 'border-brand-blue/80 text-brand-blue focus:border-brand-blue focus:ring-brand-blue/20' 
                : 'border-emerald-600/80 text-emerald-800 focus:border-emerald-600 focus:ring-emerald-600/20'
            }`}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-1">
          <p className="text-sm text-gray-600 font-bold">
            Total detectados: <span className={`font-black ${mode === 'recepcion' ? 'text-brand-blue' : 'text-emerald-700'}`}>{detectedCount}</span>
          </p>
          <button 
            onClick={handleProcess}
            disabled={isProcessing || detectedCount === 0}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
              mode === 'recepcion'
                ? 'bg-brand-blue hover:bg-brand-blue/90 shadow-brand-blue/20'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
            }`}
          >
            {isProcessing ? (
              <><Loader2 className="animate-spin" size={18} /> Procesando...</>
            ) : (
              <><Play size={18} /> Procesar {mode === 'recepcion' ? 'Recepción' : 'Entrega'}</>
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
              Resultados del Proceso ({mode === 'recepcion' ? 'Recepción' : 'Entrega'})
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
