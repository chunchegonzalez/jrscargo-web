'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, User, Box, ArrowRight, Loader2, Link as LinkIcon } from 'lucide-react';

// Static Modules for quick navigation
const MODULES = [
  { label: 'Vista General (Inicio)', url: '/admin' },
  { label: 'Escanear Individual (Bodega)', url: '/admin/bodega' },
  { label: 'Recepción Masiva', url: '/admin/bodega/masivo' },
  { label: 'Entrega Masiva', url: '/admin/entregas/masivo' },
  { label: 'Inventario CR', url: '/admin/inventario' },
  { label: 'Facturas a Clientes', url: '/admin/facturacion' },
  { label: 'Cuentas por cobrar', url: '/admin/cuentas-por-cobrar' },
  { label: 'Gastos y Compras', url: '/admin/gastos' },
  { label: 'Historial de Pagos', url: '/admin/contabilidad/pagos' },
  { label: 'Directorio de Clientes', url: '/admin/clientes' },
  { label: 'Ajustes de Sistema', url: '/admin/ajustes' },
  { label: 'Servicios y Tarifas', url: '/admin/servicios' },
];

interface ClientItem {
  id: string;
  name?: string;
  email?: string;
  cedula?: string;
  address?: string;
}

interface InvoiceItem {
  id: string;
  invoice_number?: string;
}

interface InventoryItem {
  id: string;
  tracking_number?: string;
  client_name?: string;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  
  // Data caches
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch data on first open
  useEffect(() => {
    if (isOpen && !dataLoaded && !isFetching) {
      const loadData = async () => {
        setIsFetching(true);
        try {
          const [clientsRes, invoicesRes, invRes] = await Promise.all([
            fetch('/api/clients').then(r => r.json()),
            fetch('/api/invoices').then(r => r.json()),
            fetch('/api/inventory').then(r => r.json())
          ]);
          if (clientsRes.success) setClients(clientsRes.data || []);
          if (invoicesRes.success) setInvoices(invoicesRes.data || []);
          if (invRes.success) setInventory(invRes.data || []);
          setDataLoaded(true);
        } catch (error) {
          console.error("Error loading search data:", error);
        } finally {
          setIsFetching(false);
        }
      };
      loadData();
    }
  }, [isOpen, dataLoaded, isFetching]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  // Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = (url: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(url);
  };

  const q = query.toLowerCase();

  const filteredModules = MODULES.filter(m => m.label.toLowerCase().includes(q));
  const filteredClients = clients.filter(c => 
    (c.name && c.name.toLowerCase().includes(q)) || 
    (c.email && c.email.toLowerCase().includes(q)) || 
    (c.cedula && c.cedula.toLowerCase().includes(q)) ||
    (c.address && c.address.toLowerCase().includes(q)) // since we repurposed address for cedula
  ).slice(0, 5); // Limit to 5
  
  const filteredInvoices = invoices.filter(i => 
    (i.invoice_number && i.invoice_number.toLowerCase().includes(q))
  ).slice(0, 5);

  const filteredInventory = inventory.filter(p => 
    (p.tracking_number && p.tracking_number.toLowerCase().includes(q))
  ).slice(0, 5);

  const hasResults = filteredModules.length > 0 || filteredClients.length > 0 || filteredInvoices.length > 0 || filteredInventory.length > 0;

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl mx-auto">
      <div className="relative group">
        <input 
          type="text" 
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar clientes, facturas, tracking o módulos..." 
          className="w-full bg-gray-100/80 border border-transparent hover:bg-gray-50 hover:border-gray-200 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 rounded-full px-5 py-2.5 pl-11 text-sm font-medium text-gray-700 transition-all outline-none placeholder-gray-400"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-blue transition-colors" size={18} />
        {isFetching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-blue animate-spin" size={16} />
        )}
      </div>

      {isOpen && query.length > 0 && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[999] max-h-[70vh] flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
          
          <div className="overflow-y-auto p-2">
            {!hasResults && !isFetching && (
              <div className="p-8 text-center text-gray-400 text-sm">
                No se encontraron resultados para &quot;{query}&quot;
              </div>
            )}

            {filteredModules.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Módulos</div>
                {filteredModules.map((mod, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSelect(mod.url)}
                    className="w-full text-left px-3 py-2.5 hover:bg-brand-blue/5 rounded-xl flex items-center gap-3 text-sm font-medium text-gray-700 hover:text-brand-blue transition-colors group"
                  >
                    <LinkIcon size={16} className="text-gray-400 group-hover:text-brand-blue" />
                    {mod.label}
                    <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}

            {filteredClients.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Clientes</div>
                {filteredClients.map((client, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSelect(`/admin/clientes/${client.id}`)}
                    className="w-full text-left px-3 py-2.5 hover:bg-brand-blue/5 rounded-xl flex items-center justify-between text-sm transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-brand-blue/10 group-hover:text-brand-blue">
                        <User size={14} />
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 group-hover:text-brand-blue">{client.name}</div>
                        <div className="text-xs text-gray-500">{client.email}</div>
                      </div>
                    </div>
                    {(client.cedula || client.address) && (
                      <div className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                        Cédula: {client.cedula || client.address}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {filteredInvoices.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Facturas</div>
                {filteredInvoices.map((inv, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSelect(`/admin/facturacion/${inv.id}`)}
                    className="w-full text-left px-3 py-2 hover:bg-brand-blue/5 rounded-xl flex items-center justify-between text-sm transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-brand-blue/10 group-hover:text-brand-blue">
                        <FileText size={14} />
                      </div>
                      <div className="font-bold text-gray-800 group-hover:text-brand-blue">{inv.invoice_number}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {filteredInventory.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Paquetes</div>
                {filteredInventory.map((item, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSelect(`/admin/bodega`)} 
                    className="w-full text-left px-3 py-2 hover:bg-brand-blue/5 rounded-xl flex items-center gap-3 text-sm transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-brand-blue/10 group-hover:text-brand-blue">
                      <Box size={14} />
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 group-hover:text-brand-blue">{item.tracking_number}</div>
                      <div className="text-xs text-gray-500">
                        {item.client_name ? item.client_name : 'Sin asignar'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
