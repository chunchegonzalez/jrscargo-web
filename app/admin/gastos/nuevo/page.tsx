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
  ChevronDown,
  Check,
  X,
  FileText,
  Eye,
  Plus,
  Trash2,
  Download,
  ExternalLink,
  Paperclip,
} from 'lucide-react';
import { useModal } from '@/app/components/ModalProvider';
import { getLocalTodayDate } from '@/lib/billing';
import {
  ExpenseAttachment,
  isImageAttachment,
  isPdfAttachment,
  isTextLikeAttachment,
  isAiReadableAttachment,
  getAttachmentBadge,
  formatFileSize,
  serializeExpenseAttachments,
  dataUrlToBlobUrl,
  decodeTextFromDataUrl,
} from '@/lib/expense-attachments';

const MAX_TOTAL_PAYLOAD_BYTES = 3_800_000; // Margen seguro bajo el límite de 4.5 MB de Vercel

const CATEGORY_OPTIONS = [
  { value: 'Combustible', label: 'Combustible' },
  { value: 'Mantenimiento', label: 'Mantenimiento de Vehículos' },
  { value: 'Papelería', label: 'Papelería y Oficina' },
  { value: 'Planillas', label: 'Planillas / Salarios' },
  { value: 'Viáticos', label: 'Viáticos / Alimentación' },
  { value: 'Servicios', label: 'Servicios (Agua, Luz, Internet)' },
  { value: 'Pago de Proveedor', label: 'Pago de Proveedor' },
  { value: 'Local San Pablo', label: 'Local San Pablo' },
  { value: 'Otros', label: 'Otros' },
];

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

