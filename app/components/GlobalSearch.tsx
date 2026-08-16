'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, User, ArrowRight, Loader2, Link as LinkIcon, Package, CheckCircle2 } from 'lucide-react';

// Static Modules for quick navigation
const MODULES = [
  { label: 'Vista General (Inicio)', url: '/admin' },
  { label: 'Escanear Individual (Bodega)', url: '/admin/bodega' },
  { label: 'Acción Masiva', url: '/admin/bodega/masivo' },
  { label: 'Inventario CR', url: '/admin/inventario' },
  { label: 'Facturas a Clientes', url: '/admin/facturacion', adminOnly: true },
  { label: 'Cuentas por cobrar', url: '/admin/cuentas-por-cobrar', adminOnly: true },
  { label: 'Gastos y Compras', url: '/admin/gastos', adminOnly: true },
  { label: 'Historial de Pagos', url: '/admin/contabilidad/pagos', adminOnly: true },
  { label: 'Directorio de Clientes', url: '/admin/clientes', adminOnly: true },
  { label: 'Ajustes de Sistema', url: '/admin/ajustes', adminOnly: true },
  { label: 'Servicios y Tarifas', url: '/admin/servicios', adminOnly: true },
];

interface ClientItem {
  id: string;
  name?: string;
  email?: string;
  cedula?: string;
  phone?: string;
  address?: string;
}

interface InvoiceItem {
  id: string;
  invoice_number?: string;
  total?: number;
  currency?: string;
  clients?: {
    name?: string;
    email?: string;
  };
  items?: Array<{
    tracking_number?: string;
    service_name?: string;
    amount?: number;
  }>;
}

interface InventoryItem {
  id: string;
  tracking?: string;
  tracking_number?: string;
  client?: string;
  client_name?: string;
  company?: string;
  status?: string;
  weight?: string | number;
  received_date?: string;
  created_at?: string;
  history?: Array<{
    date?: string;
    action?: string;
    user?: string;
  }>;
}

interface GlobalSearchProps {
  role?: string;
}

function getStatusConfig(status?: string) {
  const isDelivered = (status || '').toLowerCase().includes('entregad');
  if (isDelivered) {
    return { label: 'Entregado', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 };
  }
  return { label: 'En Bodega', color: 'text-brand-blue', bg: 'bg-brand-blue/10', icon: Package };
}

function matchTracking(queryStr: string, targetTracking: string | undefined): boolean {
  if (!targetTracking) return false;
  const qClean = queryStr.trim().toUpperCase().replace(/\s+/g, '');
  const tClean = targetTracking.trim().toUpperCase().replace(/\s+/g, '');
  if (!qClean || !tClean) return false;

  // Direct match or substring
  if (tClean.includes(qClean) || qClean.includes(tClean)) return true;

  // USPS 420XXXXX prefix stripping (e.g. 420331269200... -> 9200...)
  const stripUSPS = (s: string) => s.replace(/^420\d{5}/i, '');
  const qStripped = stripUSPS(qClean);
  const tStripped = stripUSPS(tClean);

  if (qStripped.length >= 8 && (tClean.includes(qStripped) || tStripped.includes(qClean) || tStripped === qStripped)) {
    return true;
  }

  return false;
}

