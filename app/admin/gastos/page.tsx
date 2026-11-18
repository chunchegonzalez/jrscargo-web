'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Search, Receipt, FileText, X, Download, Eye, Pencil, Save, Loader2, ExternalLink } from 'lucide-react';
import { formatCurrency, formatDisplayDate, getLocalTodayDate } from '@/lib/billing';
import {
  ExpenseAttachment,
  ExpenseMetadata,
  parseExpenseMetadata,
  serializeExpenseMetadata,
  isImageAttachment,
  isPdfAttachment,
  isTextLikeAttachment,
  getAttachmentBadge,
  formatFileSize,
  dataUrlToBlobUrl,
  decodeTextFromDataUrl,
} from '@/lib/expense-attachments';
import { useModal } from '@/app/components/ModalProvider';

type Expense = {
  id: string;
  provider_name: string;
  date: string;
  amount: number | string;
  currency?: string;
  category: string;
  document_number?: string;
  attachment_count?: number;
  has_receipt?: boolean;
  receipt_image?: string | null;
  receipt_url?: string | null;
};

interface SelectedReceiptModal {
  expenseId: string;
  loading: boolean;
  error?: string;
  attachments: ExpenseAttachment[];
  activeIndex: number;
  documentNumber?: string;
  provider: string;
  amount: string;
  date: string;
  category: string;
}

