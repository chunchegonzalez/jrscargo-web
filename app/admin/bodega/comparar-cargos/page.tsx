'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Package,
  X,
  Download,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  Check,
  Info,
  Edit3,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import {
  ProviderInvoiceRow,
  SystemPackageRecord,
  ComparisonResultItem,
  ComparisonSummary,
  compareInvoiceWithSystem,
  normalizeTrackingAlphanumeric,
  parseCurrencyAmount,
  exportComparisonToCsv
} from '@/lib/package-comparison';

type FilterTab = 'all' | 'difference' | 'no_match' | 'higher_cost' | 'ambiguous';

export default function CompararCargosPage() {
  // Estado de carga y datos del sistema
  const [systemRecords, setSystemRecords] = useState<SystemPackageRecord[]>([]);
  const [loadingSystem, setLoadingSystem] = useState(true);
  const [systemError, setSystemError] = useState<string | null>(null);

  // Archivo del proveedor cargado
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [providerRows, setProviderRows] = useState<ProviderInvoiceRow[]>([]);
  const [isOcr, setIsOcr] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Filtros y búsqueda
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  // Modales
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');

  // Filas en edición dentro del modal de vista previa
  const [editingRows, setEditingRows] = useState<ProviderInvoiceRow[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Cargar datos reales de cobros y paquetes del sistema
  const loadSystemCharges = async () => {
    setLoadingSystem(true);
    setSystemError(null);
    try {
      const res = await fetch('/api/comparison/package-charges', {
        cache: 'no-store'
      });
      if (!res.ok) {
        throw new Error(`Error en servidor (${res.status})`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.packages)) {
        setSystemRecords(data.packages);
      } else {
        throw new Error(data.error || 'Respuesta inválida del servidor');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error cargando cobros del sistema';
      setSystemError(msg);
    } finally {
      setLoadingSystem(false);
    }
  };

  useEffect(() => {
    loadSystemCharges();
  }, []);

  // 2. Ejecutar la comparación con datos reales
  const { results, summary } = useMemo(() => {
    if (providerRows.length === 0) {
      const emptySummary: ComparisonSummary = {
        totalRows: 0,
        matchedCount: 0,
        differencesCount: 0,
        unmatchedCount: 0,
        ambiguousCount: 0,
        higherThanCostCount: 0,
        exactCount: 0,
        totalProvider: 0,
        totalSystem: 0,
        netDifference: 0
      };
      return { results: [], summary: emptySummary };
    }
    return compareInvoiceWithSystem(providerRows, systemRecords);
  }, [providerRows, systemRecords]);

  // 3. Filtrar resultados
  const filteredResults = useMemo(() => {
    return results.filter(item => {
      // Filtro por pestaña
      if (activeFilter === 'difference' && item.difference === 0) return false;
      if (activeFilter === 'difference' && item.status === 'sin_coincidencia') return false;
      if (activeFilter === 'no_match' && item.status !== 'sin_coincidencia') return false;
      if (activeFilter === 'higher_cost' && item.status !== 'mayor_al_costo') return false;
      if (activeFilter === 'ambiguous' && item.status !== 'ambiguo' && item.status !== 'duplicado') return false;

      // Filtro por búsqueda de tracking
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const inDigits = item.trackingDigits.includes(q);
        const inRaw = item.rawTracking.toLowerCase().includes(q);
        const inClient = (item.systemRecord?.clientName || '').toLowerCase().includes(q);
        const inInv = (item.systemRecord?.invoiceNumber || '').toLowerCase().includes(q);
        if (!inDigits && !inRaw && !inClient && !inInv) return false;
      }

      return true;
    });
  }, [results, activeFilter, searchTerm]);

  // 4. Manejo de subida de archivo
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/comparison/parse-file', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error procesando el archivo');
      }

      const rows: ProviderInvoiceRow[] = data.rows || [];
      if (rows.length === 0) {
        throw new Error('No se detectaron filas válidas en la factura. Verifica que la columna 2 contenga el tracking y la última columna el monto.');
      }

      setFileName(data.filename || file.name);
      setFileType(data.fileType || '');
      setIsOcr(Boolean(data.isOcr));
      setProviderRows(rows);
      setEditingRows(JSON.parse(JSON.stringify(rows)));

      // Abrir modal de vista previa para confirmación
      setShowPreviewModal(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error subiendo archivo';
      setUploadError(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 5. Procesar pegado de texto manual
  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return;
    setUploading(true);
    setUploadError(null);

    try {
      const res = await fetch('/api/comparison/parse-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al procesar el texto');
      }
      const rows: ProviderInvoiceRow[] = data.rows || [];
      if (rows.length === 0) {
        throw new Error('No se detectaron filas válidas. Pega una tabla con al menos 2 columnas.');
      }

      setFileName('tabla_manual.txt');
      setFileType('text');
      setIsOcr(false);
      setProviderRows(rows);
      setEditingRows(JSON.parse(JSON.stringify(rows)));
      setShowPasteModal(false);
      setPasteText('');
      setShowPreviewModal(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error procesando texto';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  // 6. Eliminar archivo actual
  const handleRemoveFile = () => {
    setFileName(null);
    setFileType(null);
    setProviderRows([]);
    setEditingRows([]);
    setIsOcr(false);
    setUploadError(null);
  };

  // 7. Guardar correcciones del modal de vista previa
  const handleSavePreviewCorrections = () => {
    const cleaned = editingRows
      .filter(r => r.trackingDigits || r.rawTracking || r.providerAmount > 0)
      .map((r, idx) => ({
        ...r,
        rowNumber: idx + 1,
        trackingDigits: normalizeTrackingAlphanumeric(r.rawTracking || r.trackingDigits),
        providerAmount: parseCurrencyAmount(r.providerAmount)
      }));

    setProviderRows(cleaned);
    setShowPreviewModal(false);
  };

  // Copiar tracking al portapapeles
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTracking(text);
    setTimeout(() => setCopiedTracking(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0B2737]/5 text-[#0B2737] border border-[#0B2737]/10">
            <FileSpreadsheet size={13} className="text-brand-blue" />
            Auditoría de Costos
          </span>
          {loadingSystem && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <RefreshCw size={11} className="animate-spin" />
              Sincronizando cobros del sistema...
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#0B2737] tracking-tight">
          Comparar cargos por paquete
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Se comparan los montos de la factura del proveedor con los cargos internos de JRS Cargo por paquete.
        </p>
      </div>

      {/* Alerta si hubo error cargando cobros de Supabase */}
      {systemError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <span>{systemError}</span>
          </div>
          <button
            onClick={loadSystemCharges}
            className="px-3 py-1 bg-amber-200/80 hover:bg-amber-200 text-amber-900 rounded-lg font-bold text-xs cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Barra de Carga de Factura (idéntica a la maqueta) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Input de archivo oculto */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.tsv,.txt,.pdf,image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Botón Cargar Factura (Rojo/Coral) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-red hover:bg-[#e23046] text-white font-bold text-sm shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>Cargar factura</span>
                </>
              )}
            </button>

            {/* Pastilla con nombre de archivo cargado */}
            {fileName ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200 text-xs font-semibold text-slate-800">
                <FileText size={15} className="text-slate-500" />
                <span className="max-w-[220px] truncate">{fileName}</span>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  title="Quitar archivo"
                  className="p-0.5 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <X size={13} />
                </button>
              </div>
            ) : null}

            {/* Botón para ver/editar vista previa si hay datos cargados */}
            {providerRows.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setEditingRows(JSON.parse(JSON.stringify(providerRows)));
                  setShowPreviewModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-brand-blue transition-colors cursor-pointer"
              >
                <Edit3 size={13} />
                <span>Revisar datos ({providerRows.length})</span>
                {isOcr && <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-800">OCR</span>}
              </button>
            )}

            {/* Alternativa: pegar tabla */}
            {!fileName && (
              <button
                type="button"
                onClick={() => setShowPasteModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
              >
                <FileSpreadsheet size={14} className="text-slate-500" />
                <span>Pegar tabla</span>
              </button>
            )}
          </div>

          {/* Información a la derecha: tracking normalizado */}
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Info size={14} className="text-slate-400 shrink-0" />
            <span>tracking normalizado: letras y números (sin símbolos)</span>
          </div>
        </div>

        {uploadError && (
          <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-lg flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Tarjetas de Resumen (exactas a la maqueta: 3 tarjetas grandes) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Tarjeta 1: Paquetes encontrados */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Paquetes encontrados
            </p>
            <p className="text-3xl font-black text-[#0B2737]">
              {summary.totalRows}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100/80 flex items-center justify-center text-[#0B2737]">
            <Package size={24} />
          </div>
        </div>

        {/* Tarjeta 2: Coincidencias */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Coincidencias
            </p>
            <p className="text-3xl font-black text-[#0B2737]">
              {summary.matchedCount}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Tarjeta 3: Diferencias por revisar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Diferencias por revisar
            </p>
            <p className="text-3xl font-black text-[#0B2737]">
              {summary.differencesCount}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-brand-red flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
        </div>
      </div>

      {/* Barra de Filtros, Búsqueda y Botón Exportar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Pestañas de Filtro (píldoras como en la maqueta) */}
        <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex-wrap">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#0B2737] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Todos ({results.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('difference')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'difference'
                ? 'bg-[#0B2737] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Con diferencia ({summary.differencesCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('no_match')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'no_match'
                ? 'bg-[#0B2737] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Sin coincidencia ({summary.unmatchedCount})
          </button>
          {summary.higherThanCostCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter('higher_cost')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'higher_cost'
                  ? 'bg-[#0B2737] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Mayor al costo ({summary.higherThanCostCount})
            </button>
          )}
          {summary.ambiguousCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter('ambiguous')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'ambiguous'
                  ? 'bg-[#0B2737] text-white shadow-xs'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              Ambiguos ({summary.ambiguousCount})
            </button>
          )}
        </div>

        {/* Buscador y Exportar Resultados */}
        <div className="flex items-center gap-2 flex-wrap">
          {providerRows.length > 0 && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por tracking..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-9 pl-8 pr-3 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 w-48 sm:w-56"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Botón Exportar Resultados */}
          <button
            type="button"
            onClick={() => exportComparisonToCsv(results, fileName ? fileName.replace(/\.[^/.]+$/, '') : 'comparacion')}
            disabled={results.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} className="text-slate-500" />
            <span>Exportar resultados</span>
          </button>
        </div>
      </div>

      {/* Tabla de Comparación Principal (idéntica a la maqueta) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
        {providerRows.length === 0 ? (
          /* Estado vacío: invitar a cargar factura */
          <div className="py-16 px-4 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
              <Upload size={28} />
            </div>
            <h3 className="text-base font-extrabold text-[#0B2737] mb-1">
              No hay factura cargada
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Sube el archivo Excel (.xlsx), CSV, texto delimitado o imagen de la factura del proveedor para comparar automáticamente cada paquete con los cobros del sistema.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-red hover:bg-[#e23046] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                <Upload size={14} />
                <span>Cargar factura</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPasteModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                <span>Pegar tabla manual</span>
              </button>
            </div>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No se encontraron filas que coincidan con el filtro actual o la búsqueda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Tracking (letras y números)</th>
                  <th className="py-3 px-4">Cobro proveedor</th>
                  <th className="py-3 px-4">Cobro JRS Cargo</th>
                  <th className="py-3 px-4">Diferencia (JRS &minus; proveedor)</th>
                  <th className="py-3 px-4 sm:px-6">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredResults.map(item => {
                  const isCopied = copiedTracking === item.trackingDigits;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Tracking normalizado (letras y números) */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-sm select-all">
                            {item.trackingDigits || '—'}
                          </span>
                          {item.trackingDigits && (
                            <button
                              onClick={() => handleCopy(item.trackingDigits)}
                              title="Copiar tracking"
                              className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                            >
                              {isCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          )}
                        </div>
                        {/* Subtítulo con tracking original si difería del normalizado */}
                        {item.rawTracking && item.rawTracking !== item.trackingDigits && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Original: {item.rawTracking}
                          </div>
                        )}
                      </td>

                      {/* Cobro proveedor */}
                      <td className="py-3.5 px-4 font-mono text-sm text-slate-900 font-semibold">
                        ${item.providerAmount.toFixed(2)}
                      </td>

                      {/* Cobro JRS Cargo */}
                      <td className="py-3.5 px-4">
                        {item.systemAmount !== null ? (
                          <div>
                            <span className="font-mono text-sm text-slate-900 font-semibold">
                              ${item.systemAmount.toFixed(2)}
                            </span>
                            {item.systemRecord?.invoiceNumber && (
                              <div className="text-[10px] text-brand-blue font-semibold mt-0.5">
                                Factura {item.systemRecord.invoiceNumber}
                                {item.systemRecord.clientName ? ` · ${item.systemRecord.clientName}` : ''}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-normal">
                            Sin registro
                          </span>
                        )}
                      </td>

                      {/* Diferencia (JRS - Proveedor) */}
                      <td className="py-3.5 px-4 font-mono text-sm font-bold">
                        {item.difference === null ? (
                          <span className="text-slate-400 font-normal">—</span>
                        ) : item.difference > 0 ? (
                          /* Positivo: color coral/rojo de la marca (como en la maqueta) */
                          <span className="text-brand-red">
                            +${item.difference.toFixed(2)}
                          </span>
                        ) : item.difference < 0 ? (
                          /* Negativo: azul marino oscuro */
                          <span className="text-[#0B2737]">
                            -${Math.abs(item.difference).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-600">
                            $0.00
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 sm:px-6">
                        {item.status === 'mayor_al_costo' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-brand-red border border-red-200/60 shadow-2xs">
                            Mayor al costo
                          </span>
                        )}
                        {item.status === 'revisar' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-[#0B2737] border border-slate-200/80 shadow-2xs">
                            Revisar
                          </span>
                        )}
                        {item.status === 'exacto' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            Exacto
                          </span>
                        )}
                        {item.status === 'sin_coincidencia' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200/60">
                            Sin coincidencia
                          </span>
                        )}
                        {item.status === 'ambiguo' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <ShieldAlert size={12} className="text-amber-600" />
                            Ambiguo
                          </span>
                        )}
                        {item.status === 'duplicado' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Duplicado en factura
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nota al pie (idéntica a la maqueta) */}
      <div className="flex items-start gap-2 text-xs text-slate-500 pt-1">
        <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
        <p>
          Diferencia = cobro JRS Cargo menos cobro del proveedor. Verifica coincidencias ambiguas antes de cerrar.
        </p>
      </div>

      {/* ============================================================ */}
      {/* MODAL DE VISTA PREVIA Y CORRECCIÓN DE DATOS EXTRAÍDOS        */}
      {/* ============================================================ */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[#0B2737]">
                  Vista previa de datos importados
                </h3>
                <p className="text-xs text-slate-500">
                  {editingRows.length} filas leídas. Puedes corregir cualquier valor antes de realizar la comparación.
                </p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Alerta de OCR si aplica */}
            {isOcr && (
              <div className="mx-5 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Lectura OCR realizada:</strong> Revisa que los números de tracking y los montos extraídos coincidan con la factura física antes de comparar.
                </span>
              </div>
            )}

            {/* Modal Body: Tabla Editable */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 divide-y divide-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2 w-10">#</th>
                    <th className="p-2">Tracking extraído</th>
                    <th className="p-2">Tracking normalizado (sin símbolos)</th>
                    <th className="p-2 w-32">Cobro proveedor ($)</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {editingRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={r.rawTracking}
                          onChange={e => {
                            const val = e.target.value;
                            setEditingRows(prev => {
                              const copy = [...prev];
                              copy[idx] = {
                                ...copy[idx],
                                rawTracking: val,
                                trackingDigits: normalizeTrackingAlphanumeric(val)
                              };
                              return copy;
                            });
                          }}
                          className="w-full h-8 px-2 text-xs font-mono border border-slate-200 rounded-lg focus:border-brand-blue focus:outline-none"
                        />
                      </td>
                      <td className="p-2 font-mono text-slate-700">
                        {normalizeTrackingAlphanumeric(r.rawTracking)}
                      </td>
                      <td className="p-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={r.providerAmount}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setEditingRows(prev => {
                                const copy = [...prev];
                                copy[idx] = { ...copy[idx], providerAmount: val };
                                return copy;
                              });
                            }}
                            className="w-full h-8 pl-6 pr-2 text-xs font-mono border border-slate-200 rounded-lg focus:border-brand-blue focus:outline-none"
                          />
                        </div>
                      </td>
                      <td className="p-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRows(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-md"
                          title="Eliminar fila"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Botón para agregar fila manual */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingRows(prev => [
                      ...prev,
                      {
                        rowNumber: prev.length + 1,
                        rawTracking: '',
                        trackingDigits: '',
                        providerAmount: 0
                      }
                    ]);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Agregar fila manualmente</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePreviewCorrections}
                className="px-5 py-2 rounded-xl bg-brand-blue hover:bg-[#0c2f42] text-white font-bold text-xs shadow-xs"
              >
                Confirmar y comparar cargos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL DE PEGAR TABLA MANUAL                                  */}
      {/* ============================================================ */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#0B2737]">
                Pegar datos desde Excel o texto
              </h3>
              <button
                onClick={() => setShowPasteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                Copia y pega directamente las filas desde tu hoja de cálculo. La <strong>columna 2</strong> debe contener el tracking y la <strong>última columna</strong> el monto cobrado por el proveedor.
              </p>
              <textarea
                rows={8}
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder="1&#9;123456789012&#9;2.5 lbs&#9;10.40&#10;2&#9;222333444555&#9;4.1 lbs&#9;16.40"
                className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl focus:border-brand-blue focus:outline-none"
              />
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePasteSubmit}
                disabled={!pasteText.trim()}
                className="px-5 py-2 rounded-xl bg-brand-red hover:bg-[#e23046] text-white font-bold text-xs shadow-xs disabled:opacity-50"
              >
                Procesar tabla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
