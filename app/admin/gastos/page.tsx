'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Search, Receipt, FileText, X, Download, Eye, Pencil, Save, Loader2 } from 'lucide-react';
import { formatCurrency, formatDisplayDate, getLocalTodayDate, parseLocalDate } from '@/lib/billing';
import { useModal } from '@/app/components/ModalProvider';

type Expense = {
  id: string;
  provider_name: string;
  date: string;
  amount: number | string;
  currency?: string;
  category: string;
  receipt_image?: string | null;
  receipt_url?: string | null;
};

interface SelectedReceiptModal {
  image: string;
  provider: string;
  amount: string;
  date: string;
  category: string;
}

const CATEGORY_OPTIONS = [
  'Combustible',
  'Mantenimiento de Vehículos',
  'Papelería y Oficina',
  'Planillas / Salarios',
  'Viáticos / Alimentación',
  'Servicios',
  'Pago de Proveedor',
  'Local San Pablo',
  'Otros'
];

export default function GastosPage() {
  const { showAlert, showConfirm } = useModal();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
  const [selectedReceipt, setSelectedReceipt] = useState<SelectedReceiptModal | null>(null);

  // Edit Expense State
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState({
    provider_name: '',
    date: '',
    amount: '',
    currency: 'USD',
    category: 'Otros'
  });
  const [isUpdating, setIsUpdating] = useState(false);

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
    if (!(await showConfirm('Confirmación', '¿Estás seguro de que deseas eliminar este gasto?'))) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadExpenses();
      } else {
        await showAlert('Aviso', 'Error al eliminar');
      }
    } catch {
      await showAlert('Aviso', 'Error de red');
    }
  };

  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setEditForm({
      provider_name: expense.provider_name || '',
      date: expense.date ? expense.date.split('T')[0] : getLocalTodayDate(),
      amount: String(expense.amount || ''),
      currency: expense.currency || 'USD',
      category: expense.category || 'Otros'
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;

    const numAmount = parseFloat(editForm.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      await showAlert('Aviso', 'Por favor ingresa un monto válido.');
      return;
    }

    if (!editForm.provider_name.trim()) {
      await showAlert('Aviso', 'Por favor ingresa el nombre del proveedor.');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/expenses/${editingExpense.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_name: editForm.provider_name,
          date: editForm.date,
          amount: numAmount,
          currency: editForm.currency,
          category: editForm.category
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEditingExpense(null);
        await showAlert('Éxito', 'Gasto actualizado correctamente.');
        loadExpenses();
      } else {
        await showAlert('Aviso', data.error || 'Error al actualizar el gasto.');
      }
    } catch {
      await showAlert('Aviso', 'Error de conexión al intentar actualizar.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getExpenseMonth = (dateStr: string): string => {
    if (!dateStr) return '';
    const clean = String(dateStr).split('T')[0];
    const parts = clean.split('-');
    if (parts.length >= 2) {
      const monthNum = parseInt(parts[1], 10) - 1;
      if (!isNaN(monthNum)) return monthNum.toString();
    }
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) ? d.getMonth().toString() : '';
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.provider_name.toLowerCase().includes(searchTerm.toLowerCase()) || exp.category.toLowerCase().includes(searchTerm.toLowerCase());
    const expMonth = getExpenseMonth(exp.date);
    const matchesMonth = selectedMonth === 'all' || expMonth === selectedMonth;
    return matchesSearch && matchesMonth;
  });

  const totalAmountUSD = filteredExpenses.filter(e => e.currency !== 'CRC').reduce((acc, exp) => acc + Number(exp.amount), 0);
  const totalAmountCRC = filteredExpenses.filter(e => e.currency === 'CRC').reduce((acc, exp) => acc + Number(exp.amount), 0);

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
                    <th className="pb-3 font-medium">Documento</th>
                    <th className="pb-3 font-medium text-right">Monto</th>
                    <th className="pb-3 font-medium text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredExpenses.map((expense) => {
                    const docImg = expense.receipt_image || expense.receipt_url;
                    return (
                      <tr key={expense.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 text-sm text-gray-600">
                          {formatDisplayDate(expense.date)}
                        </td>
                        <td className="py-4 text-sm font-bold text-gray-800 uppercase">{expense.provider_name}</td>
                        <td className="py-4">
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
                            {expense.category}
                          </span>
                        </td>
                        <td className="py-4">
                          {docImg ? (
                            <button
                              onClick={() => setSelectedReceipt({
                                image: docImg,
                                provider: expense.provider_name,
                                amount: formatCurrency(Number(expense.amount), expense.currency),
                                date: formatDisplayDate(expense.date),
                                category: expense.category
                              })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-brand-blue text-brand-blue hover:text-white border border-blue-200/60 rounded-xl text-xs font-bold transition-all shadow-sm group cursor-pointer"
                              title="Ver factura escaneada"
                            >
                              <Eye size={14} className="group-hover:scale-110 transition-transform" />
                              <span>Ver Documento</span>
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">Sin adjunto</span>
                          )}
                        </td>
                        <td className="py-4 text-sm font-bold text-brand-blue text-right">
                          {formatCurrency(Number(expense.amount), expense.currency)}
                        </td>
                        <td className="py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              onClick={() => handleOpenEdit(expense)} 
                              className="p-2 text-brand-blue hover:text-white hover:bg-brand-blue rounded-lg transition-colors inline-flex cursor-pointer" 
                              title="Editar Gasto"
                            >
                              <Pencil size={17} />
                            </button>
                            <button 
                              onClick={() => handleDelete(expense.id)} 
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex cursor-pointer" 
                              title="Eliminar Gasto"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="md:col-span-1">
          <div className="bg-brand-blue rounded-3xl p-6 shadow-sm text-white sticky top-6">
            <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-2">Total de Gastos</h3>
            <p className="text-3xl font-black mb-1">{formatCurrency(totalAmountUSD, 'USD')}</p>
            <p className="text-xl font-bold text-orange-300">{formatCurrency(totalAmountCRC, 'CRC')}</p>
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

      {/* Modal para Editar Gasto */}
      {editingExpense && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setEditingExpense(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-blue/10 text-brand-blue rounded-xl">
                  <Pencil size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-brand-blue text-base">Editar Gasto u Operación</h3>
                  <p className="text-xs text-gray-500">Modifica los datos del comprobante registrado</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingExpense(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Proveedor / Beneficiario
                </label>
                <input
                  type="text"
                  required
                  value={editForm.provider_name}
                  onChange={e => setEditForm({ ...editForm, provider_name: e.target.value })}
                  placeholder="Ej: KARRY CARGO S.A."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Fecha del Gasto
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.date}
                    onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Categoría
                  </label>
                  <select
                    value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                  >
                    {CATEGORY_OPTIONS.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Monto
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editForm.amount}
                    onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-black text-gray-900 focus:bg-white focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Moneda
                  </label>
                  <select
                    value={editForm.currency}
                    onChange={e => setEditForm({ ...editForm, currency: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:bg-white focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CRC">CRC (₡)</option>
                  </select>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  disabled={isUpdating}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2.5 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold rounded-xl text-sm shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal Lightbox para Ver Documento Escaneado */}
      {selectedReceipt && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedReceipt(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-xl">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-brand-blue text-base">{selectedReceipt.provider}</h3>
                  <p className="text-xs text-gray-500">{selectedReceipt.date} • {selectedReceipt.category} • <strong className="text-brand-blue">{selectedReceipt.amount}</strong></p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={selectedReceipt.image} 
                  download={`factura-${selectedReceipt.provider.replace(/\s+/g, '_')}.jpg`}
                  className="p-2 text-gray-600 hover:text-brand-blue hover:bg-gray-200/60 rounded-xl transition-colors inline-flex items-center gap-1 text-xs font-bold"
                  title="Descargar imagen"
                >
                  <Download size={16} />
                  <span className="hidden sm:inline">Descargar</span>
                </a>
                <button 
                  onClick={() => setSelectedReceipt(null)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Contenido / Imagen */}
            <div className="p-4 sm:p-6 overflow-y-auto flex items-center justify-center bg-gray-900/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={selectedReceipt.image} 
                alt={`Comprobante ${selectedReceipt.provider}`} 
                className="max-h-[65vh] w-auto object-contain rounded-2xl shadow-md border border-gray-200"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
