'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, UserPlus, ChevronDown, MessageCircle, Mail, Send, Check } from 'lucide-react';
import { useModal } from '@/app/components/ModalProvider';
import { getLocalTodayDate } from '@/lib/billing';
import { generateInvoiceWhatsAppMessage, formatWhatsAppPhone, openWhatsAppWeb } from '@/lib/whatsapp';

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
  { id: '7', name: 'COMPRA EN SITIO WEB', default_rate: 0 },
];

export default function NuevaFacturaPage() {
  const { showAlert } = useModal();
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
  const [weightUnit, setWeightUnit] = useState<'Lb' | 'Kg'>('Lb');
  const [issueDate, setIssueDate] = useState(getLocalTodayDate());
  const [discountPercent, setDiscountPercent] = useState(0);
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: 1, service_name: '', tracking_number: '', weight: '', rate: '', amount: 0 }
  ]);
  const [notes, setNotes] = useState('Gracias por elegir a JRS CARGO.');

  // Auto-send notification state
  const [autoSendEmail, setAutoSendEmail] = useState(true);
  const [autoSendWhatsApp, setAutoSendWhatsApp] = useState(true);

  // New client state
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', address: 'Costa Rica' });

  useEffect(() => {
    loadClients();
    loadCatalogServices();
    loadNextInvoiceNumber();
    loadDailyExchangeRate();
  }, []);

  const loadDailyExchangeRate = async () => {
    try {
      const res = await fetch('/api/exchange-rate');
      const data = await res.json();
      if (res.ok && data.success && Number(data.rate) > 0) {
        setExchangeRate(Number(data.rate));
      }
    } catch {
      // Keep default 500
    }
  };

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

  const loadNextInvoiceNumber = async () => {
    try {
      const res = await fetch('/api/invoices/next-number');
      const data = await res.json();
      if (res.ok && data.success) {
        setInvoiceNumber(data.nextNumber);
      } else {
        setInvoiceNumber(`F-${Math.floor(Date.now() / 1000)}`);
      }
    } catch {
      setInvoiceNumber(`F-${Math.floor(Date.now() / 1000)}`);
    }
  };

  const loadClients = async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      if (data.success) {
        setClients(data.data);

        // Check if a client was passed via URL search parameters
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const cid = urlParams.get('client_id');
          if (cid) {
            const matched = (data.data as Client[]).find(cl => cl.id === cid);
            if (matched) {
              setSelectedClientId(matched.id);
              setSearchClientTerm(matched.name);
              const fixedDiscount = Number(matched.discount_percent) || 0;
              setDiscountPercent(fixedDiscount);
            }
          }
        }
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
    setItems([...items, { id: Date.now(), service_name: '', tracking_number: '', weight: '', rate: '', amount: 0 }]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length === 1) return;
    setItems(items.filter(item => item.id !== id));
  };

  const handleWeightUnitChange = (newUnit: 'Lb' | 'Kg') => {
    if (newUnit === weightUnit) return;
    setWeightUnit(newUnit);
    
    setItems(items.map(item => {
      if (!item.weight) return item;
      const w = Number(item.weight);
      const newWeight = newUnit === 'Kg' ? (w * 0.453592) : (w * 2.20462);
      const updatedWeight = newWeight.toFixed(2).replace(/\.00$/, '');
      
      const r = Number(item.rate) || 0;
      const amount = r > 0 ? Number((Number(updatedWeight) * r).toFixed(2)) : Number(item.amount);
      
      return { ...item, weight: updatedWeight, amount };
    }));
  };

  const handleTrackingBlur = async (itemId: number, trackingNumber: string) => {
    if (!trackingNumber) return;
    try {
      const res = await fetch(`/api/tracking?number=${encodeURIComponent(trackingNumber)}`);
      const data = await res.json();
      if (data.status === 'SUCCESS' && data.rawData?.package?.weight) {
        let apiWeight = Number(data.rawData.package.weight);
        const apiUnit = (data.rawData.package.weightUnit || 'lbs').toLowerCase();
        
        if (apiUnit.includes('lb') && weightUnit === 'Kg') {
          apiWeight = apiWeight * 0.453592;
        } else if ((apiUnit.includes('kg') || apiUnit.includes('kilo')) && weightUnit === 'Lb') {
          apiWeight = apiWeight * 2.20462;
        }
        
        handleItemChange(itemId, 'weight', apiWeight.toFixed(2).replace(/\.00$/, ''));
      }
    } catch (e) {
      console.error('Error fetching tracking for weight:', e);
    }
  };

  const handleItemChange = (id: number, field: string, value: string) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-fill rate if a catalog service is selected
        if (field === 'service_name') {
           const foundService = catalogServices.find(s => s.name.toUpperCase() === value.toUpperCase());
           if (foundService) {
             updatedItem.rate = foundService.default_rate.toString();
             // recalculate amount if weight is present
             const w = Number(updatedItem.weight) || 0;
             const r = Number(updatedItem.rate) || 0;
             updatedItem.amount = w > 0 && r > 0 ? Number((w * r).toFixed(2)) : 0;
           }
        }

        // Auto calculate amount if rate and weight are present
        if (field === 'weight' || field === 'rate') {
          const w = Number(field === 'weight' ? value : item.weight) || 0;
          const r = Number(field === 'rate' ? value : item.rate) || 0;
          updatedItem.amount = w > 0 && r > 0 ? Number((w * r).toFixed(2)) : Number(updatedItem.amount);
        }
        if (field === 'amount') {
           updatedItem.amount = Number(value) || 0;
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
      const payload = {
        invoice_number: invoiceNumber,
        client_id: selectedClientId,
        issue_date: issueDate,
        subtotal,
        tax_amount: 0,
        discount_amount: discountAmount,
        total,
        notes,
        currency,
        exchange_rate: exchangeRate,
        items: items.map(item => ({
          service_name: item.service_name,
          tracking_number: item.tracking_number,
          weight: Number(item.weight) || 0,
          rate: Number(item.rate) || 0,
          amount: item.amount
        }))
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        const newInvoiceId = data.id;
        const selectedClient = clients.find(c => c.id === selectedClientId);

        // 1. Envío automático por Correo Electrónico
        if (autoSendEmail && newInvoiceId) {
          try {
            fetch(`/api/invoices/${newInvoiceId}/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            }).catch(err => console.error('Error auto-sending email:', err));
          } catch (err) {
            console.error('Error auto-sending email:', err);
          }
        }

        // 2. Envío automático por WhatsApp
        if (autoSendWhatsApp && selectedClient) {
          const clientPhone = selectedClient.phone || '';
          const clientName = selectedClient.name || 'Cliente';
          const msg = generateInvoiceWhatsAppMessage({
            clientName,
            invoiceNumber,
            items,
            totalAmount: total,
            pendingAmount: total,
            currency,
            exchangeRate,
            isPaid: false
          });
          openWhatsAppWeb(clientPhone, msg);
        }

        await showAlert('Éxito', `✅ Factura ${invoiceNumber} guardada y procesada para envío.`);
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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/facturacion" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-black text-brand-blue">Nueva Factura</h1>
      </div>

      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
        {/* Cabecera Factura */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 border-b border-gray-100 pb-8">
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cliente</label>
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
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue"
                    />
                    {isClientDropdownOpen && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
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
                            className={`px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 flex items-center justify-between ${selectedClientId === c.id ? 'bg-brand-blue/5 font-bold text-brand-blue' : 'text-gray-700'}`}
                          >
                            <div>
                              <div className="text-sm font-medium">{c.name}</div>
                              <div className="text-xs text-gray-400">{c.email}</div>
                            </div>
                            {Number(c.discount_percent || 0) > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200 shrink-0">
                                🏷️ {c.discount_percent}% desc
                              </span>
                            )}
                          </div>
                        ))}
                        {clients.filter(c => c.name.toLowerCase().includes(searchClientTerm.toLowerCase())).length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">No se encontraron clientes.</div>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setShowNewClientForm(true)} className="p-2.5 bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20 rounded-xl shrink-0" title="Nuevo Cliente">
                    <UserPlus size={20} />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateClient} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                  <h4 className="text-sm font-bold text-brand-blue mb-2">Crear Cliente Rápido</h4>
                  <input required placeholder="Nombre Completo" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input required type="email" placeholder="Correo Electrónico" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="tel" placeholder="Nº de Teléfono" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    <select value={newClient.address} onChange={e => setNewClient({...newClient, address: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                      <option value="Costa Rica">Costa Rica</option>
                      <option value="Estados Unidos">Estados Unidos</option>
                      <option value="Nicaragua">Nicaragua</option>
                      <option value="Otro">Otro País</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm font-bold">Guardar</button>
                    <button type="button" onClick={() => setShowNewClientForm(false)} className="py-2 px-4 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold">Cancelar</button>
                  </div>
                </form>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nota para cliente</label>
              <textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue resize-none"
              />
            </div>
          </div>

          <div className="space-y-4 md:pl-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">N.º Factura</label>
                <input 
                  type="text" 
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-blue font-bold text-brand-blue" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Moneda</label>
                <select 
                  value="USD"
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-blue bg-gray-50 font-bold text-brand-blue cursor-not-allowed"
                >
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">T. Cambio</label>
                <input 
                  type="number"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-blue bg-white font-bold text-brand-blue"
                  min="1"
                  step="1"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Unidad</label>
                <select 
                  value={weightUnit}
                  onChange={(e) => handleWeightUnitChange(e.target.value as 'Lb' | 'Kg')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-blue bg-white font-bold text-brand-blue"
                >
                  <option value="Lb">Libras (Lb)</option>
                  <option value="Kg">Kilos (Kg)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Emisión</label>
                <input 
                  type="date" 
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-blue text-gray-700 font-medium" 
                  required 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Productos / Servicios */}
        <div className="space-y-4 mb-10">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Productos o Servicios</h3>
            <span className="px-3 py-1 bg-brand-blue/10 text-brand-blue text-xs font-black rounded-full">
              {items.length} {items.length === 1 ? 'línea' : 'líneas'}
            </span>
          </div>
          
          <div className="border border-gray-200 rounded-xl bg-white">
            <div className="bg-gray-50 grid grid-cols-12 gap-2 p-3 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:grid items-center rounded-t-xl">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-4">Producto/Servicio</div>
              <div className="col-span-3">Nº Rastreo</div>
              <div className="col-span-1 text-center">Peso</div>
              <div className="col-span-1 text-center">Tarifa</div>
              <div className="col-span-2 text-right pr-8">Importe ($)</div>
            </div>

            {items.map((item, index) => {
              const availableServices = catalogServices.length > 0 ? catalogServices : DEFAULT_SERVICES;
              return (
              <div key={item.id} className="p-3 border-b border-gray-100 last:border-0 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <div className="hidden md:flex justify-center items-center">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 font-bold text-xs flex items-center justify-center">
                    {index + 1}
                  </span>
                </div>
                <div className="md:col-span-4 relative">
                  <div className="md:hidden text-xs font-bold text-gray-400 mb-1">Línea #{index + 1} - Producto / Servicio</div>
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
                      className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue uppercase font-medium text-gray-800"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setActiveServiceDropdown(activeServiceDropdown === item.id ? null : item.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-brand-blue cursor-pointer"
                      title="Ver catálogo de servicios"
                    >
                      <ChevronDown size={16} className={`transition-transform duration-200 ${activeServiceDropdown === item.id ? 'rotate-180 text-brand-blue' : ''}`} />
                    </button>
                  </div>

                  {activeServiceDropdown === item.id && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-gray-100 min-w-[280px]">
                      <div className="p-2 bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-wider sticky top-0 border-b border-gray-100">
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
                          className="px-3 py-2.5 hover:bg-brand-blue/5 cursor-pointer flex justify-between items-center transition-colors group"
                        >
                          <span className="text-xs font-bold text-gray-700 group-hover:text-brand-blue">{s.name}</span>
                          <span className="text-xs font-black text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-lg shrink-0 ml-2">
                            ${Number(s.default_rate).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {availableServices.filter(s => !item.service_name || s.name.toLowerCase().includes(item.service_name.toLowerCase())).length === 0 && (
                        <div className="px-4 py-3 text-xs text-gray-500 text-center">
                          Usar personalizado: &quot;{item.service_name}&quot;
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="md:col-span-3">
                  <div className="md:hidden text-xs font-bold text-gray-400 mb-1">Nº Rastreo</div>
                  <input 
                    required
                    placeholder="Tracking (Obligatorio)" 
                    value={item.tracking_number} 
                    onChange={e => handleItemChange(item.id, 'tracking_number', e.target.value)}
                    onBlur={() => handleTrackingBlur(item.id, item.tracking_number || '')}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue font-mono"
                  />
                </div>
                <div className="md:col-span-1">
                  <div className="md:hidden text-xs font-bold text-gray-400 mb-1">Peso ({weightUnit})</div>
                  <input 
                    type="number" 
                    placeholder={weightUnit} 
                    value={item.weight} 
                    onChange={e => handleItemChange(item.id, 'weight', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue text-center"
                  />
                </div>
                <div className="md:col-span-1">
                  <div className="md:hidden text-xs font-bold text-gray-400 mb-1">Tarifa ($/{weightUnit})</div>
                  <input 
                    type="number" 
                    placeholder={`$/${weightUnit}`} 
                    value={item.rate} 
                    onChange={e => handleItemChange(item.id, 'rate', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue text-center"
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <div className="flex-1">
                    <div className="md:hidden text-xs font-bold text-gray-400 mb-1">Importe ($)</div>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={item.amount || ''} 
                      onChange={e => handleItemChange(item.id, 'amount', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-brand-blue focus:outline-none focus:border-brand-blue text-right"
                    />
                  </div>
                  <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-auto md:mt-0">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button onClick={handleAddItem} className="flex items-center gap-2 text-sm font-bold text-brand-blue hover:text-brand-blue/80 px-2 py-1 rounded-lg hover:bg-brand-blue/5 transition-colors">
              <Plus size={16} /> Agregar línea
            </button>
            <span className="text-xs font-bold text-gray-500">
              Total de líneas: <span className="text-brand-blue font-black">{items.length}</span>
            </span>
          </div>
        </div>

        {/* Totales y Opciones de Envío */}
        <div className="border-t border-gray-100 pt-8 flex flex-col lg:flex-row justify-between items-start gap-8">
          
          {/* Panel de Envío Automático */}
          <div className="w-full lg:w-1/2 space-y-4">
            <div className="bg-gradient-to-br from-emerald-50/90 to-teal-50/60 border border-emerald-200/90 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-950 font-black text-sm mb-1">
                <span className="text-lg">⚡</span>
                <span>Proceso de Envío Automático al Guardar</span>
              </div>
              <p className="text-xs text-emerald-800/80 mb-4 leading-relaxed">
                Al crear la factura, el sistema enviará los comprobantes y notificaciones automáticamente a tu cliente sin pasos adicionales.
              </p>

              <div className="space-y-2.5">
                <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${autoSendEmail ? 'bg-white border-emerald-300 shadow-2xs' : 'bg-white/50 border-gray-200 opacity-60'}`}>
                  <input 
                    type="checkbox" 
                    checked={autoSendEmail} 
                    onChange={e => setAutoSendEmail(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-gray-900 flex items-center gap-1.5">
                      <Mail size={14} className="text-emerald-600" /> Enviar Factura en PDF por Correo
                    </span>
                    <span className="text-gray-500 block text-[11px] mt-0.5">Envía el correo oficial con el desglose de paquetes y PDF adjunto.</span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${autoSendWhatsApp ? 'bg-white border-emerald-300 shadow-2xs' : 'bg-white/50 border-gray-200 opacity-60'}`}>
                  <input 
                    type="checkbox" 
                    checked={autoSendWhatsApp} 
                    onChange={e => setAutoSendWhatsApp(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-gray-900 flex items-center gap-1.5">
                      <MessageCircle size={14} className="text-[#25D366]" /> Enviar Aviso de Retiro por WhatsApp
                    </span>
                    <span className="text-gray-500 block text-[11px] mt-0.5">Abre WhatsApp con el mensaje listo informando trackings y saldo pendiente.</span>
                  </div>
                </label>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              * La factura quedará registrada en estado <strong className="text-orange-500">Pendiente</strong> hasta que se registre su cobro.
            </p>
          </div>
          
          <div className="w-full lg:w-5/12 bg-gray-50 p-6 rounded-2xl border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-gray-600">Subtotal</span>
              <span className="text-sm font-bold text-gray-800">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-gray-600 flex items-center gap-2">
                Descuento
                <div className="relative">
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={e => setDiscountPercent(Number(e.target.value) || 0)}
                    className="w-20 pl-2 pr-6 py-1 bg-white border border-gray-200 rounded text-right focus:outline-none focus:border-brand-blue [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">%</span>
                </div>
              </span>
              <span className="text-sm font-bold text-green-600">-${discountAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-200 mb-2">
              <span className="text-sm font-black text-brand-blue uppercase tracking-wider">Total (USD)</span>
              <span className="text-xl font-black text-brand-blue">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-brand-blue/5 rounded-xl border border-brand-blue/10">
              <span className="text-xs font-bold text-gray-600 flex flex-col">
                <span>Total Ref. (CRC)</span>
                <span className="text-[10px] font-normal opacity-70">T.C. {exchangeRate}</span>
              </span>
              <span className="text-lg font-black text-brand-blue">
                ₡{(total * exchangeRate).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex flex-col sm:flex-row justify-end items-center gap-3">
          <Link
            href="/admin/facturacion"
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 text-center transition-colors"
          >
            Cancelar
          </Link>
          <button 
            onClick={handleSaveInvoice}
            disabled={loading}
            className="w-full sm:w-auto btn-primary px-8 py-3.5 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <Send size={18} />
            <span>{loading ? 'Guardando y Procesando...' : 'Guardar y Enviar Automáticamente'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
