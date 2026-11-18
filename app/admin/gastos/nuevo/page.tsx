'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  UploadCloud,
  Sparkles,
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

const MAX_SINGLE_FILE_BYTES = 3_800_000; // Margen seguro por archivo bajo límite de 4.5 MB
const AI_CONCURRENCY = 3;

const CATEGORY_OPTIONS = [
  { value: 'Pago de Proveedor', label: 'Pago de Proveedor' },
  { value: 'Combustible', label: 'Combustible' },
  { value: 'Mantenimiento', label: 'Mantenimiento de Vehículos' },
  { value: 'Papelería', label: 'Papelería y Oficina' },
  { value: 'Planillas', label: 'Planillas / Salarios' },
  { value: 'Viáticos', label: 'Viáticos / Alimentación' },
  { value: 'Servicios', label: 'Servicios (Agua, Luz, Internet)' },
  { value: 'Local San Pablo', label: 'Local San Pablo' },
  { value: 'Otros', label: 'Otros' },
];

type RowStatus = 'queued' | 'analyzing' | 'ready' | 'manual' | 'error' | 'saved';

type ExpenseDraftRow = {
  id: string;
  selected: boolean;
  attachment: ExpenseAttachment | null;
  documentNumber: string;
  providerName: string;
  date: string;
  currency: 'USD' | 'CRC';
  amount: string;
  category: string;
  status: RowStatus;
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
    attachment: null,
    documentNumber: '',
    providerName: '',
    date: getLocalTodayDate(),
    currency: 'USD',
    amount: '',
    category: 'Otros',
    status: 'manual',
  };
}

