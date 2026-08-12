'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, LineChart, Line
} from 'recharts';
import { Package, TrendingUp, DollarSign, CheckCircle, AlertCircle, Plus, Building2 } from 'lucide-react';
import Link from 'next/link';

interface UserData {
  username: string;
  role: string;
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  total: number;
  invoice_payments?: { amount_applied: number | string }[];
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

const COLORS = ['#12435E', '#F5A623', '#2ecc71', '#E5E7EB'];

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'hoy' | 'semana' | 'mes' | 'todos'>('mes');
  
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [userRes, invRes, pkgRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/invoices'),
          fetch('/api/inventory')
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
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

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
    const d = new Date(ds);
    return d >= filterStart && d <= filterEnd;
  };

  // --- KPIs ---
  const paquetesRecibidos = inventory.filter(p => inRange(p.received_date || p.created_at)).length;
  const paquetesEntregados = inventory.filter(p => p.status === 'Entregado' && inRange(p.updated_at || p.created_at)).length;

  const todayS = startOfDay(new Date());
  const todayE = endOfDay(new Date());
  const ventaDiaria = invoices
    .filter(inv => {
      const d = new Date(inv.issue_date);
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
      const issueDate = new Date(inv.issue_date);
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
      .filter(inv => inv.status !== 'Anulada' && isSameDay(new Date(inv.issue_date), day.date))
      .reduce((s, inv) => s + Number(inv.total), 0)
  }));

  const paquetesPorDia = last7.map(day => ({
    name: day.label,
    Recibidos: inventory.filter(p => isSameDay(new Date(p.received_date || p.created_at), day.date)).length,
    Entregados: inventory.filter(p => p.status === 'Entregado' && isSameDay(new Date(p.updated_at || p.created_at), day.date)).length,
  }));

  // --- Cash flow (6 months) ---
  const monthlyData: { name: string; Total: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mName = d.toLocaleString('es-CR', { month: 'short' }).toUpperCase();
    const mInv = invoices.filter(inv => {
      const id = new Date(inv.issue_date);
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
    return (
      <div className="space-y-8 animate-fade-in">
        <h1 className="text-2xl font-light text-gray-600">
          {greeting}, <strong className="font-black text-brand-blue">{currentUser?.username || 'Usuario'}</strong>
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-bold text-gray-800">Crear acciones</span>
          <Link href="/admin/bodega" className="px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-colors text-brand-blue font-medium">
            Escanear paquete
          </Link>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center space-y-4">
          <Building2 size={48} className="mx-auto text-brand-blue/20" />
          <h2 className="text-xl font-black text-brand-blue">Bienvenido al Área Operativa</h2>
          <p className="text-gray-500 max-w-md mx-auto">Selecciona &quot;Operaciones&quot; en el menú lateral o utiliza los accesos directos para comenzar a trabajar.</p>
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