const CATEGORY_OPTIONS = [
  'Pago de Proveedor',
  'Combustible',
  'Mantenimiento',
  'Mantenimiento de Vehículos',
  'Papelería',
  'Papelería y Oficina',
  'Planillas',
  'Planillas / Salarios',
  'Viáticos',
  'Viáticos / Alimentación',
  'Servicios',
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
  const [activePdfBlobUrl, setActivePdfBlobUrl] = useState<string | null>(null);
  const receiptCacheRef = useRef<Record<string, ExpenseMetadata>>({});

  // Edit Expense State
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState({
    document_number: '',
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

  useEffect(() => {
    if (!selectedReceipt || selectedReceipt.loading) {
      setActivePdfBlobUrl(null);
      return;
    }
    const current = selectedReceipt.attachments[selectedReceipt.activeIndex];
    if (current && isPdfAttachment(current)) {
      const url = dataUrlToBlobUrl(current.dataUrl);
      setActivePdfBlobUrl(url);
      return () => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      };
    }
    setActivePdfBlobUrl(null);
  }, [selectedReceipt]);

  const loadExpenses = async () => {
    try {
      const res = await fetch('/api/expenses', { cache: 'no-store' });
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

  const fetchExpenseMetadataOnDemand = async (expense: Expense): Promise<ExpenseMetadata> => {
    const cached = receiptCacheRef.current[expense.id];
    if (cached) return cached;

    if (expense.receipt_image || expense.receipt_url) {
      const parsed = parseExpenseMetadata(expense.receipt_image || expense.receipt_url);
      receiptCacheRef.current[expense.id] = parsed;
      return parsed;
    }

    const res = await fetch(`/api/expenses/${expense.id}`, { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok || !json.success || !json.data) {
      throw new Error(json.error || 'No se pudo cargar el documento');
    }
    const parsed = parseExpenseMetadata(json.data.receipt_image || json.data.receipt_url);
    receiptCacheRef.current[expense.id] = parsed;
    return parsed;
  };

  const handleOpenReceipt = async (expense: Expense) => {
    const cached = receiptCacheRef.current[expense.id];
    const baseInfo = {
      expenseId: expense.id,
      documentNumber: expense.document_number || '',
      provider: expense.provider_name,
      amount: formatCurrency(Number(expense.amount), expense.currency),
      date: formatDisplayDate(expense.date),
      category: expense.category,
    };

    if (cached) {
      setSelectedReceipt({
        ...baseInfo,
        loading: false,
        attachments: cached.attachments,
        activeIndex: 0,
        documentNumber: cached.documentNumber || baseInfo.documentNumber,
      });
      return;
    }

    setSelectedReceipt({
      ...baseInfo,
      loading: true,
      attachments: [],
      activeIndex: 0,
    });

    try {
      const meta = await fetchExpenseMetadataOnDemand(expense);
      setSelectedReceipt(prev =>
        prev && prev.expenseId === expense.id
          ? {
              ...prev,
              loading: false,
              attachments: meta.attachments,
              documentNumber: meta.documentNumber || prev.documentNumber,
            }
          : prev
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error cargando documento';
      setSelectedReceipt(prev =>
        prev && prev.expenseId === expense.id
          ? { ...prev, loading: false, error: msg }
          : prev
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await showConfirm('Confirmación', '¿Estás seguro de que deseas eliminar este gasto?'))) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        delete receiptCacheRef.current[id];
        setExpenses(prev => prev.filter(e => e.id !== id));
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
      document_number: expense.document_number || '',
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
      const patchPayload: Record<string, unknown> = {
        provider_name: editForm.provider_name,
        date: editForm.date,
        amount: numAmount,
        currency: editForm.currency,
        category: editForm.category,
      };

      const prevDoc = (editingExpense.document_number || '').trim();
      const nextDoc = editForm.document_number.trim();
      if (prevDoc !== nextDoc) {
        const existingMeta = await fetchExpenseMetadataOnDemand(editingExpense);
        patchPayload.receipt_image = serializeExpenseMetadata(existingMeta.attachments, nextDoc);
        receiptCacheRef.current[editingExpense.id] = {
          documentNumber: nextDoc,
          attachments: existingMeta.attachments,
        };
      }

      const res = await fetch(`/api/expenses/${editingExpense.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload)
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
    const q = searchTerm.toLowerCase().trim();
    const docNum = (exp.document_number || '').toLowerCase();
    const matchesSearch =
      !q ||
      exp.provider_name.toLowerCase().includes(q) ||
      exp.category.toLowerCase().includes(q) ||
      docNum.includes(q);
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
        <div className="px-4 py-3 border-b border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
            <input 
              type="text" 
              placeholder="Buscar proveedor, N° documento o categoría..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200/90 rounded-lg shadow-2xs text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={`h-9 px-3 bg-white border rounded-lg text-xs font-medium shadow-2xs focus:outline-none focus:border-brand-blue transition-colors cursor-pointer ${
                selectedMonth !== 'all'
                  ? 'border-brand-blue/40 bg-brand-blue/[0.04] text-brand-blue font-semibold'
                  : 'border-slate-200/90 text-slate-700 hover:border-slate-300'
              }`}
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

            {(searchTerm || selectedMonth !== 'all') && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setSelectedMonth('all'); }}
                className="h-9 px-2.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200/60 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <X size={13} /> Limpiar
              </button>
            )}

            <span className="h-9 px-3 bg-white border border-slate-200/80 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs inline-flex items-center tabular-nums">
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
                  <th className="py-2.5 px-3.5">N° Documento</th>
                  <th className="py-2.5 px-3.5">Proveedor</th>
                  <th className="py-2.5 px-3.5">Categoría</th>
                  <th className="py-2.5 px-3.5">Archivo</th>
                  <th className="py-2.5 px-3.5 text-right">Monto</th>
                  <th className="py-2.5 px-3.5 pr-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {filteredExpenses.map((expense) => {
                  const documentNumber = expense.document_number || '';
                  const attachmentCount =
                    typeof expense.attachment_count === 'number'
                      ? expense.attachment_count
                      : expense.has_receipt || expense.receipt_image || expense.receipt_url
                      ? 1
                      : 0;
                  return (
                    <tr key={expense.id} className="hover:bg-slate-50/90 transition-colors group">
                      <td className="py-2.5 px-3.5 pl-5 text-xs text-slate-500 whitespace-nowrap tabular-nums">
                        {formatDisplayDate(expense.date)}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        {documentNumber ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold max-w-[165px] truncate"
                            title={documentNumber}
                          >
                            {documentNumber}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900 uppercase">{expense.provider_name}</td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-md">
                          {expense.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        {attachmentCount > 0 ? (
                          <button
                            onClick={() => handleOpenReceipt(expense)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-blue/[0.08] hover:bg-brand-blue text-brand-blue hover:text-white border border-brand-blue/15 rounded-md text-xs font-semibold transition-all cursor-pointer"
                            title={attachmentCount === 1 ? 'Ver archivo adjunto' : `Ver ${attachmentCount} archivos adjuntos`}
                          >
                            <Eye size={13} />
                            <span>
                              {attachmentCount === 1 ? 'Ver Documento' : `Ver ${attachmentCount} archivos`}
                            </span>
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    N° Documento / Factura
                  </label>
                  <input
                    type="text"
                    value={editForm.document_number}
                    onChange={e => setEditForm({ ...editForm, document_number: e.target.value })}
                    placeholder="Ej: 00100001010000012345"
                    className="w-full h-9 px-3.5 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm font-mono text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
                  />
                </div>

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

      {/* Modal Lightbox para Ver Documentos Adjuntos (carga bajo demanda al hacer clic) */}
      {selectedReceipt && (() => {
        const activeFile = selectedReceipt.attachments[selectedReceipt.activeIndex] || selectedReceipt.attachments[0] || null;
        return (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setSelectedReceipt(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200/80 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del Modal */}
              <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/80 gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 bg-brand-blue/10 text-brand-blue rounded-lg flex items-center justify-center shrink-0">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate">
                      {selectedReceipt.provider}
                      {selectedReceipt.documentNumber ? (
                        <span className="ml-2 font-mono text-[11px] font-semibold text-slate-500">
                          #{selectedReceipt.documentNumber}
                        </span>
                      ) : null}
                    </h3>
                    <p className="text-xs text-slate-500 truncate">
                      {selectedReceipt.date} • {selectedReceipt.category} • <strong className="text-brand-blue">{selectedReceipt.amount}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {activePdfBlobUrl && (
                    <a
                      href={activePdfBlobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-2.5 text-slate-600 hover:text-brand-blue bg-white border border-slate-200/90 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center gap-1.5 text-xs font-semibold"
                      title="Abrir en nueva pestaña"
                    >
                      <ExternalLink size={14} />
                      <span className="hidden sm:inline">Abrir</span>
                    </a>
                  )}
                  {activeFile && (
                    <a
                      href={activeFile.dataUrl}
                      download={activeFile.name || `comprobante-${selectedReceipt.provider.replace(/\s+/g, '_')}`}
                      className="h-8 px-2.5 text-slate-600 hover:text-brand-blue bg-white border border-slate-200/90 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center gap-1.5 text-xs font-semibold"
                      title="Descargar archivo"
                    >
                      <Download size={14} />
                      <span className="hidden sm:inline">Descargar</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedReceipt(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Selector de archivos cuando hay múltiples adjuntos */}
              {!selectedReceipt.loading && selectedReceipt.attachments.length > 1 && (
                <div className="px-4 py-2.5 border-b border-slate-200/80 bg-white flex items-center gap-2 overflow-x-auto">
                  {selectedReceipt.attachments.map((file, idx) => {
                    const badge = getAttachmentBadge(file);
                    const isActive = idx === selectedReceipt.activeIndex;
                    return (
                      <button
                        key={file.id || idx}
                        type="button"
                        onClick={() => setSelectedReceipt(prev => (prev ? { ...prev, activeIndex: idx } : prev))}
                        className={`h-8 px-2.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#0B2737] text-white border-[#0B2737]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span
                          className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                            isActive ? 'bg-white/20 text-white' : badge.colorClass
                          }`}
                        >
                          {badge.label}
                        </span>
                        <span className="max-w-[160px] truncate">{file.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Contenido según estado y tipo de archivo */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex items-center justify-center bg-slate-900/5 min-h-[260px]">
                {selectedReceipt.loading ? (
                  <div className="flex flex-col items-center gap-2.5 py-10 text-slate-500">
                    <Loader2 size={26} className="animate-spin text-brand-blue" />
                    <p className="text-xs font-semibold">Cargando documento...</p>
                  </div>
                ) : selectedReceipt.error ? (
                  <div className="text-center py-8 text-xs text-red-600 font-medium">
                    {selectedReceipt.error}
                  </div>
                ) : !activeFile ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    Este gasto no tiene archivos adjuntos.
                  </div>
                ) : isImageAttachment(activeFile) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeFile.dataUrl}
                    alt={`Comprobante ${activeFile.name}`}
                    className="max-h-[65vh] w-auto object-contain rounded-xl shadow-md border border-slate-200 bg-white"
                  />
                ) : isPdfAttachment(activeFile) && activePdfBlobUrl ? (
                  <iframe
                    src={activePdfBlobUrl}
                    title={activeFile.name}
                    className="w-full h-[65vh] rounded-xl border border-slate-200 bg-white shadow-sm"
                  />
                ) : isTextLikeAttachment(activeFile) ? (
                  <pre className="w-full max-h-[65vh] overflow-auto p-4 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-700 whitespace-pre-wrap break-words">
                    {decodeTextFromDataUrl(activeFile.dataUrl) || 'No se pudo previsualizar este archivo.'}
                  </pre>
                ) : (
                  <div className="text-center py-8 px-4 max-w-sm">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto mb-3 text-brand-blue">
                      <FileText size={26} />
                    </div>
                    <p className="text-sm font-bold text-slate-800 break-all">{activeFile.name}</p>
                    <p className="text-xs text-slate-500 mt-1 mb-4">
                      {activeFile.mimeType}
                      {activeFile.size ? ` · ${formatFileSize(activeFile.size)}` : ''}
                    </p>
                    <a
                      href={activeFile.dataUrl}
                      download={activeFile.name}
                      className="h-9 px-4 rounded-lg bg-brand-blue hover:bg-[#0e354b] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Download size={14} />
                      <span>Descargar archivo</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
