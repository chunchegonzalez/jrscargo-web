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
            const fullConsignee = pkg.consignatario || pkg.clientName || pkg.consignee || pkg.client || pkg.name || 'Desconocido';
            const extracted = extractCompanyAndClient(
              pkg.consignatario || fullConsignee,
              pkg.tenantName || pkg.company,
              pkg.clientCode,
              pkg.clientName
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
              const fullConsignee = pkg.consignatario || pkg.clientName || pkg.consignee || pkg.client || pkg.name || 'Desconocido';
              const extracted = extractCompanyAndClient(
                pkg.consignatario || fullConsignee,
                pkg.tenantName || pkg.company,
                pkg.clientCode,
                pkg.clientName
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
    <div className="w-full max-w-5xl mx-auto space-y-5">
      {/* Header compacto y elegante */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {mode === 'recepcion' ? 'Recepción Masiva' : 'Entrega Masiva'}
            </h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                mode === 'recepcion'
                  ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/15'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              Lote CR
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {mode === 'recepcion'
              ? 'Escanea múltiples trackings a la vez para ingresarlos a la Bodega CR.'
              : 'Escanea múltiples trackings a la vez para marcar los paquetes como Entregados al cliente.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/bodega"
            className="h-9 px-3.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs sm:text-sm inline-flex items-center gap-1.5 transition-all"
          >
            <ArrowLeft size={14} className="text-slate-500" />
            <span>Volver a escáner individual</span>
          </Link>
        </div>
      </div>

      {/* Tabs Selector de Modo: Recepción Masiva vs Entrega Masiva */}
      <div className="bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 inline-flex w-full sm:w-auto gap-1">
        <button
          onClick={() => { setMode('recepcion'); setResults([]); }}
          disabled={isProcessing}
          className={`flex-1 sm:flex-initial h-9 px-4 rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            mode === 'recepcion'
              ? 'bg-brand-blue text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <PackagePlus size={15} />
          <span>Recepción Masiva</span>
        </button>
        <button
          onClick={() => { setMode('entrega'); setResults([]); }}
          disabled={isProcessing}
          className={`flex-1 sm:flex-initial h-9 px-4 rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            mode === 'entrega'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <PackageCheck size={15} />
          <span>Entrega Masiva</span>
        </button>
      </div>

      {/* Tarjeta Principal de Escaneo Masivo */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50/95 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-2">
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Escanea los paquetes para {mode === 'recepcion' ? 'ingreso' : 'entrega'} (uno por línea)
          </label>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              mode === 'recepcion'
                ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/20'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                mode === 'recepcion' ? 'bg-brand-blue' : 'bg-emerald-500'
              }`}
            />
            Modo: {mode === 'recepcion' ? 'Recepción a Bodega' : 'Entrega a Cliente'}
          </span>
        </div>

        <div className="p-5 space-y-4">
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
              className={`w-full h-56 p-3.5 rounded-lg bg-white border border-slate-200/90 font-mono font-medium text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all disabled:opacity-50 resize-none leading-relaxed ${
                mode === 'recepcion'
                  ? 'focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10'
                  : 'focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10'
              }`}
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-1">
            <div className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-600 font-medium">
              <span>Total detectados:</span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-md font-bold tabular-nums text-xs border ${
                  mode === 'recepcion'
                    ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/20'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {detectedCount} {detectedCount === 1 ? 'paquete' : 'paquetes'}
              </span>
            </div>
            <button
              onClick={handleProcess}
              disabled={isProcessing || detectedCount === 0}
              className={`h-10 px-5 rounded-lg text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer ${
                mode === 'recepcion'
                  ? 'bg-brand-blue hover:bg-[#0e354b]'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={15} /> Procesando...
                </>
              ) : (
                <>
                  <Play size={15} /> Procesar {mode === 'recepcion' ? 'Recepción' : 'Entrega'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Log de Resultados */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-2 bg-slate-50/95">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers size={15} className="text-brand-blue" />
              Resultados del Proceso ({mode === 'recepcion' ? 'Recepción' : 'Entrega'})
            </h3>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Exitosos: {successCount}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-red-50 text-red-700 border-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Errores: {errorCount}
              </span>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/95 border-b border-slate-200/90 text-[11px] uppercase tracking-wider text-slate-500 font-semibold sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3.5 w-12">#</th>
                  <th className="py-2.5 px-3.5">Tracking</th>
                  <th className="py-2.5 px-3.5">Estado</th>
                  <th className="py-2.5 px-3.5 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {results.map((res, i) => (
                  <tr key={i} className="hover:bg-slate-50/90 transition-colors">
                    <td className="py-2.5 px-3.5 text-slate-400 font-mono text-xs tabular-nums">
                      {i + 1}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-semibold text-slate-800">
                      {res.tracking}
                    </td>
                    <td className="py-2.5 px-3.5">
                      {res.status === 'success' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                          <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                          Completado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-red-50 text-red-700 border-red-200">
                          <XCircle size={12} className="text-red-600 shrink-0" />
                          Error
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-2.5 px-3.5 text-right font-medium ${
                        res.status === 'success' ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {res.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
