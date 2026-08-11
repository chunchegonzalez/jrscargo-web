'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, UploadCloud, Sparkles, Loader2 } from 'lucide-react';

export default function NuevoGastoPage() {
  const router = useRouter();
  
  const [providerName, setProviderName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Otros');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Crear preview local
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      // Redimensionar la imagen para evitar errores de tamaño de Next.js (Payload Too Large) y ahorrar tokens
      const resizedBase64 = await resizeImage(file);
      const base64Data = resizedBase64.split(',')[1];
      const mimeType = 'image/jpeg';

      analyzeReceipt(base64Data, mimeType);
    } catch (error) {
      console.error(error);
      alert('Error al procesar la imagen antes de enviarla.');
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
        alert('Detalle del error de IA: ' + (data.error || 'Desconocido'));
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : 'Error de red';
      alert('Error al comunicar con la IA: ' + errorMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerName || !date || !amount || !category) {
      alert('Por favor completa todos los campos.');
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
          category,
          receipt_image: null // Evitar guardar un blob URL local que no sirve
        })
      });

      const result = await res.json();

      if (res.ok) {
        alert('Gasto guardado correctamente.');
        router.push('/admin/gastos');
      } else {
        alert('Error al guardar el gasto: ' + (result.error || 'Desconocido'));
      }
    } catch (err: any) {
      console.error(err);
      alert('Error de red al guardar el gasto.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/gastos" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-black text-brand-blue">Registrar Nuevo Gasto</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Lado Izquierdo: IA y Subida de Archivo */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-2">
              <Sparkles className="text-brand-blue" size={20} /> Analizar Factura con IA
            </h3>
            <p className="text-sm text-gray-500">
              Sube una foto de tu factura o recibo. Nuestra Inteligencia Artificial leerá el documento y llenará los campos por ti automáticamente.
            </p>
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 cursor-pointer transition-colors relative overflow-hidden min-h-[300px] ${
              previewUrl ? 'border-brand-blue/30 bg-brand-blue/5' : 'border-gray-200 hover:border-brand-blue/50 hover:bg-gray-50'
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
                <Loader2 size={40} className="text-brand-blue animate-spin mx-auto mb-4" />
                <p className="text-sm font-bold text-gray-700">La IA está analizando tu factura...</p>
                <p className="text-xs text-gray-500 mt-2">Extrayendo montos y fechas</p>
              </div>
            ) : previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-contain p-4 opacity-80" />
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UploadCloud size={28} className="text-gray-400" />
                </div>
                <p className="text-sm font-bold text-gray-700 mb-1">Haz clic para subir un archivo</p>
                <p className="text-xs text-gray-400">Soporta JPG, PNG o PDF</p>
              </div>
            )}
            
            {previewUrl && !isAnalyzing && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <span className="bg-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg">Cambiar archivo</span>
              </div>
            )}
          </div>
        </div>

        {/* Lado Derecho: Formulario */}
        <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">
            Detalles del Gasto
          </h3>
          
          <div className="space-y-5 flex-1">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Proveedor / Negocio</label>
              <input 
                required
                type="text" 
                value={providerName} 
                onChange={e => setProviderName(e.target.value)}
                placeholder="Ej. Gasolinera Delta"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue font-medium"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fecha</label>
                <input 
                  required
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Monto ($)</label>
                <input 
                  required
                  type="number" 
                  step="0.01"
                  value={amount} 
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue font-bold text-brand-blue"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Categoría</label>
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue font-medium"
              >
                <option value="Combustible">Combustible</option>
                <option value="Mantenimiento">Mantenimiento de Vehículos</option>
                <option value="Papelería">Papelería y Oficina</option>
                <option value="Planillas">Planillas / Salarios</option>
                <option value="Viáticos">Viáticos / Alimentación</option>
                <option value="Servicios">Servicios (Agua, Luz, Internet)</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
            <button 
              type="submit"
              disabled={isSaving || isAnalyzing}
              className="btn-primary w-full md:w-auto"
            >
              <Save size={20} /> {isSaving ? 'Guardando...' : 'Guardar Gasto'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
