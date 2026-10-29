'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Package, MapPin, Truck, CheckCircle2, Clock, Loader2, AlertTriangle, FileText, ExternalLink, Plus } from 'lucide-react';
import { formatPackageWeightAndRate } from '@/lib/billing';

interface TrackingEvent {
  date: string;
  status: string;
  description: string;
}

interface TrackingPackage {
  tracking?: string;
  consignatario?: string;
  consignee?: string;
  client?: string;
  name?: string;
  weight?: number;
  weightUnit?: string;
  statusLabel?: string;
  fotos?: { id?: number | string; url: string }[];
  dimensions?: string;
  origin?: string;
  destination?: string;
  description?: string;
  pieces?: number;
  volumetricWeight?: number;
  declaredValue?: number;
  currency?: string;
  carrier?: string;
  service?: string;
  createdAt?: string;
  receivedAt?: string;
}

interface LocalItem {
  id: string;
  tracking_number: string;
  client_name: string;
  status: string;
  weight: number | null;
  received_date: string | null;
  created_at: string;
}

interface MatchedInvoice {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  currency?: string;
  issue_date?: string;
  client_name?: string;
  package_amount?: number | null;
  package_weight?: string | number | null;
  package_rate?: string | number | null;
  package_service?: string;
  package_tracking?: string;
}

function formatDate(ds: string | null | undefined): string {
  if (!ds) return 'N/A';
  try {
    const d = new Date(ds);
    if (isNaN(d.getTime())) return ds;
    return d.toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'N/A';
  }
}

function getStatusStyle(status: string): { bg: string; text: string; border: string } {
  const s = status.toLowerCase();
  if (s.includes('entregado') || s.includes('delivered')) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
  if (s.includes('por entregar')) return { bg: 'bg-sky-50', text: 'text-brand-blue', border: 'border-sky-200' };
  if (s.includes('tránsito') || s.includes('transit') || s.includes('camino') || s.includes('aduana')) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
  if (s.includes('bodega') || s.includes('warehouse') || s.includes('miami') || s.includes('mia')) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
  return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
}

function getTimelineIcon(status?: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('entregado') && !s.includes('por entregar')) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (s.includes('por entregar')) return <MapPin className="w-4 h-4 text-brand-blue" />;
  if (s.includes('transit') || s.includes('camino') || s.includes('tránsito')) return <Truck className="w-4 h-4 text-amber-500" />;
  if (s.includes('bodega') || s.includes('warehouse') || s.includes('recib')) return <MapPin className="w-4 h-4 text-blue-500" />;
  return <Package className="w-4 h-4 text-slate-400" />;
}

