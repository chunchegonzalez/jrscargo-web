'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  ScanLine,
  Loader2,
  Check,
  X,
  FileText,
  Eye,
  Plus,
  Trash2,
  Download,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useModal } from '@/app/components/ModalProvider';
import { getLocalTodayDate, formatCurrency } from '@/lib/billing';
import {
  ExpenseAttachment,
  isImageAttachment,
  isPdfAttachment,
  isTextLikeAttachment,
  isAiReadableAttachment,
  getAttachmentBadge,
  formatFileSize,
  serializeExpenseMetadata,
  extractHaciendaHintFromFilename,
  dataUrlToBlobUrl,
  decodeTextFromDataUrl,
} from '@/lib/expense-attachments';
import { readReceiptLocally } from '@/lib/receipt-local-reader';

const MAX_SINGLE_FILE_BYTES = 3_800_000;
const LOCAL_READER_CONCURRENCY = 2;

const CATEGORY_OPTIONS = [
  { value: 'Pago de Proveedor', label: 'Pago de proveedor' },
  { value: 'Servicios', label: 'Servicios' },
  { value: 'Combustible', label: 'Combustible' },
  { value: 'Mantenimiento', label: 'Mantenimiento de vehículos' },
  { value: 'Papelería', label: 'Papelería y oficina' },
  { value: 'Planillas', label: 'Planillas / salarios' },
  { value: 'Viáticos', label: 'Viáticos / alimentación' },
  { value: 'Local San Pablo', label: 'Local San Pablo' },
  { value: 'Otros', label: 'Otros' },
];

type RowStatus = 'queued' | 'analyzing' | 'ready' | 'manual' | 'error' | 'saved';

type ExpenseDraftRow = {
  id: string;
  selected: boolean;
  collapsed: boolean;
  attachment: ExpenseAttachment | null;
  documentNumber: string;
  providerName: string;
  date: string;
  currency: 'USD' | 'CRC';
  amount: string;
  category: string;
  status: RowStatus;
  needsConfirmation?: boolean;
  reviewNotice?: string;
  errorMessage?: string;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('No se pudo leer el archivo.'));
      }
    };
    reader.onerror = () => reject(new Error('Error leyendo el archivo.'));
    reader.readAsDataURL(file);
  });
}

function resizeRasterImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const MAX_SIZE = 1200;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }

        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo inicializar el canvas.'));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo decodificar la imagen.'));
    };
    img.src = objectUrl;
  });
}

async function processSingleFile(file: File): Promise<ExpenseAttachment> {
  const rawMime = file.type || 'application/octet-stream';
  const isCompressibleImage =
    rawMime.startsWith('image/') &&
    rawMime !== 'image/svg+xml' &&
    rawMime !== 'image/gif' &&
    rawMime !== 'image/heic' &&
    rawMime !== 'image/heif';

  let dataUrl: string;
  let finalMime = rawMime;

  if (isCompressibleImage) {
    try {
      dataUrl = await resizeRasterImage(file);
      finalMime = 'image/jpeg';
    } catch {
      dataUrl = await readFileAsDataUrl(file);
    }
  } else {
    dataUrl = await readFileAsDataUrl(file);
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name || 'archivo',
    mimeType: finalMime,
    size: file.size,
    dataUrl,
  };
}

function makeManualRow(): ExpenseDraftRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    selected: true,
    collapsed: false,
    attachment: null,
    documentNumber: '',
    providerName: '',
    date: getLocalTodayDate(),
    currency: 'CRC',
    amount: '',
    category: 'Pago de Proveedor',
    status: 'manual',
    needsConfirmation: true,
  };
}

