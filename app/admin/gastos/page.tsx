'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Search, Receipt } from 'lucide-react';

type Expense = {
  id: string;
  provider_name: string;
  date: string;
  amount: number | string;
  category: string;
  receipt_url?: string;
};

export default function GastosPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const res = await fetch('/api/expenses');
      const data = await res.json();
      if (res.ok && data.success) {
        setExpenses(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este gasto?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadExpenses();
      } else {
        alert('Error al eliminar');
      }
    } catch {
      alert('Error de red');
    }
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.provider_name.toLowerCase().includes(searchTerm.toLowerCase()) || exp.category.toLowerCase().includes(searchTerm.toLowerCase());
    const expMonth = new Date(exp.date).getMonth().toString();
    const matchesMonth = selectedMonth === 'all' || expMonth === selectedMonth;
    return matchesSearch && matchesMonth;
  });

  const totalAmount = filteredExpenses.reduce((acc, exp) => acc + Number(exp.amount), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-blue">Gastos y Compras</h1>
          <p className="text-sm text-gray-500">Gestiona tus gastos operativos y analiza facturas con IA.</p>
        </div>
        <Link 
          href="/admin/gastos/nuevo"
          className="btn-primary"
        >
          <Plus size={20} /> Nuevo Gasto
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar proveedor o categoría..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue"
              />
            </div>
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue font-medium text-gray-700"
            >
              <option value="all">Todos los meses</option>
              <option value="0">Enero</option>
              <option value="1">Febrero</option>
              <option value="2">Marzo</option>
              <option value="3">Abril</option>
              <option value="4">Mayo</option>
              <option value="5">Junio</option>
              <option value="6">Julio</option>
              <option value="7">Agosto</option>
              <option value="8">Septiembre</option>
              <option value="9">Octubre</option>
              <option value="10">Noviembre</option>
              <option value="11">Diciembre</option>
            </select>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400 font-medium">Cargando gastos...</div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-12 text-center text-gray-400 font-medium bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <Receipt size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No se encontraron gastos en este periodo.</p>
              <p className="text-xs mt-1">Haz clic en &quot;Nuevo Gasto&quot; para registrar uno o subir una factura.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <th className="pb-3 font-medium">Fecha</th>
                    <th className="pb-3 font-medium">Proveedor</th>
                    <th className="pb-3 font-medium">Categoría</th>
                    <th className="pb-3 font-medium text-right">Monto</th>
                    <th className="pb-3 font-medium text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 text-sm text-gray-600">
                        {new Date(expense.date).toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="py-4 text-sm font-bold text-gray-800 uppercase">{expense.provider_name}</td>
                      <td className="py-4">
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
                          {expense.category}
                        </span>
                      </td>
                      <td className="py-4 text-sm font-bold text-brand-blue text-right">
                        ${Number(expense.amount).toFixed(2)}
                      </td>
                      <td className="py-4 text-center">
                        <button onClick={() => handleDelete(expense.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex" title="Eliminar Gasto">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="md:col-span-1">
          <div className="bg-brand-blue rounded-3xl p-6 shadow-sm text-white sticky top-6">
            <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-2">Total de Gastos</h3>
            <p className="text-4xl font-black">${totalAmount.toFixed(2)}</p>
            <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
              <p className="text-xs text-white/70">
                Este monto refleja el total gastado según los filtros aplicados en la tabla principal.
              </p>
              <div className="bg-white/10 p-3 rounded-xl">
                <p className="text-xs font-bold text-white mb-1">Tip de IA 🤖</p>
                <p className="text-xs text-white/80">Sube fotos de tus facturas o recibos físicos y deja que la IA extraiga el monto y proveedor automáticamente.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
