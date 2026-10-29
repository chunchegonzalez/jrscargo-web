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
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gastos y Compras</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/15">
              Operativo
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Gestiona tus gastos operativos y analiza facturas con IA.</p>
        </div>
        <Link 
          href="/admin/gastos/nuevo"
          className="h-9 px-3.5 rounded-lg border border-brand-blue/20 bg-brand-blue hover:bg-[#0e354b] text-white shadow-2xs inline-flex items-center gap-1.5 font-semibold text-xs transition-all active:scale-[0.98]"
        >
          <Plus size={15} /> Nuevo Gasto
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Gastos (USD)</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 tabular-nums">
                {formatCurrency(totalAmountUSD, 'USD')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Gastos en dólares del período</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
            <Receipt size={19} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Gastos (CRC)</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-amber-600 tabular-nums">
                {formatCurrency(totalAmountCRC, 'CRC')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Gastos en colones del período</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 font-bold text-sm">
            ₡
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Comprobantes</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-brand-blue tabular-nums">
                {filteredExpenses.length}
              </span>
              {filteredExpenses.length !== expenses.length && (
                <span className="text-xs font-medium text-slate-400 tabular-nums">de {expenses.length}</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Soportan extracción con IA 🤖</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <FileText size={19} />
          </div>
        </div>
      </div>

      {/* Contenedor Principal: Barra de filtros + Tabla */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
            <input 
              type="text" 
              placeholder="Buscar proveedor o categoría..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:border-brand-blue transition-colors"
            >
              <option value="all">Mes: Todos los meses</option>
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

            <span className="h-9 px-3 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center tabular-nums">
              {filteredExpenses.length} {filteredExpenses.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 px-6 text-center text-slate-400 text-sm">Cargando gastos...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-12 px-6 text-center text-slate-400">
            <div className="flex flex-col items-center gap-2">
              <Receipt size={28} className="text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No se encontraron gastos en este periodo.</p>
              <p className="text-xs text-slate-400">Haz clic en &quot;Nuevo Gasto&quot; para registrar uno o subir una factura.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/95 border-b border-slate-200/90">
                <tr className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                  <th className="py-2.5 px-3.5 pl-5">Fecha</th>
                  <th className="py-2.5 px-3.5">Proveedor</th>
                  <th className="py-2.5 px-3.5">Categoría</th>
                  <th className="py-2.5 px-3.5">Documento</th>
                  <th className="py-2.5 px-3.5 text-right">Monto</th>
                  <th className="py-2.5 px-3.5 pr-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {filteredExpenses.map((expense) => {
                  const docImg = expense.receipt_image || expense.receipt_url;
                  return (
                    <tr key={expense.id} className="hover:bg-slate-50/90 transition-colors group">
                      <td className="py-2.5 px-3.5 pl-5 text-xs text-slate-500 whitespace-nowrap tabular-nums">
                        {formatDisplayDate(expense.date)}
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900 uppercase">{expense.provider_name}</td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-md">
                          {expense.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        {docImg ? (
                          <button
                            onClick={() => setSelectedReceipt({
                              image: docImg,
                              provider: expense.provider_name,
                              amount: formatCurrency(Number(expense.amount), expense.currency),
                              date: formatDisplayDate(expense.date),
                              category: expense.category
                            })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-blue/[0.08] hover:bg-brand-blue text-brand-blue hover:text-white border border-brand-blue/15 rounded-md text-xs font-semibold transition-all cursor-pointer"
                            title="Ver factura escaneada"
                          >
                            <Eye size={13} />
                            <span>Ver Documento</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Sin adjunto</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-900 text-right tabular-nums whitespace-nowrap">
                        {formatCurrency(Number(expense.amount), expense.currency)}
                      </td>
                      <td className="py-2.5 px-3.5 pr-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-0.5">
                          <button 
                            onClick={() => handleOpenEdit(expense)} 
                            className="p-1.5 text-slate-500 hover:text-brand-blue hover:bg-brand-blue/10 rounded-md transition-colors inline-flex cursor-pointer" 
                            title="Editar Gasto"
                          >
                            <Pencil size={15} />
                          </button>
                          <button 
                            onClick={() => handleDelete(expense.id)} 
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors inline-flex cursor-pointer" 
                            title="Eliminar Gasto"
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
        )}

        {/* Footer Tabla */}
        <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>
            Mostrando <strong className="font-semibold text-slate-700">{filteredExpenses.length}</strong> de{' '}
            <strong className="font-semibold text-slate-700">{expenses.length}</strong> gastos registrados
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Tip de IA: sube fotos de facturas físicas en &ldquo;Nuevo Gasto&rdquo; para extracción automática
          </span>
        </div>
      </div>

      {/* Modal para Editar Gasto */}
      {editingExpense && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setEditingExpense(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col border border-slate-200/80"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-brand-blue/10 text-brand-blue rounded-lg flex items-center justify-center">
                  <Pencil size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Editar Gasto u Operación</h3>
                  <p className="text-xs text-slate-500">Modifica los datos del comprobante registrado</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingExpense(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Proveedor / Beneficiario
                </label>
                <input
                  type="text"
                  required
                  value={editForm.provider_name}
                  onChange={e => setEditForm({ ...editForm, provider_name: e.target.value })}
                  placeholder="Ej: KARRY CARGO S.A."
                  className="w-full h-9 px-3.5 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Fecha del Gasto
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.date}
                    onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Categoría
                  </label>
                  <select
                    value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                  >
                    {CATEGORY_OPTIONS.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3.5">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
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
                    className="w-full h-9 px-3.5 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm font-bold text-slate-900 tabular-nums focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Moneda
                  </label>
                  <select
                    value={editForm.currency}
                    onChange={e => setEditForm({ ...editForm, currency: e.target.value })}
                    className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CRC">CRC (₡)</option>
                  </select>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  disabled={isUpdating}
                  className="h-9 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="h-9 px-4 bg-brand-blue hover:bg-[#0e354b] text-white font-semibold rounded-lg text-xs shadow-2xs inline-flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
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
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedReceipt(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200/80 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-brand-blue/10 text-brand-blue rounded-lg flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{selectedReceipt.provider}</h3>
                  <p className="text-xs text-slate-500">{selectedReceipt.date} • {selectedReceipt.category} • <strong className="text-brand-blue">{selectedReceipt.amount}</strong></p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <a 
                  href={selectedReceipt.image} 
                  download={`factura-${selectedReceipt.provider.replace(/\s+/g, '_')}.jpg`}
                  className="h-8 px-2.5 text-slate-600 hover:text-brand-blue bg-white border border-slate-200/90 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center gap-1.5 text-xs font-semibold"
                  title="Descargar imagen"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Descargar</span>
                </a>
                <button 
                  onClick={() => setSelectedReceipt(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Contenido / Imagen */}
            <div className="p-4 sm:p-6 overflow-y-auto flex items-center justify-center bg-slate-900/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={selectedReceipt.image} 
                alt={`Comprobante ${selectedReceipt.provider}`} 
                className="max-h-[65vh] w-auto object-contain rounded-xl shadow-md border border-slate-200"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
