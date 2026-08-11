'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

type UserData = {
  username: string;
  role: string;
};

type InvoiceData = {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  total: number;
};

export default function AdminDashboard() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setCurrentUser(data.user);
        }
      })
      .catch(console.error);
      
    fetch('/api/invoices')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setInvoices(data.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // --- CÁLCULOS ESTADÍSTICOS ---
  
  // 1. Ingresos y Pérdidas (Este Mes)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const thisMonthInvoices = invoices.filter(inv => {
    const d = new Date(inv.issue_date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  
  const totalIncomeThisMonth = thisMonthInvoices.reduce((acc, inv) => acc + Number(inv.total), 0);
  
  // 2. Cuentas por Cobrar (Aging)
  const pendingInvoices = invoices.filter(inv => inv.status === 'Pendiente' || inv.status === 'Vencida');
  const totalReceivables = pendingInvoices.reduce((acc, inv) => acc + Number(inv.total), 0);
  
  const today = new Date();
  let age1_30 = 0, age31_60 = 0, age61_90 = 0, ageOver90 = 0;
  
  pendingInvoices.forEach(inv => {
    const issueDate = new Date(inv.issue_date);
    const diffTime = Math.abs(today.getTime() - issueDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 30) age1_30 += Number(inv.total);
    else if (diffDays <= 60) age31_60 += Number(inv.total);
    else if (diffDays <= 90) age61_90 += Number(inv.total);
    else ageOver90 += Number(inv.total);
  });

  const pieData = [
    { name: '1 - 30 días', value: age1_30, color: '#00594C' }, // Verde oscuro QB
    { name: '31 - 60 días', value: age31_60, color: '#10893E' }, // Verde medio
    { name: '61 - 90 días', value: age61_90, color: '#87D396' }, // Verde claro
    { name: '91 o más', value: ageOver90, color: '#E5E7EB' }, // Gris
  ].filter(d => d.value > 0);

  // 3. Flujo de Efectivo (Últimos 6 meses)
  const monthlyData: { name: string; Total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const monthName = d.toLocaleString('es-CR', { month: 'short' });
    
    const monthInvoices = invoices.filter(inv => {
      const invD = new Date(inv.issue_date);
      return invD.getMonth() === d.getMonth() && invD.getFullYear() === d.getFullYear();
    });
    
    const totalMonth = monthInvoices.reduce((acc, inv) => acc + Number(inv.total), 0);
    monthlyData.push({ name: monthName.toUpperCase(), Total: totalMonth });
  }

  // 4. Total en Cuentas (Simulado - Total histórico facturado vs pagado)
  const totalPaid = invoices.filter(inv => inv.status === 'Pagada').reduce((acc, inv) => acc + Number(inv.total), 0);

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-gray-400 font-bold">Cargando panel de control...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      
      {/* Saludo */}
      <div className="text-center md:text-left mb-8">
        <h1 className="text-3xl font-light text-gray-800">
          Buenas noches, <span className="font-bold text-brand-blue">{currentUser?.username || 'Usuario'} !</span>
        </h1>
      </div>

      {/* Acciones Rápidas */}
      <div className="flex flex-wrap items-center gap-4 mb-8 text-sm">
        <span className="font-bold text-gray-800">Crear acciones</span>
        <Link href="/admin/facturacion" className="px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-colors text-gray-700 font-medium">
          Crear factura a clientes
        </Link>
        <Link href="/admin/clientes" className="px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-colors text-gray-700 font-medium">
          Crear cliente
        </Link>
        <Link href="/admin/bodega" className="px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-colors text-brand-blue font-medium">
          Escanear paquete
        </Link>
      </div>

      <h2 className="text-lg font-bold text-gray-800 mb-4">Resumen del negocio</h2>

      {/* Grid 3 columnas (Tarjetas Superiores) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Tarjeta 1: PÉRDIDAS Y GANANCIAS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pérdidas y Ganancias</h3>
              <span className="text-xs text-gray-500">Este mes ▾</span>
            </div>
            <p className="text-sm text-gray-600 mb-1">Ingreso neto de {new Date().toLocaleString('es-CR', { month: 'long' })}</p>
            <div className="flex items-end gap-2 mb-2">
              <p className="text-3xl font-black text-gray-800">${totalIncomeThisMonth.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="mt-6 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-bold text-gray-800">${totalIncomeThisMonth.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500 mb-1">Ingreso</p>
              <div className="w-full bg-gray-100 h-4 rounded-r-md">
                <div className="bg-[#10893E] h-4 rounded-r-md" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-bold text-gray-800">$0.00</span>
              </div>
              <p className="text-xs text-gray-500 mb-1">Gastos</p>
              <div className="w-full h-4">
                <div className="bg-[#00594C] h-4 w-1 rounded-r-md"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tarjeta 2: CUENTAS POR COBRAR */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cuentas por Cobrar</h3>
            <span className="text-xs text-gray-500">Desde hoy</span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total</p>
          <p className="text-3xl font-black text-gray-800 mb-6">${totalReceivables.toFixed(2)}</p>
          
          <div className="flex items-center gap-6 mt-4">
            <div className="w-32 h-32 relative">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={30}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full rounded-full border-[16px] border-gray-100 flex items-center justify-center">
                  <span className="text-xs text-gray-400 font-bold">$0</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2 text-xs text-gray-600 font-medium">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                  <span>{d.name}: <strong className="text-gray-800">${d.value.toFixed(0)}</strong></span>
                </div>
              ))}
              {pieData.length === 0 && <p className="text-gray-400">Todo al día</p>}
            </div>
          </div>
        </div>

        {/* Tarjeta 3: CUENTAS BANCARIAS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cuentas Bancarias</h3>
            </div>
            <p className="text-xs text-gray-400 italic mb-6">Basado en facturas pagadas</p>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-blue/10 rounded-full flex items-center justify-center text-brand-blue">
                  <Building2 size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Caja General</p>
                  <p className="text-xs text-gray-500">En JRS Cargo</p>
                </div>
              </div>
              <p className="font-black text-gray-800">${totalPaid.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link href="/admin/facturacion" className="text-sm font-bold text-brand-blue hover:underline">
              Ir a los registros
            </Link>
          </div>
        </div>
      </div>

      {/* Gráfico de Flujo de Efectivo */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Flujo de Efectivo</h3>
        <p className="text-lg font-light text-gray-800 mb-8">Realiza el seguimiento del rendimiento de tu dinero</p>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10893E" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10893E" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(val) => `$${val}`} />
              <RechartsTooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              <Area type="monotone" dataKey="Total" stroke="#10893E" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