export default function NuevoGastoPage() {
  const { showAlert } = useModal();
  const router = useRouter();

  const [providerName, setProviderName] = useState('');
  const [date, setDate] = useState(getLocalTodayDate());
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('Otros');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  const [attachments, setAttachments] = useState<ExpenseAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiStatusNote, setAiStatusNote] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewFile, setPreviewFile] = useState<ExpenseAttachment | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const totalPayloadBytes = useMemo(() => {
    return attachments.reduce((acc, f) => acc + f.dataUrl.length, 0);
  }, [attachments]);

  const totalOriginalBytes = useMemo(() => {
    return attachments.reduce((acc, f) => acc + (f.size || 0), 0);
  }, [attachments]);

  const readableAttachmentsCount = useMemo(() => {
    return attachments.filter(f => isAiReadableAttachment(f)).length;
  }, [attachments]);

  const analyzeFilesWithAI = async (filesToAnalyze: ExpenseAttachment[]) => {
    const readable = filesToAnalyze.filter(f => isAiReadableAttachment(f));
    if (readable.length === 0) {
      setAiStatusNote(
        'Archivos adjuntados. Este formato no admite lectura automática con IA; completa los campos manualmente.'
      );
      return;
    }

    // Limitar payload enviado a IA para no exceder límite del request
    const payloadFiles: Array<{ name: string; mimeType: string; base64Data: string }> = [];
    let runningBytes = 0;

    for (const file of readable) {
      const commaIdx = file.dataUrl.indexOf(',');
      if (commaIdx === -1) continue;
      const base64Data = file.dataUrl.slice(commaIdx + 1);
      if (runningBytes + base64Data.length > 3_500_000 && payloadFiles.length > 0) {
        break;
      }
      runningBytes += base64Data.length;
      payloadFiles.push({
        name: file.name,
        mimeType: file.mimeType,
        base64Data,
      });
    }

    if (payloadFiles.length === 0) return;

    setIsAnalyzing(true);
    setAiStatusNote(null);
    try {
      const res = await fetch('/api/expenses/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: payloadFiles }),
      });

      const textResponse = await res.text();
      let data: {
        success?: boolean;
        skipped?: boolean;
        message?: string;
        error?: string;
        data?: {
          provider_name?: string;
          date?: string;
          amount?: number | string;
          currency?: string;
          category?: string;
        };
      };

      try {
        data = JSON.parse(textResponse);
      } catch {
        throw new Error(
          'La respuesta del servidor no es válida (posiblemente los archivos superaron el tamaño permitido).'
        );
      }

      if (res.ok && data.success) {
        if (data.skipped) {
          setAiStatusNote(data.message || 'Archivos adjuntados. Completa los campos manualmente.');
          return;
        }
        if (data.data) {
          if (data.data.provider_name) setProviderName(data.data.provider_name);
          if (data.data.date) setDate(data.data.date);
          if (data.data.amount !== undefined && data.data.amount !== null && data.data.amount !== '') {
            setAmount(String(data.data.amount));
          }
          if (data.data.currency === 'USD' || data.data.currency === 'CRC') {
            setCurrency(data.data.currency);
          }
          if (data.data.category) setCategory(data.data.category);
          setAiStatusNote(
            payloadFiles.length === 1
              ? `Datos extraídos automáticamente de "${payloadFiles[0].name}".`
              : `Datos extraídos automáticamente combinando ${payloadFiles.length} archivos.`
          );
        }
      } else {
        setAiStatusNote('No se pudo extraer con IA automáticamente; puedes editar los campos manualmente.');
        await showAlert('Aviso de IA', 'No se pudo analizar automáticamente: ' + (data.error || 'Desconocido'), 'info');
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : 'Error de red';
      setAiStatusNote('Archivos adjuntados. Error al analizar con IA; puedes completar los datos manualmente.');
      await showAlert('Aviso de IA', 'Error al comunicar con la IA: ' + errorMsg, 'info');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addIncomingFiles = async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    setIsProcessingFiles(true);
    try {
      const processed: ExpenseAttachment[] = [];
      let currentTotal = totalPayloadBytes;
      const skippedTooLarge: string[] = [];

      for (const file of incoming) {
        try {
          const att = await processSingleFile(file);
          if (currentTotal + att.dataUrl.length > MAX_TOTAL_PAYLOAD_BYTES) {
            skippedTooLarge.push(file.name);
            continue;
          }
          currentTotal += att.dataUrl.length;
          processed.push(att);
        } catch (err) {
          console.error('Error procesando archivo:', file.name, err);
          skippedTooLarge.push(file.name);
        }
      }

      if (processed.length > 0) {
        setAttachments(prev => [...prev, ...processed]);
        const readableNew = processed.filter(f => isAiReadableAttachment(f));
        if (readableNew.length > 0) {
          void analyzeFilesWithAI(readableNew);
        } else {
          setAiStatusNote(
            'Archivo(s) adjuntado(s). Este formato no admite lectura automática con IA; completa los datos manualmente.'
          );
        }
      }

      if (skippedTooLarge.length > 0) {
        await showAlert(
          'Límite de tamaño',
          `No se pudieron agregar ${skippedTooLarge.join(', ')} porque superan el tamaño máximo total permitido (3.8 MB por gasto).`,
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

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(f => f.id !== id));
    if (previewFile?.id === id) {
      setPreviewFile(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerName || !date || !amount || !category) {
      await showAlert('Campos incompletos', 'Por favor completa todos los campos obligatorios.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const normalizedAmount = amount.replace(',', '.');
      const numAmount = parseFloat(normalizedAmount);
      if (Number.isNaN(numAmount) || numAmount < 0) {
        await showAlert('Monto inválido', 'Por favor ingresa un monto numérico válido.', 'error');
        setIsSaving(false);
        return;
      }

      const serialized = serializeExpenseAttachments(attachments);

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider_name: providerName,
          date,
          amount: numAmount,
          currency,
          category,
          receipt_image: serialized,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        await showAlert('Gasto guardado', 'Gasto y comprobantes guardados correctamente.', 'success');
        router.push('/admin/gastos');
      } else {
        await showAlert('Error al guardar', 'Error al guardar el gasto: ' + (result.error || 'Desconocido'), 'error');
      }
    } catch (err) {
      console.error(err);
      await showAlert('Error de conexión', 'Error de red al guardar el gasto.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/gastos"
            className="h-9 w-9 inline-flex items-center justify-center bg-white border border-slate-200/90 rounded-lg hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors"
            title="Volver a Gastos"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Registrar Nuevo Gasto</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/15">
                <Sparkles size={11} /> IA Activa
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Sube uno o varios comprobantes (PDF, imágenes, XML, Excel, Word o cualquier archivo) o ingresa los datos manualmente.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Lado Izquierdo: Subida Múltiple y Análisis con IA */}
        <div className="bg-white rounded-xl p-5 md:p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col">
          <div className="mb-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="text-brand-blue" size={16} /> Comprobantes y Análisis con IA
              </h3>
              {attachments.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-blue/10 text-brand-blue">
                  <Paperclip size={11} />
                  {attachments.length} {attachments.length === 1 ? 'archivo' : 'archivos'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sube varios archivos a la vez: <strong>PDF, JPG, PNG, XML, Excel, Word</strong> o cualquier otro documento. La IA leerá automáticamente las imágenes, PDF y XML.
            </p>
          </div>

          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-5 cursor-pointer transition-all relative ${
              attachments.length === 0 ? 'flex-1 min-h-[220px]' : 'py-4'
            } ${
              isDragging
                ? 'border-brand-blue bg-brand-blue/[0.06] scale-[1.005]'
                : attachments.length > 0
                ? 'border-brand-blue/30 bg-brand-blue/[0.02] hover:bg-brand-blue/[0.05]'
                : 'border-slate-200 hover:border-brand-blue/50 hover:bg-slate-50/70'
            }`}
          >
            {isProcessingFiles || isAnalyzing ? (
              <div className="text-center py-2">
                <Loader2 size={28} className="text-brand-blue animate-spin mx-auto mb-2.5" />
                <p className="text-xs sm:text-sm font-bold text-slate-800">
                  {isProcessingFiles ? 'Procesando archivos...' : 'La IA está analizando tus documentos...'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Extrayendo proveedor, fecha, moneda y monto
                </p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-2.5 text-slate-500">
                  <UploadCloud size={21} />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-700 mb-0.5">
                  {attachments.length > 0
                    ? 'Arrastra más archivos o haz clic para agregar'
                    : 'Arrastra archivos aquí o haz clic para subir'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Múltiples archivos a la vez · PDF, imágenes, XML, Office y más
                </p>
              </div>
            )}
          </div>

          {/* Nota de estado de IA */}
          {aiStatusNote && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-brand-blue/[0.06] border border-brand-blue/15 text-[11px] text-slate-700 flex items-start gap-2">
              <Sparkles size={13} className="text-brand-blue shrink-0 mt-0.5" />
              <span className="leading-snug">{aiStatusNote}</span>
            </div>
          )}

          {/* Lista de archivos adjuntos */}
          {attachments.length > 0 && (
            <div className="mt-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                <span>
                  Adjuntos ({attachments.length})
                  {totalOriginalBytes > 0 ? ` · ${formatFileSize(totalOriginalBytes)}` : ''}
                </span>
                <div className="flex items-center gap-2">
                  {readableAttachmentsCount > 0 && (
                    <button
                      type="button"
                      disabled={isAnalyzing}
                      onClick={() => analyzeFilesWithAI(attachments)}
                      className="inline-flex items-center gap-1 text-brand-blue hover:underline font-semibold cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles size={11} />
                      <span>Re-analizar IA</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-0.5 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Agregar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachments([]);
                      setAiStatusNote(null);
                    }}
                    className="inline-flex items-center gap-0.5 text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                  >
                    <Trash2 size={11} />
                    <span>Limpiar</span>
                  </button>
                </div>
              </div>

              <div className="max-h-[260px] overflow-y-auto space-y-2 pr-0.5">
                {attachments.map(file => {
                  const isImg = isImageAttachment(file);
                  const badge = getAttachmentBadge(file);
                  const aiReadable = isAiReadableAttachment(file);

                  return (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                    >
                      {/* Miniatura o ícono según tipo */}
                      <button
                        type="button"
                        onClick={() => setPreviewFile(file)}
                        className="w-11 h-11 rounded-lg border border-slate-200 bg-white overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:border-brand-blue/50 transition-colors"
                        title="Ver vista previa"
                      >
                        {isImg ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={file.dataUrl}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <FileText size={16} className="text-slate-500" />
                            <span className="text-[9px] font-bold text-slate-600 leading-none mt-0.5">
                              {badge.label}
                            </span>
                          </div>
                        )}
                      </button>

                      {/* Nombre y metadatos */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate" title={file.name}>
                          {file.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${badge.colorClass}`}
                          >
                            {badge.label}
                          </span>
                          {file.size ? (
                            <span className="text-[11px] text-slate-400 tabular-nums">
                              {formatFileSize(file.size)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Acciones rápidas por archivo */}
                      <div className="flex items-center gap-1 shrink-0">
                        {aiReadable && (
                          <button
                            type="button"
                            disabled={isAnalyzing}
                            onClick={() => analyzeFilesWithAI([file])}
                            className="h-7 w-7 rounded-lg border border-slate-200 bg-white hover:bg-brand-blue/10 hover:text-brand-blue text-slate-500 inline-flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                            title="Analizar este archivo con IA"
                          >
                            <Sparkles size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setPreviewFile(file)}
                          className="h-7 w-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 inline-flex items-center justify-center transition-colors cursor-pointer"
                          title="Ver archivo"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(file.id)}
                          className="h-7 w-7 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-400 inline-flex items-center justify-center transition-colors cursor-pointer"
                          title="Quitar archivo"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Lado Derecho: Formulario */}
        <form
          onSubmit={handleSave}
          className="bg-white rounded-xl p-5 md:p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col"
        >
          <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-200/80 pb-3">
            Detalles del Gasto
          </h3>

          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Proveedor / Negocio
              </label>
              <input
                required
                type="text"
                value={providerName}
                onChange={e => setProviderName(e.target.value)}
                placeholder="Ej. Gasolinera Delta"
                className="w-full h-9 px-3.5 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Fecha
                </label>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Moneda
                </label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-brand-blue font-semibold text-slate-800 transition-all"
                >
                  <option value="USD">Dólares (USD)</option>
                  <option value="CRC">Colones (CRC)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Monto
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-brand-blue font-bold text-slate-900 tabular-nums transition-all"
                />
              </div>
            </div>

            <div ref={dropdownRef} className="relative">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Categoría
              </label>

              <div
                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                className={`w-full h-9 px-3.5 bg-white border rounded-lg text-xs sm:text-sm font-medium flex items-center justify-between cursor-pointer transition-colors ${
                  isCategoryMenuOpen
                    ? 'border-brand-blue ring-2 ring-brand-blue/10'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <span className="text-slate-800">
                  {CATEGORY_OPTIONS.find(c => c.value === category)?.label || 'Otros'}
                </span>
                <ChevronDown
                  size={15}
                  className={`text-slate-400 transition-transform ${isCategoryMenuOpen ? 'rotate-180' : ''}`}
                />
              </div>

              {isCategoryMenuOpen && (
                <div className="absolute z-50 w-full bottom-full mb-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1.5 transform origin-bottom transition-all animate-in fade-in slide-in-from-bottom-2">
                  {CATEGORY_OPTIONS.map(opt => (
                    <div
                      key={opt.value}
                      onClick={() => {
                        setCategory(opt.value);
                        setIsCategoryMenuOpen(false);
                      }}
                      className="px-3.5 py-2 text-xs sm:text-sm hover:bg-brand-blue/5 hover:text-brand-blue cursor-pointer flex items-center justify-between text-slate-700 font-medium transition-colors"
                    >
                      <span>{opt.label}</span>
                      {category === opt.value && <Check size={14} className="text-brand-blue" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200/80 flex justify-end gap-2">
            <Link
              href="/admin/gastos"
              className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs inline-flex items-center transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSaving || isAnalyzing || isProcessingFiles}
              className="h-9 px-4 rounded-lg border border-brand-blue/20 bg-brand-blue hover:bg-[#0e354b] text-white shadow-2xs inline-flex items-center justify-center gap-1.5 font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              <Save size={15} /> {isSaving ? 'Guardando...' : 'Guardar Gasto'}
            </button>
          </div>
        </form>
      </div>

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
                    Este tipo de archivo se guardará completo con el gasto y podrás descargarlo en cualquier momento.
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
