'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Anchor,
  Search,
  Calendar,
  DollarSign,
  Package,
  FileSpreadsheet,
  RefreshCw,
  X,
  Eye,
  ArrowRight,
  CheckCircle2,
  Clock,
  Box,
} from 'lucide-react';
import {
  getInvoiceStats,
  formatDisplayDate,
  isMaritimoService,
  parseCubicFeetValue,
  parseLocalDate,
  getLocalTodayDate,
  extractPackageTransportAndNote,
  InventoryHistoryEvent,
} from '@/lib/billing';
import { generateIncomeReportXlsx } from '@/lib/excel-export';

type InvoiceItem = {
  service_name?: string;
  tracking_number?: string;
  weight?: string | number;
  rate?: string | number;
  amount?: number | string;
};

type Invoice = {
  id: string;
  invoice_number: string;
  issue_date: string;
  created_at?: string;
  total: number | string;
  status: string;
  client_id: string;
  currency?: string;
  exchange_rate?: number;
  clients?: {
    id?: string;
    name: string;
    email: string;
  };
  invoice_payments?: { amount_applied: number | string }[];
  invoice_items?: InvoiceItem[];
  items?: InvoiceItem[];
};

type InventoryItem = {
  id: string;
  client: string;
  company?: string;
  weight: string;
  status: string;
  created_at: string;
  history?: InventoryHistoryEvent[];
};

type MaritimeLineRecord = {
  key: string;
  invoiceId: string;
  invoiceNumber: string;
  issueDate: string;
  clientName: string;
  clientEmail: string;
  trackingNumber: string;
  serviceName: string;
  cubicFeet: number;
  rateUsd: number;
  amountUsd: number;
  invoiceStatus: string;
  isPaid: boolean;
};

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}

function subDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - n);
  return r;
}

