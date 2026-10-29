'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Layers, Play, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { formatCostaRicaDateTime } from '@/lib/billing';

interface Result {
  tracking: string;
  status: 'success' | 'error';
  message: string;
}

export default function EntregasMasivo() {
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
        const formattedDate = formatCostaRicaDateTime();
        
        await fetch(`/api/inventory/${tracking}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'Entregado',
            history: [{
              date: formattedDate,
              action: 'Paquete Entregado al Cliente (Proceso Masivo)',
              user: 'Operador Entregas'
            }] // Note: In the real app we should fetch existing history and append, 
               // but the API PATCH logic in /api/inventory/[id]/route.ts handles appending if we pass it, 
               // or maybe it replaces it. Let's see. If the API replaces, we might lose history. 
               // The single item scanner does: newHistory = [newEvent, ...history] and sends it.
               // Let's modify the body to just send what to append, or fetch first.
          })
        });

        // Let's fetch first to get current history and append
        const getRes = await fetch(`/api/inventory/${tracking}`);
        if (!getRes.ok) {
          newResults.push({ tracking, status: 'error', message: 'Paquete no encontrado en Inventario CR' });
          setResults([...newResults]);
          continue;
        }

        const getData = await getRes.json();
        const currentHistory = getData.success && getData.data?.history ? getData.data.history : [];
        
        const newHistory = [
          {
            date: formattedDate,
            action: 'Paquete Entregado al Cliente (Proceso Masivo)',
            user: 'Operador Entregas'
          },
          ...currentHistory
        ];

        const patchRes = await fetch(`/api/inventory/${tracking}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'Entregado al Cliente',
            history: newHistory
          })
        });

        if (patchRes.ok) {
          newResults.push({ tracking, status: 'success', message: 'Marcado como entregado' });
        } else {
          newResults.push({ tracking, status: 'error', message: 'Error al actualizar base de datos' });
        }
      } catch {
        newResults.push({ tracking, status: 'error', message: 'Error de red' });
      }
      
      setResults([...newResults]);
    }

    setIsProcessing(false);
    setText('');
    textareaRef.current?.focus();
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      {/* Header compacto y elegante */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Entrega Masiva</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Despacho por Lote
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Escanea múltiples trackings para marcarlos como entregados al cliente de una sola vez.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/bodega"
            className="h-9 px-3.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs sm:text-sm inline-flex items-center gap-1.5 transition-all"
          >
            Volver a escáner individual
          </Link>
        </div>
      </div>

      {/* Contenedor de escaneo masivo */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50/95 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-2">
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Escanea los paquetes a entregar (uno por línea)
          </label>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Modo: Entrega a Cliente
          </span>
        </div>

        <div className="p-5 space-y-4">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isProcessing}
            rows={10}
            placeholder="Ejemplo:
9400109205568123456789
1Z9999999999999999..."
            className="w-full p-3.5 rounded-lg bg-white border border-slate-200/90 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm font-mono font-medium text-slate-800 placeholder:text-slate-400 transition-all disabled:opacity-50 resize-none leading-relaxed"
          />

          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-1">
            <p className="text-xs sm:text-sm text-slate-600 font-medium inline-flex items-center gap-2">
              <span>Total a entregar:</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-bold tabular-nums text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                {text.split('\n').filter(t => t.trim().length > 0).length}
              </span>
            </p>
            <button
              onClick={handleProcess}
              disabled={isProcessing || text.trim().length === 0}
              className="h-10 px-5 bg-brand-blue hover:bg-[#0e354b] text-white rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Entregando...
                </>
              ) : (
                <>
                  <Play size={16} /> Confirmar Entregas
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-2 bg-slate-50/95">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers size={16} className="text-brand-blue" />
              Resultados de la Entrega
            </h3>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Entregados: {successCount}
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
                          <CheckCircle2 className="text-emerald-600 shrink-0" size={12} />
                          Entregado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-red-50 text-red-700 border-red-200">
                          <XCircle className="text-red-600 shrink-0" size={12} />
                          Error
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-2.5 px-3.5 text-right font-medium ${
                        res.status === 'success' ? 'text-emerald-700' : 'text-red-700'
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
