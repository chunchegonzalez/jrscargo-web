'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, LineChart, Line, ComposedChart
} from 'recharts';
import { 
  Package, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  BarChart2, 
  Coins, 
  Save, 
  RefreshCw,
  Truck,
  Scale,
  Layers,
  ArrowRight,
  FileText,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieIcon,
  Calendar
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
  subtotal?: number;
  discount_amount?: number;
  discount_percent?: number;
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

interface ExpenseData {
  id: string;
  provider_name: string;
  date: string;
  amount: number | string;
  currency?: string;
  category: string;
  receipt_image?: string | null;
  receipt_url?: string | null;
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
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Interactive Dashboard States
  const [dateFilter, setDateFilter] = useState<'hoy' | 'semana' | 'mes' | 'todos'>('mes');
  const [activeChartTab, setActiveChartTab] = useState<'operaciones' | 'ventas' | 'servicios'>('ventas');
  const [chartTimeframe, setChartTimeframe] = useState<'7d' | '14d' | '30d'>('7d');
  
  // Finance Sub-view
  const [financeView, setFinanceView] = useState<'comparativa' | 'mensual' | 'gastos' | 'cobranza'>('comparativa');

  // Exchange rate state
  const [currentExchangeRate, setCurrentExchangeRate] = useState<number>(500);
  const [exchangeRateInput, setExchangeRateInput] = useState<string>('500');
  const [isSavingExchangeRate, setIsSavingExchangeRate] = useState<boolean>(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [userRes, invRes, pkgRes, expRes, rateRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/invoices?includeItems=true', { cache: 'no-store' }),
          fetch('/api/inventory', { cache: 'no-store' }),
          fetch('/api/expenses', { cache: 'no-store' }),
          fetch('/api/exchange-rate', { cache: 'no-store' })
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
        if (expRes.ok) {
          const ed = await expRes.json();
          setExpenses(ed.data || []);
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
        const invRes = await fetch('/api/invoices?includeItems=true', { cache: 'no-store' });
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

  const totalFacturadoUSD = useMemo(() => {
    return filteredInvoices.reduce((s, inv) => {
      const val = Number(inv.total) || 0;
      return s + (inv.currency === 'CRC' ? (val / (inv.exchange_rate || currentExchangeRate)) : val);
    }, 0);
  }, [filteredInvoices, currentExchangeRate]);

  // Expenses metrics
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => inRange(exp.date));
  }, [expenses, dateFilter]);

  const totalGastosUSD = useMemo(() => {
    return filteredExpenses.reduce((s, exp) => {
      const val = Number(exp.amount) || 0;
      return s + (exp.currency === 'CRC' ? (val / currentExchangeRate) : val);
    }, 0);
  }, [filteredExpenses, currentExchangeRate]);

  // Net Profit & Margins
  const utilidadNetaUSD = totalFacturadoUSD - totalGastosUSD;
  const margenUtilidad = totalFacturadoUSD > 0 ? (utilidadNetaUSD / totalFacturadoUSD) * 100 : 0;

  // Receivables & Collections
  const { totalPaidUSD, totalReceivablesUSD, pendientesCount, pieAgingData } = useMemo(() => {
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
      const invTotal = Number(inv.total) || 0;
      const rate = inv.exchange_rate || currentExchangeRate;
      const totalUSD = inv.currency === 'CRC' ? (invTotal / rate) : invTotal;
      const paidUSD = inv.currency === 'CRC' ? (invPaid / rate) : invPaid;
      const pendingUSD = Math.max(0, totalUSD - paidUSD);

      if (inv.status === 'Pagada' || pendingUSD <= 0.01) {
        paidSum += totalUSD;
      } else {
        recSum += pendingUSD;
        paidSum += paidUSD;
        pendCount++;

        const issueDate = parseLocalDate(inv.issue_date);
        const diffDays = Math.ceil(Math.abs(today.getTime() - issueDate.getTime()) / (1000*60*60*24));
        if (diffDays <= 30) a1_30 += pendingUSD;
        else if (diffDays <= 60) a31_60 += pendingUSD;
        else if (diffDays <= 90) a61_90 += pendingUSD;
        else aOver90 += pendingUSD;
      }
    });

    const aging = [
      { name: '1-30 días', value: a1_30, color: '#12435E' },
      { name: '31-60 días', value: a31_60, color: '#F5A623' },
      { name: '61-90 días', value: a61_90, color: '#06B6D4' },
      { name: '+90 días', value: aOver90, color: '#EF4444' },
    ].filter(d => d.value > 0);

    return { 
      totalPaidUSD: paidSum, 
      totalReceivablesUSD: recSum, 
      pendientesCount: pendCount, 
      pieAgingData: aging 
    };
  }, [invoices, currentExchangeRate]);

  // Today metrics
  const ventaHoy = useMemo(() => {
    const todayS = startOfDay(new Date());
    const todayE = endOfDay(new Date());
    return invoices
      .filter(inv => {
        const d = parseLocalDate(inv.issue_date);
        return d >= todayS && d <= todayE && inv.status !== 'Anulada';
      })
      .reduce((s, inv) => {
        const val = Number(inv.total) || 0;
        return s + (inv.currency === 'CRC' ? (val / (inv.exchange_rate || currentExchangeRate)) : val);
      }, 0);
  }, [invoices, currentExchangeRate]);

  const gastosHoy = useMemo(() => {
    const todayS = startOfDay(new Date());
    const todayE = endOfDay(new Date());
    return expenses
      .filter(exp => {
        const d = parseLocalDate(exp.date);
        return d >= todayS && d <= todayE;
      })
      .reduce((s, exp) => {
        const val = Number(exp.amount) || 0;
        return s + (exp.currency === 'CRC' ? (val / currentExchangeRate) : val);
      }, 0);
  }, [expenses, currentExchangeRate]);

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

  // Comparative Daily Financial Data (Facturación vs Gastos vs Utilidad)
  const comparativeChartData = useMemo(() => {
    return chartDays.map(day => {
      const daySales = invoices
        .filter(inv => inv.status !== 'Anulada' && isSameDay(parseLocalDate(inv.issue_date), day.date))
        .reduce((s, inv) => {
          const val = Number(inv.total) || 0;
          return s + (inv.currency === 'CRC' ? (val / (inv.exchange_rate || currentExchangeRate)) : val);
        }, 0);

      const dayExpenses = expenses
        .filter(exp => isSameDay(parseLocalDate(exp.date), day.date))
        .reduce((s, exp) => {
          const val = Number(exp.amount) || 0;
          return s + (exp.currency === 'CRC' ? (val / currentExchangeRate) : val);
        }, 0);

      const netProfit = daySales - dayExpenses;

      return {
        name: day.label,
        Facturacion: Number(daySales.toFixed(2)),
        Gastos: Number(dayExpenses.toFixed(2)),
        Utilidad: Number(netProfit.toFixed(2))
      };
    });
  }, [chartDays, invoices, expenses, currentExchangeRate]);

  // Monthly Financial Data (Last 6 Months)
  const monthlyFinancialData = useMemo(() => {
    const months = [];
    const now = new Date();
    const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();
      const label = `${monthNames[targetMonth]} ${String(targetYear).slice(2)}`;

      const mSales = invoices
        .filter(inv => {
          if (inv.status === 'Anulada') return false;
          const d = parseLocalDate(inv.issue_date);
          return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
        })
        .reduce((s, inv) => {
          const val = Number(inv.total) || 0;
          return s + (inv.currency === 'CRC' ? (val / (inv.exchange_rate || currentExchangeRate)) : val);
        }, 0);

      const mExpenses = expenses
        .filter(exp => {
          const d = parseLocalDate(exp.date);
          return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
        })
        .reduce((s, exp) => {
          const val = Number(exp.amount) || 0;
          return s + (exp.currency === 'CRC' ? (val / currentExchangeRate) : val);
        }, 0);

      const mProfit = mSales - mExpenses;
      const mMargen = mSales > 0 ? (mProfit / mSales) * 100 : 0;

      months.push({
        mes: label,
        Facturacion: Number(mSales.toFixed(2)),
        Gastos: Number(mExpenses.toFixed(2)),
        Utilidad: Number(mProfit.toFixed(2)),
        Margen: Number(mMargen.toFixed(1))
      });
    }
    return months;
  }, [invoices, expenses, currentExchangeRate]);

  // Expense Categories Breakdown
  const expenseCategoriesData = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses.forEach(exp => {
      const cat = (exp.category || 'Otros').trim();
      const val = Number(exp.amount) || 0;
      const usdVal = exp.currency === 'CRC' ? (val / currentExchangeRate) : val;
      map.set(cat, (map.get(cat) || 0) + usdVal);
    });

    const categoryColors: Record<string, string> = {
      'Combustible': '#EF4444',
      'Pago de Proveedor': '#12435E',
      'Planillas': '#10B981',
      'Mantenimiento': '#F5A623',
      'Servicios': '#6366F1',
      'Local San Pablo': '#8B5CF6',
      'Viáticos': '#EC4899',
      'Papelería': '#14B8A6',
      'Otros': '#94A3B8'
    };

    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);

    return Array.from(map.entries())
      .map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2)),
        percent: total > 0 ? Math.round((value / total) * 100) : 0,
        color: categoryColors[name] || '#64748B'
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses, currentExchangeRate]);

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
        <p className="text-sm font-semibold text-gray-500">Cargando métricas financieras y operaciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-fade-in text-sm pb-10">
      
      {/* 1. Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {greeting}, <span className="text-brand-blue">{currentUser?.username || 'Equipo JRS'}</span>
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1 font-medium">
            Panel interactivo de rendimiento financiero, facturación y operaciones de carga.
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

      {/* 2. Tipo de Cambio Oficial del Día */}
      <div className="bg-gradient-to-br from-white via-white to-amber-50/40 rounded-3xl shadow-sm border border-amber-200/70 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-amber-500/20">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-gray-900 text-base sm:text-lg">Tipo de Cambio Oficial</h3>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-black rounded-lg border border-emerald-200">
                  ₡{currentExchangeRate} CRC = $1.00 USD
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-medium flex-wrap">
                <span>Fecha: <strong className="text-gray-700">{formatDisplayDate(getLocalTodayDate())}</strong></span>
                <span>&bull;</span>
                <span className="text-brand-blue font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  {invoices.filter(i => (i.issue_date || '').split('T')[0] === getLocalTodayDate()).length} facturas de hoy sincronizadas
                </span>
              </div>
            </div>
          </div>

          {/* Quick Adjustment & Save Form */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="hidden sm:flex items-center bg-gray-100/80 p-1 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setExchangeRateInput(prev => String(Math.max(1, (Number(prev) || 500) - 5)))}
                className="px-2.5 py-1 text-xs font-bold text-gray-600 hover:bg-white hover:text-gray-900 rounded-xl transition-all cursor-pointer"
                title="Restar ₡5"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => setExchangeRateInput(prev => String(Math.max(1, (Number(prev) || 500) - 1)))}
                className="px-2.5 py-1 text-xs font-bold text-gray-600 hover:bg-white hover:text-gray-900 rounded-xl transition-all cursor-pointer"
                title="Restar ₡1"
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => setExchangeRateInput(prev => String((Number(prev) || 500) + 1))}
                className="px-2.5 py-1 text-xs font-bold text-gray-600 hover:bg-white hover:text-gray-900 rounded-xl transition-all cursor-pointer"
                title="Sumar ₡1"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => setExchangeRateInput(prev => String((Number(prev) || 500) + 5))}
                className="px-2.5 py-1 text-xs font-bold text-gray-600 hover:bg-white hover:text-gray-900 rounded-xl transition-all cursor-pointer"
                title="Sumar ₡5"
              >
                +5
              </button>
            </div>

            <div className="flex items-center bg-white border-2 border-amber-300/80 rounded-2xl px-3.5 py-2 focus-within:border-brand-blue focus-within:ring-4 focus-within:ring-brand-blue/10 transition-all shadow-sm">
              <span className="text-xs font-black text-amber-600 mr-1.5">₡</span>
              <input
                type="number"
                min="1"
                step="1"
                value={exchangeRateInput}
                onChange={e => setExchangeRateInput(e.target.value)}
                className="w-24 bg-transparent font-black text-brand-blue text-base focus:outline-none"
                placeholder="500"
              />
              <span className="text-[11px] font-bold text-gray-400 ml-1">CRC</span>
            </div>

            <button
              onClick={handleSaveExchangeRate}
              disabled={isSavingExchangeRate || !exchangeRateInput}
              className="px-4 py-2.5 bg-gradient-to-r from-brand-blue to-[#0C2B3D] text-white rounded-2xl text-xs font-bold hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shrink-0 shadow-sm"
              title="Guardar y actualizar todas las facturas emitidas hoy"
            >
              {isSavingExchangeRate ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Actualizar Tipo de Cambio</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Global KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* KPI 1: Ingresos Facturados */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ingresos Facturados</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-brand-blue flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-gray-900">${totalFacturadoUSD.toFixed(2)}</div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-600">
              <TrendingUp size={13} />
              <span>Hoy: ${ventaHoy.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Gastos Operativos */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gastos Operativos</span>
            <div className="w-9 h-9 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Receipt size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-red-600">${totalGastosUSD.toFixed(2)}</div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-gray-500">
              <TrendingDown size={13} className="text-red-400" />
              <span>Hoy: ${gastosHoy.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Utilidad Operativa */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Utilidad Operativa</span>
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${
              utilidadNetaUSD >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}>
              <Wallet size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-black ${utilidadNetaUSD >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              ${utilidadNetaUSD.toFixed(2)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-bold">
              <span className={`px-2 py-0.5 rounded-md ${utilidadNetaUSD >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                Margen {margenUtilidad.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Cuentas por Cobrar */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Por Cobrar</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-600">${totalReceivablesUSD.toFixed(2)}</div>
            <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-gray-500">
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-bold">{pendientesCount} pendientes</span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Interactive Analytics Center (Tabs + Pro Financial Suite) */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-7 space-y-6">
        
        {/* Main Tab Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-center gap-2 bg-gray-100/80 p-1 rounded-2xl w-fit">
            <button
              onClick={() => setActiveChartTab('ventas')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeChartTab === 'ventas'
                  ? 'bg-white text-brand-blue shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <BarChart2 size={14} /> Ventas & Finanzas Pro
            </button>
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

          {/* Timeframe Selector for Daily Charts */}
          {activeChartTab === 'ventas' && financeView === 'comparativa' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400">Rango diario:</span>
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
          )}

          {activeChartTab === 'operaciones' && (
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
          )}
        </div>

        {/* Tab 1: Ventas y Finanzas PRO */}
        {activeChartTab === 'ventas' && (
          <div className="space-y-6">
            
            {/* Sub-navigation buttons inside Ventas & Finanzas */}
            <div className="flex flex-wrap items-center gap-2 bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100 w-fit">
              <button
                onClick={() => setFinanceView('comparativa')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  financeView === 'comparativa' 
                    ? 'bg-brand-blue text-white shadow-xs' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                }`}
              >
                <TrendingUp size={13} /> Comparativa Ingresos vs Gastos
              </button>
              <button
                onClick={() => setFinanceView('mensual')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  financeView === 'mensual' 
                    ? 'bg-brand-blue text-white shadow-xs' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                }`}
              >
                <Calendar size={13} /> Evolución Mensual (6 Meses)
              </button>
              <button
                onClick={() => setFinanceView('gastos')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  financeView === 'gastos' 
                    ? 'bg-brand-blue text-white shadow-xs' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                }`}
              >
                <PieIcon size={13} /> Desglose de Gastos
              </button>
              <button
                onClick={() => setFinanceView('cobranza')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  financeView === 'cobranza' 
                    ? 'bg-brand-blue text-white shadow-xs' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                }`}
              >
                <AlertCircle size={13} /> Antigüedad de Saldos
              </button>
            </div>

            {/* Sub-view Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Main Chart Column (8 cols) */}
              <div className="lg:col-span-8">
                
                {/* 1. Comparativa Diaria: Ingresos vs Gastos vs Utilidad */}
                {financeView === 'comparativa' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">Flujo Diario: Ingresos, Gastos y Utilidad Neta ($ USD)</h3>
                        <p className="text-xs text-gray-400">Comparativa directa entre facturación emitida y gastos operativos diarios</p>
                      </div>
                    </div>
                    <div className="h-72 sm:h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={comparativeChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `$${v}`} />
                          <RechartsTooltip 
                            formatter={(val: number, name: string) => [`$${val.toFixed(2)} USD`, name]}
                            contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '12px' }} 
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                          <Bar dataKey="Facturacion" name="Ingresos" fill="#12435E" radius={[4, 4, 0, 0]} maxBarSize={24} />
                          <Bar dataKey="Gastos" name="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={24} />
                          <Line type="monotone" dataKey="Utilidad" name="Utilidad Neta" stroke="#10B981" strokeWidth={3} dot={{ r: 3 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* 2. Evolución Mensual (6 Meses) */}
                {financeView === 'mensual' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">Histórico Mensual: Facturación vs Gastos (Últimos 6 Meses)</h3>
                        <p className="text-xs text-gray-400">Evolución de resultados financieros mes a mes</p>
                      </div>
                    </div>
                    <div className="h-72 sm:h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyFinancialData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `$${v}`} />
                          <RechartsTooltip 
                            formatter={(val: number, name: string) => [`$${val.toFixed(2)} USD`, name]}
                            contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '12px' }} 
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                          <Bar dataKey="Facturacion" name="Facturación" fill="#12435E" radius={[5, 5, 0, 0]} maxBarSize={32} />
                          <Bar dataKey="Gastos" name="Gastos" fill="#F87171" radius={[5, 5, 0, 0]} maxBarSize={32} />
                          <Bar dataKey="Utilidad" name="Utilidad" fill="#10B981" radius={[5, 5, 0, 0]} maxBarSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* 3. Desglose de Gastos por Categoría */}
                {financeView === 'gastos' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">Estructura de Gastos Operativos por Categoría</h3>
                        <p className="text-xs text-gray-400">Distribución de los egresos en el período seleccionado</p>
                      </div>
                    </div>
                    <div className="h-72 sm:h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={expenseCategoriesData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                          <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `$${v}`} />
                          <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} width={130} />
                          <RechartsTooltip 
                            formatter={(val: number) => [`$${val.toFixed(2)} USD`, 'Total Gasto']}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} 
                          />
                          <Bar dataKey="value" name="Gasto USD" radius={[0, 6, 6, 0]} maxBarSize={22}>
                            {expenseCategoriesData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* 4. Antigüedad y Cobranza */}
                {financeView === 'cobranza' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">Estado de Cuentas por Cobrar</h3>
                        <p className="text-xs text-gray-400">Distribución de saldos según días de emisión</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="h-64 flex items-center justify-center">
                        {pieAgingData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={pieAgingData} innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                                {pieAgingData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <RechartsTooltip formatter={(val: number) => `$${val.toFixed(2)} USD`} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs font-bold text-emerald-600">
                            ✓ Todo cobrado al día
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-center space-y-2.5">
                        {pieAgingData.map((d, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span>
                              <span className="font-bold text-gray-700 text-xs">{d.name}</span>
                            </div>
                            <span className="font-black text-gray-900 text-sm">${d.value.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Financial Executive Summary Card (4 cols) */}
              <div className="lg:col-span-4 bg-gray-50/80 rounded-2xl p-5 border border-gray-100 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-gray-900 text-sm">Estado de Resultados</h4>
                      <p className="text-xs text-gray-400">Resumen del período</p>
                    </div>
                    <span className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue text-[10px] font-black rounded-lg uppercase">
                      {dateFilter}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    {/* Ingresos */}
                    <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center">
                          <ArrowUpRight size={14} />
                        </div>
                        <div>
                          <div className="font-bold text-gray-700 text-xs">Facturación Bruta</div>
                          <div className="text-[10px] text-gray-400">≈ ₡{(totalFacturadoUSD * currentExchangeRate).toFixed(0)}</div>
                        </div>
                      </div>
                      <span className="font-black text-gray-900 text-sm">${totalFacturadoUSD.toFixed(2)}</span>
                    </div>

                    {/* Gastos */}
                    <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                          <ArrowDownRight size={14} />
                        </div>
                        <div>
                          <div className="font-bold text-gray-700 text-xs">Gastos Operativos</div>
                          <div className="text-[10px] text-gray-400">{filteredExpenses.length} comprobantes</div>
                        </div>
                      </div>
                      <span className="font-black text-red-600 text-sm">-${totalGastosUSD.toFixed(2)}</span>
                    </div>

                    {/* Utilidad Operativa */}
                    <div className={`p-3.5 rounded-xl border shadow-xs flex items-center justify-between ${
                      utilidadNetaUSD >= 0 
                        ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950' 
                        : 'bg-red-50/70 border-red-200/80 text-red-950'
                    }`}>
                      <div>
                        <div className="font-black text-xs">Utilidad Neta (P&L)</div>
                        <div className="text-[10px] opacity-75 font-semibold">Margen: {margenUtilidad.toFixed(1)}%</div>
                      </div>
                      <span className={`font-black text-base ${utilidadNetaUSD >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        ${utilidadNetaUSD.toFixed(2)}
                      </span>
                    </div>

                    {/* Cobranza Realizada */}
                    <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 size={14} />
                        </div>
                        <div>
                          <div className="font-bold text-gray-700 text-xs">Efectivo Cobrado</div>
                          <div className="text-[10px] text-gray-400">Total recaudado</div>
                        </div>
                      </div>
                      <span className="font-black text-emerald-600 text-sm">${totalPaidUSD.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Links */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/60">
                  <Link 
                    href="/admin/gastos" 
                    className="py-2 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-center text-xs transition-colors border border-gray-200 shadow-xs flex items-center justify-center gap-1"
                  >
                    <Receipt size={13} /> Ver Gastos
                  </Link>
                  <Link 
                    href="/admin/cuentas-por-cobrar" 
                    className="py-2 bg-brand-blue text-white hover:bg-brand-blue/90 font-bold rounded-xl text-center text-xs transition-colors shadow-xs flex items-center justify-center gap-1"
                  >
                    <DollarSign size={13} /> Cobrar
                  </Link>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Tab 2: Operaciones de Bodega */}
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
              <h3 className="font-bold text-gray-900 text-sm">Últimos Comprobantes Emitidos</h3>
            </div>
            <Link href="/admin/facturacion" className="text-xs font-bold text-brand-blue hover:underline">
              Ver todos →
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
              <p className="text-xs text-gray-400 py-6 text-center">No hay comprobantes recientes</p>
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
