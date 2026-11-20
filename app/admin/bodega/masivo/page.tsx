'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Layers, Play, CheckCircle2, XCircle, AlertTriangle, Loader2, ArrowLeft, PackageCheck, PackagePlus, User } from 'lucide-react';
import Link from 'next/link';
import { useModal } from '@/app/components/ModalProvider';
import { formatCostaRicaDateTime, extractCompanyAndClient } from '@/lib/billing';

interface Result {
  tracking: string;
  status: 'success' | 'warning' | 'error';
  message: string;
}

export default function BodegaMasivo() {
  const { showAlert } = useModal();
  const [mode, setMode] = useState<'recepcion' | 'entrega'>('recepcion');
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/users?namesOnly=true', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.currentUser) {
          setSelectedAgent(String(d.currentUser).trim());
        } else if (d?.success && Array.isArray(d.data) && d.data.length > 0) {
          const first = String(d.data[0]?.username || '').trim();
          if (first) setSelectedAgent(first);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [mode]);

  const formatWorldboxWeight = (rawWeight: unknown, rawUnit?: unknown): { formatted: string; numeric: number } => {
    const str = String(rawWeight ?? '').trim();
    const unitHint = String(rawUnit ?? '').trim().toLowerCase();
    const numMatch = str.replace(/,/g, '.').match(/(\d+(?:\.\d+)?)/);
    const numeric = numMatch ? parseFloat(numMatch[1]) : 0;

    let unit = 'lbs';
    if (unitHint.includes('ft') || unitHint.includes('pie') || str.toLowerCase().includes('ft')) {
      unit = 'ft³';
    } else if (unitHint.includes('kg') || str.toLowerCase().includes('kg')) {
      unit = 'kg';
    }

    return {
      formatted: `${numeric > 0 ? numeric : 0} ${unit}`,
      numeric: numeric > 0 ? numeric : 0,
    };
  };

  const extractApiError = async (res: Response, fallback: string): Promise<string> => {
    try {
      const data = await res.json();
      const detail = data?.error || data?.message;
      if (detail) return `${fallback} (HTTP ${res.status}): ${String(detail)}`;
    } catch {
      // Ignore JSON parse error
    }
    return `${fallback} (HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''})`;
  };

  const fetchWorldboxWithRetry = async (code: string) => {
    let lastError = 'No encontrado en Worldbox';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`/api/tracking?number=${encodeURIComponent(code)}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.status === 'SUCCESS' && data?.rawData?.package) {
            const w = formatWorldboxWeight(data.rawData.package.weight, data.rawData.package.weightUnit);
            if (w.numeric > 0 || attempt === 1) {
              return { data, error: null as string | null };
            }
          } else {
            lastError = data?.message || data?.error || 'No encontrado en Worldbox';
          }
        } else {
          lastError = await extractApiError(res, 'Error al consultar Worldbox');
        }
      } catch (err) {
        lastError = `Error de red al consultar Worldbox: ${err instanceof Error ? err.message : 'Sin conexión'}`;
      }
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, 350));
      }
    }
    return { data: null, error: lastError };
  };

  const handleProcess = async () => {
    const trackings = Array.from(
      new Set(
        text
          .split('\n')
          .map(t => t.replace(/[\x00-\x1F\x7F]+/g, '').trim())
          .filter(t => t.length > 0)
      )
    );

    if (trackings.length === 0) return;

    setIsProcessing(true);
    setResults([]);
    
    const newResults: Result[] = [];
    
    for (const tracking of trackings) {
      try {
        const formattedDate = formatCostaRicaDateTime();

        if (mode === 'recepcion') {
          // ==================== RECEPCIÓN MASIVA ====================
          // 1. Verificar primero si ya existe en inventario local para NO duplicar recepción
          const preCheckRes = await fetch(`/api/inventory/${encodeURIComponent(tracking)}`, { cache: 'no-store' });
          if (preCheckRes.ok) {
            const preCheckJson = await preCheckRes.json();
            const existingPkg = preCheckJson?.success ? preCheckJson.data : null;
            if (existingPkg && existingPkg.status !== 'Eliminado') {
              const isAlreadyDelivered = String(existingPkg.status || '').toLowerCase().includes('entregad');
              newResults.push({
                tracking: String(existingPkg.id || tracking),
                status: 'warning',
                message: isAlreadyDelivered
                  ? 'Alerta: El paquete ya fue entregado anteriormente'
                  : 'Alerta: El paquete ya se encuentra en Bodega CR',
              });
              setResults([...newResults]);
              continue;
            }
          } else if (preCheckRes.status !== 404) {
            newResults.push({
              tracking,
              status: 'error',
              message: await extractApiError(preCheckRes, 'Error al verificar inventario local'),
            });
            setResults([...newResults]);
            continue;
          }

          const { data: wbData, error: wbError } = await fetchWorldboxWithRetry(tracking);

          if (!wbData || wbData.status !== 'SUCCESS' || !wbData.rawData?.package) {
            newResults.push({
              tracking,
              status: 'error',
              message: wbError || 'No encontrado en Worldbox',
            });
            setResults([...newResults]);
            continue;
          }

          const pkg = wbData.rawData.package;
          const resolvedTracking = String(pkg.tracking || wbData.trackingNumber || tracking).trim();

          // Verificar también por tracking normalizado de Worldbox (por si se escaneó con prefijo USPS)
          if (resolvedTracking.toUpperCase() !== tracking.toUpperCase()) {
            const existingRes = await fetch(`/api/inventory/${encodeURIComponent(resolvedTracking)}`, { cache: 'no-store' });
            if (existingRes.ok) {
              const existingJson = await existingRes.json();
              const oldPkg = existingJson?.success ? existingJson.data : null;
              if (oldPkg && oldPkg.status !== 'Eliminado') {
                const isAlreadyDelivered = String(oldPkg.status || '').toLowerCase().includes('entregad');
                newResults.push({
                  tracking: resolvedTracking,
                  status: 'warning',
                  message: isAlreadyDelivered
                    ? 'Alerta: El paquete ya fue entregado anteriormente'
                    : 'Alerta: El paquete ya se encuentra en Bodega CR',
                });
                setResults([...newResults]);
                continue;
              }
            }
          }

          const fullConsignee = pkg.consignatario || pkg.clientName || pkg.consignee || pkg.client || pkg.name || 'Desconocido';
          const extracted = extractCompanyAndClient(
            pkg.consignatario || fullConsignee,
            pkg.tenantName || pkg.company,
            pkg.clientCode,
            pkg.clientName
          );
          const company = pkg.company || extracted.company;
          const client = extracted.cleanClient;
          const { formatted: weightStr } = formatWorldboxWeight(pkg.weight, pkg.weightUnit);

          const res = await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: resolvedTracking,
              client: client,
              company: company,
              weight: weightStr,
              status: 'En Bodega',
              history: [{
                date: formattedDate,
                action: 'Paquete Recibido en Bodega Costa Rica (Recepción Masiva)',
                user: selectedAgent || 'Operador Bodega',
                transportType: 'Aéreo',
              }]
            })
          });

          if (res.ok) {
            newResults.push({
              tracking: resolvedTracking,
              status: 'success',
              message: `Ingresado a Bodega CR · ${weightStr} (${company})`,
            });
          } else {
            newResults.push({
              tracking: resolvedTracking,
              status: 'error',
              message: await extractApiError(res, 'Error al guardar en Base de Datos'),
            });
          }

        } else {
          // ==================== ENTREGA MASIVA ====================
          // 1. Verificar en inventario local
          const invRes = await fetch(`/api/inventory/${encodeURIComponent(tracking)}`, { cache: 'no-store' });
          if (invRes.ok) {
            const invData = await invRes.json();
            const existingPkg = invData.data;
            const resolvedId = String(existingPkg?.id || tracking);

            // Bloquear doble entrega si ya está en estado Entregado
            if (String(existingPkg?.status || '').toLowerCase().includes('entregad')) {
              newResults.push({
                tracking: resolvedId,
                status: 'warning',
                message: 'Alerta: El paquete ya se encuentra marcado como Entregado',
              });
              setResults([...newResults]);
              continue;
            }

            const oldHistory = Array.isArray(existingPkg?.history) ? existingPkg.history : [];
            const newHistory = [
              {
                date: formattedDate,
                action: 'Paquete Entregado al Cliente (Entrega Masiva)',
                user: selectedAgent || 'Operador Bodega'
              },
              ...oldHistory
            ];

            const patchBody: Record<string, unknown> = {
              status: 'Entregado',
              history: newHistory,
            };

            // Si el peso guardado estaba en 0 o vacío, recuperarlo automáticamente de Worldbox
            const existingWeightNum = parseFloat(String(existingPkg?.weight || '0').replace(/[^\d.]/g, '')) || 0;
            let refreshedWeightLabel = String(existingPkg?.weight || '').trim();
            if (existingWeightNum <= 0) {
              const { data: wbRefresh } = await fetchWorldboxWithRetry(resolvedId);
              if (wbRefresh?.status === 'SUCCESS' && wbRefresh?.rawData?.package) {
                const { formatted, numeric } = formatWorldboxWeight(
                  wbRefresh.rawData.package.weight,
                  wbRefresh.rawData.package.weightUnit
                );
                if (numeric > 0) {
                  patchBody.weight = formatted;
                  refreshedWeightLabel = formatted;
                }
              }
            }

            const patchRes = await fetch(`/api/inventory/${encodeURIComponent(resolvedId)}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(patchBody)
            });

            if (patchRes.ok) {
              newResults.push({
                tracking: resolvedId,
                status: 'success',
                message: refreshedWeightLabel
                  ? `Marcado como Entregado · ${refreshedWeightLabel}`
                  : 'Marcado como Entregado',
              });
            } else {
              newResults.push({
                tracking: resolvedId,
                status: 'error',
                message: await extractApiError(patchRes, 'Error al actualizar estado en BD'),
              });
            }
          } else if (invRes.status !== 404) {
            newResults.push({
              tracking,
              status: 'error',
              message: await extractApiError(invRes, 'Error al consultar inventario local'),
            });
          } else {
            // 2. Si no está en inventario local, buscar en Worldbox y registrar como Entregado
            const { data: wbData, error: wbError } = await fetchWorldboxWithRetry(tracking);
            
            if (wbData && wbData.status === 'SUCCESS' && wbData.rawData?.package) {
              const pkg = wbData.rawData.package;
              const resolvedTracking = String(pkg.tracking || wbData.trackingNumber || tracking).trim();

              // Revisar también por tracking normalizado de Worldbox para no duplicar entrega
              if (resolvedTracking.toUpperCase() !== tracking.toUpperCase()) {
                const resolvedInvRes = await fetch(`/api/inventory/${encodeURIComponent(resolvedTracking)}`, { cache: 'no-store' });
                if (resolvedInvRes.ok) {
                  const resolvedInvJson = await resolvedInvRes.json();
                  const resolvedPkg = resolvedInvJson?.success ? resolvedInvJson.data : null;
                  if (resolvedPkg && String(resolvedPkg.status || '').toLowerCase().includes('entregad')) {
                    newResults.push({
                      tracking: resolvedTracking,
                      status: 'warning',
                      message: 'Alerta: El paquete ya se encuentra marcado como Entregado',
                    });
                    setResults([...newResults]);
                    continue;
                  }
                }
              }

              const fullConsignee = pkg.consignatario || pkg.clientName || pkg.consignee || pkg.client || pkg.name || 'Desconocido';
              const extracted = extractCompanyAndClient(
                pkg.consignatario || fullConsignee,
                pkg.tenantName || pkg.company,
                pkg.clientCode,
                pkg.clientName
              );
              const { formatted: weightStr } = formatWorldboxWeight(pkg.weight, pkg.weightUnit);

              const createRes = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: resolvedTracking,
                  client: extracted.cleanClient,
                  company: pkg.company || extracted.company,
                  weight: weightStr,
                  status: 'Entregado',
                  history: [{
                    date: formattedDate,
                    action: 'Paquete Entregado al Cliente (Entrega Masiva)',
                    user: selectedAgent || 'Operador Bodega',
                    transportType: 'Aéreo',
                  }]
                })
              });

              if (createRes.ok) {
                newResults.push({
                  tracking: resolvedTracking,
                  status: 'success',
                  message: `Registrado y Entregado · ${weightStr}`,
                });
              } else {
                newResults.push({
                  tracking: resolvedTracking,
                  status: 'error',
                  message: await extractApiError(createRes, 'Error al registrar entrega en BD'),
                });
              }
            } else {
              newResults.push({
                tracking,
                status: 'error',
                message: wbError || 'No encontrado en inventario local ni en Worldbox',
              });
            }
          }
        }
      } catch (err) {
        newResults.push({
          tracking,
          status: 'error',
          message: `Error de red o servidor: ${err instanceof Error ? err.message : 'Fallo inesperado'}`,
        });
      }
      
      setResults([...newResults]);
    }

    setIsProcessing(false);
    setText('');
    textareaRef.current?.focus();

    const warnings = newResults.filter(r => r.status === 'warning').length;
    const errors = newResults.filter(r => r.status === 'error').length;
    if (warnings > 0 || errors > 0) {
      const parts: string[] = [];
      if (warnings > 0) {
        parts.push(
          `${warnings} ${warnings === 1 ? 'paquete ya se encontraba' : 'paquetes ya se encontraban'} en ese estado (no se duplicó)`
        );
      }
      if (errors > 0) {
        parts.push(`${errors} ${errors === 1 ? 'paquete presentó error' : 'paquetes presentaron errores'}`);
      }
      await showAlert(
        warnings > 0 && errors === 0 ? 'Paquetes ya registrados' : 'Proceso finalizado con alertas',
        `${parts.join(' y ')}. Revisa el detalle en la tabla de resultados.`,
        errors > 0 ? 'error' : 'warning'
      );
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
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
        <div className="flex items-center gap-2 flex-wrap">
          {selectedAgent && (
            <div className="h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 inline-flex items-center gap-2 text-xs">
              <User size={14} className="text-brand-blue shrink-0" />
              <span className="text-slate-500 font-medium">Agente:</span>
              <span className="font-bold text-slate-800">{selectedAgent}</span>
            </div>
          )}
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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Exitosos: {successCount}
              </span>
              {warningCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 text-amber-800 border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Alertas: {warningCount}
                </span>
              )}
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
                      ) : res.status === 'warning' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 text-amber-800 border-amber-200">
                          <AlertTriangle size={12} className="text-amber-600 shrink-0" />
                          Ya registrado
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
                        res.status === 'success'
                          ? 'text-emerald-700'
                          : res.status === 'warning'
                            ? 'text-amber-800'
                            : 'text-red-600'
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
