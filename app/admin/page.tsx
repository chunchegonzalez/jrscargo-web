'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, LineChart, Line
} from 'recharts';
import { 
  Package, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Building2, 
  ShoppingBag, 
  BarChart2, 
  Coins, 
  Save, 
  RefreshCw,
  Truck,
  Scale,
  Clock,
  ArrowUpRight,
  Layers,
  ArrowRight,
  Filter,
  Activity,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { parseLocalDate, getLocalTodayDate, formatDisplayDate } from '@/lib/billing';
import { useModal } from '@/app/components/ModalProvider';

interface UserData {
  username: string;
  role: string;
}

interface InvoiceItemLine {
  invoice_id?: string;
  tracking_number?: string;
  service_name?: string;
  amount?: number | string;
  weight?: number | string;
  rate?: number | string;
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  total: number;
  currency?: string;
  exchange_rate?: number;
  invoice_payments?: { amount_applied: number | string }[];
  invoice_items?: InvoiceItemLine[];
  clients?: { id?: string; name?: string; email?: string };
}

interface InventoryItem {
  id: string;
  tracking_number?: string;
  client_name?: string;
  client?: string;
  company?: string;
  status: string;
  weight: number | string;
  received_date?: string;
  created_at: string;
  updated_at?: string;
}

// Helper date utilities
function startOfDay(d: Date): Date {
  const r = new Date(d); r.setHours(0,0,0,0); return r;
}
function endOfDay(d: Date): Date {
  const r = new Date(d); r.setHours(23,59,59,999); return r;
}
function startOfWeek(d: Date): Date {
  const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0,0,0,0); return r;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function subDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() - n); return r;
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function formatShortDay(d: Date): string {
  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  return `${days[d.getDay()]} ${d.getDate()}`;
}

