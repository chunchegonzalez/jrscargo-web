'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Layers, Play, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

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
        const wbRes = await fetch(`/api/tracking?number=${encodeURIComponent(tracking)}`);
        const wbData = await wbRes.json();
        
        let client = 'Desconocido';
        let company = 'Independiente';
        let weightStr = '0 lbs';
        
        if (wbData.status === 'SUCCESS' && wbData.rawData?.package) {
          const pkg = wbData.rawData.package;
          const fullConsignee = pkg.consignatario || pkg.consignee || pkg.client || pkg.name || 'Desconocido';
          
          if (/\bJRS(\s*CARGO)?\b/i.test(fullConsignee)) {
            company = 'JRS CARGO';
            client = fullConsignee.replace(/\bJRS(\s*CARGO)?\b/i, '').replace(/-/g, '').trim();
          } else if (/\b(AT(\s*IMPORTS?)?|ATLANTIC\s*IMPORTS?|AT-\d+)\b/i.test(fullConsignee)) {
            company = 'ATLANTIC IMPORTS';
            client = fullConsignee.replace(/\b(AT(\s*IMPORTS?)?|ATLANTIC\s*IMPORTS?|AT-\d+)\b/i, '').replace(/-/g, '').trim();
          } else {
            client = fullConsignee;
          }
          weightStr = `${pkg.weight || '0'} ${pkg.weightUnit || 'lbs'}`;
        }

        if (wbData.status !== 'SUCCESS' || !wbData.rawData?.package) {
          newResults.push({ tracking, status: 'error', message: 'No encontrado en Worldbox' });
          setResults([...newResults]);
          continue;
        }

        const now = new Date();
        const formattedDate = now.toLocaleDateString('es-CR') + ' ' + now.toLocaleTimeString('es-CR');
        
        const res = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: tracking,
            client: client,
            company: company,
            weight: weightStr,
            status: 'En Bodega CR',
            history: [{
              date: formattedDate,
              action: 'Paquete Recibido en Bodega Costa Rica (Proceso Masivo)',
              user: 'Operador Bodega'
            }]
          })
        });

        if (res.ok) {
          newResults.push({ tracking, status: 'success', message: 'Ingresado correctamente' });
        } else {
          newResults.push({ tracking, status: 'error', message: 'Error al guardar en Base de Datos' });
        }
      } catch {
        newResults.push({ tracking, status: 'error', message: 'Error de red o sistema' });
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
          <h1 className="text-3xl font-black text-brand-blue mb-2">Recepción Masiva</h1>
          <p className="text-gray-500">Escanea múltiples trackings a la vez para ingresarlos a la Bodega CR.</p>
        </div>
        <Link href="/admin/bodega" className="text-sm font-bold text-brand-blue hover:underline">
          Volver a escáner individual
        </Link>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Escanea los paquetes aquí (uno por línea):
        </label>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isProcessing}
          rows={10}
          placeholder="Ejemplo:
9400109205568123456789
1Z9999999999999999
TBA123456789000..."
          className="w-full p-4 rounded-xl bg-gray-50 border-2 border-gray-200 text-brand-blue font-bold focus:border-brand-blue focus:ring-0 focus:bg-white transition-all disabled:opacity-50"
        />
        
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-500 font-bold">
            Total detectados: {text.split('\n').filter(t => t.trim().length > 0).length}
          </p>
          <button 
            onClick={handleProcess}
            disabled={isProcessing || text.trim().length === 0}
            className="btn-primary px-8 flex items-center gap-2"
          >
            {isProcessing ? (
              <><Loader2 className="animate-spin" size={20} /> Procesando...</>
            ) : (
              <><Play size={20} /> Procesar Todos</>
            )}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <h3 className="font-bold text-brand-blue flex items-center gap-2">
              <Layers size={20} />
              Resultados del Proceso
            </h3>
            <div className="flex gap-4 text-sm font-bold">
              <span className="text-green-600 bg-green-100 px-3 py-1 rounded-lg">Exitosos: {successCount}</span>
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
