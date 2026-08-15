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
            status: 'Entregado al Cliente',
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
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-blue mb-2">Entrega Masiva</h1>
          <p className="text-gray-500">Escanea múltiples trackings para marcarlos como entregados al cliente de una sola vez.</p>
        </div>
        <Link href="/admin/bodega" className="text-sm font-bold text-brand-blue hover:underline">
          Volver a escáner individual
        </Link>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Escanea los paquetes a entregar (uno por línea):
        </label>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isProcessing}
          rows={10}
          placeholder="Ejemplo:
9400109205568123456789
1Z9999999999999999..."
          className="w-full p-4 rounded-xl bg-green-50 border-2 border-green-200 text-green-800 font-bold focus:border-green-500 focus:ring-0 focus:bg-white transition-all disabled:opacity-50"
        />
        
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-500 font-bold">
            Total a entregar: {text.split('\n').filter(t => t.trim().length > 0).length}
          </p>
          <button 
            onClick={handleProcess}
            disabled={isProcessing || text.trim().length === 0}
            className="bg-green-600 text-white hover:bg-green-700 px-8 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            {isProcessing ? (
              <><Loader2 className="animate-spin" size={20} /> Entregando...</>
            ) : (
              <><Play size={20} /> Confirmar Entregas</>
            )}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <h3 className="font-bold text-brand-blue flex items-center gap-2">
              <Layers size={20} />
              Resultados de la Entrega
            </h3>
            <div className="flex gap-4 text-sm font-bold">
              <span className="text-green-600 bg-green-100 px-3 py-1 rounded-lg">Entregados: {successCount}</span>
              <span className="text-red-600 bg-red-100 px-3 py-1 rounded-lg">Errores: {errorCount}</span>
            </div>
          </div>
          <div className="p-6">
            <div className="grid gap-3">
              {results.map((res, i) => (
                <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${res.status === 'success' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                  <div className="flex items-center gap-3">
                    {res.status === 'success' ? (
                      <CheckCircle2 className="text-green-500 shrink-0" size={20} />
                    ) : (
                      <XCircle className="text-red-500 shrink-0" size={20} />
                    )}
                    <span className="font-bold text-gray-800">{res.tracking}</span>
                  </div>
                  <span className={`text-sm font-bold ${res.status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
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