export default function AdminDashboard() {
  const { showAlert } = useModal();
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Interactive Dashboard States
  const [dateFilter, setDateFilter] = useState<'hoy' | 'semana' | 'mes' | 'todos'>('mes');
  const [activeChartTab, setActiveChartTab] = useState<'operaciones' | 'ventas' | 'servicios'>('operaciones');
  const [chartTimeframe, setChartTimeframe] = useState<'7d' | '14d' | '30d'>('7d');

  // Exchange rate state
  const [currentExchangeRate, setCurrentExchangeRate] = useState<number>(500);
  const [exchangeRateInput, setExchangeRateInput] = useState<string>('500');
  const [isSavingExchangeRate, setIsSavingExchangeRate] = useState<boolean>(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [userRes, invRes, pkgRes, rateRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/invoices?includeItems=true'),
          fetch('/api/inventory'),
          fetch('/api/exchange-rate')
        ]);
        
        if (userRes.ok) {
          const ud = await userRes.json();
          if (ud.authenticated) setCurrentUser(ud.user);
        }
        if (invRes.ok) {
          const id = await invRes.json();
          setInvoices(id.data || []);
        }
        if (pkgRes.ok) {
          const pd = await pkgRes.json();
          setInventory((pd.data || []).filter((p: InventoryItem) => p.status !== 'Eliminado'));
        }
        if (rateRes.ok) {
          const rd = await rateRes.json();
          if (rd.success && Number(rd.rate) > 0) {
            setCurrentExchangeRate(Number(rd.rate));
            setExchangeRateInput(String(rd.rate));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleSaveExchangeRate = async () => {
    const rateNum = Number(exchangeRateInput);
    if (!rateNum || isNaN(rateNum) || rateNum <= 0) {
      await showAlert('Aviso', 'Por favor ingresa un tipo de cambio numérico válido.');
      return;
    }
    setIsSavingExchangeRate(true);
    try {
      const todayDate = getLocalTodayDate();
      const res = await fetch('/api/exchange-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: rateNum, updateTodayInvoices: true, date: todayDate })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentExchangeRate(rateNum);
        await showAlert('Éxito', data.message || `Tipo de cambio guardado a ₡${rateNum}.`);
        const invRes = await fetch('/api/invoices?includeItems=true');
        if (invRes.ok) {
          const id = await invRes.json();
          setInvoices(id.data || []);
        }
      } else {
        await showAlert('Aviso', 'Error al guardar tipo de cambio: ' + (data.error || ''));
      }
    } catch {
      await showAlert('Aviso', 'Error de conexión al actualizar tipo de cambio.');
    } finally {
      setIsSavingExchangeRate(false);
    }
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  // --- Dynamic Date Filtering ---
  const getFilterRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'hoy': return { start: startOfDay(now), end: endOfDay(now) };
      case 'semana': return { start: startOfWeek(now), end: endOfDay(now) };
      case 'mes': return { start: startOfMonth(now), end: endOfDay(now) };
      default: return { start: new Date(2000,0,1), end: endOfDay(now) };
    }
  };
  const { start: filterStart, end: filterEnd } = getFilterRange();

  const inRange = (ds: string | undefined | null) => {
    if (!ds) return false;
    const d = parseLocalDate(ds);
    return d >= filterStart && d <= filterEnd;
  };

  // --- Operational & Financial Metrics ---
  const filteredInventory = useMemo(() => {
    return inventory.filter(p => inRange(p.received_date || p.created_at));
  }, [inventory, dateFilter]);

  const totalPaquetes = filteredInventory.length;
  const enBodega = filteredInventory.filter(p => !p.status?.toLowerCase().includes('entregad')).length;
  const entregados = filteredInventory.filter(p => p.status?.toLowerCase().includes('entregad')).length;
  const tasaEntrega = totalPaquetes > 0 ? Math.round((entregados / totalPaquetes) * 100) : 0;

  // Total weight processed
  const totalWeightLbs = useMemo(() => {
    return filteredInventory.reduce((sum, p) => {
      const raw = String(p.weight || '0').replace(/[^0-9.]/g, '');
      return sum + (parseFloat(raw) || 0);
    }, 0);
  }, [filteredInventory]);
  const totalWeightKg = (totalWeightLbs * 0.45359237).toFixed(1);

  // Invoices metrics
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => inv.status !== 'Anulada' && inRange(inv.issue_date));
  }, [invoices, dateFilter]);

  const totalFacturado = useMemo(() => {
    return filteredInvoices.reduce((s, inv) => s + Number(inv.total), 0);
  }, [filteredInvoices]);

  // Receivables & Payments
  const { totalPaid, totalReceivables, pendientesCount, pieAgingData } = useMemo(() => {
    let paidSum = 0;
    let recSum = 0;
    let pendCount = 0;
    let a1_30 = 0, a31_60 = 0, a61_90 = 0, aOver90 = 0;
    const today = new Date();

    invoices.forEach(inv => {
      if (inv.status === 'Anulada') return;
      
      let invPaid = 0;
      if (inv.invoice_payments && Array.isArray(inv.invoice_payments)) {
        invPaid = inv.invoice_payments.reduce((a, p) => a + Number(p.amount_applied), 0);
      }
      const invTotal = Number(inv.total);
      const pending = invTotal - invPaid;

      if (inv.status === 'Pagada' || pending <= 0.01) {
        paidSum += invTotal;
      } else {
        recSum += pending;
        paidSum += invPaid;
        pendCount++;

        const issueDate = parseLocalDate(inv.issue_date);
        const diffDays = Math.ceil(Math.abs(today.getTime() - issueDate.getTime()) / (1000*60*60*24));
        if (diffDays <= 30) a1_30 += pending;
        else if (diffDays <= 60) a31_60 += pending;
        else if (diffDays <= 90) a61_90 += pending;
        else aOver90 += pending;
      }
    });

    const aging = [
      { name: '1-30 días', value: a1_30, color: '#12435E' },
      { name: '31-60 días', value: a31_60, color: '#F5A623' },
      { name: '61-90 días', value: a61_90, color: '#06B6D4' },
      { name: '+90 días', value: aOver90, color: '#EF4444' },
    ].filter(d => d.value > 0);

    return { totalPaid: paidSum, totalReceivables: recSum, pendientesCount: pendCount, pieAgingData: aging };
  }, [invoices]);

  // Today Invoicing
  const ventaHoy = useMemo(() => {
    const todayS = startOfDay(new Date());
    const todayE = endOfDay(new Date());
    return invoices
      .filter(inv => {
        const d = parseLocalDate(inv.issue_date);
        return d >= todayS && d <= todayE && inv.status !== 'Anulada';
      })
      .reduce((s, inv) => s + Number(inv.total), 0);
  }, [invoices]);

  // Timeframe chart days (7d, 14d, 30d)
  const chartDays = useMemo(() => {
    const count = chartTimeframe === '30d' ? 30 : chartTimeframe === '14d' ? 14 : 7;
    return Array.from({ length: count }).map((_, i) => {
      const d = subDays(new Date(), count - 1 - i);
      return { date: startOfDay(d), label: formatShortDay(d) };
    });
  }, [chartTimeframe]);

  // Operational Trend Data
  const operationalChartData = useMemo(() => {
    return chartDays.map(day => {
      const rec = inventory.filter(p => isSameDay(new Date(p.received_date || p.created_at), day.date)).length;
      const ent = inventory.filter(p => p.status?.toLowerCase().includes('entregad') && isSameDay(new Date(p.updated_at || p.created_at), day.date)).length;
      return {
        name: day.label,
        Recibidos: rec,
        Entregados: ent,
        EnProceso: Math.max(0, rec - ent)
      };
    });
  }, [chartDays, inventory]);

  // Sales Trend Data
  const salesChartData = useMemo(() => {
    return chartDays.map(day => {
      const total = invoices
        .filter(inv => inv.status !== 'Anulada' && isSameDay(parseLocalDate(inv.issue_date), day.date))
        .reduce((s, inv) => s + Number(inv.total), 0);
      return {
        name: day.label,
        Ventas: Number(total.toFixed(2))
      };
    });
  }, [chartDays, invoices]);

  // Service analysis data
  const serviceStats = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; count: number }>();
    filteredInvoices.forEach(inv => {
      const items = inv.invoice_items || [];
      if (items.length > 0) {
        items.forEach(it => {
          const rawName = (it.service_name || 'Flete / Paquetería General').trim();
          const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
          const current = map.get(name) || { name, revenue: 0, count: 0 };
          current.revenue += Number(it.amount) || 0;
          current.count += 1;
          map.set(name, current);
        });
      } else {
        const name = 'Flete / Paquetería General';
        const current = map.get(name) || { name, revenue: 0, count: 0 };
        current.revenue += Number(inv.total) || 0;
        current.count += 1;
        map.set(name, current);
      }
    });

    const colors = ['#12435E', '#F5A623', '#10B981', '#6366F1', '#EC4899', '#8B5CF6', '#14B8A6'];
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
      .map((it, idx) => ({
        ...it,
        revenue: Number(it.revenue.toFixed(2)),
        color: colors[idx % colors.length]
      }));
  }, [filteredInvoices]);

  // Recent 5 Invoices
  const recentInvoices = useMemo(() => {
    return [...invoices]
      .sort((a, b) => new Date(b.issue_date || 0).getTime() - new Date(a.issue_date || 0).getTime())
      .slice(0, 5);
  }, [invoices]);

  // Recent 5 Packages
  const recentPackages = useMemo(() => {
    return [...inventory]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 5);
  }, [inventory]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-80 gap-3">
        <div className="w-10 h-10 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-gray-500">Cargando métricas y análisis...</p>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-fade-in text-sm pb-10">
      
      {/* 1. Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {greeting}, <span className="text-brand-blue">{currentUser?.username || 'Equipo JRS'}</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-brand-blue/10 text-brand-blue border border-brand-blue/20 uppercase tracking-wider">
              {currentUser?.role === 'admin' ? 'Administrador' : 'Operador'}
            </span>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm mt-1 font-medium">
            Panel interactivo de rendimiento, operaciones de carga y facturación.
          </p>
        </div>

        {/* Date Filter & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex bg-white rounded-2xl shadow-sm border border-gray-200/80 p-1">
            {[
              { id: 'hoy' as const, label: 'Hoy' },
              { id: 'semana' as const, label: 'Semana' },
              { id: 'mes' as const, label: 'Mes' },
              { id: 'todos' as const, label: 'Histórico' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dateFilter === f.id
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <Link 
            href="/admin/bodega" 
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-yellow hover:bg-brand-yellow/90 text-brand-blue font-black rounded-2xl text-xs shadow-sm hover:shadow transition-all"
          >
            <Plus size={15} /> Escanear
          </Link>

          <Link 
            href="/admin/facturacion/nueva" 
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold rounded-2xl text-xs shadow-sm hover:shadow transition-all"
          >
            <Plus size={15} /> Facturar
          </Link>
        </div>
      </div>

      {/* 2. Tipo de Cambio Oficial del Día (Preserved Section) */}
      <div className="bg-gradient-to-r from-white via-amber-50/20 to-amber-50/50 rounded-3xl shadow-sm border border-amber-200/60 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-600 shrink-0 shadow-inner">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-gray-900 text-sm sm:text-base">Tipo de Cambio Oficial del Día</h3>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-black rounded-lg border border-emerald-200 uppercase tracking-wider">
                Vigente: ₡{currentExchangeRate}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">
              Aplica a todas las facturas y cálculos emitidos hoy ({formatDisplayDate(getLocalTodayDate())})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-white border border-gray-300 rounded-2xl px-3.5 py-2 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/10 transition-all shadow-sm">
            <span className="text-xs font-black text-gray-400 mr-1.5">₡</span>
            <input
              type="number"
              min="1"
              step="1"
              value={exchangeRateInput}
              onChange={e => setExchangeRateInput(e.target.value)}
              className="w-24 bg-transparent font-black text-brand-blue text-sm focus:outline-none"
              placeholder="500"
            />
            <span className="text-[11px] font-bold text-gray-400 ml-1">CRC / $1 USD</span>
          </div>

          <button
            onClick={handleSaveExchangeRate}
            disabled={isSavingExchangeRate || !exchangeRateInput}
            className="px-4 py-2.5 bg-brand-blue text-white rounded-2xl text-xs font-bold hover:bg-brand-blue/90 transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Guardar y actualizar todas las facturas de hoy"
          >
            {isSavingExchangeRate ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Actualizar Tipo de Cambio</span>
          </button>
        </div>
      </div>

      {/* 3. Interactive KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* KPI 1: Paquetes Recibidos */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Paquetes Totales</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-brand-blue flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-gray-900">{totalPaquetes}</div>
            <div className="flex items-center gap-2 mt-2 text-xs font-semibold">
              <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">{enBodega} en bodega</span>
              <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{entregados} listos</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Eficiencia de Entrega / Peso */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tasa de Entrega</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-gray-900">{tasaEntrega}%</div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-gray-500">
              <Scale size={13} className="text-gray-400" />
              <span>{totalWeightLbs.toFixed(1)} lbs ({totalWeightKg} kg)</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Venta Facturada */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Venta en Período</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-gray-900">${totalFacturado.toFixed(2)}</div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-600">
              <TrendingUp size={13} />
              <span>Venta hoy: ${ventaHoy.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Cuentas por Cobrar */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Por Cobrar</span>
            <div className="w-9 h-9 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-red-600">${totalReceivables.toFixed(2)}</div>
            <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-gray-500">
              <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-md font-bold">{pendientesCount} pendientes</span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Interactive Analytics Center (Tabs + Charts) */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-7 space-y-6">
        
        {/* Chart Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-center gap-2 bg-gray-100/80 p-1 rounded-2xl w-fit">
            <button
              onClick={() => setActiveChartTab('operaciones')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeChartTab === 'operaciones'
                  ? 'bg-white text-brand-blue shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Truck size={14} /> Flujo de Bodega
            </button>
            <button
              onClick={() => setActiveChartTab('ventas')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeChartTab === 'ventas'
                  ? 'bg-white text-brand-blue shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <BarChart2 size={14} /> Ventas & Finanzas
            </button>
            <button
              onClick={() => setActiveChartTab('servicios')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeChartTab === 'servicios'
                  ? 'bg-white text-brand-blue shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Layers size={14} /> Servicios
            </button>
          </div>

          {/* Timeframe Selector for Charts */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400">Rango del gráfico:</span>
            <div className="flex bg-gray-50 border border-gray-200 rounded-xl p-0.5 text-xs font-bold">
              {(['7d', '14d', '30d'] as const).map(tf => (
                <button
                  key={tf}
                  onClick={() => setChartTimeframe(tf)}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    chartTimeframe === tf ? 'bg-brand-blue text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tf === '7d' ? '7 Días' : tf === '14d' ? '14 Días' : '30 Días'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab 1: Operaciones de Bodega */}
        {activeChartTab === 'operaciones' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Flujo Diario de Paquetes</h3>
                  <p className="text-xs text-gray-400">Comparativa de paquetes recibidos versus entregados</p>
                </div>
              </div>
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={operationalChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRecibidos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#12435E" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#12435E" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorEntregados" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '12px' }} 
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="Recibidos" stroke="#12435E" strokeWidth={3} fillOpacity={1} fill="url(#colorRecibidos)" />
                    <Area type="monotone" dataKey="Entregados" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorEntregados)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Breakdown Mini Card */}
            <div className="lg:col-span-4 bg-gray-50/70 rounded-2xl p-5 border border-gray-100 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Resumen Operativo</h4>
                <p className="text-xs text-gray-400 mt-0.5">Distribución actual de inventario</p>
                
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                      <span className="font-semibold text-gray-700 text-xs">En Bodega</span>
                    </div>
                    <span className="font-black text-gray-900 text-sm">{enBodega}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                      <span className="font-semibold text-gray-700 text-xs">Entregados</span>
                    </div>
                    <span className="font-black text-gray-900 text-sm">{entregados}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-brand-blue"></span>
                      <span className="font-semibold text-gray-700 text-xs">Peso Procesado</span>
                    </div>
                    <span className="font-black text-gray-900 text-sm">{totalWeightLbs.toFixed(0)} lbs</span>
                  </div>
                </div>
              </div>

              <Link 
                href="/admin/inventario" 
                className="mt-5 w-full py-2.5 bg-brand-blue/5 hover:bg-brand-blue/10 text-brand-blue font-bold rounded-xl text-center text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                Ver Inventario Completo <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* Tab 2: Ventas y Finanzas */}
        {activeChartTab === 'ventas' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Facturación Diaria ($ USD)</h3>
                  <p className="text-xs text-gray-400">Total facturado por día en el período seleccionado</p>
                </div>
              </div>
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `$${v}`} />
                    <RechartsTooltip 
                      formatter={(val: number) => [`$${val.toFixed(2)} USD`, 'Facturado']}
                      contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '12px' }} 
                    />
                    <Bar dataKey="Ventas" fill="#12435E" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Antigüedad de Saldos Pie Chart */}
            <div className="lg:col-span-4 bg-gray-50/70 rounded-2xl p-5 border border-gray-100 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Antigüedad de Saldos</h4>
                <p className="text-xs text-gray-400 mt-0.5">Cuentas por cobrar por vencimiento</p>

                <div className="h-44 mt-3">
                  {pieAgingData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieAgingData} innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                          {pieAgingData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(val: number) => `$${val.toFixed(2)}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs font-bold text-emerald-600">
                      ✓ Todo cobrado al día
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-xs mt-2">
                  {pieAgingData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                        <span>{d.name}</span>
                      </div>
                      <span className="font-bold text-gray-900">${d.value.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link 
                href="/admin/cuentas-por-cobrar" 
                className="mt-4 w-full py-2 bg-brand-blue/5 hover:bg-brand-blue/10 text-brand-blue font-bold rounded-xl text-center text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                Cobrar Facturas <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* Tab 3: Servicios */}
        {activeChartTab === 'servicios' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <h3 className="font-bold text-gray-900 text-sm mb-1">Ingresos por Tipo de Servicio</h3>
              <p className="text-xs text-gray-400 mb-4">Desglose de facturación por línea de producto o flete</p>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serviceStats} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `$${v}`} />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} width={120} />
                    <RechartsTooltip 
                      formatter={(val: number) => [`$${val.toFixed(2)} USD`, 'Facturado']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} 
                    />
                    <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={22}>
                      {serviceStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 bg-gray-50/70 rounded-2xl p-5 border border-gray-100">
              <h4 className="font-bold text-gray-900 text-sm mb-3">Detalle de Servicios</h4>
              <div className="space-y-3">
                {serviceStats.map((srv, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-xs text-gray-800 truncate">{srv.name}</div>
                      <div className="text-[10px] text-gray-400">{srv.count} operaciones</div>
                    </div>
                    <span className="font-black text-brand-blue text-sm shrink-0">${srv.revenue.toFixed(2)}</span>
                  </div>
                ))}
                {serviceStats.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-8">Sin datos de servicios en este rango</p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 5. Live Activity Feed & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Invoices Feed */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-brand-blue" />
              <h3 className="font-bold text-gray-900 text-sm">Últimas Facturas Emitidas</h3>
            </div>
            <Link href="/admin/facturacion" className="text-xs font-bold text-brand-blue hover:underline">
              Ver todas →
            </Link>
          </div>

          <div className="divide-y divide-gray-50">
            {recentInvoices.map(inv => (
              <div key={inv.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-gray-900 text-xs">#{inv.invoice_number}</div>
                  <div className="text-[11px] text-gray-500">{inv.clients?.name || 'Cliente'} &bull; {inv.issue_date?.split('T')[0]}</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-gray-900 text-xs">${Number(inv.total).toFixed(2)}</div>
                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    inv.status === 'Pagada' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
            {recentInvoices.length === 0 && (
              <p className="text-xs text-gray-400 py-6 text-center">No hay facturas recientes</p>
            )}
          </div>
        </div>

        {/* Recent Packages Feed */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-brand-blue" />
              <h3 className="font-bold text-gray-900 text-sm">Últimos Paquetes Registrados</h3>
            </div>
            <Link href="/admin/inventario" className="text-xs font-bold text-brand-blue hover:underline">
              Ver inventario →
            </Link>
          </div>

          <div className="divide-y divide-gray-50">
            {recentPackages.map(pkg => (
              <div key={pkg.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold font-mono text-brand-blue text-xs">{pkg.tracking_number || pkg.id}</div>
                  <div className="text-[11px] text-gray-500">{pkg.client_name || pkg.client || 'Sin cliente'} &bull; {pkg.weight || '0'} lbs</div>
                </div>
                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                  pkg.status?.toLowerCase().includes('entregad') 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                    : 'bg-blue-50 text-brand-blue border border-blue-200/60'
                }`}>
                  {pkg.status || 'En Bodega'}
                </span>
              </div>
            ))}
            {recentPackages.length === 0 && (
              <p className="text-xs text-gray-400 py-6 text-center">No hay paquetes recientes</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

