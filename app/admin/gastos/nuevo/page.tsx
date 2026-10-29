'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, UploadCloud, Sparkles, Loader2, ChevronDown, Check } from 'lucide-react';
import { useModal } from '@/app/components/ModalProvider';
import { getLocalTodayDate } from '@/lib/billing';

export default function NuevoGastoPage() {
  const { showAlert } = useModal();
  const router = useRouter();
  
  const [providerName, setProviderName] = useState('');
  const [date, setDate] = useState(getLocalTodayDate());
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('Otros');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  
  const CATEGORY_OPTIONS = [
    { value: 'Combustible', label: 'Combustible' },
    { value: 'Mantenimiento', label: 'Mantenimiento de Vehículos' },
    { value: 'Papelería', label: 'Papelería y Oficina' },
    { value: 'Planillas', label: 'Planillas / Salarios' },
    { value: 'Viáticos', label: 'Viáticos / Alimentación' },
    { value: 'Servicios', label: 'Servicios (Agua, Luz, Internet)' },
    { value: 'Pago de Proveedor', label: 'Pago de Proveedor' },
    { value: 'Local San Pablo', label: 'Local San Pablo' },
    { value: 'Otros', label: 'Otros' }
  ];
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Crear preview local
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      // Redimensionar la imagen para optimizar el tamaño y guardarla
      const resizedBase64 = await resizeImage(file);
      setReceiptBase64(resizedBase64);
      const base64Data = resizedBase64.split(',')[1];
      const mimeType = 'image/jpeg';

      analyzeReceipt(base64Data, mimeType);
    } catch (error) {
      console.error(error);
      await showAlert('Aviso', 'Error al procesar la imagen antes de enviarla.');
    }
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max dimension 1200px
        const MAX_SIZE = 1200;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Export as JPEG
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
    });
  };

  const analyzeReceipt = async (base64Image: string, mimeType: string) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/expenses/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image, mimeType })
      });
      
      const textResponse = await res.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch {
        throw new Error('La respuesta del servidor no es válida (posiblemente la imagen era muy pesada).');
      }

      if (res.ok && data.success && data.data) {
        if (data.data.provider_name) setProviderName(data.data.provider_name);
        if (data.data.date) setDate(data.data.date);
        if (data.data.amount !== undefined) setAmount(data.data.amount.toString());
        if (data.data.category) setCategory(data.data.category);
      } else {
        await showAlert('Aviso', 'Detalle del error de IA: ' + (data.error || 'Desconocido'));
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : 'Error de red';
      await showAlert('Aviso', 'Error al comunicar con la IA: ' + errorMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerName || !date || !amount || !category) {
      await showAlert('Aviso', 'Por favor completa todos los campos.');
      return;
    }

    setIsSaving(true);
    try {
      const normalizedAmount = amount.replace(',', '.');
      const numAmount = parseFloat(normalizedAmount);

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider_name: providerName,
          date,
          amount: numAmount,
          currency,
          category,
          receipt_image: receiptBase64 || null
        })
      });

      const result = await res.json();

      if (res.ok) {
        await showAlert('Aviso', 'Gasto guardado correctamente.');
        router.push('/admin/gastos');
      } else {
        await showAlert('Aviso', 'Error al guardar el gasto: ' + (result.error || 'Desconocido'));
      }
    } catch (err) {
      console.error(err);
      await showAlert('Aviso', 'Error de red al guardar el gasto.');
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Registrar Nuevo Gasto</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/15">
                <Sparkles size={11} /> IA Activa
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Sube el comprobante o ingresa los datos manualmente.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Lado Izquierdo: IA y Subida de Archivo */}
        <div className="bg-white rounded-xl p-5 md:p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Sparkles className="text-brand-blue" size={16} /> Analizar Factura con IA
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sube una foto de tu factura o recibo. Nuestra Inteligencia Artificial leerá el documento y llenará los campos por ti automáticamente.
            </p>
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 cursor-pointer transition-colors relative overflow-hidden min-h-[260px] ${
              previewUrl ? 'border-brand-blue/30 bg-brand-blue/[0.03]' : 'border-slate-200 hover:border-brand-blue/50 hover:bg-slate-50/70'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*,application/pdf"
              className="hidden" 
            />
            
            {isAnalyzing ? (
              <div className="text-center">
                <Loader2 size={32} className="text-brand-blue animate-spin mx-auto mb-3" />
                <p className="text-xs sm:text-sm font-bold text-slate-800">La IA está analizando tu factura...</p>
                <p className="text-xs text-slate-400 mt-1">Extrayendo montos y fechas</p>
              </div>
            ) : previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-contain p-3 opacity-85" />
            ) : (
              <div className="text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-500">
                  <UploadCloud size={22} />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-700 mb-0.5">Haz clic para subir un archivo</p>
                <p className="text-[11px] text-slate-400">Soporta JPG, PNG o PDF</p>
              </div>
            )}
            
            {previewUrl && !isAnalyzing && (
              <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <span className="bg-white px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-800 shadow-lg">Cambiar archivo</span>
              </div>
            )}
          </div>
        </div>

        {/* Lado Derecho: Formulario */}
        <form onSubmit={handleSave} className="bg-white rounded-xl p-5 md:p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-200/80 pb-3">
            Detalles del Gasto
          </h3>
          
          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Proveedor / Negocio</label>
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
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha</label>
                <input 
                  required
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Moneda</label>
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-brand-blue font-semibold text-slate-800 transition-all"
                >
                  <option value="USD">Dólares (USD)</option>
                  <option value="CRC">Colones (CRC)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Monto</label>
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
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Categoría</label>
              
              <div 
                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                className={`w-full h-9 px-3.5 bg-white border rounded-lg text-xs sm:text-sm font-medium flex items-center justify-between cursor-pointer transition-colors ${isCategoryMenuOpen ? 'border-brand-blue ring-2 ring-brand-blue/10' : 'border-slate-200/90 hover:border-slate-300'}`}
              >
                <span className="text-slate-800">{CATEGORY_OPTIONS.find(c => c.value === category)?.label || 'Otros'}</span>
                <ChevronDown size={15} className={`text-slate-400 transition-transform ${isCategoryMenuOpen ? 'rotate-180' : ''}`} />
              </div>

              {isCategoryMenuOpen && (
                <div className="absolute z-50 w-full bottom-full mb-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1.5 transform origin-bottom transition-all animate-in fade-in slide-in-from-bottom-2">
                  {CATEGORY_OPTIONS.map((opt) => (
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
              disabled={isSaving || isAnalyzing}
              className="h-9 px-4 rounded-lg border border-brand-blue/20 bg-brand-blue hover:bg-[#0e354b] text-white shadow-2xs inline-flex items-center justify-center gap-1.5 font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              <Save size={15} /> {isSaving ? 'Guardando...' : 'Guardar Gasto'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
