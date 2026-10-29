'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, UserPlus, ChevronDown } from 'lucide-react';
import { useModal } from '@/app/components/ModalProvider';
import { getLocalTodayDate } from '@/lib/billing';

type Client = { id: string; name: string; email: string; phone?: string; address?: string; discount_percent?: number };
type InvoiceItem = { id: number; service_name: string; tracking_number: string; weight: string; rate: string; amount: number | string };
type ServiceType = { id: string; name: string; default_rate: number };

const DEFAULT_SERVICES: ServiceType[] = [
  { id: '1', name: 'TRANSPORTE ESTÁNDAR AÉREO MIA - SJO', default_rate: 7 },
  { id: '2', name: 'MAYORISTA AEREO MIA - SJO', default_rate: 9 },
  { id: '3', name: 'SERVICIO MARITIMO MIA - SJO', default_rate: 30 },
  { id: '4', name: 'MAYORISTA MARITIMO MIA - SJO TODO INCLUIDO', default_rate: 25 },
  { id: '5', name: 'TRANSPORTE ESTÁNDAR AÉREO CHINA - SJO', default_rate: 17 },
  { id: '6', name: 'TRANSPORTE ESTÁNDAR AÉREO MADRID - SJO', default_rate: 15 },
  { id: '7', name: 'MAYORISTA AÉREO MADRID - SJO', default_rate: 15 },
  { id: '8', name: 'COMPRA EN SITIO WEB', default_rate: 0 },
];

export type WeightUnitType = 'Lb' | 'Kg' | 'ft³';

