'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Package,
  Search,
  Filter,
  X,
  Pencil,
  Trash2,
  AlertTriangle,
  AlertCircle,
  FileText,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  QrCode,
  MapPin,
  Copy,
  Check,
  Download,
  SlidersHorizontal,
  Columns,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Building2,
  Scale,
  Calendar,
  User
} from 'lucide-react';
import Link from 'next/link';
import { generateInventoryReportXlsx } from '@/lib/excel-export';
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

type ColumnKey = 'client' | 'company' | 'weight' | 'invoice' | 'date' | 'status';

export default function BodegaInventario() {
  const { showAlert } = useModal();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [originalTracking, setOriginalTracking] = useState<string>('');
  const [trackingJustification, setTrackingJustification] = useState('');

  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null);

  // Slide-over detail drawer state
  const [selectedDetailItem, setSelectedDetailItem] = useState<InventoryItem | null>(null);
  // Copy tracking feedback
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);
  // Secondary filters & column customization menus
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showColumnFiltersRow, setShowColumnFiltersRow] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>({
    client: true,
    company: true,
    weight: true,
    invoice: true,
    date: true,
    status: true
  });

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

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewingPhotos) return;
        if (editingItem) return;
        if (deletingItem) return;
        if (selectedDetailItem) setSelectedDetailItem(null);
        setShowMoreFilters(false);
        setShowColumnsMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const [viewingPhotos, setViewingPhotos] = useState<{ id: string; photos: { id?: number | string; url: string }[] } | null>(null);
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

  const handleCopyTracking = (trackingId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(trackingId).catch(() => {});
    setCopiedTracking(trackingId);
    setTimeout(() => {
      setCopiedTracking(prev => (prev === trackingId ? null : prev));
    }, 1800);
  };

  const openEditModal = (item: InventoryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingItem({ ...item });
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

  const secondaryFilterCount =
    (filterInvoice !== 'Todas' ? 1 : 0) +
    (filterWeight !== 'Todos' ? 1 : 0) +
    (colTracking.trim() !== '' ? 1 : 0) +
    (colClient.trim() !== '' ? 1 : 0) +
    (colInvoiceSearch.trim() !== '' ? 1 : 0);

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

  const getInvoiceForTracking = useCallback(
    (trackingId: string) => {
      if (!trackingId) return undefined;
      const clean = trackingId.trim().toUpperCase();
      const direct = invoiceMap.get(clean);
      if (direct) return direct;
      const stripped = clean.replace(/^420(?:\d{9}|\d{5})(?=9\d{14,})/i, '').replace(/^420\d{5}/i, '');
      if (stripped !== clean && stripped.length >= 8) {
        return invoiceMap.get(stripped);
      }
      return undefined;
    },
    [invoiceMap]
  );

  const loadInventory = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/inventory', { cache: 'no-store' });
      if (res.ok) {
        const { data } = await res.json();
        // Transform from DB format
        const formatted = (data || [])
          .filter((item: { status: string }) => item.status !== 'Eliminado')
          .map((item: { id: string; client: string; weight: string; status: string; company?: string; created_at: string }) => {
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

  const handleExportExcel = () => {
    const rows = filteredInventory.map((item, idx) => {
      const inv = getInvoiceForTracking(item.id)?.number || 'Sin Factura';
      const shelf = shelfMap.get(item.id.trim().toUpperCase()) || '';
      const statusLabel = (item.status || '').toLowerCase().includes('entregad') ? 'Entregado' : 'En Bodega';
      return {
        index: idx + 1,
        tracking: item.id,
        client: item.client,
        company: item.company || 'JRS CARGO',
        weight: item.weight,
        invoice: inv,
        shelf: shelf,
        date: item.date,
        status: statusLabel
      };
    });

    generateInventoryReportXlsx(rows);
  };

  const toggleColumn = (col: ColumnKey) => {
    setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
  };

  const weightFilterLabel: Record<string, string> = {
    light: 'Hasta 5 lbs',
    medium: '5 a 15 lbs',
    heavy: 'Más de 15 lbs'
  };

  if (!mounted) return null;

  return (
    <div className="w-full space-y-5">
      {/* 1. Encabezado compacto y elegante */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventario Local</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/15">
              Bodega CR
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Gestión de paquetes físicos en la bodega de Costa Rica.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/mobile"
            className="h-9 px-3.5 rounded-lg border border-[#0B1D2B] bg-[#0B1D2B] hover:bg-[#123147] text-brand-yellow shadow-2xs inline-flex items-center gap-2 font-semibold text-xs transition-all active:scale-[0.98]"
            title="Abrir aplicación móvil de estantes y códigos QR"
          >
            <QrCode size={14} />
            <span>JRS Mobile (QR)</span>
          </Link>

          <button
            onClick={handleExportExcel}
            disabled={filteredInventory.length === 0}
            className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-2xs inline-flex items-center gap-1.5 font-medium text-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            title="Exportar inventario actual a Microsoft Excel (.xlsx)"
          >
            <Download size={14} className="text-emerald-600" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={() => loadInventory()}
            disabled={isRefreshing}
            className="h-9 px-3.5 rounded-lg border border-brand-blue/20 bg-brand-blue hover:bg-[#0e354b] text-white shadow-2xs inline-flex items-center gap-1.5 font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            title="Actualizar inventario sin recargar la página"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* 2. Indicadores (3 tarjetas KPI uniformes) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* KPI 1: Total de paquetes */}
        <button
          type="button"
          onClick={() => setFilterStatus('Todos')}
          className={`text-left bg-white rounded-xl p-4 border transition-all cursor-pointer flex items-center justify-between group ${
            filterStatus === 'Todos'
              ? 'border-brand-blue/40 ring-2 ring-brand-blue/10 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
          }`}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total de paquetes</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 tabular-nums">
                {filteredInventory.length}
              </span>
              {filteredInventory.length !== inventory.length && (
                <span className="text-xs font-medium text-slate-400 tabular-nums">de {inventory.length}</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Registros activos en consulta</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-brand-blue flex items-center justify-center shrink-0 group-hover:bg-brand-blue/10 transition-colors">
            <Package size={19} />
          </div>
        </button>

        {/* KPI 2: En bodega */}
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'En Bodega' ? 'Todos' : 'En Bodega')}
          className={`text-left bg-white rounded-xl p-4 border transition-all cursor-pointer flex items-center justify-between group ${
            filterStatus === 'En Bodega'
              ? 'border-brand-blue ring-2 ring-brand-blue/15 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-yellow"></span>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">En bodega</p>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-brand-blue tabular-nums">
                {activePackages}
              </span>
              <span className="text-[11px] font-semibold text-brand-blue/70">
                {filteredInventory.length > 0 ? `${Math.round((activePackages / filteredInventory.length) * 100)}%` : '0%'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Almacenados disponibles</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0 group-hover:bg-brand-blue group-hover:text-white transition-colors">
            <Clock size={19} />
          </div>
        </button>

        {/* KPI 3: Entregados */}
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'Entregado' ? 'Todos' : 'Entregado')}
          className={`text-left bg-white rounded-xl p-4 border transition-all cursor-pointer flex items-center justify-between group ${
            filterStatus === 'Entregado'
              ? 'border-emerald-600 ring-2 ring-emerald-500/15 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Entregados</p>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-700 tabular-nums">
                {deliveredPackages}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600/80">
                {filteredInventory.length > 0 ? `${Math.round((deliveredPackages / filteredInventory.length) * 100)}%` : '0%'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Despachados a cliente final</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <CheckCircle2 size={19} />
          </div>
        </button>
      </div>

      {/* Contenedor Principal: Barra de filtros + Tabla de inventario */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
        {/* 3. Barra de filtros compacta */}
        <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/60 space-y-2.5">
          <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between">
            {/* Búsqueda principal amplia */}
            <div className="relative flex-1 min-w-0 lg:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
              <input
                type="text"
                placeholder="Buscar por tracking, cliente o factura..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-8 bg-white rounded-lg border border-slate-200/90 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  title="Limpiar búsqueda"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filtros rápidos: Empresa, Estado, Fecha + Más filtros + Columnas */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro Rápido: Empresa */}
              <select
                value={filterCompany}
                onChange={e => setFilterCompany(e.target.value)}
                className="h-9 px-2.5 bg-white border border-slate-200/90 rounded-lg text-slate-700 font-medium text-xs hover:border-slate-300 focus:outline-none focus:border-brand-blue transition-colors"
                title="Filtrar por empresa"
              >
                <option value="Todas">Empresa: Todas</option>
                <option value="JRS CARGO">JRS CARGO</option>
                <option value="ATLANTIC IMPORTS">ATLANTIC IMPORTS</option>
                <option value="JR LOGISTICS">JR LOGISTICS</option>
                <option value="TRINITY BOX">TRINITY BOX</option>
              </select>

              {/* Filtro Rápido: Estado */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="h-9 px-2.5 bg-white border border-slate-200/90 rounded-lg text-slate-700 font-medium text-xs hover:border-slate-300 focus:outline-none focus:border-brand-blue transition-colors"
                title="Filtrar por estado"
              >
                <option value="Todos">Estado: Todos</option>
                <option value="En Bodega">En Bodega</option>
                <option value="Entregado">Entregados</option>
              </select>

              {/* Filtro Rápido: Fecha */}
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="h-9 px-2.5 bg-white border border-slate-200/90 rounded-lg text-slate-700 font-medium text-xs hover:border-slate-300 focus:outline-none focus:border-brand-blue transition-colors"
                title="Filtrar por fecha de ingreso"
              />

              {/* Botón: Más filtros */}
              <button
                type="button"
                onClick={() => {
                  setShowMoreFilters(prev => !prev);
                  setShowColumnsMenu(false);
                }}
                className={`h-9 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                  showMoreFilters || secondaryFilterCount > 0
                    ? 'bg-brand-blue/10 border-brand-blue/30 text-brand-blue'
                    : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal size={13} />
                <span>Más filtros</span>
                {secondaryFilterCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-brand-blue text-white text-[10px] font-bold">
                    {secondaryFilterCount}
                  </span>
                )}
              </button>

              {/* Selector de Columnas Visibles */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowColumnsMenu(prev => !prev);
                    setShowMoreFilters(false);
                  }}
                  className="h-9 px-3 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Personalizar columnas visibles"
                >
                  <Columns size={13} className="text-slate-500" />
                  <span className="hidden sm:inline">Columnas</span>
                </button>

                {showColumnsMenu && (
                  <div
                    className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl border border-slate-200 shadow-lg p-2 z-30 space-y-1"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Columnas visibles
                    </div>
                    {(
                      [
                        { key: 'client', label: 'Cliente' },
                        { key: 'company', label: 'Empresa' },
                        { key: 'weight', label: 'Peso' },
                        { key: 'invoice', label: 'Factura' },
                        { key: 'date', label: 'Fecha de Ingreso' },
                        { key: 'status', label: 'Estado Interno' }
                      ] as { key: ColumnKey; label: string }[]
                    ).map(col => (
                      <label
                        key={col.key}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 text-xs text-slate-700 font-medium cursor-pointer"
                      >
                        <span>{col.label}</span>
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.key]}
                          onChange={() => toggleColumn(col.key)}
                          className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Contador compacto */}
              <span className="h-9 px-3 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center tabular-nums">
                {filteredInventory.length} {filteredInventory.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
          </div>

          {/* Panel expandible: Más filtros (secundarios) */}
          {showMoreFilters && (
            <div className="pt-2.5 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 animate-fade-in">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Estado de Facturación
                </label>
                <select
                  value={filterInvoice}
                  onChange={e => setFilterInvoice(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-brand-blue"
                >
                  <option value="Todas">Todas las Facturas</option>
                  <option value="Facturado">Con Factura (Facturados)</option>
                  <option value="Sin Factura">Sin Factura (Pendientes)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Rango de Peso
                </label>
                <select
                  value={filterWeight}
                  onChange={e => setFilterWeight(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-brand-blue"
                >
                  <option value="Todos">Todos los Pesos</option>
                  <option value="light">Hasta 5 lbs</option>
                  <option value="medium">5 a 15 lbs</option>
                  <option value="heavy">Más de 15 lbs</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Tracking específico
                </label>
                <input
                  type="text"
                  placeholder="Ej. 1Z999..."
                  value={colTracking}
                  onChange={e => setColTracking(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Cliente específico
                </label>
                <input
                  type="text"
                  placeholder="Nombre del cliente..."
                  value={colClient}
                  onChange={e => setColClient(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Nº de Factura
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Ej. F-0341"
                    value={colInvoiceSearch}
                    onChange={e => setColInvoiceSearch(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-brand-blue"
                  />
                  <button
                    type="button"
                    onClick={() => setShowColumnFiltersRow(prev => !prev)}
                    className={`h-8 px-2.5 rounded-lg border text-[11px] font-semibold shrink-0 transition-colors cursor-pointer ${
                      showColumnFiltersRow
                        ? 'bg-brand-blue text-white border-brand-blue'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="Mostrar/ocultar filtros rápidos en encabezados de columna"
                  >
                    Fila filtros
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Chips de filtros activos + Limpiar filtros */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-medium text-slate-400 mr-1">Filtros activos:</span>

              {searchQuery.trim() !== '' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium">
                  Búsqueda: &ldquo;{searchQuery}&rdquo;
                  <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700">
                    <X size={12} />
                  </button>
                </span>
              )}

              {filterCompany !== 'Todas' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium">
                  Empresa: {filterCompany}
                  <button type="button" onClick={() => setFilterCompany('Todas')} className="text-slate-400 hover:text-slate-700">
                    <X size={12} />
                  </button>
                </span>
              )}

              {filterStatus !== 'Todos' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium">
                  Estado: {filterStatus}
                  <button type="button" onClick={() => setFilterStatus('Todos')} className="text-slate-400 hover:text-slate-700">
                    <X size={12} />
                  </button>
                </span>
              )}

              {filterDate !== '' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium">
                  Fecha: {filterDate}
                  <button type="button" onClick={() => setFilterDate('')} className="text-slate-400 hover:text-slate-700">
                    <X size={12} />
                  </button>
                </span>
              )}

              {filterInvoice !== 'Todas' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium">
                  Facturación: {filterInvoice}
                  <button type="button" onClick={() => setFilterInvoice('Todas')} className="text-slate-400 hover:text-slate-700">
                    <X size={12} />
                  </button>
                </span>
              )}

              {filterWeight !== 'Todos' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium">
                  Peso: {weightFilterLabel[filterWeight] || filterWeight}
                  <button type="button" onClick={() => setFilterWeight('Todos')} className="text-slate-400 hover:text-slate-700">
                    <X size={12} />
                  </button>
                </span>
              )}

              {colTracking.trim() !== '' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium">
                  Tracking: {colTracking}
                  <button type="button" onClick={() => setColTracking('')} className="text-slate-400 hover:text-slate-700">
                    <X size={12} />
                  </button>
                </span>
              )}

              {colClient.trim() !== '' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium">
                  Cliente: {colClient}
                  <button type="button" onClick={() => setColClient('')} className="text-slate-400 hover:text-slate-700">
                    <X size={12} />
                  </button>
                </span>
              )}

              {colInvoiceSearch.trim() !== '' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-medium">
                  Factura: {colInvoiceSearch}
                  <button type="button" onClick={() => setColInvoiceSearch('')} className="text-slate-400 hover:text-slate-700">
                    <X size={12} />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-1 px-2 py-0.5 rounded-md text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <X size={12} />
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* 4. Tabla de inventario con encabezado sticky y filas compactas */}
        <div className="overflow-x-auto max-h-[calc(100vh-280px)] min-h-[420px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200/90">
              <tr className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                <th className="py-2.5 px-3 pl-5 text-center w-12">#</th>
                <th
                  className="py-2.5 px-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleSort('tracking')}
                  title="Ordenar por Tracking"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tracking</span>
                    {sortField === 'tracking' ? (
                      sortOrder === 'asc' ? (
                        <ArrowUp size={13} className="text-brand-blue" />
                      ) : (
                        <ArrowDown size={13} className="text-brand-blue" />
                      )
                    ) : (
                      <ArrowUpDown size={13} className="text-slate-300" />
                    )}
                  </div>
                </th>

                {visibleColumns.client && (
                  <th
                    className="py-2.5 px-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                    onClick={() => handleSort('client')}
                    title="Ordenar por Cliente"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Cliente</span>
                      {sortField === 'client' ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp size={13} className="text-brand-blue" />
                        ) : (
                          <ArrowDown size={13} className="text-brand-blue" />
                        )
                      ) : (
                        <ArrowUpDown size={13} className="text-slate-300" />
                      )}
                    </div>
                  </th>
                )}

                {visibleColumns.company && (
                  <th
                    className="py-2.5 px-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                    onClick={() => handleSort('company')}
                    title="Ordenar por Empresa"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Empresa</span>
                      {sortField === 'company' ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp size={13} className="text-brand-blue" />
                        ) : (
                          <ArrowDown size={13} className="text-brand-blue" />
                        )
                      ) : (
                        <ArrowUpDown size={13} className="text-slate-300" />
                      )}
                    </div>
                  </th>
                )}

                {visibleColumns.weight && (
                  <th
                    className="py-2.5 px-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                    onClick={() => handleSort('weight')}
                    title="Ordenar por Peso"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Peso</span>
                      {sortField === 'weight' ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp size={13} className="text-brand-blue" />
                        ) : (
                          <ArrowDown size={13} className="text-brand-blue" />
                        )
                      ) : (
                        <ArrowUpDown size={13} className="text-slate-300" />
                      )}
                    </div>
                  </th>
                )}

                {visibleColumns.invoice && (
                  <th
                    className="py-2.5 px-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                    onClick={() => handleSort('invoice')}
                    title="Ordenar por Factura"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Factura</span>
                      {sortField === 'invoice' ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp size={13} className="text-brand-blue" />
                        ) : (
                          <ArrowDown size={13} className="text-brand-blue" />
                        )
                      ) : (
                        <ArrowUpDown size={13} className="text-slate-300" />
                      )}
                    </div>
                  </th>
                )}

                {visibleColumns.date && (
                  <th
                    className="py-2.5 px-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                    onClick={() => handleSort('date')}
                    title="Ordenar por Fecha de Ingreso"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Fecha de Ingreso</span>
                      {sortField === 'date' ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp size={13} className="text-brand-blue" />
                        ) : (
                          <ArrowDown size={13} className="text-brand-blue" />
                        )
                      ) : (
                        <ArrowUpDown size={13} className="text-slate-300" />
                      )}
                    </div>
                  </th>
                )}

                {visibleColumns.status && (
                  <th
                    className="py-2.5 px-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                    onClick={() => handleSort('status')}
                    title="Ordenar por Estado Interno"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Estado Interno</span>
                      {sortField === 'status' ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp size={13} className="text-brand-blue" />
                        ) : (
                          <ArrowDown size={13} className="text-brand-blue" />
                        )
                      ) : (
                        <ArrowUpDown size={13} className="text-slate-300" />
                      )}
                    </div>
                  </th>
                )}

                <th className="py-2.5 px-3.5 pr-5 text-right">Acciones</th>
              </tr>

              {/* Fila opcional de filtros directos por columna */}
              {showColumnFiltersRow && (
                <tr className="bg-slate-50 border-t border-slate-200/70 text-xs">
                  <th className="py-1.5 px-2 pl-5 text-center text-slate-400">
                    <Filter size={11} className="mx-auto" />
                  </th>
                  <th className="py-1.5 px-2.5">
                    <input
                      type="text"
                      placeholder="Filtrar tracking..."
                      value={colTracking}
                      onChange={e => setColTracking(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-normal text-slate-700 focus:border-brand-blue focus:outline-none"
                    />
                  </th>
                  {visibleColumns.client && (
                    <th className="py-1.5 px-2.5">
                      <input
                        type="text"
                        placeholder="Filtrar cliente..."
                        value={colClient}
                        onChange={e => setColClient(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-normal text-slate-700 focus:border-brand-blue focus:outline-none"
                      />
                    </th>
                  )}
                  {visibleColumns.company && (
                    <th className="py-1.5 px-2.5">
                      <select
                        value={filterCompany}
                        onChange={e => setFilterCompany(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700 focus:border-brand-blue focus:outline-none"
                      >
                        <option value="Todas">Todas</option>
                        <option value="JRS CARGO">JRS CARGO</option>
                        <option value="ATLANTIC IMPORTS">ATLANTIC IMPORTS</option>
                        <option value="JR LOGISTICS">JR LOGISTICS</option>
                        <option value="TRINITY BOX">TRINITY BOX</option>
                      </select>
                    </th>
                  )}
                  {visibleColumns.weight && (
                    <th className="py-1.5 px-2.5">
                      <select
                        value={filterWeight}
                        onChange={e => setFilterWeight(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700 focus:border-brand-blue focus:outline-none"
                      >
                        <option value="Todos">Todos</option>
                        <option value="light">≤ 5 lbs</option>
                        <option value="medium">5 - 15 lbs</option>
                        <option value="heavy">&gt; 15 lbs</option>
                      </select>
                    </th>
                  )}
                  {visibleColumns.invoice && (
                    <th className="py-1.5 px-2.5">
                      <select
                        value={filterInvoice}
                        onChange={e => setFilterInvoice(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700 focus:border-brand-blue focus:outline-none"
                      >
                        <option value="Todas">Todas</option>
                        <option value="Facturado">Facturado</option>
                        <option value="Sin Factura">Sin Factura</option>
                      </select>
                    </th>
                  )}
                  {visibleColumns.date && (
                    <th className="py-1.5 px-2.5">
                      <input
                        type="date"
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-normal text-slate-700 focus:border-brand-blue focus:outline-none"
                      />
                    </th>
                  )}
                  {visibleColumns.status && (
                    <th className="py-1.5 px-2.5">
                      <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700 focus:border-brand-blue focus:outline-none"
                      >
                        <option value="Todos">Todos</option>
                        <option value="En Bodega">En Bodega</option>
                        <option value="Entregado">Entregados</option>
                      </select>
                    </th>
                  )}
                  <th className="py-1.5 px-2.5 pr-5 text-right">
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <X size={11} /> Limpiar
                      </button>
                    )}
                  </th>
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-slate-100 text-[13px]">
              {filteredInventory.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 px-6 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Package size={28} className="text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">No se encontraron paquetes con los filtros seleccionados</p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearAllFilters}
                          className="mt-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Restablecer filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {filteredInventory.map((item, index) => {
                const isDelivered = (item.status || '').toLowerCase().includes('entregad');
                const shelfCode = shelfMap.get(item.id.trim().toUpperCase());
                const inv = getInvoiceForTracking(item.id);
                const isSelected = selectedDetailItem?.id === item.id;

                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedDetailItem(item)}
                    className={`transition-colors group cursor-pointer ${
                      isSelected ? 'bg-brand-blue/[0.04]' : 'hover:bg-slate-50/90'
                    }`}
                  >
                    <td className="py-2.5 px-3 pl-5 text-center">
                      <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                        {index + 1}
                      </span>
                    </td>

                    {/* Tracking con botón de fotos, icono de copiar y badge de estante */}
                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleViewPhotos(item.id);
                          }}
                          disabled={loadingPhotosFor === item.id}
                          className="w-7 h-7 rounded-md bg-slate-100/80 hover:bg-brand-blue/10 text-brand-blue flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                          title="Ver fotos de WorldBox"
                        >
                          {loadingPhotosFor === item.id ? (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
                          ) : (
                            <Package size={14} />
                          )}
                        </button>

                        <div className="min-w-0 flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900 group-hover:text-brand-blue transition-colors truncate">
                              {item.id}
                            </span>
                            <button
                              type="button"
                              onClick={e => handleCopyTracking(item.id, e)}
                              className="p-1 rounded text-slate-400 hover:text-brand-blue hover:bg-slate-100 opacity-70 group-hover:opacity-100 transition-all cursor-pointer"
                              title="Copiar número de tracking"
                            >
                              {copiedTracking === item.id ? (
                                <Check size={12} className="text-emerald-600" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>

                          {shelfCode && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-0.5 rounded bg-[#0B1D2B] text-brand-yellow text-[10px] font-bold font-mono w-fit">
                              <MapPin size={9} />
                              {shelfCode}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {visibleColumns.client && (
                      <td className="py-2.5 px-3.5 font-medium text-slate-800 max-w-[200px] truncate" title={item.client}>
                        {item.client}
                      </td>
                    )}

                    {visibleColumns.company && (
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold">
                          {item.company}
                        </span>
                      </td>
                    )}

                    {visibleColumns.weight && (
                      <td className="py-2.5 px-3.5 text-slate-600 whitespace-nowrap tabular-nums">
                        <span className="font-medium text-slate-800">{item.weight}</span>
                        {item.weight && !item.weight.includes('kg') && (
                          <span className="text-slate-400 text-xs ml-1">
                            / {(parseFloat(item.weight) * 0.453592).toFixed(2)} kg
                          </span>
                        )}
                      </td>
                    )}

                    {visibleColumns.invoice && (
                      <td className="py-2.5 px-3.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        {inv ? (
                          <Link
                            href={'/admin/facturacion/' + inv.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-blue/[0.08] text-brand-blue border border-brand-blue/15 rounded-md text-xs font-semibold hover:bg-brand-blue/15 transition-colors"
                          >
                            <FileText size={11} />
                            {inv.number}
                          </Link>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    )}

                    {visibleColumns.date && (
                      <td className="py-2.5 px-3.5 text-slate-500 whitespace-nowrap tabular-nums text-xs">
                        {item.date}
                      </td>
                    )}

                    {visibleColumns.status && (
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            isDelivered
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                              : 'bg-brand-blue/[0.08] text-brand-blue border-brand-blue/15'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isDelivered ? 'bg-emerald-500' : 'bg-brand-yellow'
                            }`}
                          />
                          {isDelivered ? 'Entregado' : 'En Bodega'}
                        </span>
                      </td>
                    )}

                    <td className="py-2.5 px-3.5 pr-5 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="inline-flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => setSelectedDetailItem(item)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          title="Ver detalles"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={e => openEditModal(item, e)}
                          className="p-1.5 text-slate-500 hover:text-brand-blue hover:bg-brand-blue/10 rounded-md transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setDeletingItem(item);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Tabla */}
        <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Mostrando <strong className="font-semibold text-slate-700">{filteredInventory.length}</strong> de{' '}
            <strong className="font-semibold text-slate-700">{inventory.length}</strong> paquetes totales
          </span>
          <span className="text-[11px] text-slate-400">
            Haz clic en cualquier fila para abrir el panel de detalle del paquete
          </span>
        </div>
      </div>

      {/* 5. Panel de detalle lateral (Drawer) */}
      {selectedDetailItem && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] flex justify-end animate-fade-in"
          onClick={() => setSelectedDetailItem(null)}
        >
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Encabezado del Drawer */}
            <div className="p-5 border-b border-slate-200/80 bg-slate-50/60 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Detalle de Paquete
                </span>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono font-black text-base text-slate-900 truncate">
                    {selectedDetailItem.id}
                  </h3>
                  <button
                    type="button"
                    onClick={e => handleCopyTracking(selectedDetailItem.id, e)}
                    className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-brand-blue hover:border-brand-blue/30 transition-colors shrink-0 cursor-pointer"
                    title="Copiar tracking"
                  >
                    {copiedTracking === selectedDetailItem.id ? (
                      <Check size={13} className="text-emerald-600" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo del Drawer */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {/* Estado y Ubicación */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Estado Interno
                  </span>
                  {(() => {
                    const isDel = (selectedDetailItem.status || '').toLowerCase().includes('entregad');
                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          isDel
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-brand-blue/10 text-brand-blue border-brand-blue/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isDel ? 'bg-emerald-500' : 'bg-brand-yellow'}`} />
                        {isDel ? 'Entregado' : 'En Bodega'}
                      </span>
                    );
                  })()}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Ubicación Física (QR)
                  </span>
                  {shelfMap.get(selectedDetailItem.id.trim().toUpperCase()) ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0B1D2B] text-brand-yellow text-xs font-mono font-bold">
                      <MapPin size={12} />
                      {shelfMap.get(selectedDetailItem.id.trim().toUpperCase())}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">Sin estante asignado</span>
                  )}
                </div>
              </div>

              {/* Información registrada */}
              <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100">
                <div className="p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <User size={14} className="text-slate-400" />
                    <span>Cliente</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-900 text-right">
                    {selectedDetailItem.client || '—'}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <Building2 size={14} className="text-slate-400" />
                    <span>Empresa</span>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
                    {selectedDetailItem.company || 'JRS CARGO'}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <Scale size={14} className="text-slate-400" />
                    <span>Peso Registrado</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-900 tabular-nums">
                    {selectedDetailItem.weight}{' '}
                    {selectedDetailItem.weight && !selectedDetailItem.weight.includes('kg')
                      ? `(${(parseFloat(selectedDetailItem.weight) * 0.453592).toFixed(2)} kg)`
                      : ''}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <Calendar size={14} className="text-slate-400" />
                    <span>Fecha de Ingreso</span>
                  </div>
                  <span className="text-xs font-medium text-slate-700 tabular-nums">
                    {selectedDetailItem.date}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <FileText size={14} className="text-slate-400" />
                    <span>Factura Asociada</span>
                  </div>
                  {(() => {
                    const inv = getInvoiceForTracking(selectedDetailItem.id);
                    if (inv) {
                      return (
                        <Link
                          href={'/admin/facturacion/' + inv.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-blue/10 text-brand-blue rounded-md text-xs font-bold hover:bg-brand-blue/20 transition-colors"
                        >
                          <span>{inv.number}</span>
                          <ExternalLink size={11} />
                        </Link>
                      );
                    }
                    return <span className="text-xs text-slate-400">Sin facturar</span>;
                  })()}
                </div>
              </div>

              {/* Botón de Evidencia Fotográfica WorldBox */}
              <button
                type="button"
                onClick={() => handleViewPhotos(selectedDetailItem.id)}
                disabled={loadingPhotosFor === selectedDetailItem.id}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Package size={15} className="text-brand-blue" />
                <span>
                  {loadingPhotosFor === selectedDetailItem.id
                    ? 'Consultando fotos en WorldBox...'
                    : 'Ver Fotos del Paquete (WorldBox)'}
                </span>
              </button>
            </div>

            {/* Acciones del Pie del Drawer */}
            <div className="p-4 border-t border-slate-200/80 bg-slate-50/60 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => openEditModal(selectedDetailItem)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-brand-blue hover:bg-[#0e354b] text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Pencil size={14} />
                <span>Editar Paquete</span>
              </button>
              <button
                type="button"
                onClick={() => setDeletingItem(selectedDetailItem)}
                className="py-2.5 px-3.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

            <form
              onSubmit={async e => {
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
                    setInventory(prev => prev.map(p => (p.id === originalTracking ? editingItem : p)));
                    if (selectedDetailItem?.id === originalTracking) {
                      setSelectedDetailItem(editingItem);
                    }
                    setEditingItem(null);
                  } else {
                    await showAlert('Aviso', 'Error al guardar los cambios');
                  }
                } catch {
                  await showAlert('Aviso', 'Error de conexión al guardar');
                } finally {
                  setIsSaving(false);
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tracking</label>
                <input
                  type="text"
                  value={editingItem.id}
                  onChange={e => setEditingItem({ ...editingItem, id: e.target.value.toUpperCase() })}
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
                    onChange={e => setTrackingJustification(e.target.value)}
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
                  onChange={e => setEditingItem({ ...editingItem, client: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-brand-blue focus:ring-0 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Empresa / Proveedor</label>
                <select
                  value={editingItem.company || 'JRS CARGO'}
                  onChange={e => setEditingItem({ ...editingItem, company: e.target.value })}
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
                    onChange={e => setEditingItem({ ...editingItem, weight: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-brand-blue focus:ring-0 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Estado</label>
                  <select
                    value={(editingItem.status || '').toLowerCase().includes('entregad') ? 'Entregado' : 'En Bodega'}
                    onChange={e => setEditingItem({ ...editingItem, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-brand-blue focus:ring-0 text-sm font-medium"
                  >
                    <option value="En Bodega">En Bodega</option>
                    <option value="Entregado">Entregado</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 font-bold bg-brand-blue text-white rounded-xl hover:bg-brand-blue/90 disabled:opacity-50 transition-colors"
                >
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

            <form
              onSubmit={async e => {
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
                      if (selectedDetailItem?.id === deletingItem.id) {
                        setSelectedDetailItem(null);
                      }
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
              }}
              className="p-6 space-y-4"
            >
              <p className="text-sm text-gray-600">
                {currentUser?.role === 'admin'
                  ? `¿Estás seguro de que deseas eliminar permanentemente el paquete con tracking `
                  : `¿Estás seguro de solicitar la eliminación del paquete con tracking `}
                <strong className="text-gray-900">{deletingItem.id}</strong>?
                {currentUser?.role === 'admin'
                  ? ' Esta acción no se puede deshacer.'
                  : ' El Administrador Principal deberá aprobar esta solicitud.'}
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Motivo / Justificación
                </label>
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
                <button
                  type="button"
                  onClick={() => setDeletingItem(null)}
                  className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !deleteReason.trim()}
                  className="flex-1 py-3 font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isSaving
                    ? currentUser?.role === 'admin'
                      ? 'Eliminando...'
                      : 'Enviando...'
                    : currentUser?.role === 'admin'
                    ? 'Eliminar Paquete'
                    : 'Solicitar Eliminación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Fotos */}
      {viewingPhotos && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setViewingPhotos(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
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
