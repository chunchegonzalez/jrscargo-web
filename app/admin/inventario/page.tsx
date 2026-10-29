'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Package, Search, Filter, X, Pencil, Trash2, AlertTriangle, AlertCircle, FileText, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, QrCode, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useModal } from '@/app/components/ModalProvider';
import { formatCostaRicaDate, formatCostaRicaISO, extractCompanyAndClient } from '@/lib/billing';

interface InventoryItem {
  id: string;
  client: string;
  company?: string;
  weight: string;
  status: string;
  date: string;
  createdAt: string;
}

export default function BodegaInventario() {
  const { showAlert } = useModal();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [originalTracking, setOriginalTracking] = useState<string>('');
  const [trackingJustification, setTrackingJustification] = useState('');
  
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  
  const [currentUser, setCurrentUser] = useState<{username: string, role: string} | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setCurrentUser(data.user);
        }
      })
      .catch(console.error);
  }, []);
  
  const [viewingPhotos, setViewingPhotos] = useState<{ id: string, photos: { id?: number | string, url: string }[] } | null>(null);
  const [loadingPhotosFor, setLoadingPhotosFor] = useState<string | null>(null);

  // Invoice mapping: tracking_number -> { invoice_number, invoice_id }
  const [invoiceMap, setInvoiceMap] = useState<Map<string, { number: string; id: string }>>(new Map());
  // Shelf mapping from JRS Cargo Mobile: tracking_number -> shelfCode
  const [shelfMap, setShelfMap] = useState<Map<string, string>>(new Map());

  const handleViewPhotos = async (trackingId: string) => {
    setLoadingPhotosFor(trackingId);
    try {
      const res = await fetch(`/api/tracking?number=${trackingId}`);
      if (res.ok) {
        const { rawData } = await res.json();
        const photos = rawData?.package?.fotos || [];
        setViewingPhotos({ id: trackingId, photos });
      } else {
        await showAlert('Aviso', 'Error al cargar fotos desde el API');
      }
    } catch {
      await showAlert('Aviso', 'Error de conexión al cargar fotos');
    } finally {
      setLoadingPhotosFor(null);
    }
  };
  
  const openEditModal = (item: InventoryItem) => {
    setEditingItem({...item});
    setOriginalTracking(item.id);
    setTrackingJustification('');
  };
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [colTracking, setColTracking] = useState('');
  const [colClient, setColClient] = useState('');
  const [filterCompany, setFilterCompany] = useState('Todas');
  const [filterWeight, setFilterWeight] = useState('Todos');
  const [filterInvoice, setFilterInvoice] = useState('Todas');
  const [colInvoiceSearch, setColInvoiceSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterDate, setFilterDate] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  type SortField = 'tracking' | 'client' | 'company' | 'weight' | 'invoice' | 'date' | 'status';
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'date' || field === 'weight' ? 'desc' : 'asc');
    }
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    colTracking.trim() !== '' ||
    colClient.trim() !== '' ||
    filterCompany !== 'Todas' ||
    filterWeight !== 'Todos' ||
    filterInvoice !== 'Todas' ||
    colInvoiceSearch.trim() !== '' ||
    filterStatus !== 'Todos' ||
    filterDate !== '';

  const clearAllFilters = () => {
    setSearchQuery('');
    setColTracking('');
    setColClient('');
    setFilterCompany('Todas');
    setFilterWeight('Todos');
    setFilterInvoice('Todas');
    setColInvoiceSearch('');
    setFilterStatus('Todos');
    setFilterDate('');
  };

  const getInvoiceForTracking = useCallback((trackingId: string) => {
    if (!trackingId) return undefined;
    const clean = trackingId.trim().toUpperCase();
    const direct = invoiceMap.get(clean);
    if (direct) return direct;
    const stripped = clean.replace(/^420(?:\d{9}|\d{5})(?=9\d{14,})/i, '').replace(/^420\d{5}/i, '');
    if (stripped !== clean && stripped.length >= 8) {
      return invoiceMap.get(stripped);
    }
    return undefined;
  }, [invoiceMap]);

  const loadInventory = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/inventory', { cache: 'no-store' });
      if (res.ok) {
        const { data } = await res.json();
        // Transform from DB format
        const formatted = (data || [])
          .filter((item: { status: string }) => item.status !== 'Eliminado')
          .map((item: { id: string, client: string, weight: string, status: string, company?: string, created_at: string }) => {
            let comp = item.company;
            if (!comp || comp === 'N/A' || comp === 'Independiente' || comp === 'OTRO') {
              const extracted = extractCompanyAndClient(item.client);
              comp = extracted.company || 'JRS CARGO';
            }
            return {
              id: item.id,
              client: item.client,
              company: comp,
              weight: item.weight,
              status: item.status,
              date: formatCostaRicaDate(item.created_at),
              createdAt: item.created_at
            };
          });
        setInventory(formatted);
      }

      // Fetch invoices to build tracking -> invoice map
      const invRes = await fetch('/api/invoices?includeItems=true', { cache: 'no-store' });
      if (invRes.ok) {
        const invData = await invRes.json();
        const map = new Map<string, { number: string; id: string }>();
        (invData.data || []).forEach((inv: { id: string; invoice_number: string; invoice_items?: { tracking_number?: string }[] }) => {
          if (inv.invoice_items) {
            inv.invoice_items.forEach(item => {
              if (item.tracking_number) {
                const rawTrack = item.tracking_number.trim().toUpperCase();
                map.set(rawTrack, { number: inv.invoice_number, id: inv.id });
                const stripped = rawTrack.replace(/^420(?:\d{9}|\d{5})(?=9\d{14,})/i, '').replace(/^420\d{5}/i, '');
                if (stripped !== rawTrack && stripped.length >= 8 && !map.has(stripped)) {
                  map.set(stripped, { number: inv.invoice_number, id: inv.id });
                }
              }
            });
          }
        });
        setInvoiceMap(map);
      }

      // Fetch active shelf assignments from JRS Cargo Mobile
      const mobRes = await fetch('/api/mobile', { cache: 'no-store' }).catch(() => null);
      if (mobRes && mobRes.ok) {
        const mobData = await mobRes.json();
        const sMap = new Map<string, string>();
        (mobData.packages || []).forEach((p: { tracking?: string; shelfCode?: string | null }) => {
          if (p.tracking && p.shelfCode) {
            sMap.set(p.tracking.trim().toUpperCase(), p.shelfCode);
          }
        });
        setShelfMap(sMap);
      }
    } catch (error) {
      console.error('Error fetching inventory', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadInventory();
  }, [loadInventory]);

  const filteredInventory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const qTrack = colTracking.trim().toLowerCase();
    const qClient = colClient.trim().toLowerCase();
    const qInvNum = colInvoiceSearch.trim().toLowerCase();

    const filtered = inventory.filter(item => {
      const inv = getInvoiceForTracking(item.id);
      const invNumber = (inv?.number || '').toLowerCase();

      const matchesSearch =
        !q ||
        (item.id || '').toLowerCase().includes(q) ||
        (item.client || '').toLowerCase().includes(q) ||
        (item.company || '').toLowerCase().includes(q) ||
        invNumber.includes(q);

      const matchesColTracking = !qTrack || (item.id || '').toLowerCase().includes(qTrack);
      const matchesColClient = !qClient || (item.client || '').toLowerCase().includes(qClient);
      const matchesCompany = filterCompany === 'Todas' || item.company === filterCompany;

      // Weight filter (in lbs)
      const numWeight = parseFloat(String(item.weight || '0')) || 0;
      const matchesWeight =
        filterWeight === 'Todos' ||
        (filterWeight === 'light' && numWeight > 0 && numWeight <= 5) ||
        (filterWeight === 'medium' && numWeight > 5 && numWeight <= 15) ||
        (filterWeight === 'heavy' && numWeight > 15);

      // Invoice filter
      const matchesInvoice =
        filterInvoice === 'Todas' ||
        (filterInvoice === 'Facturado' && !!inv) ||
        (filterInvoice === 'Sin Factura' && !inv);

      const matchesColInvoiceSearch = !qInvNum || invNumber.includes(qInvNum);

      const isDelivered = (item.status || '').toLowerCase().includes('entregad');
      const matchesStatus =
        filterStatus === 'Todos' ||
        (filterStatus === 'En Bodega' && !isDelivered) ||
        (filterStatus === 'Entregado' && isDelivered);

      // Compare YYYY-MM-DD
      const itemDateString = formatCostaRicaISO(item.createdAt);
      const matchesDate = !filterDate || itemDateString === filterDate;

      return (
        matchesSearch &&
        matchesColTracking &&
        matchesColClient &&
        matchesCompany &&
        matchesWeight &&
        matchesInvoice &&
        matchesColInvoiceSearch &&
        matchesStatus &&
        matchesDate
      );
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'tracking') {
        comparison = (a.id || '').localeCompare(b.id || '', 'es', { numeric: true });
      } else if (sortField === 'client') {
        comparison = (a.client || '').localeCompare(b.client || '', 'es', { sensitivity: 'base' });
      } else if (sortField === 'company') {
        comparison = (a.company || '').localeCompare(b.company || '', 'es', { sensitivity: 'base' });
      } else if (sortField === 'weight') {
        const wA = parseFloat(String(a.weight || '0')) || 0;
        const wB = parseFloat(String(b.weight || '0')) || 0;
        comparison = wA - wB;
      } else if (sortField === 'invoice') {
        const invA = getInvoiceForTracking(a.id)?.number || '';
        const invB = getInvoiceForTracking(b.id)?.number || '';
        if (invA && !invB) comparison = 1;
        else if (!invA && invB) comparison = -1;
        else comparison = invA.localeCompare(invB, 'es', { numeric: true });
      } else if (sortField === 'date') {
        const tA = new Date(a.createdAt || 0).getTime();
        const tB = new Date(b.createdAt || 0).getTime();
        comparison = tA - tB;
      } else if (sortField === 'status') {
        const sA = (a.status || '').toLowerCase().includes('entregad') ? 'Entregado' : 'En Bodega';
        const sB = (b.status || '').toLowerCase().includes('entregad') ? 'Entregado' : 'En Bodega';
        comparison = sA.localeCompare(sB, 'es');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [
    inventory,
    searchQuery,
    colTracking,
    colClient,
    filterCompany,
    filterWeight,
    filterInvoice,
    colInvoiceSearch,
    filterStatus,
    filterDate,
    sortField,
    sortOrder,
    getInvoiceForTracking
  ]);

  const activePackages = filteredInventory.filter(p => !(p.status || '').toLowerCase().includes('entregad')).length;

  const deliveredPackages = filteredInventory.filter(p => (p.status || '').toLowerCase().includes('entregad')).length;

  if (!mounted) return null;

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-blue mb-2">Inventario Local</h1>
          <p className="text-gray-500">Gestión de paquetes físicos en la bodega de Costa Rica.</p>
        </div>
        
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <Link
            href="/mobile"
            className="px-4 py-2.5 rounded-2xl border border-[#0B1D2B] bg-[#0B1D2B] hover:bg-[#123147] text-brand-yellow shadow-xs flex items-center gap-2 font-black text-sm transition-all active:scale-95"
            title="Abrir aplicación móvil de estantes y códigos QR"
          >
            <QrCode size={16} />
            <span>JRS Mobile (QR)</span>
          </Link>

          <button 
            onClick={() => loadInventory()}
            disabled={isRefreshing}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-brand-blue shadow-xs flex items-center gap-2 font-bold text-sm transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
            title="Refrescar inventario sin recargar la página"
          >
            <RefreshCw size={16} className={`text-brand-blue ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Actualizando...' : 'Refrescar'}</span>
          </button>

          <button 
            onClick={() => setFilterStatus(filterStatus === 'En Bodega' ? 'Todos' : 'En Bodega')}
            className={'px-5 py-2.5 rounded-2xl shadow-[0_4px_15px_-3px_rgba(18,67,94,0.3)] border flex items-center gap-3 hover:scale-105 transition-all select-none ' + (
              filterStatus === 'En Bodega'
                ? 'bg-gradient-to-r from-brand-blue to-[#0A2636] border-brand-yellow/50 ring-2 ring-brand-yellow/30'
                : 'bg-gradient-to-r from-brand-blue to-[#0A2636] border-brand-blue/20'
            )}
          >
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-yellow opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-yellow"></span>
            </div>
            <span className="font-black text-white uppercase tracking-wider text-sm">{activePackages} En Bodega</span>
          </button>
          <button 
            onClick={() => setFilterStatus(filterStatus === 'Entregado' ? 'Todos' : 'Entregado')}
            className={'px-5 py-2.5 rounded-2xl shadow-[0_4px_15px_-3px_rgba(22,163,74,0.3)] border flex items-center gap-3 hover:scale-105 transition-all select-none ' + (
              filterStatus === 'Entregado'
                ? 'bg-gradient-to-r from-green-600 to-green-700 border-green-300/50 ring-2 ring-green-300/30'
                : 'bg-gradient-to-r from-green-600 to-green-700 border-green-500/20'
            )}
          >
            <div className="relative flex h-3 w-3">
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-300"></span>
            </div>
            <span className="font-black text-white uppercase tracking-wider text-sm">{deliveredPackages} Entregados</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Barra de herramientas */}
        <div className="p-4 border-b border-gray-100 flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center bg-gray-50">
          <div className="relative w-full xl:max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="text-gray-400" size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Buscar por tracking, cliente o factura..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-gray-200 focus:border-brand-blue focus:ring-0 text-sm shadow-xs"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="hidden sm:flex items-center text-gray-400 pl-1">
              <Filter size={16} />
            </div>
            
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors focus:ring-0 focus:border-brand-blue shadow-xs"
              title="Filtrar por fecha de ingreso"
            />

            <select
              value={filterInvoice}
              onChange={(e) => setFilterInvoice(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-brand-blue font-semibold text-sm hover:bg-gray-50 transition-colors focus:ring-0 focus:border-brand-blue shadow-xs"
              title="Filtrar por estado de facturación"
            >
              <option value="Todas">Todas las Facturas</option>
              <option value="Facturado">Con Factura (Facturados)</option>
              <option value="Sin Factura">Sin Factura (Pendientes)</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-brand-blue font-semibold text-sm hover:bg-gray-50 transition-colors focus:ring-0 focus:border-brand-blue shadow-xs"
            >
              <option value="Todos">Todos los Estados</option>
              <option value="En Bodega">En Bodega</option>
              <option value="Entregado">Entregados</option>
            </select>

            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-brand-blue font-semibold text-sm hover:bg-gray-50 transition-colors focus:ring-0 focus:border-brand-blue shadow-xs"
            >
              <option value="Todas">Todas las Empresas</option>
              <option value="JRS CARGO">JRS CARGO</option>
              <option value="ATLANTIC IMPORTS">ATLANTIC IMPORTS</option>
              <option value="JR LOGISTICS">JR LOGISTICS</option>
              <option value="TRINITY BOX">TRINITY BOX</option>
            </select>

            <select
              value={filterWeight}
              onChange={(e) => setFilterWeight(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-brand-blue font-semibold text-sm hover:bg-gray-50 transition-colors focus:ring-0 focus:border-brand-blue shadow-xs"
              title="Filtrar por rango de peso"
            >
              <option value="Todos">Todos los Pesos</option>
              <option value="light">Hasta 5 lbs</option>
              <option value="medium">5 a 15 lbs</option>
              <option value="heavy">Más de 15 lbs</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-3.5 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                title="Restablecer todos los filtros"
              >
                <X size={14} /> Limpiar
              </button>
            )}

            <span className="px-3.5 py-2 bg-brand-blue/10 text-brand-blue text-xs font-black rounded-xl shrink-0 self-center">
              {filteredInventory.length} {filteredInventory.length === 1 ? 'Línea' : 'Líneas'}
            </span>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {/* Fila de Encabezados Ordenables */}
              <tr className="bg-white border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold select-none">
                <th className="p-4 pl-6 text-center w-14">#</th>
                <th
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleSort('tracking')}
                  title="Ordenar por Tracking"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tracking</span>
                    {sortField === 'tracking' ? (
                      sortOrder === 'asc' ? <ArrowUp size={14} className="text-brand-blue" /> : <ArrowDown size={14} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={14} className="text-gray-300" />
                    )}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleSort('client')}
                  title="Ordenar por Cliente"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Cliente</span>
                    {sortField === 'client' ? (
                      sortOrder === 'asc' ? <ArrowUp size={14} className="text-brand-blue" /> : <ArrowDown size={14} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={14} className="text-gray-300" />
                    )}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleSort('company')}
                  title="Ordenar por Empresa"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Empresa</span>
                    {sortField === 'company' ? (
                      sortOrder === 'asc' ? <ArrowUp size={14} className="text-brand-blue" /> : <ArrowDown size={14} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={14} className="text-gray-300" />
                    )}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleSort('weight')}
                  title="Ordenar por Peso"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Peso</span>
                    {sortField === 'weight' ? (
                      sortOrder === 'asc' ? <ArrowUp size={14} className="text-brand-blue" /> : <ArrowDown size={14} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={14} className="text-gray-300" />
                    )}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleSort('invoice')}
                  title="Ordenar por Factura"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Factura</span>
                    {sortField === 'invoice' ? (
                      sortOrder === 'asc' ? <ArrowUp size={14} className="text-brand-blue" /> : <ArrowDown size={14} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={14} className="text-gray-300" />
                    )}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleSort('date')}
                  title="Ordenar por Fecha de Ingreso"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Fecha de Ingreso</span>
                    {sortField === 'date' ? (
                      sortOrder === 'asc' ? <ArrowUp size={14} className="text-brand-blue" /> : <ArrowDown size={14} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={14} className="text-gray-300" />
                    )}
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleSort('status')}
                  title="Ordenar por Estado Interno"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Estado Interno</span>
                    {sortField === 'status' ? (
                      sortOrder === 'asc' ? <ArrowUp size={14} className="text-brand-blue" /> : <ArrowDown size={14} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={14} className="text-gray-300" />
                    )}
                  </div>
                </th>
                <th className="p-4 pr-6 text-right">Acciones</th>
              </tr>

              {/* Fila de Filtros Directos por Columna */}
              <tr className="bg-gray-50/70 border-b border-gray-100 text-xs">
                <th className="py-2 px-2 pl-6 text-center text-gray-300">
                  <Filter size={12} className="mx-auto" />
                </th>
                <th className="py-2 px-3">
                  <input
                    type="text"
                    placeholder="Filtrar tracking..."
                    value={colTracking}
                    onChange={(e) => setColTracking(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-normal text-gray-700 focus:border-brand-blue focus:outline-none"
                  />
                </th>
                <th className="py-2 px-3">
                  <input
                    type="text"
                    placeholder="Filtrar cliente..."
                    value={colClient}
                    onChange={(e) => setColClient(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-normal text-gray-700 focus:border-brand-blue focus:outline-none"
                  />
                </th>
                <th className="py-2 px-3">
                  <select
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:border-brand-blue focus:outline-none"
                  >
                    <option value="Todas">Todas</option>
                    <option value="JRS CARGO">JRS CARGO</option>
                    <option value="ATLANTIC IMPORTS">ATLANTIC IMPORTS</option>
                    <option value="JR LOGISTICS">JR LOGISTICS</option>
                    <option value="TRINITY BOX">TRINITY BOX</option>
                  </select>
                </th>
                <th className="py-2 px-3">
                  <select
                    value={filterWeight}
                    onChange={(e) => setFilterWeight(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:border-brand-blue focus:outline-none"
                  >
                    <option value="Todos">Todos</option>
                    <option value="light">≤ 5 lbs</option>
                    <option value="medium">5 - 15 lbs</option>
                    <option value="heavy">&gt; 15 lbs</option>
                  </select>
                </th>
                <th className="py-2 px-3">
                  <div className="flex items-center gap-1">
                    <select
                      value={filterInvoice}
                      onChange={(e) => setFilterInvoice(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:border-brand-blue focus:outline-none"
                    >
                      <option value="Todas">Todas</option>
                      <option value="Facturado">Facturado</option>
                      <option value="Sin Factura">Sin Factura</option>
                    </select>
                  </div>
                </th>
                <th className="py-2 px-3">
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-normal text-gray-700 focus:border-brand-blue focus:outline-none"
                  />
                </th>
                <th className="py-2 px-3">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:border-brand-blue focus:outline-none"
                  >
                    <option value="Todos">Todos</option>
                    <option value="En Bodega">En Bodega</option>
                    <option value="Entregado">Entregados</option>
                  </select>
                </th>
                <th className="py-2 px-3 pr-6 text-right">
                  {hasActiveFilters && (
                    <button
                      onClick={clearAllFilters}
                      className="px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                      title="Limpiar filtros"
                    >
                      <X size={12} /> Limpiar
                    </button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {filteredInventory.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">No hay paquetes que coincidan con la búsqueda.</td>
                </tr>
              )}
              {filteredInventory.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-4 pl-6 text-center">
                    <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold text-xs inline-flex items-center justify-center">
                      {index + 1}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-brand-blue flex items-center gap-3">
                    <button 
                      onClick={() => handleViewPhotos(item.id)} 
                      disabled={loadingPhotosFor === item.id}
                      className="p-1.5 hover:bg-brand-blue/10 rounded-md transition-colors shrink-0"
                      title="Ver fotos del paquete"
                    >
                      {loadingPhotosFor === item.id ? (
                        <div className="w-4 h-4 rounded-full border-2 border-brand-blue border-t-transparent animate-spin"></div>
                      ) : (
                        <Package size={16} className="text-brand-blue cursor-pointer" />
                      )}
                    </button>
                    <div className="flex flex-col gap-1">
                      <span>{item.id}</span>
                      {shelfMap.get(item.id.trim().toUpperCase()) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0B1D2B] text-brand-yellow text-[10px] font-black font-mono w-fit">
                          <MapPin size={10} />
                          Estante: {shelfMap.get(item.id.trim().toUpperCase())}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-medium text-gray-700">{item.client}</td>
                  <td className="p-4 text-gray-500">{item.company}</td>
                  <td className="p-4 text-gray-500 whitespace-nowrap">
                    {item.weight} {item.weight && !item.weight.includes('kg') ? `/ ${(parseFloat(item.weight) * 0.453592).toFixed(2)} kg` : ''}
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    {(() => {
                      const inv = getInvoiceForTracking(item.id);
                      if (inv) {
                        return (
                          <Link href={'/admin/facturacion/' + inv.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-brand-blue rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors">
                            <FileText size={12} />
                            {inv.number}
                          </Link>
                        );
                      }
                      return <span className="text-gray-300 text-xs">—</span>;
                    })()}
                  </td>
                  <td className="p-4 text-gray-500 whitespace-nowrap">{item.date}</td>
                  <td className="p-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                      (item.status || '').toLowerCase().includes('entregad')
                        ? 'bg-green-100 text-green-700'
                        : 'bg-brand-blue/10 text-brand-blue'
                    }`}>
                      {(item.status || '').toLowerCase().includes('entregad') ? 'Entregado' : 'En Bodega'}
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEditModal(item)} className="p-2 text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors" title="Editar">
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => setDeletingItem(item)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Footer Tabla */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 text-center font-medium">
          Mostrando {filteredInventory.length} de {inventory.length} líneas / paquetes totales
        </div>
      </div>

      {/* Modal de Edición */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-brand-blue text-lg">Editar Paquete</h3>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSaving(true);
              
              const updates = {
                id: editingItem.id !== originalTracking ? editingItem.id : undefined,
                client: editingItem.client,
                weight: editingItem.weight,
                company: editingItem.company,
                status: editingItem.status,
                updated_at: new Date().toISOString()
              };

              try {
                const res = await fetch(`/api/inventory/${originalTracking}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updates)
                });
                if (res.ok) {
                  setInventory(prev => prev.map(p => p.id === originalTracking ? editingItem : p));
                  setEditingItem(null);
                } else {
                  await showAlert('Aviso', 'Error al guardar los cambios');
                }
              } catch {
                await showAlert('Aviso', 'Error de conexión al guardar');
              } finally {
                setIsSaving(false);
              }
            }} className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tracking</label>
                <input 
                  type="text" 
                  value={editingItem.id} 
                  onChange={e => setEditingItem({...editingItem, id: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-brand-blue focus:ring-0 text-sm font-mono" 
                />
              </div>

              {originalTracking !== editingItem.id && (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl space-y-3">
                  <div className="flex gap-2 items-center text-orange-800">
                    <AlertTriangle size={16} />
                    <span className="text-sm font-bold">Justificación de Cambio de Tracking</span>
                  </div>
                  <textarea
                    required
                    value={trackingJustification}
                    onChange={(e) => setTrackingJustification(e.target.value)}
                    placeholder="¿Por qué se está modificando el número de tracking original?"
                    className="w-full text-sm px-4 py-2 rounded-lg border border-orange-200 focus:ring-0 focus:border-orange-400 bg-white"
                    rows={2}
                  />
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cliente</label>
                <input 
                  type="text" 
                  value={editingItem.client} 
                  onChange={e => setEditingItem({...editingItem, client: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-brand-blue focus:ring-0 text-sm font-medium" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Empresa / Proveedor</label>
                <select 
                  value={editingItem.company || 'JRS CARGO'} 
                  onChange={e => setEditingItem({...editingItem, company: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-brand-blue focus:ring-0 text-sm font-medium bg-white" 
                >
                  <option value="JRS CARGO">JRS CARGO</option>
                  <option value="ATLANTIC IMPORTS">ATLANTIC IMPORTS</option>
                  <option value="JR LOGISTICS">JR LOGISTICS</option>
                  <option value="TRINITY BOX">TRINITY BOX</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Peso</label>
                  <input 
                    type="text" 
                    value={editingItem.weight} 
                    onChange={e => setEditingItem({...editingItem, weight: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-brand-blue focus:ring-0 text-sm font-medium" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Estado</label>
                  <select 
                    value={(editingItem.status || '').toLowerCase().includes('entregad') ? 'Entregado' : 'En Bodega'} 
                    onChange={e => setEditingItem({...editingItem, status: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-brand-blue focus:ring-0 text-sm font-medium"
                  >
                    <option value="En Bodega">En Bodega</option>
                    <option value="Entregado">Entregado</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex gap-3">
                <button type="button" onClick={() => setEditingItem(null)} className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="flex-1 py-3 font-bold bg-brand-blue text-white rounded-xl hover:bg-brand-blue/90 disabled:opacity-50 transition-colors">
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal de Eliminación */}
      {deletingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <h3 className="font-bold text-red-600 text-lg flex items-center gap-2">
                <AlertCircle size={20} /> Eliminar Paquete
              </h3>
              <button onClick={() => setDeletingItem(null)} className="text-red-400 hover:text-red-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSaving(true);
              try {
                if (currentUser?.role === 'admin') {
                  // Soft-delete: mark as "Eliminado" using PATCH (more reliable with Supabase RLS)
                  const res = await fetch(`/api/inventory/${deletingItem.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'Eliminado' })
                  });
                  if (res.ok) {
                    setInventory(prev => prev.filter(p => p.id !== deletingItem.id));
                    setDeletingItem(null);
                    setDeleteReason('');
                    await showAlert('Éxito', 'Paquete eliminado correctamente.');
                  } else {
                    const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }));
                    await showAlert('Error', errorData.error || 'No se pudo eliminar el paquete.');
                  }
                } else {
                  // Request deletion for regular user
                  const res = await fetch('/api/deletion-requests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      package_id: deletingItem.id,
                      requested_by: currentUser?.username || 'user',
                      reason: deleteReason
                    })
                  });
                  if (res.ok) {
                    await showAlert('Aviso', 'Solicitud enviada al Administrador Principal para su aprobación.');
                    setDeletingItem(null);
                    setDeleteReason('');
                  } else {
                    await showAlert('Aviso', 'Error al enviar la solicitud');
                  }
                }
              } catch {
                await showAlert('Aviso', 'Error de conexión');
              } finally {
                setIsSaving(false);
              }
            }} className="p-6 space-y-4">
              
              <p className="text-sm text-gray-600">
                {currentUser?.role === 'admin' 
                  ? `¿Estás seguro de que deseas eliminar permanentemente el paquete con tracking `
                  : `¿Estás seguro de solicitar la eliminación del paquete con tracking `}
                <strong className="text-gray-900">{deletingItem.id}</strong>? 
                {currentUser?.role === 'admin' ? ' Esta acción no se puede deshacer.' : ' El Administrador Principal deberá aprobar esta solicitud.'}
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Motivo / Justificación</label>
                <textarea 
                  required
                  value={deleteReason} 
                  onChange={e => setDeleteReason(e.target.value)}
                  placeholder="Por favor, indica el motivo de la eliminación..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-red-400 focus:ring-0 text-sm" 
                  rows={3}
                />
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex gap-3">
                <button type="button" onClick={() => setDeletingItem(null)} className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving || !deleteReason.trim()} className="flex-1 py-3 font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">
                  {isSaving ? (currentUser?.role === 'admin' ? 'Eliminando...' : 'Enviando...') : (currentUser?.role === 'admin' ? 'Eliminar Paquete' : 'Solicitar Eliminación')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Fotos */}
      {viewingPhotos && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewingPhotos(null)}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="font-bold text-brand-blue text-lg flex items-center gap-2">
                <Package size={20} /> Fotos del Paquete {viewingPhotos.id}
              </h3>
              <button onClick={() => setViewingPhotos(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {viewingPhotos.photos.length === 0 ? (
                <p className="text-center text-gray-500 py-12">No hay fotos disponibles para este paquete en Worldbox.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {viewingPhotos.photos.map((foto, index) => (
                    <div key={foto.id || index} className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={foto.url} alt={`Evidencia ${index + 1}`} className="w-full h-auto object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