export default function EditarFacturaPage() {
  const { showAlert } = useModal();
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [catalogServices, setCatalogServices] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);

  // Invoice state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [searchClientTerm, setSearchClientTerm] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [activeServiceDropdown, setActiveServiceDropdown] = useState<number | null>(null);
  
  const [invoiceNumber, setInvoiceNumber] = useState(`Cargando...`);
  const currency = 'USD';
  const [exchangeRate, setExchangeRate] = useState(500);
  const [weightUnit, setWeightUnit] = useState<WeightUnitType>('Lb');
  const [issueDate, setIssueDate] = useState(getLocalTodayDate());
  const [discountPercent, setDiscountPercent] = useState(0);
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: 1, service_name: '', tracking_number: '', weight: '', rate: '', amount: 0 }
  ]);
  const [notes, setNotes] = useState('Gracias por elegir a JRS CARGO.');
  const lastFetchedTrackingRef = useRef<Record<number, string>>({});
  const trackingTimerRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  // New client state
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', address: 'Costa Rica' });

  useEffect(() => {
    loadClients();
    loadCatalogServices();
    loadInvoiceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadCatalogServices = async () => {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      if (res.ok && data.success) {
        setCatalogServices(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/invoices/${id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        const inv = data.data;
        setSelectedClientId(inv.clients?.id || '');
        setSearchClientTerm(inv.clients?.name || '');
        setInvoiceNumber(inv.invoice_number);
        setExchangeRate(inv.exchange_rate || 500);
        setIssueDate(inv.issue_date.split('T')[0]);
        setDiscountPercent(Number(inv.discount_percent) || 0);
        setNotes(inv.notes || '');
        
        if (inv.items && inv.items.length > 0) {
          const firstService = inv.items[0]?.service_name || '';
          const detected = detectServiceUnit(firstService);
          if (detected) {
            setWeightUnit(detected);
          }

          const initialFetchedMap: Record<number, string> = {};
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          inv.items.forEach((it: any) => {
            initialFetchedMap[it.id] = String(it.tracking_number || '').trim().toUpperCase();
          });
          lastFetchedTrackingRef.current = initialFetchedMap;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setItems(inv.items.map((it: any) => ({
            id: it.id,
            service_name: it.service_name || '',
            tracking_number: it.tracking_number || '',
            weight: it.weight !== undefined && it.weight !== null ? String(it.weight) : '',
            rate: it.rate !== undefined && it.rate !== null ? String(it.rate) : '',
            amount: it.amount !== undefined && it.amount !== null ? Number(it.amount) : 0
          })));
        }
      } else {
        await showAlert('Aviso', 'Error al cargar la factura');
        router.push('/admin/facturacion');
      }
    } catch {
      await showAlert('Aviso', 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      if (data.success) {
        setClients(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await loadClients();
        setShowNewClientForm(false);
        setNewClient({ name: '', email: '', phone: '', address: 'Costa Rica' });
      } else {
        await showAlert('Aviso', 'Error al crear cliente: ' + (data.error || 'Verifica que hayas ejecutado el código SQL en Supabase.'));
      }
    } catch {
      await showAlert('Aviso', 'Error de red al crear cliente.');
    }
  };

  const handleAddItem = () => {
    setItems(prev => {
      const lastItem = prev[prev.length - 1];
      const newId = Date.now() + Math.random();
      lastFetchedTrackingRef.current[newId] = '';
      return [
        ...prev,
        {
          id: newId,
          service_name: lastItem?.service_name || '',
          tracking_number: '',
          weight: '',
          rate: lastItem?.rate || '',
          amount: 0
        }
      ];
    });
  };

  const handleTrackingBlur = async (itemId: number, trackingNumber: string) => {
    const cleanTracking = (trackingNumber || '').trim();
    if (!cleanTracking) return;

    const upperTracking = cleanTracking.toUpperCase();
    // Si el tracking no cambió respecto al que ya tenía cargado o consultado, no sobreescribir el peso manual
    if (lastFetchedTrackingRef.current[itemId] === upperTracking) {
      return;
    }
    lastFetchedTrackingRef.current[itemId] = upperTracking;

    try {
      const res = await fetch(`/api/tracking?number=${encodeURIComponent(cleanTracking)}`);
      const data = await res.json();
      if (data.status === 'SUCCESS' && data.rawData?.package?.weight) {
        const rawWeight = Number(data.rawData.package.weight);
        if (!rawWeight || isNaN(rawWeight) || rawWeight <= 0) return;
        const apiUnit = (data.rawData.package.weightUnit || 'lbs').toLowerCase();

        setItems(prev => prev.map(item => {
          if (item.id !== itemId) return item;
          // Verificar que el usuario siga teniendo este mismo tracking en la línea
          if ((item.tracking_number || '').trim().toUpperCase() !== upperTracking) return item;

          const rowUnit = detectServiceUnit(item.service_name) || weightUnit;
          let convertedWeight = rawWeight;
          if (apiUnit.includes('lb') && rowUnit === 'Kg') {
            convertedWeight = rawWeight * 0.453592;
          } else if ((apiUnit.includes('kg') || apiUnit.includes('kilo')) && rowUnit === 'Lb') {
            convertedWeight = rawWeight * 2.20462;
          }

          const formattedWeight = convertedWeight.toFixed(2).replace(/\.00$/, '');
          const r = Number(item.rate) || 0;
          const w = Number(formattedWeight) || 0;
          const updatedAmount = w > 0 && r > 0 ? Number((w * r).toFixed(2)) : item.amount;

          return {
            ...item,
            weight: formattedWeight,
            amount: updatedAmount
          };
        }));
      }
    } catch (e) {
      console.error('Error fetching tracking for weight:', e);
    }
  };

  const handleRemoveItem = (id: number) => {
    setItems(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(item => item.id !== id);
    });
  };

  const handleWeightUnitChange = (newUnit: WeightUnitType) => {
    // Solo cambia la etiqueta de unidad visual seleccionada, sin alterar los pesos ni importes existentes
    setWeightUnit(newUnit);
  };

  const detectServiceUnit = (name: string): WeightUnitType | null => {
    if (!name) return null;
    const norm = name
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    // 1. Marítimo -> Pies Cúbicos (ft³)
    if (norm.includes('MARITIMO') || norm.includes('PIE CUBICO') || norm.includes('FT3')) {
      return 'ft³';
    }

    // 2. Mayorista Aéreo / Madrid -> Kilos (Kg)
    if (
      norm.includes('MAYORISTA AEREO') ||
      norm.includes('AEREO MADRID') ||
      (norm.includes('MAYORISTA') && norm.includes('AEREO')) ||
      (norm.includes('MAYORISTA') && norm.includes('MADRID'))
    ) {
      return 'Kg';
    }

    // 3. Estándar Aéreo -> Libras (Lb)
    if (norm.includes('ESTANDAR AEREO') || norm.includes('TRANSPORTE ESTANDAR')) {
      return 'Lb';
    }

    return null;
  };

  const handleItemChange = (id: number, field: string, value: string) => {
    if (field === 'tracking_number') {
      if (trackingTimerRef.current[id]) {
        clearTimeout(trackingTimerRef.current[id]);
      }
      const trimmed = value.trim();
      if (!trimmed) {
        lastFetchedTrackingRef.current[id] = '';
      } else if (trimmed.length >= 5) {
        trackingTimerRef.current[id] = setTimeout(() => {
          handleTrackingBlur(id, trimmed);
        }, 450);
      }
    }

    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Al seleccionar un servicio del catálogo, solo sugerir tarifa por defecto si la tarifa actual está vacía
        if (field === 'service_name') {
           const available = catalogServices.length > 0 ? [...catalogServices, ...DEFAULT_SERVICES] : DEFAULT_SERVICES;
           const foundService = available.find(s => s.name.toUpperCase() === value.toUpperCase());
           if (foundService && (!updatedItem.rate || Number(updatedItem.rate) === 0)) {
             updatedItem.rate = foundService.default_rate.toString();
             const w = Number(updatedItem.weight) || 0;
             const r = Number(updatedItem.rate) || 0;
             if (w > 0 && r > 0 && (!updatedItem.amount || Number(updatedItem.amount) === 0)) {
               updatedItem.amount = Number((w * r).toFixed(2));
             }
           }
        }

        // Recalcular importe únicamente cuando el usuario edita manualmente el peso o la tarifa
        if (field === 'weight' || field === 'rate') {
          const w = Number(field === 'weight' ? value : item.weight) || 0;
          const r = Number(field === 'rate' ? value : item.rate) || 0;
          if (w > 0 && r > 0) {
            updatedItem.amount = Number((w * r).toFixed(2));
          }
        }

        if (field === 'amount') {
           updatedItem.amount = value === '' ? '' : Number(value);
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const subtotal = items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const total = subtotal - discountAmount;

  const handleSaveInvoice = async () => {
    if (!selectedClientId) {
      await showAlert('Aviso', 'Debes seleccionar un cliente');
      return;
    }
    if (items.some(i => !i.service_name || !i.amount)) {
      await showAlert('Aviso', 'Todos los ítems deben tener un nombre de servicio y un importe válido.');
      return;
    }

    setLoading(true);
    try {
      const invoiceData = {
        invoice_number: invoiceNumber,
        client_id: selectedClientId,
        issue_date: issueDate,
        subtotal,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        total,
        notes,
        currency,
        exchange_rate: exchangeRate,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        items: items.map(({ id, ...rest }) => rest) // remove temp id
      };

      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/admin/facturacion');
      } else {
        await showAlert('Aviso', 'Error al guardar factura: ' + (data.error || 'Verifica que hayas ejecutado el código SQL en Supabase.'));
      }
    } catch {
      await showAlert('Aviso', 'Error de red al guardar factura');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/facturacion"
            className="h-9 w-9 inline-flex items-center justify-center bg-white border border-slate-200/90 rounded-lg hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors"
            title="Volver a Facturación"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Editar Factura</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/15 font-mono">
                {invoiceNumber}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Actualiza los datos y servicios del comprobante.</p>
          </div>
        </div>
        <button 
          onClick={handleSaveInvoice}
          disabled={loading}
          className="h-9 px-3.5 rounded-lg border border-brand-blue/20 bg-brand-blue hover:bg-[#0e354b] text-white shadow-2xs inline-flex items-center gap-1.5 font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
        >
          <Save size={15} /> {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <div className="bg-white rounded-xl p-5 md:p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        {/* Cabecera Factura */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 border-b border-slate-200/80 pb-6">
          
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Cliente</label>
              {!showNewClientForm ? (
                <div className="flex gap-2 relative">
                  <div className="relative w-full">
                    <input 
                      type="text"
                      placeholder="Buscar cliente por nombre..."
                      value={searchClientTerm}
                      onChange={(e) => {
                        setSearchClientTerm(e.target.value);
                        setIsClientDropdownOpen(true);
                      }}
                      onFocus={() => setIsClientDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsClientDropdownOpen(false), 150)}
                      className="w-full h-9 px-3.5 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                    />
                    {isClientDropdownOpen && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {clients.filter(c => c.name.toLowerCase().includes(searchClientTerm.toLowerCase())).map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => {
                              setSelectedClientId(c.id);
                              setSearchClientTerm(c.name);
                              setIsClientDropdownOpen(false);
                              const fixedDiscount = Number(c.discount_percent) || 0;
                              setDiscountPercent(fixedDiscount);
                            }}
                            className={`px-3.5 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between ${selectedClientId === c.id ? 'bg-brand-blue/5 font-bold text-brand-blue' : 'text-slate-700'}`}
                          >
                            <div>
                              <div className="text-xs sm:text-sm font-medium">{c.name}</div>
                              <div className="text-[11px] text-slate-400">{c.email}</div>
                            </div>
                            {Number(c.discount_percent || 0) > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-200/80 shrink-0">
                                🏷️ {c.discount_percent}% desc
                              </span>
                            )}
                          </div>
                        ))}
                        {clients.filter(c => c.name.toLowerCase().includes(searchClientTerm.toLowerCase())).length === 0 && (
                          <div className="px-4 py-3 text-xs text-slate-400 text-center">No se encontraron clientes.</div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowNewClientForm(true)}
                    className="h-9 px-3 bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/15 border border-brand-blue/20 rounded-lg inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                    title="Nuevo Cliente"
                  >
                    <UserPlus size={16} />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateClient} className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Crear Cliente Rápido</h4>
                  <input required placeholder="Nombre Completo" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm" />
                  <input required type="email" placeholder="Correo Electrónico" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="tel" placeholder="Nº de Teléfono" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm" />
                    <select value={newClient.address} onChange={e => setNewClient({...newClient, address: e.target.value})} className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm">
                      <option value="Costa Rica">Costa Rica</option>
                      <option value="Estados Unidos">Estados Unidos</option>
                      <option value="Nicaragua">Nicaragua</option>
                      <option value="Otro">Otro País</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="submit" className="flex-1 h-8 bg-brand-blue text-white rounded-lg text-xs font-semibold">Guardar</button>
                    <button type="button" onClick={() => setShowNewClientForm(false)} className="h-8 px-3 bg-slate-200/80 text-slate-700 rounded-lg text-xs font-semibold">Cancelar</button>
                  </div>
                </form>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nota para cliente</label>
              <textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full p-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 resize-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-4 md:pl-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">N.º Factura</label>
                <input 
                  type="text" 
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200/90 bg-white font-mono font-bold text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all" 
                  required 
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Moneda</label>
                <select 
                  value="USD"
                  disabled
                  className="w-full h-9 px-3 rounded-lg border border-slate-200/90 bg-slate-50 font-semibold text-slate-600 text-xs sm:text-sm cursor-not-allowed"
                >
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">T. Cambio</label>
                <input 
                  type="number"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200/90 bg-white font-semibold text-slate-800 text-xs sm:text-sm tabular-nums focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                  min="1"
                  step="1"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Unidad</label>
                <select 
                  value={weightUnit}
                  onChange={(e) => handleWeightUnitChange(e.target.value as WeightUnitType)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200/90 bg-white font-semibold text-slate-800 text-xs sm:text-sm focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all cursor-pointer"
                >
                  <option value="Lb">Libras (Lb)</option>
                  <option value="Kg">Kilos (Kg)</option>
                  <option value="ft³">Pies Cúbicos (ft³)</option>
                </select>
              </div>
              <div className="col-span-2 sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha de Emisión</label>
                <input 
                  type="date" 
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200/90 bg-white text-slate-800 font-medium text-xs sm:text-sm focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all" 
                  required 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Productos / Servicios */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Productos o Servicios</h3>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md tabular-nums">
              {items.length} {items.length === 1 ? 'línea' : 'líneas'}
            </span>
          </div>
          
          <div className="border border-slate-200/80 rounded-xl bg-white">
            <div className="bg-slate-50/95 grid grid-cols-12 gap-2 py-2.5 px-3.5 border-b border-slate-200/90 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden md:grid items-center rounded-t-xl">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-4">Producto/Servicio</div>
              <div className="col-span-3">Nº Rastreo</div>
              <div className="col-span-1 text-center">Peso / Medida</div>
              <div className="col-span-1 text-center">Tarifa</div>
              <div className="col-span-2 text-right pr-8">Importe ($)</div>
            </div>

            {items.map((item, index) => {
              const availableServices = catalogServices.length > 0 ? catalogServices : DEFAULT_SERVICES;
              const isWeb = Boolean(item.service_name && (
                item.service_name.toUpperCase().includes('COMPRA') ||
                item.service_name.toUpperCase().includes('SITIO WEB')
              ));

              return (
              <div key={item.id} className="py-2.5 px-3.5 border-b border-slate-100 last:border-0 grid grid-cols-1 md:grid-cols-12 gap-2 items-center hover:bg-slate-50/50 transition-colors">
                <div className="hidden md:flex justify-center items-center">
                  <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                    {index + 1}
                  </span>
                </div>
                <div className="md:col-span-4 relative">
                  <div className="md:hidden text-[11px] font-semibold text-slate-400 mb-1">Línea #{index + 1} - Producto / Servicio</div>
                  <div className="relative">
                    <input 
                      placeholder="Seleccionar o escribir servicio..." 
                      value={item.service_name} 
                      onChange={e => {
                        handleItemChange(item.id, 'service_name', e.target.value);
                        setActiveServiceDropdown(item.id);
                      }}
                      onFocus={() => setActiveServiceDropdown(item.id)}
                      onBlur={() => setTimeout(() => setActiveServiceDropdown(null), 250)}
                      className="w-full h-9 pl-3 pr-8 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-brand-blue uppercase font-medium text-slate-800"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setActiveServiceDropdown(activeServiceDropdown === item.id ? null : item.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-brand-blue cursor-pointer"
                      title="Ver catálogo de servicios"
                    >
                      <ChevronDown size={15} className={`transition-transform duration-200 ${activeServiceDropdown === item.id ? 'rotate-180 text-brand-blue' : ''}`} />
                    </button>
                  </div>

                  {activeServiceDropdown === item.id && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 min-w-[280px]">
                      <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 border-b border-slate-100">
                        Catálogo de Servicios Disponibles
                      </div>
                      {availableServices
                        .filter(s => !item.service_name || s.name.toLowerCase().includes(item.service_name.toLowerCase()))
                        .map(s => (
                        <div 
                          key={s.id} 
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleItemChange(item.id, 'service_name', s.name);
                            setActiveServiceDropdown(null);
                          }}
                          className="px-3 py-2 hover:bg-brand-blue/5 cursor-pointer flex justify-between items-center transition-colors group"
                        >
                          <span className="text-xs font-semibold text-slate-700 group-hover:text-brand-blue">{s.name}</span>
                          <span className="text-xs font-bold text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-md shrink-0 ml-2 tabular-nums">
                            ${Number(s.default_rate).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {availableServices.filter(s => !item.service_name || s.name.toLowerCase().includes(item.service_name.toLowerCase())).length === 0 && (
                        <div className="px-4 py-3 text-xs text-slate-500 text-center">
                          Usar personalizado: &quot;{item.service_name}&quot;
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="md:col-span-3">
                  <div className="md:hidden text-[11px] font-semibold text-slate-400 mb-1">Nº Rastreo</div>
                  <input 
                    required={!isWeb}
                    placeholder={isWeb ? "Detalle / Referencia (Opcional)" : "Tracking (Obligatorio)"} 
                    value={item.tracking_number} 
                    onChange={e => handleItemChange(item.id, 'tracking_number', e.target.value)}
                    onBlur={() => !isWeb && handleTrackingBlur(item.id, item.tracking_number || '')}
                    className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-brand-blue font-mono text-slate-800"
                  />
                </div>
                <div className="md:col-span-1">
                  <div className="md:hidden text-[11px] font-semibold text-slate-400 mb-1">{isWeb ? 'Cantidad' : `Medida (${weightUnit})`}</div>
                  <input 
                    type="number" 
                    placeholder={isWeb ? "Cant." : weightUnit} 
                    value={item.weight} 
                    onChange={e => handleItemChange(item.id, 'weight', e.target.value)}
                    className="w-full h-9 px-2.5 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-brand-blue text-center tabular-nums"
                  />
                </div>
                <div className="md:col-span-1">
                  <div className="md:hidden text-[11px] font-semibold text-slate-400 mb-1">{isWeb ? 'Precio ($)' : `Tarifa ($/${weightUnit})`}</div>
                  <input 
                    type="number" 
                    placeholder={isWeb ? "$/Und" : `$/${weightUnit}`} 
                    value={item.rate} 
                    onChange={e => handleItemChange(item.id, 'rate', e.target.value)}
                    className="w-full h-9 px-2.5 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-brand-blue text-center tabular-nums"
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-1.5">
                  <div className="flex-1">
                    <div className="md:hidden text-[11px] font-semibold text-slate-400 mb-1">Importe ($)</div>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={item.amount || ''} 
                      onChange={e => handleItemChange(item.id, 'amount', e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-blue text-right tabular-nums"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-auto md:mt-0 cursor-pointer"
                    title="Eliminar línea"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleAddItem}
              className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue bg-brand-blue/[0.06] hover:bg-brand-blue/10 border border-brand-blue/15 rounded-lg transition-colors cursor-pointer"
            >
              <Plus size={14} /> Agregar línea
            </button>
            <span className="text-xs font-medium text-slate-500">
              Total de líneas: <span className="text-slate-900 font-bold tabular-nums">{items.length}</span>
            </span>
          </div>
        </div>

        {/* Totales y Guardar */}
        <div className="border-t border-slate-200/80 pt-6 flex flex-col md:flex-row justify-between items-end gap-5">
          <div className="w-full md:w-1/2">
            <p className="text-xs text-slate-500">
              Esta factura se guardará en estado <span className="font-semibold text-amber-600">Pendiente</span>. Podrás enviarla por correo desde el panel principal.
            </p>
          </div>
          
          <div className="w-full md:w-80 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-2.5">
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="font-medium text-slate-600">Subtotal</span>
              <span className="font-semibold text-slate-800 tabular-nums">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="font-medium text-slate-600 flex items-center gap-2">
                Descuento
                <div className="relative">
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={e => setDiscountPercent(Number(e.target.value) || 0)}
                    className="w-16 h-7 pl-2 pr-5 bg-white border border-slate-200/90 rounded-md text-right text-xs font-semibold focus:outline-none focus:border-brand-blue [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none tabular-nums"
                  />
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-[11px]">%</span>
                </div>
              </span>
              <span className="font-semibold text-emerald-600 tabular-nums">-${discountAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2.5 border-t border-slate-200/80">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Total (USD)</span>
              <span className="text-xl font-black text-slate-900 tabular-nums">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-white rounded-lg border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-600 flex flex-col">
                <span>Total Ref. (CRC)</span>
                <span className="text-[10px] font-normal text-slate-400">T.C. ₡{exchangeRate}</span>
              </span>
              <span className="text-sm font-black text-brand-blue tabular-nums">
                ₡{(total * exchangeRate).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end gap-2">
          <Link
            href="/admin/facturacion"
            className="h-9 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs inline-flex items-center transition-colors"
          >
            Cancelar
          </Link>
          <button 
            onClick={handleSaveInvoice}
            disabled={loading}
            className="h-9 px-4 rounded-lg border border-brand-blue/20 bg-brand-blue hover:bg-[#0e354b] text-white shadow-2xs inline-flex items-center gap-1.5 font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            <Save size={15} /> {loading ? 'Guardando...' : 'Guardar y Cerrar'}
          </button>
        </div>

      </div>
    </div>
  );
}
