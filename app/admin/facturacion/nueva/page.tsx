'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, UserPlus } from 'lucide-react';
import { useModal } from '@/app/components/ModalProvider';

type Client = { id: string; name: string; email: string; phone?: string; address?: string };
type InvoiceItem = { id: number; service_name: string; tracking_number: string; weight: string; rate: string; amount: number | string };
type ServiceType = { id: string; name: string; default_rate: number };

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
  const [currency, setCurrency] = useState('USD');
  const [weightUnit, setWeightUnit] = useState<'Lb' | 'Kg'>('Lb');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: 1, service_name: '', tracking_number: '', weight: '', rate: '', amount: 0 }
  ]);
  const [notes, setNotes] = useState('Gracias por elegir a JRS CARGO.');

  // New client state
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', address: 'Costa Rica' });

  useEffect(() => {
    loadClients();
    loadCatalogServices();
    loadNextInvoiceNumber();
  }, []);

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
                            }}
                            className={`px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 ${selectedClientId === c.id ? 'bg-brand-blue/5 font-bold text-brand-blue' : 'text-gray-700'}`}
                          >
                            <div className="text-sm">{c.name}</div>
                            <div className="text-xs text-gray-400">{c.email}</div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
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
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-blue bg-white font-bold text-brand-blue"
                >
                  <option value="USD">USD ($)</option>
                  <option value="CRC">CRC (₡)</option>
                </select>
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
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Productos o Servicios</h3>
          
          <div className="border border-gray-200 rounded-xl">
            <div className="bg-gray-50 grid grid-cols-12 gap-2 p-3 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:grid">
              <div className="col-span-4">Producto/Servicio</div>
              <div className="col-span-3">Nº Rastreo</div>
              <div className="col-span-1 text-center">Peso</div>
              <div className="col-span-2 text-center">Tarifa</div>
              <div className="col-span-2 text-right pr-8">Importe ({currency === 'CRC' ? '₡' : '$'})</div>
            </div>

            {items.map((item) => (
              <div key={item.id} className="p-3 border-b border-gray-100 last:border-0 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-4 relative">
                  <input 
                    placeholder="Ej. Transporte Marítimo" 
                    value={item.service_name} 
                    onChange={e => {
                      handleItemChange(item.id, 'service_name', e.target.value);
                      setActiveServiceDropdown(item.id);
                    }}
                    onFocus={() => setActiveServiceDropdown(item.id)}
                    onBlur={() => setTimeout(() => setActiveServiceDropdown(null), 200)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue uppercase"
                  />
                  {activeServiceDropdown === item.id && catalogServices.length > 0 && (
                    <div className="absolute z-50 w-full min-w-[250px] mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {catalogServices
                        .filter(s => s.name.toLowerCase().includes((item.service_name || '').toLowerCase()))
                        .map(s => (
                        <div 
                          key={s.id} 
                          onClick={() => {
                            handleItemChange(item.id, 'service_name', s.name);
                            setActiveServiceDropdown(null);
                          }}
                          className="px-4 py-2 hover:bg-brand-blue/5 cursor-pointer border-b border-gray-100 last:border-0 flex justify-between items-center"
                        >
                          <span className="text-xs font-bold text-gray-700">{s.name}</span>
                          <span className="text-xs font-bold text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded">${Number(s.default_rate).toFixed(2)}</span>
                        </div>
                      ))}
                      {catalogServices.filter(s => s.name.toLowerCase().includes((item.service_name || '').toLowerCase())).length === 0 && (
                         <div className="px-4 py-3 text-xs text-gray-500 text-center">Presiona Enter o sigue escribiendo...</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="md:col-span-3">
                  <input 
                    required
                    placeholder="Tracking (Obligatorio)" 
                    value={item.tracking_number} 
                    onChange={e => handleItemChange(item.id, 'tracking_number', e.target.value)}
                    onBlur={() => handleTrackingBlur(item.id, item.tracking_number || '')}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 col-span-1 md:col-span-3 gap-2">
                  <input 
                    type="number" 
                    placeholder={weightUnit} 
                    value={item.weight} 
                    onChange={e => handleItemChange(item.id, 'weight', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue text-center"
                  />
                  <input 
                    type="number" 
                    placeholder={`$/${weightUnit}`} 
                    value={item.rate} 
                    onChange={e => handleItemChange(item.id, 'rate', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue text-center md:col-span-2"
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    value={item.amount || ''} 
                    onChange={e => handleItemChange(item.id, 'amount', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-brand-blue focus:outline-none focus:border-brand-blue text-right"
                  />
                  <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleAddItem} className="flex items-center gap-2 text-sm font-bold text-brand-blue hover:text-brand-blue/80 px-2 py-1 rounded-lg hover:bg-brand-blue/5 transition-colors">
            <Plus size={16} /> Agregar línea
          </button>
        </div>

        {/* Totales y Guardar */}
        <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="w-full md:w-1/2">
            <p className="text-xs text-gray-500 mb-2">Esta factura se guardará en estado <span className="font-bold text-orange-500">Pendiente</span>. Podrás enviarla por correo desde el dashboard principal.</p>
          </div>
          
          <div className="w-full md:w-1/3 bg-gray-50 p-6 rounded-2xl border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-gray-600">Subtotal</span>
              <span className="text-sm font-bold text-gray-800">{currency === 'CRC' ? '₡' : '$'}{subtotal.toFixed(2)}</span>
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
              <span className="text-sm font-bold text-green-600">-{currency === 'CRC' ? '₡' : '$'}{discountAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <span className="text-base font-black text-brand-blue uppercase tracking-wider">Total a Pagar</span>
              <span className="text-2xl font-black text-brand-blue">{currency === 'CRC' ? '₡' : '$'}{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex justify-end">
          <button 
            onClick={handleSaveInvoice}
            disabled={loading}
            className="btn-primary"
          >
            <Save size={20} /> {loading ? 'Guardando...' : 'Guardar y Cerrar'}
          </button>
        </div>

      </div>
    </div>
  );
}
