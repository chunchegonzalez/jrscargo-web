'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, LineChart, Line
} from 'recharts';
import { Package, TrendingUp, DollarSign, CheckCircle, AlertCircle, Plus, Building2, ShoppingBag, BarChart2, Coins, Save, RefreshCw } from 'lucide-react';
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
  exchange_rate?: number;
  invoice_payments?: { amount_applied: number | string }[];
  invoice_items?: InvoiceItemLine[];
}

interface InventoryItem {
  id: string;
  tracking_number: string;
  client_name: string;
  status: string;
  weight: number;
  received_date?: string;
  created_at: string;
  updated_at?: string;
}

// --- Helper functions (no date-fns needed) ---
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
  const [dateFilter, setDateFilter] = useState<'hoy' | 'semana' | 'mes' | 'todos'>('mes');
  
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
          fetch('/api/invoices'),
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
        // Refresh invoices in dashboard to reflect updated rates
        const invRes = await fetch('/api/invoices');
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

  // --- Date Filter ---
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

  // --- KPIs ---
  const paquetesRecibidos = inventory.filter(p => inRange(p.received_date || p.created_at)).length;
  const paquetesEntregados = inventory.filter(p => p.status === 'Entregado' && inRange(p.updated_at || p.created_at)).length;

  const todayS = startOfDay(new Date());
  const todayE = endOfDay(new Date());
  const ventaDiaria = invoices
    .filter(inv => {
      const d = parseLocalDate(inv.issue_date);
      return d >= todayS && d <= todayE && inv.status !== 'Anulada';
    })
    .reduce((s, inv) => s + Number(inv.total), 0);

  const facturasPendientes = invoices.filter(inv => {
    if (inv.status === 'Pagada' || inv.status === 'Anulada') return false;
    let paid = 0;
    if (inv.invoice_payments && Array.isArray(inv.invoice_payments)) {
      paid = inv.invoice_payments.reduce((a, p) => a + Number(p.amount_applied), 0);
    }
    return (Number(inv.total) - paid) > 0.01;
  }).length;

  // --- Filtered totals ---
  const filteredInvoices = invoices.filter(inv => inv.status !== 'Anulada' && inRange(inv.issue_date));
  const totalIncome = filteredInvoices.reduce((s, inv) => s + Number(inv.total), 0);

  let totalPaid = 0;
  let totalReceivables = 0;
  const today = new Date();
  let age1_30 = 0, age31_60 = 0, age61_90 = 0, ageOver90 = 0;

  invoices.forEach(inv => {
    let invPaid = 0;
    if (inv.invoice_payments && Array.isArray(inv.invoice_payments)) {
      invPaid = inv.invoice_payments.reduce((a, p) => a + Number(p.amount_applied), 0);
    }
    const invTotal = Number(inv.total);
    const pending = invTotal - invPaid;

    if (inv.status === 'Pagada') {
      totalPaid += invTotal;
    } else if (inv.status !== 'Anulada' && pending > 0.01) {
      totalReceivables += pending;
      totalPaid += invPaid;
      const issueDate = parseLocalDate(inv.issue_date);
      const diffDays = Math.ceil(Math.abs(today.getTime() - issueDate.getTime()) / (1000*60*60*24));
      if (diffDays <= 30) age1_30 += pending;
      else if (diffDays <= 60) age31_60 += pending;
      else if (diffDays <= 90) age61_90 += pending;
      else ageOver90 += pending;
    }
  });

  const pieData = [
    { name: '1-30 días', value: age1_30, color: '#12435E' },
    { name: '31-60 días', value: age31_60, color: '#F5A623' },
    { name: '61-90 días', value: age61_90, color: '#2ecc71' },
    { name: '+90 días', value: ageOver90, color: '#E5E7EB' },
  ].filter(d => d.value > 0);

  // --- Last 7 days charts ---
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    return { date: startOfDay(d), label: formatShortDay(d) };
  });

  const ventasPorDia = last7.map(day => ({
    name: day.label,
    Total: invoices
      .filter(inv => inv.status !== 'Anulada' && isSameDay(parseLocalDate(inv.issue_date), day.date))
      .reduce((s, inv) => s + Number(inv.total), 0)
  }));

  const paquetesPorDia = last7.map(day => ({
    name: day.label,
    Recibidos: inventory.filter(p => isSameDay(new Date(p.received_date || p.created_at), day.date)).length,
    Entregados: inventory.filter(p => p.status === 'Entregado' && isSameDay(new Date(p.updated_at || p.created_at), day.date)).length,
  }));

  // --- Product Sales Analysis ---
  const productSalesData = useMemo(() => {
    // 1. Filter invoices based on dateFilter
    const activeInvoices = invoices.filter(inv => {
      if (inv.status === 'Anulada') return false;
      const invDate = parseLocalDate(inv.issue_date);
      const curr = new Date();
      if (dateFilter === 'hoy') return isSameDay(invDate, curr);
      if (dateFilter === 'semana') return invDate >= startOfWeek(curr) && invDate <= endOfDay(curr);
      if (dateFilter === 'mes') return invDate >= startOfMonth(curr) && invDate <= endOfDay(curr);
      return true;
    });

    const map = new Map<string, { name: string; revenue: number; quantity: number; totalWeight: number }>();

    activeInvoices.forEach(inv => {
      const items = inv.invoice_items || [];
      if (items.length > 0) {
        items.forEach(it => {
          const rawName = (it.service_name || 'Servicio de Carga / Flete').trim();
          const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
          const amount = Number(it.amount) || 0;
          const weight = Number(it.weight) || 0;

          const current = map.get(name) || { name, revenue: 0, quantity: 0, totalWeight: 0 };
          current.revenue += amount;
          current.quantity += 1;
          current.totalWeight += weight;
          map.set(name, current);
        });
      } else {
        // Fallback for invoices without itemized lines
        const name = 'Flete / Paquetería General';
        const amount = Number(inv.total) || 0;
        const current = map.get(name) || { name, revenue: 0, quantity: 0, totalWeight: 0 };
        current.revenue += amount;
        current.quantity += 1;
        map.set(name, current);
      }
    });

    const totalRevenue = Array.from(map.values()).reduce((sum, p) => sum + p.revenue, 0);
    const totalUnits = Array.from(map.values()).reduce((sum, p) => sum + p.quantity, 0);

    const list = Array.from(map.values())
      .map(p => ({
        ...p,
        averageTicket: p.quantity > 0 ? p.revenue / p.quantity : 0,
        percentage: totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const topProduct = list[0] || null;

    // Palette for charts
    const colors = ['#12435E', '#F5A623', '#2ecc71', '#9b59b6', '#3498db', '#e74c3c', '#1abc9c', '#34495e'];
    const chartData = list.slice(0, 6).map((item, idx) => ({
      name: item.name.length > 18 ? item.name.substring(0, 18) + '...' : item.name,
      fullName: item.name,
      Ventas: Number(item.revenue.toFixed(2)),
      Cantidad: item.quantity,
      color: colors[idx % colors.length]
    }));

    return {
      list,
      chartData,
      totalRevenue,
      totalUnits,
      topProduct,
      activeServicesCount: list.length
    };
  }, [invoices, dateFilter]);

  // --- Cash flow (6 months) ---
  const monthlyData: { name: string; Total: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mName = d.toLocaleString('es-CR', { month: 'short' }).toUpperCase();
    const mInv = invoices.filter(inv => {
      const id = parseLocalDate(inv.issue_date);
      return id.getMonth() === d.getMonth() && id.getFullYear() === d.getFullYear() && inv.status !== 'Anulada';
    });
    monthlyData.push({ name: mName, Total: mInv.reduce((s, inv) => s + Number(inv.total), 0) });
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  if (currentUser?.role !== 'admin') {
    // --- Operator-specific stats ---
    const enBodega = inventory.filter(p => !p.status?.toLowerCase().includes('entregad')).length;
    const entregados = inventory.filter(p => p.status?.toLowerCase().includes('entregad')).length;
    const pendEntrega = enBodega;

    // Packages by provider (client_name)
    const providerMap = new Map<string, number>();
    inventory.forEach(p => {
      const name = p.client_name || 'Sin asignar';
      providerMap.set(name, (providerMap.get(name) || 0) + 1);
    });
    const providerData = Array.from(providerMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name: name.length > 15 ? name.substring(0, 15) + '...' : name, Paquetes: count }));

    // Packages by status pie (Only En Bodega and Entregado)
    const statusPieData = [
      { name: 'En Bodega', value: enBodega, color: '#12435E' },
      { name: 'Entregado', value: entregados, color: '#22c55e' }
    ].filter(d => d.value > 0);

    // Recent packages (last 10)
    const recentPackages = [...inventory]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    // Packages per day (last 7 days)
    const opPkgPorDia = last7.map(day => ({
      name: day.label,
      Recibidos: inventory.filter(p => isSameDay(new Date(p.received_date || p.created_at), day.date)).length,
      Entregados: inventory.filter(p => p.status === 'Entregado' && isSameDay(new Date(p.updated_at || p.created_at), day.date)).length,
    }));

    return (
      <div className="space-y-6 animate-fade-in text-sm">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-light text-gray-600">
              {greeting}, <strong className="font-black text-brand-blue">{currentUser?.username || 'Operador'}</strong>
            </h1>
            <p className="text-gray-400 text-xs mt-1">Panel operativo — resumen de paquetes e inventario</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/bodega" className="flex items-center px-4 py-2 bg-brand-yellow text-white rounded-full text-xs font-medium hover:bg-brand-yellow/90 transition-colors">
              <Plus className="w-3 h-3 mr-1.5" /> Escanear Paquete
            </Link>
            <Link href="/admin/bodega/masivo" className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-medium text-brand-blue hover:bg-gray-50 transition-colors">
              <Package className="w-3 h-3 mr-1.5" /> Acción Masiva
            </Link>
          </div>
        </div>

        {/* Tipo de Cambio del Día */}
        <div className="bg-gradient-to-r from-white via-white to-amber-50/40 rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-brand-yellow/15 text-brand-blue rounded-xl shrink-0">
              <Coins className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-800 text-sm">Tipo de Cambio Oficial del Día</h3>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-md border border-emerald-200 uppercase">
                  Vigente: ₡{currentExchangeRate}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Aplica a todas las facturas emitidas hoy ({formatDisplayDate(getLocalTodayDate())})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus-within:border-brand-blue focus-within:bg-white transition-colors shadow-inner">
              <span className="text-xs font-black text-gray-400 mr-1.5">₡</span>
              <input
                type="number"
                min="1"
                step="1"
                value={exchangeRateInput}
                onChange={e => setExchangeRateInput(e.target.value)}
                className="w-20 bg-transparent font-black text-brand-blue text-sm focus:outline-none"
                placeholder="500"
              />
              <span className="text-xs font-bold text-gray-400 ml-1">CRC / $1 USD</span>
            </div>

            <button
              onClick={handleSaveExchangeRate}
              disabled={isSavingExchangeRate || !exchangeRateInput}
              className="px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-brand-blue/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Guardar y actualizar todas las facturas de hoy"
            >
              {isSavingExchangeRate ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Actualizar Tipo de Cambio</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-brand-blue rounded-xl shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Paquetes</p>
              <p className="text-2xl font-black text-gray-800">{inventory.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">En Bodega</p>
              <p className="text-2xl font-black text-gray-800">{enBodega}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Entregados</p>
              <p className="text-2xl font-black text-gray-800">{entregados}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Tasa de Entrega</p>
              <p className="text-2xl font-black text-gray-800">
                {inventory.length > 0 ? Math.round((entregados / inventory.length) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Packages per day */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Paquetes últimos 7 días</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={opPkgPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <RechartsTooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Recibidos" fill="#12435E" radius={[4,4,0,0]} />
                <Bar dataKey="Entregados" fill="#22c55e" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status Pie */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Paquetes por Estado</h3>
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }) => name + ' (' + value + ')'} labelLine={false}>
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 py-10">Sin datos</p>
            )}
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Clients */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Paquetes por Cliente (Top 8)</h3>
            {providerData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={providerData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                  <RechartsTooltip />
                  <Bar dataKey="Paquetes" fill="#F5A623" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 py-10">Sin datos</p>
            )}
          </div>

          {/* Recent Packages Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Últimos Paquetes Recibidos</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 font-bold text-gray-500">Tracking</th>
                    <th className="text-left py-2 font-bold text-gray-500">Cliente</th>
                    <th className="text-left py-2 font-bold text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPackages.map(pkg => (
                    <tr key={pkg.id} className="border-b border-gray-50">
                      <td className="py-2 font-mono text-brand-blue font-bold">{pkg.tracking_number}</td>
                      <td className="py-2 text-gray-600 truncate max-w-[120px]">{pkg.client_name || '—'}</td>
                      <td className="py-2">
                        <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold ' + (
                          pkg.status === 'Entregado' ? 'bg-green-100 text-green-700' :
                          pkg.status === 'En Tránsito' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-brand-blue'
                        )}>{pkg.status}</span>
                      </td>
                    </tr>
                  ))}
                  {recentPackages.length === 0 && (
                    <tr><td colSpan={3} className="py-6 text-center text-gray-400">Sin paquetes</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Summary bar */}
        <div className="bg-gradient-to-r from-brand-blue to-[#0A2636] rounded-2xl p-6 text-white flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-white/60 uppercase tracking-wider font-bold">Pendientes de Entrega</p>
            <p className="text-3xl font-black">{pendEntrega}</p>
          </div>
          <Link href="/admin/inventario" className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-colors border border-white/10">
            Ver Inventario Completo →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-gray-600">
            {greeting}, <strong className="font-black text-brand-blue">{currentUser?.username || 'Admin'}</strong>
          </h1>
          <p className="text-gray-400 text-xs mt-1">Resumen general de operaciones y finanzas</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/facturacion/nueva" className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-medium text-brand-blue hover:bg-gray-50 transition-colors">
            <Plus className="w-3 h-3 mr-1.5" /> Nueva Factura
          </Link>
          <Link href="/admin/bodega" className="flex items-center px-4 py-2 bg-brand-yellow text-white rounded-full text-xs font-medium hover:bg-brand-yellow/90 transition-colors">
            <Plus className="w-3 h-3 mr-1.5" /> Escanear Paquete
          </Link>
        </div>
      </div>

      {/* Filtros de fecha */}
      <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1 w-fit">
        {(['hoy', 'semana', 'mes', 'todos'] as const).map(f => (
          <button
            key={f}
            onClick={() => setDateFilter(f)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              dateFilter === f ? 'bg-brand-blue text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {f === 'hoy' ? 'Hoy' : f === 'semana' ? 'Esta Semana' : f === 'mes' ? 'Este Mes' : 'Todos'}
          </button>
        ))}
      </div>

      {/* Tipo de Cambio del Día */}
      <div className="bg-gradient-to-r from-white via-white to-amber-50/40 rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-brand-yellow/15 text-brand-blue rounded-xl shrink-0">
            <Coins className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-800 text-sm">Tipo de Cambio Oficial del Día</h3>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-md border border-emerald-200 uppercase">
                Vigente: ₡{currentExchangeRate}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Aplica a todas las facturas emitidas hoy ({formatDisplayDate(getLocalTodayDate())})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus-within:border-brand-blue focus-within:bg-white transition-colors shadow-inner">
            <span className="text-xs font-black text-gray-400 mr-1.5">₡</span>
            <input
              type="number"
              min="1"
              step="1"
              value={exchangeRateInput}
              onChange={e => setExchangeRateInput(e.target.value)}
              className="w-20 bg-transparent font-black text-brand-blue text-sm focus:outline-none"
              placeholder="500"
            />
            <span className="text-xs font-bold text-gray-400 ml-1">CRC / $1 USD</span>
          </div>

          <button
            onClick={handleSaveExchangeRate}
            disabled={isSavingExchangeRate || !exchangeRateInput}
            className="px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-brand-blue/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Guardar y actualizar todas las facturas de hoy"
          >
            {isSavingExchangeRate ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Actualizar Tipo de Cambio</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-brand-blue rounded-xl shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Recibidos</p>
            <p className="text-2xl font-black text-gray-800">{paquetesRecibidos}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Entregados</p>
            <p className="text-2xl font-black text-gray-800">{paquetesEntregados}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-brand-yellow rounded-xl shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Venta Hoy</p>
            <p className="text-2xl font-black text-gray-800">${ventaDiaria.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-500 rounded-xl shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Fact. Pendientes</p>
            <p className="text-2xl font-black text-gray-800">{facturasPendientes}</p>
          </div>
        </div>
      </div>

      {/* Charts Row: Ventas por Día + Paquetes por Día */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-blue" />
            Ventas por Día
          </h3>
          <p className="text-xs text-gray-400 mb-4">Últimos 7 días</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ventasPorDia} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => `$${v}`} />
                <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ventas']} />
                <Bar dataKey="Total" fill="#12435E" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
            <Package className="w-4 h-4 text-brand-blue" />
            Paquetes por Día
          </h3>
          <p className="text-xs text-gray-400 mb-4">Recibidos vs Entregados - Últimos 7 días</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={paquetesPorDia} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="Recibidos" stroke="#12435E" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Entregados" stroke="#2ecc71" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Second Row: P&L + Cuentas por Cobrar + Caja */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* P&L */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Pérdidas y Ganancias</h3>
          <p className="text-xs text-gray-500 mb-1">Ingreso del período</p>
          <p className="text-3xl font-black text-gray-800 mb-4">${totalIncome.toFixed(2)}</p>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Ingresos</span>
                <span className="font-bold text-gray-800">${totalIncome.toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-100 h-3 rounded-full">
                <div className="bg-green-500 h-3 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Por cobrar</span>
                <span className="font-bold text-brand-yellow">${totalReceivables.toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-100 h-3 rounded-full">
                <div className="bg-brand-yellow h-3 rounded-full" style={{ width: totalIncome > 0 ? `${Math.min((totalReceivables / totalIncome) * 100, 100)}%` : '0%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Cuentas por Cobrar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Cuentas por Cobrar</h3>
          <p className="text-3xl font-black text-gray-800 mb-4">${totalReceivables.toFixed(2)}</p>
          <div className="flex items-center gap-4">
            <div className="w-28 h-28">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={28} outerRadius={50} paddingAngle={2} dataKey="value" stroke="none">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full rounded-full border-[12px] border-gray-100 flex items-center justify-center">
                  <span className="text-xs text-gray-400 font-bold">$0</span>
                </div>
              )}
            </div>
            <div className="space-y-1.5 text-xs">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                  <span className="text-gray-600">{d.name}: <strong>${d.value.toFixed(0)}</strong></span>
                </div>
              ))}
              {pieData.length === 0 && <p className="text-gray-400">Todo al día ✓</p>}
            </div>
          </div>
        </div>

        {/* Caja General */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Caja General</h3>
            <p className="text-xs text-gray-400 italic mb-4">Basado en pagos recibidos</p>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-blue/10 rounded-full flex items-center justify-center text-brand-blue">
                  <Building2 size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Caja General</p>
                  <p className="text-xs text-gray-500">JRS Cargo</p>
                </div>
              </div>
              <p className="font-black text-gray-800">${totalPaid.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link href="/admin/facturacion" className="text-xs font-bold text-brand-blue hover:underline">
              Ir a los registros →
            </Link>
          </div>
        </div>
      </div>

      {/* SECCIÓN: ANÁLISIS DE VENTAS POR PRODUCTO / SERVICIO */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-800 tracking-tight">Análisis de Ventas por Producto / Servicio</h2>
              <p className="text-xs text-gray-400">Rendimiento, volumen facturado y participación de mercado por servicio</p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 bg-gray-50 text-gray-600 rounded-full border border-gray-100 self-start sm:self-auto">
            Período: <strong className="text-brand-blue capitalize">{dateFilter === 'hoy' ? 'Hoy' : dateFilter === 'semana' ? 'Esta Semana' : dateFilter === 'mes' ? 'Este Mes' : 'Histórico Total'}</strong>
          </span>
        </div>

        {/* Mini KPIs de Productos */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Producto Estrella</p>
            <p className="text-sm font-black text-brand-blue truncate" title={productSalesData.topProduct?.name || 'N/A'}>
              {productSalesData.topProduct?.name || 'Sin ventas'}
            </p>
            <p className="text-xs font-bold text-green-600 mt-1">
              ${productSalesData.topProduct?.revenue.toFixed(2) || '0.00'} ({productSalesData.topProduct?.percentage.toFixed(0) || 0}%)
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Facturado</p>
            <p className="text-xl font-black text-gray-800">${productSalesData.totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">En el período seleccionado</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Líneas Facturadas</p>
            <p className="text-xl font-black text-gray-800">{productSalesData.totalUnits}</p>
            <p className="text-xs text-gray-400 mt-1">Ítems / Servicios procesados</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ticket Promedio</p>
            <p className="text-xl font-black text-gray-800">
              ${productSalesData.totalUnits > 0 ? (productSalesData.totalRevenue / productSalesData.totalUnits).toFixed(2) : '0.00'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Por línea de producto</p>
          </div>
        </div>

        {/* Gráfico y Tabla Comparativa */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* Gráfico de Barras */}
          <div className="lg:col-span-5 bg-gray-50/70 p-5 rounded-2xl border border-gray-100 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-brand-blue" />
                Ingresos por Servicio
              </h3>
              <p className="text-xs text-gray-400 mb-4">Top productos con mayor facturación ($ USD)</p>
            </div>
            
            <div className="h-64 w-full">
              {productSalesData.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productSalesData.chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `$${v}`} />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} width={110} />
                    <RechartsTooltip 
                      formatter={(val: number) => [`$${val.toFixed(2)} USD`, 'Facturado']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} 
                    />
                    <Bar dataKey="Ventas" radius={[0, 6, 6, 0]} maxBarSize={24}>
                      {productSalesData.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                  <ShoppingBag size={32} className="opacity-30 mb-2" />
                  No hay ventas registradas en este período.
                </div>
              )}
            </div>
          </div>

          {/* Tabla Desglose Detallado */}
          <div className="lg:col-span-7 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-3">Producto / Servicio</th>
                  <th className="pb-3 text-center">Cant.</th>
                  <th className="pb-3 text-right">Ingresos</th>
                  <th className="pb-3 text-right">Ticket Prom.</th>
                  <th className="pb-3 text-right pr-2">Participación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {productSalesData.list.slice(0, 7).map((prod, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 pr-2 font-bold text-gray-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-black flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate max-w-[200px]" title={prod.name}>
                        {prod.name}
                      </span>
                    </td>
                    <td className="py-3.5 text-center text-gray-600 font-semibold">
                      {prod.quantity}
                    </td>
                    <td className="py-3.5 text-right font-black text-brand-blue whitespace-nowrap">
                      ${prod.revenue.toFixed(2)}
                    </td>
                    <td className="py-3.5 text-right text-gray-600 whitespace-nowrap">
                      ${prod.averageTicket.toFixed(2)}
                    </td>
                    <td className="py-3.5 text-right pr-2 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-100 h-2 rounded-full overflow-hidden hidden sm:block">
                          <div 
                            className="bg-brand-blue h-full rounded-full" 
                            style={{ width: `${Math.min(prod.percentage, 100)}%` }}
                          />
                        </div>
                        <span className="font-bold text-gray-700 w-10 text-right">
                          {prod.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {productSalesData.list.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 font-medium">
                      No se encontraron líneas facturadas en este rango.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cash Flow Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-brand-blue" />
          Flujo de Efectivo
        </h3>
        <p className="text-xs text-gray-400 mb-6">Últimos 6 meses</p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#12435E" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#12435E" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(val) => `$${val}`} />
              <RechartsTooltip formatter={(value: number) => `$${value.toFixed(2)}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
              <Area type="monotone" dataKey="Total" stroke="#12435E" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