export default function GlobalSearch({ role }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !dataLoaded && !isFetching) {
      const loadData = async () => {
        setIsFetching(true);
        try {
          const [clientsRes, invoicesRes, invRes] = await Promise.all([
            fetch('/api/clients').then(r => r.json()).catch(() => ({ success: false, data: [] })),
            fetch('/api/invoices').then(r => r.json()).catch(() => ({ success: false, data: [] })),
            fetch('/api/inventory').then(r => r.json()).catch(() => ({ success: false, data: [] }))
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

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

  const q = query.toLowerCase().trim();

  const filteredModules = MODULES.filter(m => 
    (!m.adminOnly || role === 'admin') && m.label.toLowerCase().includes(q)
  );

  const filteredClients = clients.filter(c => 
    (c.name && c.name.toLowerCase().includes(q)) || 
    (c.email && c.email.toLowerCase().includes(q)) || 
    (c.cedula && c.cedula.toLowerCase().includes(q)) ||
    (c.phone && c.phone.toLowerCase().includes(q)) ||
    (c.address && c.address.toLowerCase().includes(q))
  ).slice(0, 5);
  
  const filteredInvoices = invoices.filter(i => {
    const invNum = (i.invoice_number || '').toLowerCase();
    const clientName = (i.clients?.name || '').toLowerCase();
    const matchesNum = invNum.includes(q);
    const matchesClient = clientName.includes(q);
    const matchesItemTracking = Array.isArray(i.items) && i.items.some(it => matchTracking(query, it.tracking_number));
    return matchesNum || matchesClient || matchesItemTracking;
  }).slice(0, 5);

  const filteredInventory = inventory.filter(p => {
    if (p.status === 'Eliminado') return false;
    const trackingId = p.id || p.tracking || p.tracking_number || '';
    const clientName = p.client || p.client_name || '';
    const companyName = p.company || '';

    return (
      matchTracking(query, trackingId) ||
      clientName.toLowerCase().includes(q) ||
      companyName.toLowerCase().includes(q)
    );
  }).slice(0, 8);

  const hasResults = filteredModules.length > 0 || filteredClients.length > 0 || filteredInvoices.length > 0 || filteredInventory.length > 0;

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl mx-auto">
      <div className="relative group">
        <input 
          type="text" 
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar tracking, clientes, facturas o módulos..." 
          className="w-full bg-gray-100/80 border border-transparent hover:bg-gray-50 hover:border-gray-200 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 rounded-full px-5 py-2.5 pl-11 text-sm font-medium text-gray-700 transition-all outline-none placeholder-gray-400"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-blue transition-colors" size={18} />
        {isFetching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-blue animate-spin" size={16} />}
      </div>

      {isOpen && query.length > 0 && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[999] max-h-[70vh] flex flex-col">
          <div className="overflow-y-auto p-2">
            {!hasResults && !isFetching && (
              <div className="p-8 text-center text-gray-400 text-sm">
                No se encontraron resultados para &quot;{query}&quot;
              </div>
            )}

            {/* PAQUETES / TRACKING - Shown first */}
            {filteredInventory.length > 0 && (
              <div className="mb-3">
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Package size={11} /> Paquetes / Inventario ({filteredInventory.length} resultados)
                </div>
                {filteredInventory.map((item, i) => {
                  const trackingNum = item.id || item.tracking || item.tracking_number || '';
                  const clientName = item.client || item.client_name || 'Sin asignar';
                  const sc = getStatusConfig(item.status);
                  const StatusIcon = sc.icon;
                  const rd = item.created_at || item.received_date;
                  const dateStr = rd ? new Date(rd).toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica', day: '2-digit', month: 'short', year: 'numeric' }) : '';
                  
                  return (
                    <button 
                      key={i} 
                      onClick={() => handleSelect(`/admin/tracking?number=${encodeURIComponent(trackingNum)}`)} 
                      className="w-full text-left px-3 py-3 hover:bg-gray-50 rounded-xl flex items-start gap-3 transition-colors group"
                    >
                      <div className={`w-9 h-9 rounded-lg ${sc.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <StatusIcon size={16} className={sc.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-bold text-sm text-gray-800 group-hover:text-brand-blue font-mono break-all">{trackingNum}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.color} uppercase tracking-wide whitespace-nowrap`}>
                            {sc.label}
                          </span>
                          {item.company && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase tracking-wide">
                              {item.company}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                          <span className="font-medium">{clientName}</span>
                          {item.weight ? <span className="text-gray-400">• {item.weight}</span> : null}
                          {dateStr ? <span className="text-gray-400">• {dateStr}</span> : null}
                        </div>
                      </div>
                      <ArrowRight size={14} className="ml-auto text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity self-center shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* FACTURAS */}
            {filteredInvoices.length > 0 && (
              <div className="mb-3">
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={11} /> Facturas ({filteredInvoices.length} resultados)
                </div>
                {filteredInvoices.map((inv, i) => {
                  const matchedItem = Array.isArray(inv.items) ? inv.items.find(it => matchTracking(query, it.tracking_number)) : null;

                  return (
                    <button key={i} onClick={() => handleSelect(`/admin/facturacion/${inv.id}`)}
                      className="w-full text-left px-3 py-2.5 hover:bg-brand-blue/5 rounded-xl flex items-center justify-between text-sm transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-brand-blue flex items-center justify-center shrink-0">
                          <FileText size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800 group-hover:text-brand-blue">{inv.invoice_number}</span>
                            {inv.total !== undefined && (
                              <span className="text-xs font-bold text-gray-500">${inv.total.toFixed(2)}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {inv.clients?.name || 'Cliente'}
                            {matchedItem && (
                              <span className="text-brand-blue font-mono font-bold ml-1">
                                • Tracking: {matchedItem.tracking_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ArrowRight size={14} className="ml-auto text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* CLIENTES */}
            {filteredClients.length > 0 && (
              <div className="mb-3">
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <User size={11} /> Clientes ({filteredClients.length} resultados)
                </div>
                {filteredClients.map((client, i) => (
                  <button key={i} onClick={() => handleSelect(`/admin/clientes/${client.id}`)}
                    className="w-full text-left px-3 py-2.5 hover:bg-brand-blue/5 rounded-xl flex items-center justify-between text-sm transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-brand-blue/10 group-hover:text-brand-blue">
                        <User size={14} />
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 group-hover:text-brand-blue">{client.name}</div>
                        <div className="text-xs text-gray-500">{client.email || client.phone}</div>
                      </div>
                    </div>
                    {(client.cedula || client.address) && (
                      <div className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                        {client.cedula || client.address}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* MÓDULOS */}
            {filteredModules.length > 0 && (
              <div className="mb-3">
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Módulos</div>
                {filteredModules.map((mod, i) => (
                  <button key={i} onClick={() => handleSelect(mod.url)}
                    className="w-full text-left px-3 py-2.5 hover:bg-brand-blue/5 rounded-xl flex items-center gap-3 text-sm font-medium text-gray-700 hover:text-brand-blue transition-colors group">
                    <LinkIcon size={16} className="text-gray-400 group-hover:text-brand-blue" />
                    {mod.label}
                    <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
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