export default function NuevoGastoPage() {
  const { showAlert, showConfirm } = useModal();
  const router = useRouter();

  const [rows, setRows] = useState<ExpenseDraftRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('Pago de Proveedor');

  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ done: number; total: number } | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const [previewFile, setPreviewFile] = useState<ExpenseAttachment | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!previewFile) {
      setPreviewBlobUrl(null);
      return;
    }
    if (isPdfAttachment(previewFile)) {
      const url = dataUrlToBlobUrl(previewFile.dataUrl);
      setPreviewBlobUrl(url);
      return () => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      };
    }
    setPreviewBlobUrl(null);
  }, [previewFile]);

  const updateRow = (id: string, patch: Partial<ExpenseDraftRow>) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  };

  const analyzeSingleRow = async (rowId: string, attachment: ExpenseAttachment) => {
    if (!isAiReadableAttachment(attachment)) {
      updateRow(rowId, {
        status: 'manual',
        needsConfirmation: true,
        reviewNotice: 'Ingresa y confirma el monto y la moneda manualmente.',
        errorMessage: undefined,
      });
      return;
    }

    updateRow(rowId, { status: 'analyzing', errorMessage: undefined });

    try {
      const extracted = await readReceiptLocally(attachment);

      setRows(prev =>
        prev.map(r => {
          if (r.id !== rowId) return r;
          const nextAmount = extracted.amount ? extracted.amount : r.amount;
          const nextCurrency: 'USD' | 'CRC' =
            extracted.currency === 'CRC' ? 'CRC' : extracted.currency === 'USD' ? 'USD' : r.currency;
          const nextDate =
            extracted.date && /^\d{4}-\d{2}-\d{2}$/.test(extracted.date) ? extracted.date : r.date;
          const nextDoc = extracted.documentNumber ? extracted.documentNumber.trim() : r.documentNumber;
          const nextProvider = extracted.providerName ? extracted.providerName.trim() : r.providerName;
          const nextCategory =
            extracted.category && extracted.category !== 'Otros' ? extracted.category : r.category;

          return {
            ...r,
            documentNumber: nextDoc,
            providerName: nextProvider,
            date: nextDate,
            currency: nextCurrency,
            amount: nextAmount,
            category: nextCategory,
            status: extracted.amount ? 'ready' : 'manual',
            // Siempre permitir revisar y confirmar el monto detectado antes de guardar
            needsConfirmation: true,
            reviewNotice:
              extracted.notice || 'Revisa y confirma que el monto y la moneda coincidan con el comprobante.',
            errorMessage: undefined,
          };
        })
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo leer el comprobante localmente';
      updateRow(rowId, {
        status: 'error',
        needsConfirmation: true,
        reviewNotice: 'No se pudo leer automáticamente. Ingresa el monto y la moneda manualmente.',
        errorMessage: msg,
      });
    }
  };

  const runBatchAnalysis = async (items: Array<{ id: string; attachment: ExpenseAttachment }>) => {
    let cursor = 0;
    const workerCount = Math.min(LOCAL_READER_CONCURRENCY, items.length);

    const workers = Array.from({ length: workerCount }, async () => {
      while (cursor < items.length) {
        const current = items[cursor++];
        if (!current) break;
        await analyzeSingleRow(current.id, current.attachment);
      }
    });

    await Promise.all(workers);
  };

  const addIncomingFiles = async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    setIsProcessingFiles(true);
    try {
      const newRows: ExpenseDraftRow[] = [];
      const toAnalyze: Array<{ id: string; attachment: ExpenseAttachment }> = [];
      const skippedTooLarge: string[] = [];

      for (const file of incoming) {
        try {
          const att = await processSingleFile(file);
          if (att.dataUrl.length > MAX_SINGLE_FILE_BYTES) {
            skippedTooLarge.push(file.name);
            continue;
          }

          const hint = extractHaciendaHintFromFilename(file.name);
          const readable = isAiReadableAttachment(att);
          const rowId = `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

          newRows.push({
            id: rowId,
            selected: true,
            collapsed: false,
            attachment: att,
            documentNumber: hint.documentNumber || '',
            providerName: '',
            date: hint.date || getLocalTodayDate(),
            currency: 'CRC',
            amount: '',
            category: bulkCategory || 'Pago de Proveedor',
            status: readable ? 'queued' : 'manual',
            needsConfirmation: true,
          });

          if (readable) {
            toAnalyze.push({ id: rowId, attachment: att });
          }
        } catch (err) {
          console.error('Error procesando archivo:', file.name, err);
          skippedTooLarge.push(file.name);
        }
      }

      if (newRows.length > 0) {
        setRows(prev => [...prev, ...newRows]);
        if (toAnalyze.length > 0) {
          void runBatchAnalysis(toAnalyze);
        }
      }

      if (skippedTooLarge.length > 0) {
        await showAlert(
          'Archivo demasiado grande',
          `No se pudieron cargar ${skippedTooLarge.join(', ')} porque superan el tamaño máximo permitido por archivo (3.8 MB).`,
          'info'
        );
      }
    } finally {
      setIsProcessingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await addIncomingFiles(e.target.files);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await addIncomingFiles(e.dataTransfer.files);
    }
  };

  const handleAddManualRow = () => {
    setRows(prev => [...prev, makeManualRow()]);
  };

  const handleRemoveRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleRetryFailed = () => {
    const failed = rows
      .filter(r => (r.status === 'error' || r.status === 'queued') && r.attachment)
      .map(r => ({ id: r.id, attachment: r.attachment as ExpenseAttachment }));
    if (failed.length > 0) {
      void runBatchAnalysis(failed);
    }
  };

  const handleApplyBulkCategory = () => {
    setRows(prev =>
      prev.map(r => (r.selected && r.status !== 'saved' ? { ...r, category: bulkCategory } : r))
    );
  };

  const stats = useMemo(() => {
    const unsaved = rows.filter(r => r.status !== 'saved');
    const selectedUnsaved = unsaved.filter(r => r.selected);
    const analyzingCount = rows.filter(r => r.status === 'analyzing' || r.status === 'queued').length;
    const errorCount = rows.filter(r => r.status === 'error').length;
    const unconfirmedCount = selectedUnsaved.filter(r => r.needsConfirmation).length;

    let totalUSD = 0;
    let countUSD = 0;
    let totalCRC = 0;
    let countCRC = 0;

    selectedUnsaved.forEach(r => {
      const val = parseFloat(String(r.amount || '').replace(/,/g, '.'));
      if (!Number.isNaN(val) && val > 0) {
        if (r.currency === 'CRC') {
          totalCRC += val;
          countCRC++;
        } else {
          totalUSD += val;
          countUSD++;
        }
      }
    });

    const allSelected = unsaved.length > 0 && selectedUnsaved.length === unsaved.length;
    const allCollapsed = rows.length > 0 && rows.every(r => r.collapsed);

    return {
      totalRows: rows.length,
      unsavedCount: unsaved.length,
      selectedCount: selectedUnsaved.length,
      analyzingCount,
      errorCount,
      unconfirmedCount,
      totalUSD,
      countUSD,
      totalCRC,
      countCRC,
      allSelected,
      allCollapsed,
    };
  }, [rows]);

  const isRowInvalid = (row: ExpenseDraftRow): boolean => {
    if (!row.selected || row.status === 'saved') return false;
    const num = parseFloat(String(row.amount || '').replace(/,/g, '.'));
    return !row.providerName.trim() || !row.date || Number.isNaN(num) || num <= 0;
  };

  const handleToggleSelectAll = () => {
    const target = !stats.allSelected;
    setRows(prev => prev.map(r => (r.status === 'saved' ? r : { ...r, selected: target })));
  };

  const handleToggleCollapseAll = () => {
    const nextCollapsed = !stats.allCollapsed;
    setRows(prev => prev.map(r => ({ ...r, collapsed: nextCollapsed })));
  };

  const handleConfirmRowAmount = (rowId: string) => {
    setRows(prev =>
      prev.map(r => {
        if (r.id !== rowId) return r;
        const num = parseFloat(String(r.amount || '').replace(/,/g, '.'));
        if (Number.isNaN(num) || num <= 0) {
          return r;
        }
        return {
          ...r,
          amount: num.toFixed(2),
          needsConfirmation: false,
          reviewNotice: undefined,
          status: r.status === 'saved' ? 'saved' : 'ready',
        };
      })
    );
  };

  const handleSaveAll = async () => {
    setAttemptedSubmit(true);
    const toSave = rows.filter(r => r.selected && r.status !== 'saved');

    if (toSave.length === 0) {
      await showAlert('Sin gastos seleccionados', 'Selecciona al menos un comprobante o gasto para guardar.', 'info');
      return;
    }

    if (stats.analyzingCount > 0) {
      await showAlert(
        'Lectura en progreso',
        'Espera unos segundos a que termine la lectura local del monto de los comprobantes antes de guardar.',
        'info'
      );
      return;
    }

    const invalidRows = toSave.filter(isRowInvalid);
    if (invalidRows.length > 0) {
      // Desplegar las fichas con campos faltantes para que el usuario las vea de inmediato
      const invalidIds = new Set(invalidRows.map(r => r.id));
      setRows(prev => prev.map(r => (invalidIds.has(r.id) ? { ...r, collapsed: false } : r)));
      await showAlert(
        'Datos incompletos',
        `Hay ${invalidRows.length} ${invalidRows.length === 1 ? 'comprobante seleccionado' : 'comprobantes seleccionados'} sin proveedor, fecha o monto válido. Revisa los campos resaltados en rojo.`,
        'error'
      );
      return;
    }

    const unconfirmedRows = toSave.filter(r => r.needsConfirmation);
    if (unconfirmedRows.length > 0) {
      const confirmed = await showConfirm(
        'Confirmar monto y moneda',
        `Hay ${unconfirmedRows.length} ${unconfirmedRows.length === 1 ? 'comprobante con monto por confirmar' : 'comprobantes con montos por confirmar'}. ¿Confirmas que los totales y monedas (USD / CRC) son correctos para guardarlos?`
      );
      if (!confirmed) {
        return;
      }
      setRows(prev =>
        prev.map(r =>
          r.selected && r.needsConfirmation
            ? { ...r, needsConfirmation: false, reviewNotice: undefined }
            : r
        )
      );
    }

    setIsSaving(true);
    setSaveProgress({ done: 0, total: toSave.length });

    let savedOk = 0;
    const failedIds: string[] = [];

    for (let i = 0; i < toSave.length; i++) {
      const row = toSave[i];
      try {
        const numAmount = parseFloat(String(row.amount || '').replace(/,/g, '.'));
        const receiptPayload = serializeExpenseMetadata(
          row.attachment ? [row.attachment] : [],
          row.documentNumber
        );

        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider_name: row.providerName.trim(),
            date: row.date,
            amount: numAmount,
            currency: row.currency,
            category: row.category || 'Otros',
            receipt_image: receiptPayload,
          }),
        });

        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.error || 'Error guardando gasto');
        }

        savedOk++;
        updateRow(row.id, {
          status: 'saved',
          selected: false,
          needsConfirmation: false,
          errorMessage: undefined,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error de red';
        failedIds.push(row.id);
        updateRow(row.id, { status: 'error', collapsed: false, errorMessage: msg });
      } finally {
        setSaveProgress({ done: i + 1, total: toSave.length });
      }
    }

    setIsSaving(false);
    setSaveProgress(null);

    if (failedIds.length === 0) {
      await showAlert(
        'Gastos guardados',
        savedOk === 1
          ? 'El gasto se registró correctamente.'
          : `Se registraron ${savedOk} gastos correctamente.`,
        'success'
      );
      router.push('/admin/gastos');
    } else {
      await showAlert(
        'Guardado parcial',
        `Se guardaron ${savedOk} gastos correctamente, pero ${failedIds.length} presentaron error. Puedes revisar y reintentar los pendientes.`,
        'info'
      );
    }
  };

  const renderHeaderStatusBadge = (row: ExpenseDraftRow) => {
    if (row.status === 'saved') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-600 text-white">
          <Check size={11} />
          Guardado
        </span>
      );
    }
    if (row.status === 'analyzing' || row.status === 'queued') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#0B2737]/[0.07] text-[#0B2737] border border-[#0B2737]/15">
          <Loader2 size={11} className="animate-spin" />
          Leyendo monto…
        </span>
      );
    }
    if (row.status === 'error') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200"
          title={row.errorMessage || 'Revisar comprobante'}
        >
          <AlertCircle size={11} />
          Revisar datos
        </span>
      );
    }
    if (row.needsConfirmation) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100/80 text-amber-900 border border-amber-300/80"
          title={row.reviewNotice || 'Revisa y confirma el monto antes de guardar'}
        >
          Monto por confirmar
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 size={11} />
        Monto confirmado
      </span>
    );
  };

  const getCardTitle = (row: ExpenseDraftRow): string => {
    if (!row.attachment) return 'Comprobante manual';
    if (isPdfAttachment(row.attachment)) return 'Comprobante PDF';
    if (isImageAttachment(row.attachment)) return 'Comprobante imagen';
    if (row.attachment.name.toLowerCase().endsWith('.xml')) return 'Comprobante XML';
    return 'Comprobante adjunto';
  };

  const formatRowAmountSummary = (row: ExpenseDraftRow): string => {
    const num = parseFloat(String(row.amount || '').replace(/,/g, '.'));
    if (Number.isNaN(num) || num <= 0) return 'Sin monto';
    return formatCurrency(num, row.currency);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-24">
      {/* 1. Encabezado: Título «Registrar gastos», instrucción «Revisa los montos antes de guardar.» y botón «+ Agregar fila manual» */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <Link
            href="/admin/gastos"
            className="h-9 w-9 inline-flex items-center justify-center bg-white border border-slate-200/90 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors shrink-0"
            title="Volver a Gastos y Compras"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0B2737]">Registrar gastos</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Revisa los montos antes de guardar.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddManualRow}
          className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#0B2737] font-semibold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer w-fit"
        >
          <Plus size={14} />
          <span>Agregar fila manual</span>
        </button>
      </div>

      {/* Input oculto para carga múltiple */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 2. Una sola zona compacta para arrastrar comprobantes o pulsar «Agregar archivos» */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border border-dashed px-4 py-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all ${
          isDragging
            ? 'border-[#12435E] bg-[#12435E]/[0.04]'
            : 'border-slate-300 hover:border-[#12435E]/60 hover:bg-slate-50/50'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#0B2737] flex items-center justify-center shrink-0">
            {isProcessingFiles || stats.analyzingCount > 0 ? (
              <Loader2 size={16} className="animate-spin text-[#12435E]" />
            ) : (
              <Upload size={16} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-[#0B2737] truncate">
              Arrastra tus comprobantes aquí
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {stats.analyzingCount > 0
                ? `Leyendo monto localmente (${stats.totalRows - stats.analyzingCount} de ${stats.totalRows})…`
                : 'Lee el monto de tus comprobantes (PDF, imágenes o XML) con lectura local y sin cargos.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="h-8 px-3.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[#0B2737] font-semibold text-xs inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer"
        >
          Agregar archivos
        </button>
      </div>

      {/* 3. Resumen del lote en una sola franja horizontal */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80">
          <div className="px-5 py-3.5">
            <p className="text-xs font-medium text-slate-500">Facturas a registrar</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#0B2737] tabular-nums mt-0.5">
              {stats.selectedCount}
            </p>
          </div>

          <div className="px-5 py-3.5">
            <p className="text-xs font-medium text-slate-500">Total USD</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#0B2737] tabular-nums mt-0.5">
              {formatCurrency(stats.totalUSD, 'USD')}
            </p>
          </div>

          <div className="px-5 py-3.5">
            <p className="text-xs font-medium text-slate-500">Total CRC</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#D97706] tabular-nums mt-0.5">
              {formatCurrency(stats.totalCRC, 'CRC')}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Barra de acciones del lote y listado de fichas por comprobante */}
      {rows.length > 0 && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-[#0B2737] cursor-pointer select-none mr-1">
                <input
                  type="checkbox"
                  checked={stats.allSelected}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-[#0B2737] focus:ring-[#12435E] cursor-pointer"
                />
                <span>Categoría del lote</span>
              </label>

              <select
                value={bulkCategory}
                onChange={e => setBulkCategory(e.target.value)}
                className="h-8 px-3 bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#12435E] cursor-pointer"
              >
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleApplyBulkCategory}
                className="h-8 px-3.5 rounded-lg bg-[#0B2737] hover:bg-[#12435E] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Aplicar a seleccionadas
              </button>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              {stats.errorCount > 0 && (
                <button
                  type="button"
                  onClick={handleRetryFailed}
                  disabled={stats.analyzingCount > 0}
                  className="text-xs font-semibold text-amber-800 hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={12} />
                  <span>Reintentar ({stats.errorCount})</span>
                </button>
              )}

              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={handleToggleCollapseAll}
                  className="text-xs font-semibold text-slate-600 hover:text-[#0B2737] inline-flex items-center gap-1 cursor-pointer"
                >
                  {stats.allCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  <span>{stats.allCollapsed ? 'Desplegar fichas' : 'Plegar fichas'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setRows([]);
                  setAttemptedSubmit(false);
                }}
                disabled={isSaving}
                className="text-xs font-semibold text-slate-500 hover:text-red-600 inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={13} />
                <span>Limpiar lista</span>
              </button>
            </div>
          </div>

          {/* Listado de fichas editables por comprobante (sin scroll horizontal) */}
          <div className="space-y-3">
            {rows.map(row => {
              const invalid = attemptedSubmit && isRowInvalid(row);
              const isSaved = row.status === 'saved';
              const badge = row.attachment ? getAttachmentBadge(row.attachment) : null;
              const numVal = parseFloat(String(row.amount || '').replace(/,/g, '.'));
              const hasValidAmount = !Number.isNaN(numVal) && numVal > 0;

              return (
                <div
                  key={row.id}
                  className={`bg-white rounded-xl border transition-all overflow-hidden ${
                    isSaved
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : invalid
                      ? 'border-red-300 ring-1 ring-red-100'
                      : row.needsConfirmation
                      ? 'border-amber-300/90'
                      : 'border-slate-200/90'
                  } ${!row.selected && !isSaved ? 'opacity-65' : ''}`}
                >
                  {/* Encabezado de la ficha */}
                  <div className="px-4 py-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        disabled={isSaved || isSaving}
                        onChange={e => updateRow(row.id, { selected: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-[#0B2737] focus:ring-[#12435E] cursor-pointer shrink-0"
                      />

                      {badge ? (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border shrink-0 ${badge.colorClass}`}
                        >
                          {badge.label}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          MANUAL
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => updateRow(row.id, { collapsed: !row.collapsed })}
                        className="text-left min-w-0 flex items-center gap-2 flex-wrap cursor-pointer"
                      >
                        <span className="text-xs sm:text-sm font-bold text-[#0B2737] truncate">
                          {getCardTitle(row)}
                        </span>
                        {row.attachment?.name && (
                          <span
                            className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-[260px]"
                            title={row.attachment.name}
                          >
                            ({row.attachment.name})
                          </span>
                        )}
                      </button>

                      {renderHeaderStatusBadge(row)}

                      {/* Resumen compacto visible cuando la ficha está plegada */}
                      {row.collapsed && (
                        <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 pl-2 border-l border-slate-200 min-w-0">
                          <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                            {row.providerName.trim() || 'Sin proveedor'}
                          </span>
                          {row.documentNumber && (
                            <span className="font-mono text-[11px] text-slate-500">
                              · #{row.documentNumber}
                            </span>
                          )}
                          <span
                            className={`font-bold tabular-nums ml-1 ${
                              row.currency === 'CRC' ? 'text-[#D97706]' : 'text-[#0B2737]'
                            }`}
                          >
                            {formatRowAmountSummary(row)} ({row.currency})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Acciones en el encabezado de la ficha: Ver PDF, Releer, Plegar y Eliminar */}
                    <div className="flex items-center gap-2 shrink-0">
                      {row.attachment && (
                        <button
                          type="button"
                          onClick={() => setPreviewFile(row.attachment)}
                          className="h-7 px-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-[#0B2737] hover:bg-slate-100 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Ver comprobante adjunto"
                        >
                          <Eye size={14} />
                          <span>{isPdfAttachment(row.attachment) ? 'Ver PDF' : 'Ver archivo'}</span>
                        </button>
                      )}

                      {row.attachment && isAiReadableAttachment(row.attachment) && !isSaved && (
                        <button
                          type="button"
                          disabled={row.status === 'analyzing' || isSaving}
                          onClick={() => {
                            if (row.attachment) {
                              void analyzeSingleRow(row.id, row.attachment);
                            }
                          }}
                          className="h-7 px-2 rounded-lg text-xs font-medium text-slate-500 hover:text-[#0B2737] hover:bg-slate-100 inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
                          title="Volver a leer monto del comprobante"
                        >
                          <ScanLine size={13} />
                          <span className="hidden sm:inline">Leer monto</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => updateRow(row.id, { collapsed: !row.collapsed })}
                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-[#0B2737] hover:bg-slate-100 inline-flex items-center justify-center transition-colors cursor-pointer"
                        title={row.collapsed ? 'Desplegar ficha' : 'Plegar ficha'}
                      >
                        {row.collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                      </button>

                      <span className="h-4 w-px bg-slate-200" />

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleRemoveRow(row.id)}
                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 inline-flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                        title="Eliminar comprobante"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Resumen en móvil cuando la ficha está plegada */}
                  {row.collapsed && (
                    <div className="md:hidden px-4 py-2.5 bg-slate-50/60 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">
                          {row.providerName.trim() || 'Sin proveedor'}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500 truncate">
                          {row.documentNumber || 'Sin N.º de documento'}
                        </p>
                      </div>
                      <span
                        className={`font-bold tabular-nums shrink-0 ${
                          row.currency === 'CRC' ? 'text-[#D97706]' : 'text-[#0B2737]'
                        }`}
                      >
                        {formatRowAmountSummary(row)} ({row.currency})
                      </span>
                    </div>
                  )}

                  {/* Cuerpo editable de la ficha (2 filas limpias sin cortar ningún campo) */}
                  {!row.collapsed && (
                    <div className="p-4 space-y-3">
                      {/* Primera fila: N.º de documento, Proveedor / negocio y Fecha */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                        <div className="lg:col-span-4">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            N.º de documento
                          </label>
                          <input
                            type="text"
                            disabled={isSaved || isSaving}
                            value={row.documentNumber}
                            onChange={e => updateRow(row.id, { documentNumber: e.target.value })}
                            placeholder="001000010100000..."
                            className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm font-mono text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#12435E] disabled:bg-slate-50"
                          />
                        </div>

                        <div className="lg:col-span-5">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Proveedor / negocio
                          </label>
                          <input
                            type="text"
                            disabled={isSaved || isSaving}
                            value={row.providerName}
                            onChange={e => updateRow(row.id, { providerName: e.target.value })}
                            placeholder="Nombre del proveedor o comercio"
                            className={`w-full h-9 px-3 bg-white border rounded-lg text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#12435E] disabled:bg-slate-50 ${
                              invalid && !row.providerName.trim()
                                ? 'border-red-400 ring-1 ring-red-200'
                                : 'border-slate-200/90'
                            }`}
                          />
                        </div>

                        <div className="sm:col-span-2 lg:col-span-3">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Fecha
                          </label>
                          <input
                            type="date"
                            disabled={isSaved || isSaving}
                            value={row.date}
                            onChange={e => updateRow(row.id, { date: e.target.value })}
                            className={`w-full h-9 px-3 bg-white border rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-[#12435E] disabled:bg-slate-50 ${
                              invalid && !row.date
                                ? 'border-red-400 ring-1 ring-red-200'
                                : 'border-slate-200/90'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Segunda fila: Categoría, Moneda, Monto y Confirmar monto */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                        <div className="lg:col-span-4">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Categoría
                          </label>
                          <select
                            disabled={isSaved || isSaving}
                            value={row.category}
                            onChange={e => updateRow(row.id, { category: e.target.value })}
                            className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-[#12435E] disabled:bg-slate-50 cursor-pointer"
                          >
                            {CATEGORY_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="lg:col-span-2">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Moneda
                          </label>
                          <select
                            disabled={isSaved || isSaving}
                            value={row.currency}
                            onChange={e =>
                              updateRow(row.id, {
                                currency: e.target.value === 'CRC' ? 'CRC' : 'USD',
                              })
                            }
                            className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#12435E] disabled:bg-slate-50 cursor-pointer"
                          >
                            <option value="CRC">CRC</option>
                            <option value="USD">USD</option>
                          </select>
                        </div>

                        <div className="lg:col-span-4">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Monto
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            disabled={isSaved || isSaving}
                            value={row.amount}
                            onChange={e =>
                              updateRow(row.id, {
                                amount: e.target.value,
                              })
                            }
                            placeholder="0.00"
                            className={`w-full h-9 px-3 bg-white border rounded-lg text-sm font-bold text-[#0B2737] text-right tabular-nums placeholder:text-slate-300 focus:outline-none focus:border-[#12435E] disabled:bg-slate-50 ${
                              invalid && !hasValidAmount
                                ? 'border-red-400 ring-1 ring-red-200'
                                : row.needsConfirmation
                                ? 'border-amber-300 bg-amber-50/20'
                                : 'border-slate-200/90'
                            }`}
                          />
                        </div>

                        <div className="sm:col-span-2 lg:col-span-2">
                          <button
                            type="button"
                            disabled={isSaved || isSaving || !hasValidAmount}
                            onClick={() => handleConfirmRowAmount(row.id)}
                            className={`w-full h-9 px-3 rounded-lg border text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                              row.needsConfirmation
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-emerald-50/70 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {!row.needsConfirmation && <Check size={13} />}
                            <span>{row.needsConfirmation ? 'Confirmar monto' : 'Confirmado'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 5. Barra inferior visible mientras se revisa el lote, sin tapar los campos */}
      <div className="sticky bottom-3 z-20 bg-white/95 backdrop-blur-xs rounded-xl border border-slate-200/90 px-5 py-3.5 shadow-[0_4px_20px_rgba(15,23,42,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs sm:text-sm font-bold text-[#0B2737]">
          {saveProgress ? (
            <span className="inline-flex items-center gap-2 text-[#12435E]">
              <Loader2 size={15} className="animate-spin" />
              Guardando {saveProgress.done} de {saveProgress.total} gastos…
            </span>
          ) : (
            <span>
              {stats.selectedCount}{' '}
              {stats.selectedCount === 1 ? 'gasto seleccionado' : 'gastos seleccionados'}
            </span>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <Link
            href="/admin/gastos"
            className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs inline-flex items-center justify-center transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving || stats.analyzingCount > 0 || stats.selectedCount === 0}
            className="h-9 px-5 rounded-lg bg-[#0B2737] hover:bg-[#12435E] text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Guardando…</span>
              </>
            ) : (
              <span>
                {stats.selectedCount === 1
                  ? 'Guardar 1 gasto'
                  : `Guardar ${stats.selectedCount} gastos`}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Modal de vista previa rápida del documento */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200/80 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/80 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 bg-[#0B2737]/10 text-[#0B2737] rounded-lg flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm truncate">{previewFile.name}</h3>
                  <p className="text-[11px] text-slate-500">
                    {previewFile.mimeType}
                    {previewFile.size ? ` · ${formatFileSize(previewFile.size)}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {previewBlobUrl && (
                  <a
                    href={previewBlobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 px-2.5 text-slate-600 hover:text-[#0B2737] bg-white border border-slate-200/90 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                  >
                    <ExternalLink size={13} />
                    <span className="hidden sm:inline">Abrir</span>
                  </a>
                )}
                <a
                  href={previewFile.dataUrl}
                  download={previewFile.name}
                  className="h-8 px-2.5 text-slate-600 hover:text-[#0B2737] bg-white border border-slate-200/90 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Descargar</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex items-center justify-center bg-slate-900/5 min-h-[260px]">
              {isImageAttachment(previewFile) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewFile.dataUrl}
                  alt={previewFile.name}
                  className="max-h-[68vh] w-auto object-contain rounded-xl shadow-md border border-slate-200 bg-white"
                />
              ) : isPdfAttachment(previewFile) && previewBlobUrl ? (
                <iframe
                  src={previewBlobUrl}
                  title={previewFile.name}
                  className="w-full h-[68vh] rounded-xl border border-slate-200 bg-white shadow-sm"
                />
              ) : isTextLikeAttachment(previewFile) ? (
                <pre className="w-full max-h-[65vh] overflow-auto p-4 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-700 whitespace-pre-wrap break-words">
                  {decodeTextFromDataUrl(previewFile.dataUrl) || 'No se pudo previsualizar el contenido.'}
                </pre>
              ) : (
                <div className="text-center py-8 px-4 max-w-sm">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto mb-3 text-[#0B2737]">
                    <FileText size={26} />
                  </div>
                  <p className="text-sm font-bold text-slate-800 break-all">{previewFile.name}</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Este archivo se guardará adjunto al gasto y podrás descargarlo cuando quieras.
                  </p>
                  <a
                    href={previewFile.dataUrl}
                    download={previewFile.name}
                    className="h-9 px-4 rounded-lg bg-[#0B2737] hover:bg-[#12435E] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Download size={14} />
                    <span>Descargar archivo</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