export default function NuevoGastoPage() {
  const { showAlert } = useModal();
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
      updateRow(rowId, { status: 'manual', errorMessage: undefined });
      return;
    }

    const commaIdx = attachment.dataUrl.indexOf(',');
    if (commaIdx === -1) {
      updateRow(rowId, { status: 'manual', errorMessage: undefined });
      return;
    }

    const base64Data = attachment.dataUrl.slice(commaIdx + 1);
    updateRow(rowId, { status: 'analyzing', errorMessage: undefined });

    try {
      const res = await fetch('/api/expenses/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: [
            {
              name: attachment.name,
              mimeType: attachment.mimeType,
              base64Data,
            },
          ],
        }),
      });

      const textResponse = await res.text();
      let parsed: {
        success?: boolean;
        skipped?: boolean;
        error?: string;
        data?: {
          document_number?: string;
          provider_name?: string;
          date?: string;
          amount?: number | string;
          currency?: string;
          category?: string;
        };
      };

      try {
        parsed = JSON.parse(textResponse);
      } catch {
        throw new Error('Respuesta inválida del servidor.');
      }

      if (!res.ok || !parsed.success) {
        throw new Error(parsed.error || 'No se pudo leer este documento.');
      }

      if (parsed.skipped || !parsed.data) {
        updateRow(rowId, { status: 'manual', errorMessage: undefined });
        return;
      }

      const d = parsed.data;
      setRows(prev =>
        prev.map(r => {
          if (r.id !== rowId) return r;
          const nextAmount =
            d.amount !== undefined && d.amount !== null && d.amount !== ''
              ? String(d.amount)
              : r.amount;
          const nextCurrency: 'USD' | 'CRC' =
            d.currency === 'CRC' ? 'CRC' : d.currency === 'USD' ? 'USD' : r.currency;
          const nextDate = d.date && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : r.date;
          const nextDoc = d.document_number ? String(d.document_number).trim() : r.documentNumber;
          const nextProvider = d.provider_name ? String(d.provider_name).trim() : r.providerName;
          const nextCategory = d.category ? String(d.category).trim() : r.category;

          return {
            ...r,
            documentNumber: nextDoc,
            providerName: nextProvider,
            date: nextDate,
            currency: nextCurrency,
            amount: nextAmount,
            category: nextCategory,
            status: 'ready',
            errorMessage: undefined,
          };
        })
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error analizando documento';
      updateRow(rowId, { status: 'error', errorMessage: msg });
    }
  };

  const runBatchAnalysis = async (items: Array<{ id: string; attachment: ExpenseAttachment }>) => {
    let cursor = 0;
    const workerCount = Math.min(AI_CONCURRENCY, items.length);

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
          const aiReadable = isAiReadableAttachment(att);
          const rowId = `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

          newRows.push({
            id: rowId,
            selected: true,
            attachment: att,
            documentNumber: hint.documentNumber || '',
            providerName: '',
            date: hint.date || getLocalTodayDate(),
            currency: 'USD',
            amount: '',
            category: 'Otros',
            status: aiReadable ? 'queued' : 'manual',
          });

          if (aiReadable) {
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

  // Estadísticas en tiempo real del lote
  const stats = useMemo(() => {
    const unsaved = rows.filter(r => r.status !== 'saved');
    const selectedUnsaved = unsaved.filter(r => r.selected);
    const analyzingCount = rows.filter(r => r.status === 'analyzing' || r.status === 'queued').length;
    const completedAiCount = rows.filter(r => r.status === 'ready' || r.status === 'saved').length;
    const errorCount = rows.filter(r => r.status === 'error').length;

    let totalUSD = 0;
    let countUSD = 0;
    let totalCRC = 0;
    let countCRC = 0;

    selectedUnsaved.forEach(r => {
      const val = parseFloat(r.amount.replace(',', '.'));
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

    return {
      totalRows: rows.length,
      unsavedCount: unsaved.length,
      selectedCount: selectedUnsaved.length,
      analyzingCount,
      completedAiCount,
      errorCount,
      totalUSD,
      countUSD,
      totalCRC,
      countCRC,
      allSelected,
    };
  }, [rows]);

  const isRowInvalid = (row: ExpenseDraftRow): boolean => {
    if (!row.selected || row.status === 'saved') return false;
    const num = parseFloat(row.amount.replace(',', '.'));
    return !row.providerName.trim() || !row.date || Number.isNaN(num) || num <= 0;
  };

  const handleToggleSelectAll = () => {
    const target = !stats.allSelected;
    setRows(prev => prev.map(r => (r.status === 'saved' ? r : { ...r, selected: target })));
  };

  const handleSaveAll = async () => {
    setAttemptedSubmit(true);
    const toSave = rows.filter(r => r.selected && r.status !== 'saved');

    if (toSave.length === 0) {
      await showAlert('Sin gastos seleccionados', 'Selecciona al menos una factura o gasto para guardar.', 'info');
      return;
    }

    if (stats.analyzingCount > 0) {
      await showAlert(
        'Análisis en progreso',
        'Espera unos segundos a que la IA termine de leer las facturas pendientes antes de guardar.',
        'info'
      );
      return;
    }

    const invalidRows = toSave.filter(isRowInvalid);
    if (invalidRows.length > 0) {
      await showAlert(
        'Datos incompletos',
        `Hay ${invalidRows.length} ${invalidRows.length === 1 ? 'fila seleccionada' : 'filas seleccionadas'} sin proveedor, fecha o monto válido. Revisa los campos marcados en rojo.`,
        'error'
      );
      return;
    }

    setIsSaving(true);
    setSaveProgress({ done: 0, total: toSave.length });

    let savedOk = 0;
    const failedIds: string[] = [];

    for (let i = 0; i < toSave.length; i++) {
      const row = toSave[i];
      try {
        const numAmount = parseFloat(row.amount.replace(',', '.'));
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
        updateRow(row.id, { status: 'saved', selected: false, errorMessage: undefined });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error de red';
        failedIds.push(row.id);
        updateRow(row.id, { status: 'error', errorMessage: msg });
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
          : `Se registraron ${savedOk} gastos correctamente, cada uno con su propia fecha, documento y monto.`,
        'success'
      );
      router.push('/admin/gastos');
    } else {
      await showAlert(
        'Guardado parcial',
        `Se guardaron ${savedOk} gastos correctamente, pero ${failedIds.length} presentaron error. Los que ya se guardaron quedaron marcados en verde; puedes reintentar solo los pendientes.`,
        'info'
      );
    }
  };

  const renderStatusPill = (row: ExpenseDraftRow) => {
    if (row.status === 'queued') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          En cola
        </span>
      );
    }
    if (row.status === 'analyzing') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
          <Loader2 size={10} className="animate-spin" />
          Leyendo IA
        </span>
      );
    }
    if (row.status === 'ready') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          <CheckCircle2 size={10} />
          IA Lista
        </span>
      );
    }
    if (row.status === 'saved') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
          <Check size={10} />
          Guardado
        </span>
      );
    }
    if (row.status === 'error') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200/80"
          title={row.errorMessage || 'Error'}
        >
          <AlertCircle size={10} />
          Revisar
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
        Manual
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-10">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/gastos"
            className="h-9 w-9 inline-flex items-center justify-center bg-white border border-slate-200/90 rounded-lg hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors shrink-0"
            title="Volver a Gastos"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Registrar Gastos</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/15">
                <Sparkles size={11} /> Lectura Individual con IA
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Sube una o varias facturas a la vez. Cada archivo se analiza por separado con su propio N° de documento, fecha, moneda y monto.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleAddManualRow}
            className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Agregar fila manual</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-3.5 rounded-lg border border-brand-blue/20 bg-brand-blue hover:bg-[#0e354b] text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <UploadCloud size={14} />
            <span>Subir facturas</span>
          </button>
        </div>
      </div>

      {/* Input de archivos oculto: múltiples y acepta cualquier formato */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Zona de subida (grande si está vacía, compacta si ya hay facturas cargadas) */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed cursor-pointer transition-all bg-white ${
          rows.length === 0 ? 'p-10 sm:p-14 text-center' : 'px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3'
        } ${
          isDragging
            ? 'border-brand-blue bg-brand-blue/[0.05] scale-[1.003]'
            : 'border-slate-200/90 hover:border-brand-blue/50 hover:bg-slate-50/60'
        }`}
      >
        {rows.length === 0 ? (
          <div className="max-w-lg mx-auto">
            <div className="w-14 h-14 bg-brand-blue/10 text-brand-blue rounded-2xl flex items-center justify-center mx-auto mb-3.5">
              {isProcessingFiles ? <Loader2 size={26} className="animate-spin" /> : <UploadCloud size={26} />}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Arrastra tus facturas aquí o haz clic para seleccionarlas
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              Puedes subir <strong>5, 10 o más archivos a la vez</strong> (PDF, imágenes JPG/PNG, XML de Hacienda, Excel, Word o cualquier documento). La IA organizará cada factura en su propia fila con su fecha, número de documento y monto en <strong>USD o CRC</strong>.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-blue text-white text-xs font-semibold shadow-2xs">
                <UploadCloud size={14} /> Seleccionar archivos
              </span>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  handleAddManualRow();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus size={14} /> O ingresar gasto manual
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                {isProcessingFiles ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-800">
                  Arrastra más facturas aquí o haz clic para añadirlas al lote
                </p>
                <p className="text-[11px] text-slate-500">
                  Cada nuevo archivo se agrega como una fila independiente y se lee automáticamente con IA
                </p>
              </div>
            </div>
            <span className="h-8 px-3 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 self-start sm:self-center">
              <Plus size={13} /> Agregar archivos
            </span>
          </>
        )}
      </div>

      {/* Panel Dinámico del Lote (visible cuando hay al menos 1 fila) */}
      {rows.length > 0 && (
        <>
          {/* Barra de progreso de IA */}
          {stats.analyzingCount > 0 && (
            <div className="bg-white rounded-xl border border-brand-blue/25 p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <span className="inline-flex items-center gap-2 text-brand-blue">
                  <Loader2 size={14} className="animate-spin" />
                  Analizando facturas individualmente con IA...
                </span>
                <span className="tabular-nums text-slate-500">
                  {stats.totalRows - stats.analyzingCount} de {stats.totalRows} procesadas
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-brand-blue rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(
                      8,
                      Math.round(((stats.totalRows - stats.analyzingCount) / Math.max(1, stats.totalRows)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Resumen KPI del lote en tiempo real */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Facturas a Registrar
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 tabular-nums">{stats.selectedCount}</span>
                <span className="text-xs text-slate-400">de {stats.totalRows} en lista</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {stats.completedAiCount} leídas con IA
                {stats.errorCount > 0 ? ` · ${stats.errorCount} por revisar` : ''}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Total Lote (USD)
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-brand-blue tabular-nums">
                  {formatCurrency(stats.totalUSD, 'USD')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {stats.countUSD} {stats.countUSD === 1 ? 'factura en dólares' : 'facturas en dólares'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Total Lote (CRC)
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-amber-600 tabular-nums">
                  {formatCurrency(stats.totalCRC, 'CRC')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {stats.countCRC} {stats.countCRC === 1 ? 'factura en colones' : 'facturas en colones'}
              </p>
            </div>
          </div>

          {/* Tabla / Contenedor Principal del Lote */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
            {/* Barra de acciones en lote */}
            <div className="px-4 py-3 border-b border-slate-200/80 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-600">Categoría para todas:</span>
                <select
                  value={bulkCategory}
                  onChange={e => setBulkCategory(e.target.value)}
                  className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-blue"
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
                  className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Aplicar a seleccionadas
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {stats.errorCount > 0 && (
                  <button
                    type="button"
                    onClick={handleRetryFailed}
                    disabled={stats.analyzingCount > 0}
                    className="h-8 px-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={12} />
                    <span>Reintentar fallidas ({stats.errorCount})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setRows([]);
                    setAttemptedSubmit(false);
                  }}
                  disabled={isSaving}
                  className="h-8 px-3 rounded-lg border border-red-200/70 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={12} />
                  <span>Limpiar lista</span>
                </button>
              </div>
            </div>

            {/* Vista Desktop: Tabla ordenada y editable */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/95 border-b border-slate-200/90">
                  <tr className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                    <th className="py-2.5 px-3 pl-4 w-9">
                      <input
                        type="checkbox"
                        checked={stats.allSelected}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue cursor-pointer"
                        title="Seleccionar todas"
                      />
                    </th>
                    <th className="py-2.5 px-3 min-w-[185px]">Archivo / Estado</th>
                    <th className="py-2.5 px-2.5 min-w-[165px]">N° Documento</th>
                    <th className="py-2.5 px-2.5 min-w-[185px]">Proveedor / Negocio</th>
                    <th className="py-2.5 px-2.5 w-[140px]">Fecha</th>
                    <th className="py-2.5 px-2.5 w-[96px]">Moneda</th>
                    <th className="py-2.5 px-2.5 w-[125px] text-right">Monto</th>
                    <th className="py-2.5 px-2.5 min-w-[165px]">Categoría</th>
                    <th className="py-2.5 px-3 pr-4 w-[105px] text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {rows.map(row => {
                    const invalid = attemptedSubmit && isRowInvalid(row);
                    const isSaved = row.status === 'saved';
                    const badge = row.attachment ? getAttachmentBadge(row.attachment) : null;
                    const isImg = row.attachment ? isImageAttachment(row.attachment) : false;

                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors ${
                          isSaved
                            ? 'bg-emerald-50/50'
                            : invalid
                            ? 'bg-red-50/50'
                            : !row.selected
                            ? 'bg-slate-50/60 opacity-60'
                            : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="py-2.5 px-3 pl-4 align-middle">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            disabled={isSaved || isSaving}
                            onChange={e => updateRow(row.id, { selected: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue cursor-pointer disabled:opacity-40"
                          />
                        </td>

                        {/* Archivo y Estado */}
                        <td className="py-2.5 px-3 align-middle">
                          <div className="flex items-center gap-2.5">
                            {row.attachment ? (
                              <button
                                type="button"
                                onClick={() => setPreviewFile(row.attachment)}
                                className="w-9 h-9 rounded-lg border border-slate-200 bg-white overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:border-brand-blue/50"
                                title="Ver documento"
                              >
                                {isImg ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={row.attachment.dataUrl}
                                    alt={row.attachment.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span
                                    className={`text-[9px] font-extrabold px-1 py-0.5 rounded ${
                                      badge ? badge.colorClass : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {badge?.label || 'DOC'}
                                  </span>
                                )}
                              </button>
                            ) : (
                              <div className="w-9 h-9 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                                <FileText size={14} />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p
                                className="text-[11px] font-semibold text-slate-700 truncate max-w-[140px]"
                                title={row.attachment?.name || 'Registro manual'}
                              >
                                {row.attachment?.name || 'Sin archivo'}
                              </p>
                              <div className="mt-1 flex items-center gap-1.5">
                                {renderStatusPill(row)}
                                {row.attachment?.size ? (
                                  <span className="text-[10px] text-slate-400 tabular-nums">
                                    {formatFileSize(row.attachment.size)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* N° Documento */}
                        <td className="py-2.5 px-2.5 align-middle">
                          <input
                            type="text"
                            disabled={isSaved || isSaving}
                            value={row.documentNumber}
                            onChange={e => updateRow(row.id, { documentNumber: e.target.value })}
                            placeholder="Ej. 0010000101..."
                            className="w-full h-8 px-2.5 bg-white border border-slate-200/90 rounded-lg text-xs font-mono text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-brand-blue disabled:bg-slate-50"
                          />
                        </td>

                        {/* Proveedor */}
                        <td className="py-2.5 px-2.5 align-middle">
                          <input
                            type="text"
                            disabled={isSaved || isSaving}
                            value={row.providerName}
                            onChange={e => updateRow(row.id, { providerName: e.target.value })}
                            placeholder="Nombre del proveedor"
                            className={`w-full h-8 px-2.5 bg-white border rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-brand-blue disabled:bg-slate-50 ${
                              invalid && !row.providerName.trim() ? 'border-red-400 ring-1 ring-red-200' : 'border-slate-200/90'
                            }`}
                          />
                        </td>

                        {/* Fecha */}
                        <td className="py-2.5 px-2.5 align-middle">
                          <input
                            type="date"
                            disabled={isSaved || isSaving}
                            value={row.date}
                            onChange={e => updateRow(row.id, { date: e.target.value })}
                            className={`w-full h-8 px-2 bg-white border rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-blue disabled:bg-slate-50 ${
                              invalid && !row.date ? 'border-red-400 ring-1 ring-red-200' : 'border-slate-200/90'
                            }`}
                          />
                        </td>

                        {/* Moneda */}
                        <td className="py-2.5 px-2.5 align-middle">
                          <select
                            disabled={isSaved || isSaving}
                            value={row.currency}
                            onChange={e =>
                              updateRow(row.id, { currency: e.target.value === 'CRC' ? 'CRC' : 'USD' })
                            }
                            className={`w-full h-8 px-2 border rounded-lg text-xs font-bold focus:outline-none focus:border-brand-blue disabled:bg-slate-50 ${
                              row.currency === 'CRC'
                                ? 'bg-amber-50/70 border-amber-200 text-amber-800'
                                : 'bg-brand-blue/[0.05] border-brand-blue/20 text-brand-blue'
                            }`}
                          >
                            <option value="USD">USD ($)</option>
                            <option value="CRC">CRC (₡)</option>
                          </select>
                        </td>

                        {/* Monto */}
                        <td className="py-2.5 px-2.5 align-middle">
                          <input
                            type="number"
                            step="0.01"
                            disabled={isSaved || isSaving}
                            value={row.amount}
                            onChange={e => updateRow(row.id, { amount: e.target.value })}
                            placeholder="0.00"
                            className={`w-full h-8 px-2.5 bg-white border rounded-lg text-xs font-bold text-slate-900 text-right tabular-nums placeholder:text-slate-300 focus:outline-none focus:border-brand-blue disabled:bg-slate-50 ${
                              invalid && (!row.amount || parseFloat(row.amount.replace(',', '.')) <= 0)
                                ? 'border-red-400 ring-1 ring-red-200'
                                : 'border-slate-200/90'
                            }`}
                          />
                        </td>

                        {/* Categoría */}
                        <td className="py-2.5 px-2.5 align-middle">
                          <select
                            disabled={isSaved || isSaving}
                            value={row.category}
                            onChange={e => updateRow(row.id, { category: e.target.value })}
                            className="w-full h-8 px-2 bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-brand-blue disabled:bg-slate-50"
                          >
                            {CATEGORY_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Acciones */}
                        <td className="py-2.5 px-3 pr-4 align-middle text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1">
                            {row.attachment && (
                              <button
                                type="button"
                                onClick={() => setPreviewFile(row.attachment)}
                                className="h-7 w-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 inline-flex items-center justify-center cursor-pointer"
                                title="Ver documento"
                              >
                                <Eye size={13} />
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
                                className="h-7 w-7 rounded-lg border border-slate-200 bg-white hover:bg-brand-blue/10 hover:text-brand-blue text-slate-500 inline-flex items-center justify-center cursor-pointer disabled:opacity-40"
                                title="Re-analizar esta factura con IA"
                              >
                                <Sparkles size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleRemoveRow(row.id)}
                              className="h-7 w-7 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-400 inline-flex items-center justify-center cursor-pointer disabled:opacity-40"
                              title="Quitar fila"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Vista Móvil / Tablet: Tarjetas ordenadas */}
            <div className="lg:hidden divide-y divide-slate-200/80">
              {rows.map(row => {
                const invalid = attemptedSubmit && isRowInvalid(row);
                const isSaved = row.status === 'saved';
                const badge = row.attachment ? getAttachmentBadge(row.attachment) : null;

                return (
                  <div
                    key={row.id}
                    className={`p-4 space-y-3 ${
                      isSaved ? 'bg-emerald-50/40' : invalid ? 'bg-red-50/40' : !row.selected ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          disabled={isSaved || isSaving}
                          onChange={e => updateRow(row.id, { selected: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 text-brand-blue shrink-0"
                        />
                        {badge && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${badge.colorClass}`}>
                            {badge.label}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {row.attachment?.name || 'Gasto manual'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {renderStatusPill(row)}
                        {row.attachment && (
                          <button
                            type="button"
                            onClick={() => setPreviewFile(row.attachment)}
                            className="h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-600 inline-flex items-center justify-center"
                          >
                            <Eye size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleRemoveRow(row.id)}
                          className="h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-red-600 inline-flex items-center justify-center"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                          N° Documento
                        </label>
                        <input
                          type="text"
                          disabled={isSaved || isSaving}
                          value={row.documentNumber}
                          onChange={e => updateRow(row.id, { documentNumber: e.target.value })}
                          placeholder="Ej. 0010000101..."
                          className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                          Proveedor / Negocio
                        </label>
                        <input
                          type="text"
                          disabled={isSaved || isSaving}
                          value={row.providerName}
                          onChange={e => updateRow(row.id, { providerName: e.target.value })}
                          placeholder="Nombre del proveedor"
                          className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                          Fecha
                        </label>
                        <input
                          type="date"
                          disabled={isSaved || isSaving}
                          value={row.date}
                          onChange={e => updateRow(row.id, { date: e.target.value })}
                          className="w-full h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                          Moneda
                        </label>
                        <select
                          disabled={isSaved || isSaving}
                          value={row.currency}
                          onChange={e =>
                            updateRow(row.id, { currency: e.target.value === 'CRC' ? 'CRC' : 'USD' })
                          }
                          className="w-full h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="CRC">CRC (₡)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                          Monto
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          disabled={isSaved || isSaving}
                          value={row.amount}
                          onChange={e => updateRow(row.id, { amount: e.target.value })}
                          placeholder="0.00"
                          className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-right tabular-nums"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                        Categoría
                      </label>
                      <select
                        disabled={isSaved || isSaving}
                        value={row.category}
                        onChange={e => updateRow(row.id, { category: e.target.value })}
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                      >
                        {CATEGORY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer de Guardado */}
            <div className="px-5 py-4 bg-slate-50/90 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                {saveProgress ? (
                  <span className="inline-flex items-center gap-2 font-semibold text-brand-blue">
                    <Loader2 size={14} className="animate-spin" />
                    Guardando {saveProgress.done} de {saveProgress.total} gastos...
                  </span>
                ) : (
                  <span>
                    Se crearán <strong className="text-slate-900">{stats.selectedCount}</strong>{' '}
                    {stats.selectedCount === 1 ? 'registro independiente' : 'registros independientes'} en Gastos y Compras, conservando cada archivo, fecha y N° de documento.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 justify-end">
                <Link
                  href="/admin/gastos"
                  className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs inline-flex items-center transition-colors"
                >
                  Cancelar
                </Link>
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={isSaving || stats.analyzingCount > 0 || stats.selectedCount === 0}
                  className="h-9 px-5 rounded-lg border border-brand-blue/20 bg-brand-blue hover:bg-[#0e354b] text-white shadow-2xs inline-flex items-center justify-center gap-1.5 font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>
                        {stats.selectedCount === 1
                          ? 'Guardar 1 Gasto'
                          : `Guardar ${stats.selectedCount} Gastos`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de vista previa rápida */}
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
                <div className="w-8 h-8 bg-brand-blue/10 text-brand-blue rounded-lg flex items-center justify-center shrink-0">
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
                    className="h-8 px-2.5 text-slate-600 hover:text-brand-blue bg-white border border-slate-200/90 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                  >
                    <ExternalLink size={13} />
                    <span className="hidden sm:inline">Abrir</span>
                  </a>
                )}
                <a
                  href={previewFile.dataUrl}
                  download={previewFile.name}
                  className="h-8 px-2.5 text-slate-600 hover:text-brand-blue bg-white border border-slate-200/90 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
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
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto mb-3 text-brand-blue">
                    <FileText size={26} />
                  </div>
                  <p className="text-sm font-bold text-slate-800 break-all">{previewFile.name}</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Este archivo se guardará adjunto al gasto y podrás descargarlo cuando quieras.
                  </p>
                  <a
                    href={previewFile.dataUrl}
                    download={previewFile.name}
                    className="h-9 px-4 rounded-lg bg-brand-blue hover:bg-[#0e354b] text-white text-xs font-semibold inline-flex items-center gap-1.5"
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