export default function ReporteMaritimoPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState<number>(500);

  // Filtros de período y búsqueda
  const [datePreset, setDatePreset] = useState<'hoy' | 'ayer' | 'semana' | 'mes' | 'rango' | 'todos'>('mes');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'Todas' | 'Pagada' | 'Pendiente'>('Todas');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [invRes, pkgRes, rateRes] = await Promise.all([
        fetch('/api/invoices?includeItems=true', { cache: 'no-store' }),
        fetch('/api/inventory', { cache: 'no-store' }),
        fetch('/api/exchange-rate', { cache: 'no-store' }),
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData.data || []);
      }
      if (pkgRes.ok) {
        const pkgData = await pkgRes.json();
        setInventory((pkgData.data || []).filter((p: InventoryItem) => p.status !== 'Eliminado'));
      }
      if (rateRes.ok) {
        const rateData = await rateRes.json();
        if (rateData.success && Number(rateData.rate) > 0) {
          setExchangeRate(Number(rateData.rate));
        }
      }
    } catch (e) {
      console.error('Error cargando reporte marítimo:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calcular rango de fechas y etiqueta del período consultado
  const { filterStart, filterEnd, periodLabel } = useMemo(() => {
    const now = new Date();
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];

    if (datePreset === 'hoy') {
      return {
        filterStart: startOfDay(now),
        filterEnd: endOfDay(now),
        periodLabel: `Hoy (${getLocalTodayDate().split('-').reverse().join('/')})`,
      };
    }
    if (datePreset === 'ayer') {
      const y = subDays(now, 1);
      return {
        filterStart: startOfDay(y),
        filterEnd: endOfDay(y),
        periodLabel: 'Ayer',
      };
    }
    if (datePreset === 'semana') {
      return {
        filterStart: startOfWeek(now),
        filterEnd: endOfDay(now),
        periodLabel: 'Esta Semana',
      };
    }
    if (datePreset === 'mes') {
      const [yStr, mStr] = selectedMonth.split('-');
      const year = parseInt(yStr, 10) || now.getFullYear();
      const monthIdx = (parseInt(mStr, 10) || now.getMonth() + 1) - 1;
      return {
        filterStart: new Date(year, monthIdx, 1, 0, 0, 0, 0),
        filterEnd: new Date(year, monthIdx + 1, 0, 23, 59, 59, 999),
        periodLabel: `${monthNames[monthIdx]} ${year}`,
      };
    }
    if (datePreset === 'rango') {
      const s = filterStartDate ? startOfDay(parseLocalDate(filterStartDate)) : new Date(2000, 0, 1);
      const e = filterEndDate ? endOfDay(parseLocalDate(filterEndDate)) : endOfDay(now);
      const label =
        filterStartDate && filterEndDate
          ? `${filterStartDate.split('-').reverse().join('/')} al ${filterEndDate.split('-').reverse().join('/')}`
          : filterStartDate
          ? `Desde ${filterStartDate.split('-').reverse().join('/')}`
          : filterEndDate
          ? `Hasta ${filterEndDate.split('-').reverse().join('/')}`
          : 'Rango Personalizado';
      return { filterStart: s, filterEnd: e, periodLabel: label };
    }

    return {
      filterStart: new Date(2000, 0, 1),
      filterEnd: endOfDay(now),
      periodLabel: 'Histórico Completo',
    };
  }, [datePreset, selectedMonth, filterStartDate, filterEndDate]);

  // Extraer todas las líneas y facturas de productos/servicios marítimos en el período consultado
  const {
    maritimeLines,
    maritimeInvoicesForExport,
    totalCubicFeet,
    totalShipmentsCount,
    totalBilledUsd,
    totalPaidUsd,
    totalPendingUsd,
    maritimeInventoryPackages,
  } = useMemo(() => {
    const lines: MaritimeLineRecord[] = [];
    const matchedInvoices: Invoice[] = [];
    let sumFt3 = 0;
    let sumBilled = 0;
    let sumPaid = 0;
    let sumPending = 0;

    const q = searchTerm.trim().toLowerCase();

    invoices.forEach(inv => {
      if (inv.status === 'Anulada') return;
      const invDate = parseLocalDate(inv.issue_date);
      if (invDate < filterStart || invDate > filterEnd) return;

      const items =
        Array.isArray(inv.invoice_items) && inv.invoice_items.length > 0
          ? inv.invoice_items
          : Array.isArray(inv.items)
          ? inv.items
          : [];

      const marItems = items.filter(it => isMaritimoService(it.service_name, it.weight));
      if (marItems.length === 0) return;

      const stats = getInvoiceStats(inv);
      if (filterStatus === 'Pagada' && !stats.isPagada) return;
      if (filterStatus === 'Pendiente' && stats.isPagada) return;

      const clientName = inv.clients?.name || 'Cliente';
      const clientEmail = inv.clients?.email || '';
      const invTotal = Number(inv.total) || 0;
      const rate = inv.exchange_rate || exchangeRate;

      // Proporción pagada de la factura para líneas marítimas
      const paidRatio = invTotal > 0 ? Math.min(1, stats.paid / invTotal) : stats.isPagada ? 1 : 0;

      let invoiceMatchedSearch = false;

      marItems.forEach((it, idx) => {
        const tracking = String(it.tracking_number || '').trim();
        const service = String(it.service_name || 'Servicio Marítimo').trim();
        const ft3 = parseCubicFeetValue(it.weight);
        const rawAmt = Number(it.amount) || 0;
        const amtUsd = inv.currency === 'CRC' ? rawAmt / rate : rawAmt;
        const lineRate = Number(it.rate) || 0;

        if (q) {
          const matches =
            inv.invoice_number.toLowerCase().includes(q) ||
            clientName.toLowerCase().includes(q) ||
            clientEmail.toLowerCase().includes(q) ||
            tracking.toLowerCase().includes(q) ||
            service.toLowerCase().includes(q);
          if (!matches) return;
        }

        invoiceMatchedSearch = true;
        sumFt3 += ft3;
        sumBilled += amtUsd;
        const linePaid = stats.isPagada ? amtUsd : amtUsd * paidRatio;
        sumPaid += linePaid;
        sumPending += Math.max(0, amtUsd - linePaid);

        lines.push({
          key: `${inv.id}-${idx}`,
          invoiceId: inv.id,
          invoiceNumber: inv.invoice_number,
          issueDate: inv.issue_date,
          clientName,
          clientEmail,
          trackingNumber: tracking || '—',
          serviceName: service,
          cubicFeet: ft3,
          rateUsd: lineRate,
          amountUsd: amtUsd,
          invoiceStatus: stats.displayStatus,
          isPaid: stats.isPagada,
        });
      });

      if (invoiceMatchedSearch) {
        matchedInvoices.push(inv);
      }
    });

    // Paquetes marítimos registrados en inventario local en el mismo período
    const invPackages = inventory.filter(item => {
      const meta = extractPackageTransportAndNote(item);
      if (meta.transportType !== 'Marítimo') return false;
      const d = parseLocalDate(item.created_at);
      if (d < filterStart || d > filterEnd) return false;
      if (q) {
        return (
          (item.id || '').toLowerCase().includes(q) ||
          (item.client || '').toLowerCase().includes(q) ||
          (meta.note || '').toLowerCase().includes(q)
        );
      }
      return true;
    });

    return {
      maritimeLines: lines,
      maritimeInvoicesForExport: matchedInvoices,
      totalCubicFeet: sumFt3,
      totalShipmentsCount: lines.length,
      totalBilledUsd: sumBilled,
      totalPaidUsd: sumPaid,
      totalPendingUsd: sumPending,
      maritimeInventoryPackages: invPackages,
    };
  }, [invoices, inventory, filterStart, filterEnd, filterStatus, searchTerm, exchangeRate]);

  const handleExportExcel = () => {
    generateIncomeReportXlsx(
      maritimeInvoicesForExport,
      filterStart.toISOString().slice(0, 10),
      filterEnd.toISOString().slice(0, 10)
    );
  };

  return (
    <div className="max-w-7xl w-full mx-auto flex flex-col gap-3 lg:h-[calc(100vh-5.75rem)] lg:overflow-hidden animate-fade-in">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Reporte de Productos Marítimos
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Anchor size={12} />
              <span>Período: {periodLabel}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Control detallado de pies cúbicos (ft³) facturados, cantidad de envíos marítimos y montos por período.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={maritimeInvoicesForExport.length === 0}
            className="h-9 px-3.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Exportar Excel</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>

          <Link
            href="/admin/facturacion/nueva"
            className="h-9 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <Anchor size={14} />
            <span>Facturar Marítimo</span>
          </Link>
        </div>
      </div>

      {/* Barra de Filtro por Fecha y Período Consultado */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap bg-slate-100/90 border border-slate-200/60 rounded-lg p-0.5 gap-0.5">
            {[
              { id: 'hoy' as const, label: 'Hoy' },
              { id: 'ayer' as const, label: 'Ayer' },
              { id: 'semana' as const, label: 'Esta Semana' },
              { id: 'mes' as const, label: 'Por Mes' },
              { id: 'rango' as const, label: 'Rango de Fechas' },
              { id: 'todos' as const, label: 'Histórico' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {datePreset === 'mes' && (
            <div className="inline-flex items-center gap-1.5 h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5">
              <Calendar size={13} className="text-indigo-600" />
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              />
            </div>
          )}

          {datePreset === 'rango' && (
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                type="date"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
              />
              <span className="text-xs text-slate-400">a</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente, tracking o factura..."
              className="w-full h-8 pl-8 pr-7 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as 'Todas' | 'Pagada' | 'Pendiente')}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
          >
            <option value="Todas">Estado: Todos</option>
            <option value="Pagada">Pagadas</option>
            <option value="Pendiente">Pendientes</option>
          </select>
        </div>
      </div>

      {/* 4 Tarjetas KPI del Reporte Marítimo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
        {/* 1. Pies Cúbicos Facturados */}
        <div className="bg-white rounded-xl p-4 border border-indigo-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
              Pies Cúbicos Facturados
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-indigo-700 tabular-nums">
                {totalCubicFeet.toFixed(2)}
              </span>
              <span className="text-xs font-bold text-indigo-600">ft³</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Volumen total en {periodLabel}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Box size={19} />
          </div>
        </div>

        {/* 2. Cantidad de Envíos / Paquetes Marítimos */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Envíos / Paquetes Marítimos
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 tabular-nums">
                {totalShipmentsCount}
              </span>
              <span className="text-xs font-medium text-slate-400">facturados</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              En inventario CR: <strong className="text-slate-700">{maritimeInventoryPackages.length} paq.</strong>
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-brand-blue flex items-center justify-center shrink-0">
            <Package size={19} />
          </div>
        </div>

        {/* 3. Monto Total Facturado Marítimo */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Monto Facturado Marítimo
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 tabular-nums">
                ${totalBilledUsd.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-slate-400">USD</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
              ≈ ₡{Math.round(totalBilledUsd * exchangeRate).toLocaleString('es-CR')} CRC
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
            <DollarSign size={19} />
          </div>
        </div>

        {/* 4. Cobrado vs Pendiente Marítimo */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Cobrado vs Pendiente
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-700 tabular-nums">
                ${totalPaidUsd.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-emerald-600">cobrado</span>
            </div>
            <p className="text-[11px] text-amber-600 font-semibold mt-1 tabular-nums">
              Por cobrar: ${totalPendingUsd.toFixed(2)} USD
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={19} />
          </div>
        </div>
      </div>

      {/* Tabla Detallada de Envíos Marítimos Facturados */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Desglose de Envíos y Productos Marítimos Facturados ({maritimeLines.length})
            </h2>
            <p className="text-[11px] text-slate-500">
              Período consultado: <strong className="text-slate-700">{periodLabel}</strong>
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
            <span>
              Total Volumen: <strong className="text-indigo-700">{totalCubicFeet.toFixed(2)} ft³</strong>
            </span>
            <span>&bull;</span>
            <span>
              Total Facturado: <strong className="text-slate-900">${totalBilledUsd.toFixed(2)} USD</strong>
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Factura</th>
                <th className="py-2.5 px-3.5">Fecha</th>
                <th className="py-2.5 px-3.5">Cliente</th>
                <th className="py-2.5 px-3.5">Tracking / Guía</th>
                <th className="py-2.5 px-3.5">Servicio</th>
                <th className="py-2.5 px-3.5 text-right">Pies Cúbicos (ft³)</th>
                <th className="py-2.5 px-3.5 text-right">Monto (USD)</th>
                <th className="py-2.5 px-3.5 text-center">Estado</th>
                <th className="py-2.5 px-4 text-right">Ver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Cargando reporte de productos marítimos...
                  </td>
                </tr>
              ) : maritimeLines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No se encontraron envíos marítimos facturados en el período seleccionado ({periodLabel}).
                  </td>
                </tr>
              ) : (
                maritimeLines.map(line => (
                  <tr key={line.key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      #{line.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3.5 text-xs text-slate-500 whitespace-nowrap tabular-nums">
                      {formatDisplayDate(line.issueDate)}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <p className="font-semibold text-slate-900">{line.clientName}</p>
                      <p className="text-xs text-slate-400">{line.clientEmail}</p>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-xs font-semibold text-slate-700">
                      {line.trackingNumber}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/70 text-xs font-semibold">
                        <Anchor size={11} />
                        <span>{line.serviceName}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-indigo-700 tabular-nums whitespace-nowrap">
                      {line.cubicFeet.toFixed(2)} ft³
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-black text-slate-900 tabular-nums whitespace-nowrap">
                      ${line.amountUsd.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          line.isPaid
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {line.isPaid ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                        <span>{line.invoiceStatus}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/facturacion/${line.invoiceId}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-blue hover:bg-slate-100 inline-flex items-center justify-center transition-colors"
                        title="Ver comprobante"
                      >
                        <Eye size={15} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paquetes Marítimos en Inventario Local CR del Período */}
      {maritimeInventoryPackages.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Paquetes Marítimos Recibidos en Bodega CR ({maritimeInventoryPackages.length})
              </h2>
              <p className="text-[11px] text-slate-500">
                Paquetes ingresados manualmente como Marítimo en el período ({periodLabel}).
              </p>
            </div>
            <Link
              href="/admin/inventario"
              className="text-xs font-semibold text-brand-blue hover:underline inline-flex items-center gap-1"
            >
              <span>Ir a Inventario CR</span>
              <ArrowRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {maritimeInventoryPackages.slice(0, 10).map(pkg => {
              const meta = extractPackageTransportAndNote(pkg);
              return (
                <div key={pkg.id} className="px-5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/80">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{pkg.id}</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/70 text-[10px] font-bold">
                        🚢 Marítimo · {pkg.weight}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      Cliente: <strong className="text-slate-800">{pkg.client}</strong>
                      {meta.note ? ` · Nota: ${meta.note}` : ''}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {formatDisplayDate(pkg.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