export default function TrackingPage() {
  const [trackingInput, setTrackingInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const [pkg, setPkg] = useState<TrackingPackage | null>(null);
  const [timeline, setTimeline] = useState<TrackingEvent[]>([]);
  const [localItem, setLocalItem] = useState<LocalItem | null>(null);
  const [matchedInvoice, setMatchedInvoice] = useState<MatchedInvoice | null>(null);

  const executeSearch = useCallback(async (searchNumber: string) => {
    const num = searchNumber.trim();
    if (!num) return;

    setLoading(true);
    setError(null);
    setPkg(null);
    setTimeline([]);
    setLocalItem(null);
    setMatchedInvoice(null);
    setSearched(true);

    try {
      // Fetch ALL 3 sources in PARALLEL instead of sequential waterfall
      const [trackingResult, localResult, invoiceResult] = await Promise.allSettled([
        fetch(`/api/tracking?number=${encodeURIComponent(num)}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
        fetch(`/api/inventory/${encodeURIComponent(num)}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
        fetch(`/api/invoices/by-tracking?tracking=${encodeURIComponent(num)}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null)
      ]);

      // Process tracking API result
      const trackingData = trackingResult.status === 'fulfilled' ? trackingResult.value : null;
      if (trackingData?.status === 'SUCCESS' && trackingData.rawData) {
        setPkg(trackingData.rawData.package || null);
        setTimeline(trackingData.rawData.timeline || []);
      } else {
        throw new Error('No se encontraron datos para este tracking');
      }

      // Process local inventory result
      const localData = localResult.status === 'fulfilled' ? localResult.value : null;
      if (localData?.success && localData.data) {
        setLocalItem(localData.data);
      } else if (trackingData?.localItem) {
        setLocalItem(trackingData.localItem);
      }

      // Process invoice lookup result
      const invoiceData = invoiceResult.status === 'fulfilled' ? invoiceResult.value : null;
      if (invoiceData?.success && invoiceData.data) {
        setMatchedInvoice(invoiceData.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al buscar tracking');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    executeSearch(trackingInput);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const queryNumber = urlParams.get('number') || urlParams.get('tracking');
      if (queryNumber) {
        setTrackingInput(queryNumber);
        executeSearch(queryNumber);
      }
    }
  }, [executeSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const fotos = pkg?.fotos || [];
  const fotoUrls = fotos.map(f => typeof f === 'string' ? f : f.url).filter(Boolean);
  const consignatario = pkg?.consignatario || pkg?.consignee || pkg?.client || pkg?.name || '';
  const statusLabel = pkg?.statusLabel || localItem?.status || '';
  const statusStyle = statusLabel ? getStatusStyle(statusLabel) : null;

  const invWeightInfo = matchedInvoice ? formatPackageWeightAndRate({
    weight: matchedInvoice.package_weight,
    serviceName: matchedInvoice.package_service,
    rate: matchedInvoice.package_rate,
    pkgWeight: pkg?.weight,
    pkgUnit: pkg?.weightUnit
  }) : null;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 animate-fade-in">
      {/* Header compacto y elegante */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Rastrear Paquete</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/15">
              Tiempo Real
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Consulta el estado, inventario local y facturación de cualquier envío en tiempo real.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ingresa tu número de tracking..."
              className="w-full h-10 pl-10 pr-4 bg-white rounded-lg border border-slate-200/90 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !trackingInput.trim()}
            className="h-10 px-6 bg-brand-blue hover:bg-[#0e354b] text-white rounded-lg font-semibold text-xs sm:text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Rastrear
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col items-center justify-center py-14 gap-2.5">
          <Loader2 className="w-6 h-6 text-brand-blue animate-spin" />
          <p className="text-slate-500 text-xs sm:text-sm font-medium">
            Consultando información del paquete y facturas...
          </p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50/80 border border-red-200/90 rounded-xl p-4 sm:p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800 text-xs sm:text-sm">No se encontró el paquete</p>
            <p className="text-red-600 text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && searched && pkg && (
        <div className="space-y-5">
          {/* Status + Tracking header */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="bg-slate-50/95 border-b border-slate-200/90 px-5 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">
                  Número de Tracking
                </p>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-mono">
                  {pkg.tracking || trackingInput}
                </h2>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {matchedInvoice && (
                  <Link
                    href={`/admin/facturacion/${matchedInvoice.id}`}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-blue text-white hover:bg-[#0e354b] transition-all shadow-2xs group"
                    title="Ver Factura Asociada"
                  >
                    <FileText size={13} className="text-brand-yellow" />
                    <span>Factura: #{matchedInvoice.invoice_number}</span>
                    {matchedInvoice.package_amount !== undefined && matchedInvoice.package_amount !== null ? (
                      <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                        ${matchedInvoice.package_amount.toFixed(2)} USD
                      </span>
                    ) : (
                      <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                        ${matchedInvoice.total.toFixed(2)} USD
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        matchedInvoice.status === 'Pagada'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-amber-400 text-amber-950'
                      }`}
                    >
                      {matchedInvoice.status}
                    </span>
                    <ExternalLink size={12} className="opacity-70 group-hover:opacity-100" />
                  </Link>
                )}

                {statusLabel && statusStyle && (
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {getTimelineIcon(statusLabel)}
                    <span>{statusLabel}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Package details grid */}
            <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-3.5">
              {consignatario && (
                <div className="bg-slate-50/70 rounded-lg border border-slate-200/80 p-3.5">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                    Consignatario
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">{consignatario}</p>
                </div>
              )}
              {(pkg?.weight || localItem?.weight || matchedInvoice?.package_weight) && (
                <div className="bg-slate-50/70 rounded-lg border border-slate-200/80 p-3.5">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                    Peso
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 font-mono">
                    {(() => {
                      const effWeight =
                        pkg?.weight ||
                        localItem?.weight ||
                        (invWeightInfo?.unit === 'Kg' && invWeightInfo.cleanNum
                          ? (Number(invWeightInfo.cleanNum) * 2.20462).toFixed(2)
                          : invWeightInfo?.cleanNum);
                      const num = parseFloat(String(effWeight));
                      const unit = (pkg?.weightUnit || 'lbs').toLowerCase();
                      if (isNaN(num)) return `${effWeight} ${unit}`;
                      if (unit.includes('kg')) {
                        const lbs = (num * 2.20462).toFixed(2);
                        return `${num} kg (${lbs} lbs)`;
                      } else {
                        const kg = (num * 0.453592).toFixed(2);
                        return `${num} lbs (${kg} kg)`;
                      }
                    })()}
                  </p>
                  {invWeightInfo && invWeightInfo.weightFormatted && (
                    <p className="text-[11px] text-brand-blue font-semibold mt-1">
                      Facturado: {invWeightInfo.weightFull}
                    </p>
                  )}
                </div>
              )}
              {pkg.volumetricWeight && (
                <div className="bg-slate-50/70 rounded-lg border border-slate-200/80 p-3.5">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                    Peso Volumétrico
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 font-mono">
                    {(() => {
                      const num = parseFloat(String(pkg.volumetricWeight));
                      const unit = (pkg.weightUnit || 'lbs').toLowerCase();
                      if (isNaN(num)) return `${pkg.volumetricWeight} ${pkg.weightUnit || 'lbs'}`;
                      if (unit.includes('kg')) {
                        const lbs = (num * 2.20462).toFixed(2);
                        return `${num} kg (${lbs} lbs)`;
                      } else {
                        const kg = (num * 0.453592).toFixed(2);
                        return `${num} lbs (${kg} kg)`;
                      }
                    })()}
                  </p>
                </div>
              )}

              {/* Factura asociada card in grid */}
              {matchedInvoice ? (
                <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-lg p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <p className="text-[11px] text-brand-blue uppercase tracking-wider font-semibold flex items-center gap-1">
                        <FileText size={12} /> Factura Asociada
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          matchedInvoice.status === 'Pagada'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            matchedInvoice.status === 'Pagada' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        {matchedInvoice.status}
                      </span>
                    </div>
                    <div className="mb-2">
                      <Link
                        href={`/admin/facturacion/${matchedInvoice.id}`}
                        className="text-xs sm:text-sm font-bold text-brand-blue hover:underline inline-flex items-center gap-1"
                      >
                        #{matchedInvoice.invoice_number}
                        <ExternalLink size={12} className="text-slate-400" />
                      </Link>
                    </div>

                    {/* Detalle específico del paquete consultado */}
                    <div className="bg-white rounded-lg p-2.5 border border-slate-200/80 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-semibold">Costo paquete:</span>
                        <span className="text-xs sm:text-sm font-bold text-emerald-700 font-mono">
                          {matchedInvoice.package_amount !== undefined && matchedInvoice.package_amount !== null
                            ? `$${matchedInvoice.package_amount.toFixed(2)} ${matchedInvoice.currency || 'USD'}`
                            : `$${matchedInvoice.total.toFixed(2)} ${matchedInvoice.currency || 'USD'}`}
                        </span>
                      </div>
                      {invWeightInfo && invWeightInfo.weightFormatted && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Peso paquete:</span>
                          <span className="font-bold text-slate-800 font-mono">
                            {invWeightInfo.weightFull}
                          </span>
                        </div>
                      )}
                      {invWeightInfo && invWeightInfo.rateFormatted && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Tarifa:</span>
                          <span className="font-medium text-slate-700 font-mono">
                            {invWeightInfo.rateFormatted}
                          </span>
                        </div>
                      )}
                      {matchedInvoice.package_service && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Servicio:</span>
                          <span
                            className="font-medium text-slate-700 truncate max-w-[150px]"
                            title={matchedInvoice.package_service}
                          >
                            {matchedInvoice.package_service}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-brand-blue/15 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Total factura:</span>
                    <strong className="text-slate-800 font-mono">
                      ${matchedInvoice.total.toFixed(2)} {matchedInvoice.currency || 'USD'}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50/70 rounded-lg p-3.5 border border-dashed border-slate-200 flex flex-col justify-between">
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                      <FileText size={12} /> Factura
                    </p>
                    <p className="text-xs text-slate-400 font-medium">Sin facturar aún</p>
                  </div>
                  <Link
                    href={`/admin/facturacion/nueva?tracking=${encodeURIComponent(pkg.tracking || trackingInput)}`}
                    className="mt-2 text-xs font-semibold text-brand-blue hover:underline inline-flex items-center gap-1"
                  >
                    <Plus size={12} /> Crear Factura
                  </Link>
                </div>
              )}

              {pkg.dimensions && (
                <div className="bg-slate-50/70 rounded-lg border border-slate-200/80 p-3.5">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                    Dimensiones
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">{pkg.dimensions}</p>
                </div>
              )}
              {pkg.pieces && (
                <div className="bg-slate-50/70 rounded-lg border border-slate-200/80 p-3.5">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                    Piezas
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">{pkg.pieces}</p>
                </div>
              )}
              {pkg.declaredValue && (
                <div className="bg-slate-50/70 rounded-lg border border-slate-200/80 p-3.5">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                    Valor Declarado
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 font-mono">
                    ${pkg.declaredValue} {pkg.currency || 'USD'}
                  </p>
                </div>
              )}
              {pkg.carrier && (
                <div className="bg-slate-50/70 rounded-lg border border-slate-200/80 p-3.5">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                    Carrier
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">{pkg.carrier}</p>
                </div>
              )}
              {pkg.description && (
                <div className="bg-slate-50/70 rounded-lg border border-slate-200/80 p-3.5 col-span-2">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                    Descripción
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">{pkg.description}</p>
                </div>
              )}
            </div>

            {/* Local inventory badge */}
            {localItem && (
              <div className="mx-5 mb-5 p-3.5 bg-brand-blue/5 border border-brand-blue/15 rounded-lg flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-blue/10 rounded-lg flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-brand-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-xs font-bold text-brand-blue">En nuestro inventario local</p>
                    {matchedInvoice && (
                      <Link
                        href={`/admin/facturacion/${matchedInvoice.id}`}
                        className="text-[11px] font-semibold text-brand-blue bg-white px-2.5 py-0.5 rounded-md border border-brand-blue/20 hover:bg-brand-blue hover:text-white transition-colors inline-flex items-center gap-1.5"
                      >
                        <FileText size={11} />
                        <span>Factura #{matchedInvoice.invoice_number}</span>
                        {matchedInvoice.package_amount !== undefined && matchedInvoice.package_amount !== null && (
                          <span className="text-emerald-700 font-mono font-bold">
                            (${matchedInvoice.package_amount.toFixed(2)})
                          </span>
                        )}
                        <span className="text-slate-400 font-normal">({matchedInvoice.status})</span>
                      </Link>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Estado:{' '}
                    <span className="font-semibold text-slate-700">
                      {(localItem.status || '').toLowerCase().includes('entregad')
                        ? 'Entregado'
                        : 'Por Entregar (En Bodega CR)'}
                    </span>
                    {matchedInvoice ? ` • Factura: #${matchedInvoice.invoice_number}` : ''}
                    {matchedInvoice?.package_amount !== undefined && matchedInvoice?.package_amount !== null
                      ? ` • Costo paquete: $${matchedInvoice.package_amount.toFixed(2)}`
                      : ''}
                    {invWeightInfo?.weightFormatted
                      ? ` • Peso: ${invWeightInfo.weightFull}`
                      : localItem.weight
                      ? ` • Peso: ${localItem.weight} lbs`
                      : ''}
                    {localItem.client_name ? ` • Cliente: ${localItem.client_name}` : ''}
                    {` • Recibido: ${formatDate(localItem.received_date || localItem.created_at)}`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Photos */}
          {fotoUrls.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
              <div className="bg-slate-50/95 border-b border-slate-200/90 px-5 py-3 flex items-center justify-between">
                <h3 className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Fotos del Paquete ({fotoUrls.length})
                </h3>
              </div>
              <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {fotoUrls.map((url: string, idx: number) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-100 rounded-lg overflow-hidden aspect-square border border-slate-200/80 hover:border-brand-blue/40 hover:shadow-xs transition-all block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
              <div className="bg-slate-50/95 border-b border-slate-200/90 px-5 py-3 flex items-center justify-between">
                <h3 className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Historial de Eventos ({timeline.length})
                </h3>
              </div>
              <div className="p-5">
                <div className="relative pl-7 space-y-3.5">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-200" />
                  {timeline.map((event: TrackingEvent, idx: number) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-7 bg-white p-1 rounded-full border border-slate-200 shadow-2xs">
                        {getTimelineIcon(event.status)}
                      </div>
                      <div className="bg-slate-50/70 hover:bg-slate-50 transition-colors border border-slate-200/80 rounded-lg py-2.5 px-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-800 text-[13px]">{event.status}</p>
                          {event.description &&
                            event.description.trim().toLowerCase() !== event.status.trim().toLowerCase() && (
                              <p className="text-slate-500 text-xs mt-0.5">{event.description}</p>
                            )}
                        </div>
                        <p className="text-slate-400 text-[11px] font-mono flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {formatDate(event.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !searched && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] text-center py-14 px-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6" />
          </div>
          <p className="text-slate-700 font-semibold text-xs sm:text-sm">Sin consulta activa</p>
          <p className="text-slate-400 text-xs mt-0.5">
            Ingresa un número de tracking arriba para consultar su estado y facturación.
          </p>
        </div>
      )}
    </div>
  );
}
