'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, CheckCircle2, DollarSign, Mail, MailCheck, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, Filter, X, ShieldCheck, Download, Printer, FileSpreadsheet, Trash2, Hourglass } from 'lucide-react';
import { getInvoiceStats, formatCurrency, formatDisplayDate, parseClientAddress } from '@/lib/billing';
import { generateIncomeReportXlsx } from '@/lib/excel-export';
import { useModal } from '@/app/components/ModalProvider';

type Invoice = {
  id: string;
  invoice_number: string;
  issue_date: string;
  created_at?: string;
  total: number | string;
  status: string;
  client_id: string;
  currency?: string;
  email_sent_at?: string | null;
  clients?: { id?: string; name: string; email: string; address?: string; secondary_email?: string };
  invoice_payments?: { amount_applied: number | string }[];
};

type SortField = 'date' | 'number' | 'client' | 'amount' | 'status' | 'email';

function isPendingClientEmail(email?: string | null): boolean {
  if (!email) return true;
  const clean = String(email).trim().toLowerCase();
  if (!clean || !clean.includes('@')) return true;
  if (
    clean === 'pendiente@pendiente' ||
    clean.startsWith('pendiente@') ||
    clean.endsWith('@pendiente')
  ) {
    return true;
  }
  return false;
}

function getDaysSinceCreation(issueDateStr?: string, createdAtStr?: string): number {
  const rawDate = (issueDateStr || createdAtStr || '').split('T')[0];
  const parts = rawDate.split('-').map(Number);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return 0;
  const [y, m, d] = parts;
  const createdUtc = Date.UTC(y, m - 1, d);

  const nowCR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }));
  const todayUtc = Date.UTC(nowCR.getFullYear(), nowCR.getMonth(), nowCR.getDate());

  return Math.floor((todayUtc - createdUtc) / (1000 * 60 * 60 * 24));
}

export default function FacturacionDashboard() {
  const { showAlert } = useModal();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [filterStatus, setFilterStatus] = useState<string>('Todas');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [dateRangePreset, setDateRangePreset] = useState<string>('todos');
  const [filterEmail, setFilterEmail] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Secondary Filter States ("Más filtros")
  const [showMoreFilters, setShowMoreFilters] = useState<boolean>(false);
  const [filterClient, setFilterClient] = useState<string>('');
  const [filterInvoiceNumber, setFilterInvoiceNumber] = useState<string>('');
  const [filterMinAmount, setFilterMinAmount] = useState<string>('');
  const [filterMaxAmount, setFilterMaxAmount] = useState<string>('');

  // Income Statement Extraction Modal State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [modalStartDate, setModalStartDate] = useState<string>('');
  const [modalEndDate, setModalEndDate] = useState<string>('');
  const [modalStatusFilter, setModalStatusFilter] = useState<string>('Todas');
  const [modalPreset, setModalPreset] = useState<string>('este-mes');
  
  // Sorting State
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Email Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailInvoice, setEmailInvoice] = useState<Invoice | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Automatic 4-day email sending state
  const [autoSendingIds, setAutoSendingIds] = useState<Record<string, boolean>>({});
  const autoSentProcessedRef = useRef<Set<string>>(new Set());
  const isRunningAutoSendRef = useRef<boolean>(false);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/invoices');
      const data = await res.json();
      if (data.success) {
        setInvoices(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Automatic send for unsent invoices with >= 4 days since creation (excluding pendiente@pendiente)
  useEffect(() => {
    if (loading || invoices.length === 0 || isRunningAutoSendRef.current) return;
    if (typeof window !== 'undefined' && localStorage.getItem('jrs_auto_email_4days_enabled') === 'false') return;

    const pendingAutoSend = invoices.filter(inv => {
      if (inv.email_sent_at) return false;
      if (inv.status === 'Anulada' || inv.status === 'Pagada') return false;
      if (getInvoiceStats(inv).displayStatus === 'Pagada') return false;
      if (isPendingClientEmail(inv.clients?.email)) return false;
      if (autoSentProcessedRef.current.has(inv.id)) return false;
      const daysElapsed = getDaysSinceCreation(inv.issue_date, inv.created_at);
      return daysElapsed >= 4;
    });

    if (pendingAutoSend.length === 0) return;

    let cancelled = false;
    isRunningAutoSendRef.current = true;

    pendingAutoSend.forEach(inv => autoSentProcessedRef.current.add(inv.id));

    (async () => {
      for (const inv of pendingAutoSend) {
        if (cancelled) break;
        setAutoSendingIds(prev => ({ ...prev, [inv.id]: true }));
        try {
          const extra = parseClientAddress(inv.clients?.address);
          const cc = inv.clients?.secondary_email || extra.secondary_email || '';
          const res = await fetch('/api/invoices/' + inv.id + '/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: 'Comprobante de Compra #' + inv.invoice_number + ' - JRS CARGO',
              message: 'Adjunto a este correo encontrarás los detalles de tu comprobante de compra reciente. Por favor, revisa la información a continuación.',
              cc
            })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            const sentAt = data.email_sent_at || new Date().toISOString();
            setInvoices(prev =>
              prev.map(item => (item.id === inv.id ? { ...item, email_sent_at: sentAt } : item))
            );
          }
        } catch (err) {
          console.error('Error en envío automático de factura #' + inv.invoice_number, err);
        } finally {
          setAutoSendingIds(prev => {
            const next = { ...prev };
            delete next[inv.id];
            return next;
          });
        }
      }
      isRunningAutoSendRef.current = false;
    })();

    return () => {
      cancelled = true;
      isRunningAutoSendRef.current = false;
    };
  }, [invoices, loading]);

  const openEmailModal = (inv: Invoice) => {
    if (isPendingClientEmail(inv.clients?.email)) {
      showAlert('Correo Pendiente', 'Este cliente tiene el correo "pendiente@pendiente". Por favor actualiza el correo del cliente antes de enviar el comprobante.', 'error');
      return;
    }
    setEmailInvoice(inv);
    const extra = parseClientAddress(inv.clients?.address);
    setEmailCc(inv.clients?.secondary_email || extra.secondary_email || '');
    setEmailSubject('Comprobante de Compra #' + inv.invoice_number + ' - JRS CARGO');
    setEmailMessage('Adjunto a este correo encontrarás los detalles de tu comprobante de compra reciente. Por favor, revisa la información a continuación.');
    setEmailModalOpen(true);
  };

  const confirmSendEmail = async () => {
    if (!emailInvoice) return;
    setIsSendingEmail(true);
    try {
      const res = await fetch('/api/invoices/' + emailInvoice.id + '/send', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject, message: emailMessage, cc: emailCc })
      });
      const data = await res.json();
      if (data.success) {
        setInvoices(prev => prev.map(inv => 
          inv.id === emailInvoice.id ? { ...inv, email_sent_at: data.email_sent_at || new Date().toISOString() } : inv
        ));
        showAlert('Éxito', '¡Correo enviado con éxito!', 'success');
        setEmailModalOpen(false);
      } else {
        showAlert('Error', 'Error al enviar correo: ' + data.error, 'error');
      }
    } catch {
      showAlert('Error', 'Error de red al enviar el correo.', 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Date helpers (Costa Rica Timezone)
  const getCRDate = useCallback(() => {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }));
  }, []);

  const formatYMD = useCallback((d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const getDateRangeForPreset = useCallback((preset: string): { start: string; end: string } => {
    const now = getCRDate();
    if (preset === 'hoy') {
      const str = formatYMD(now);
      return { start: str, end: str };
    }
    if (preset === 'ayer') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const str = formatYMD(y);
      return { start: str, end: str };
    }
    if (preset === '7dias') {
      const s = new Date(now);
      s.setDate(now.getDate() - 6);
      return { start: formatYMD(s), end: formatYMD(now) };
    }
    if (preset === 'este-mes') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: formatYMD(s), end: formatYMD(e) };
    }
    if (preset === 'mes-anterior') {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: formatYMD(s), end: formatYMD(e) };
    }
    if (preset === 'ano') {
      const s = new Date(now.getFullYear(), 0, 1);
      const e = new Date(now.getFullYear(), 11, 31);
      return { start: formatYMD(s), end: formatYMD(e) };
    }
    return { start: '', end: '' };
  }, [getCRDate, formatYMD]);

  const applyDatePreset = useCallback((preset: string) => {
    setDateRangePreset(preset);
    const range = getDateRangeForPreset(preset);
    setFilterStartDate(range.start);
    setFilterEndDate(range.end);
  }, [getDateRangeForPreset]);

  const applyModalPreset = useCallback((preset: string) => {
    setModalPreset(preset);
    const range = getDateRangeForPreset(preset);
    setModalStartDate(range.start);
    setModalEndDate(range.end);
  }, [getDateRangeForPreset]);

  const openExportModal = useCallback(() => {
    if (filterStartDate || filterEndDate) {
      setModalStartDate(filterStartDate);
      setModalEndDate(filterEndDate);
      setModalPreset('personalizado');
    } else {
      const range = getDateRangeForPreset('este-mes');
      setModalStartDate(range.start);
      setModalEndDate(range.end);
      setModalPreset('este-mes');
    }
    setModalStatusFilter(filterStatus !== 'Todas' ? filterStatus : 'Todas');
    setExportModalOpen(true);
  }, [filterStartDate, filterEndDate, filterStatus, getDateRangeForPreset]);

  // Export Excel function for Income Statement (.xlsx nativo de Microsoft Excel)
  const handleExportIncomeExcel = useCallback((items: Invoice[], startStr: string, endStr: string) => {
    generateIncomeReportXlsx(items, startStr, endStr);
  }, []);

  // Printable Income Statement Report (clean window)
  const handlePrintIncomeReport = useCallback((items: Invoice[], startStr: string, endStr: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let totalFact = 0;
    let totalPag = 0;
    let totalPend = 0;
    
    items.forEach(inv => {
      const stats = getInvoiceStats(inv);
      if (stats.currency !== 'CRC') {
        totalFact += Number(inv.total) || 0;
        totalPag += stats.paid;
        totalPend += stats.pending;
      }
    });

    const recoveryRate = totalFact > 0 ? ((totalPag / totalFact) * 100).toFixed(1) : '0.0';
    const periodStr = (startStr && endStr) 
      ? (startStr === endStr ? startStr : `Del ${startStr} al ${endStr}`)
      : startStr 
      ? `Desde el ${startStr}` 
      : endStr 
      ? `Hasta el ${endStr}` 
      : 'Histórico Completo';

    const rowsHtml = items.map((inv, idx) => {
      const stats = getInvoiceStats(inv);
      const invDate = inv.issue_date ? inv.issue_date.split('T')[0] : '';
      return `
        <tr>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${idx + 1}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; white-space: nowrap;">${invDate}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; font-size: 11px;">${inv.invoice_number}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600;">${inv.clients?.name || 'Cliente'}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-weight: bold; white-space: nowrap;">$${Number(inv.total || 0).toFixed(2)}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: #047857; font-weight: bold; white-space: nowrap;">$${Number(stats.paid || 0).toFixed(2)}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: #b45309; font-weight: bold; white-space: nowrap;">$${Number(stats.pending || 0).toFixed(2)}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; background: ${stats.displayStatus === 'Pagada' ? '#ecfdf5; color: #065f46;' : stats.displayStatus === 'Anulada' ? '#f1f5f9; color: #64748b;' : '#fffbeb; color: #92400e;'}">
              ${stats.displayStatus}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Estado de Ingresos - JRS Cargo S.A.</title>
          <style>
            @media print {
              body { margin: 12mm; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
              .no-print { display: none !important; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 24px auto; max-width: 960px; line-height: 1.4; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background: #f8fafc; font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; padding: 8px; border-bottom: 2px solid #cbd5e1; }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0B2737; padding-bottom: 12px; margin-bottom: 16px;">
            <div>
              <h1 style="font-size: 22px; font-weight: 900; margin: 0; color: #0B2737; letter-spacing: -0.5px;">JRS CARGO S.A.</h1>
              <p style="font-size: 12px; font-weight: 700; color: #14445D; margin: 2px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">Reporte Oficial de Estado de Ingresos</p>
              <p style="font-size: 11px; color: #64748b; margin: 3px 0 0;">Período consultado: <strong>${periodStr}</strong></p>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748b;">
              <p style="margin: 0;">Fecha emisión: <strong>${new Date().toLocaleDateString('es-CR')}</strong></p>
              <p style="margin: 2px 0 0;">Total facturas: <strong>${items.length}</strong></p>
              <p style="margin: 2px 0 0;">Recaudación: <strong>${recoveryRate}%</strong></p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b;">Total Facturado</div>
              <div style="font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 4px;">$${totalFact.toFixed(2)} USD</div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Volumen total del período</div>
            </div>
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px;">
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #065f46;">Ingresos Cobrados</div>
              <div style="font-size: 20px; font-weight: 900; color: #047857; margin-top: 4px;">$${totalPag.toFixed(2)} USD</div>
              <div style="font-size: 11px; color: #059669; margin-top: 2px;">${recoveryRate}% efectivamente recaudado</div>
            </div>
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px;">
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #92400e;">Pendiente de Cobro</div>
              <div style="font-size: 20px; font-weight: 900; color: #b45309; margin-top: 4px;">$${totalPend.toFixed(2)} USD</div>
              <div style="font-size: 11px; color: #d97706; margin-top: 2px;">Cuentas por cobrar del período</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: left;">#</th>
                <th style="text-align: left;">Fecha</th>
                <th style="text-align: left;">N.° Factura</th>
                <th style="text-align: left;">Cliente</th>
                <th style="text-align: right;">Facturado</th>
                <th style="text-align: right;">Cobrado</th>
                <th style="text-align: right;">Pendiente</th>
                <th style="text-align: center;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div style="margin-top: 28px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8;">
            <span>Reporte oficial generado por Sistema JRS Cargo CR</span>
            <span>Auditoría de Finanzas y Cobros</span>
          </div>

          <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 9px 22px; background: #0B2737; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px;">
              Imprimir o Guardar como PDF
            </button>
          </div>
          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, []);

  // Unique client names for secondary filter autocomplete
  const uniqueClientNames = useMemo(() => {
    const names = new Set<string>();
    invoices.forEach(inv => {
      if (inv.clients?.name) names.add(inv.clients.name.trim());
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [invoices]);

  // Base filtered invoices (all filters except status, used to compute accurate counts per status tab)
  const baseFilteredInvoices = useMemo(() => {
    const minVal = filterMinAmount.trim() !== '' ? Number(filterMinAmount) : null;
    const maxVal = filterMaxAmount.trim() !== '' ? Number(filterMaxAmount) : null;
    const clientQuery = filterClient.toLowerCase().trim();
    const invNumQuery = filterInvoiceNumber.toLowerCase().trim();
    const searchLower = searchTerm.toLowerCase().trim();

    return invoices.filter(inv => {
      const invDate = inv.issue_date ? inv.issue_date.split('T')[0] : '';
      const matchStartDate = !filterStartDate || invDate >= filterStartDate;
      const matchEndDate = !filterEndDate || invDate <= filterEndDate;
      if (!matchStartDate || !matchEndDate) return false;

      const matchEmail =
        filterEmail === 'Todos' ||
        (filterEmail === 'Enviado' && !!inv.email_sent_at) ||
        (filterEmail === 'No enviado' && !inv.email_sent_at);
      if (!matchEmail) return false;

      if (searchLower) {
        const matchSearch =
          (inv.clients?.name || '').toLowerCase().includes(searchLower) ||
          (inv.clients?.email || '').toLowerCase().includes(searchLower) ||
          (inv.invoice_number || '').toLowerCase().includes(searchLower);
        if (!matchSearch) return false;
      }

      if (clientQuery) {
        const matchClient =
          (inv.clients?.name || '').toLowerCase().includes(clientQuery) ||
          (inv.clients?.email || '').toLowerCase().includes(clientQuery);
        if (!matchClient) return false;
      }

      if (invNumQuery) {
        if (!(inv.invoice_number || '').toLowerCase().includes(invNumQuery)) return false;
      }

      const amount = Number(inv.total) || 0;
      if (minVal !== null && !Number.isNaN(minVal) && amount < minVal) return false;
      if (maxVal !== null && !Number.isNaN(maxVal) && amount > maxVal) return false;

      return true;
    });
  }, [
    invoices,
    filterStartDate,
    filterEndDate,
    filterEmail,
    searchTerm,
    filterClient,
    filterInvoiceNumber,
    filterMinAmount,
    filterMaxAmount
  ]);

  // Real-time counts for quick status tabs (Todas, Pendientes, Pagadas, Vencidas)
  const statusCounts = useMemo(() => {
    let pendientes = 0;
    let pagadas = 0;
    let vencidas = 0;
    baseFilteredInvoices.forEach(inv => {
      const st = getInvoiceStats(inv).displayStatus;
      if (st === 'Pendiente') pendientes++;
      else if (st === 'Pagada') pagadas++;
      else if (st === 'Vencida') vencidas++;
    });
    return {
      todas: baseFilteredInvoices.length,
      pendientes,
      pagadas,
      vencidas
    };
  }, [baseFilteredInvoices]);

  // Filtered invoices (Dynamic calculation including status filter)
  const filteredInvoices = useMemo(() => {
    if (filterStatus === 'Todas') return baseFilteredInvoices;
    return baseFilteredInvoices.filter(inv => getInvoiceStats(inv).displayStatus === filterStatus);
  }, [baseFilteredInvoices, filterStatus]);

  // Modal filtered invoices
  const modalFilteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const stats = getInvoiceStats(inv);
      const effectiveStatus = stats.displayStatus;
      const matchStatus = modalStatusFilter === 'Todas' || effectiveStatus === modalStatusFilter;
      const invDate = inv.issue_date ? inv.issue_date.split('T')[0] : '';
      const matchStartDate = !modalStartDate || invDate >= modalStartDate;
      const matchEndDate = !modalEndDate || invDate <= modalEndDate;
      return matchStatus && matchStartDate && matchEndDate;
    });
  }, [invoices, modalStartDate, modalEndDate, modalStatusFilter]);

  // Modal calculated stats
  const modalStats = useMemo(() => {
    let facturado = 0;
    let pagado = 0;
    let pendiente = 0;
    modalFilteredInvoices.forEach(inv => {
      const stats = getInvoiceStats(inv);
      if (stats.currency !== 'CRC') {
        facturado += Number(inv.total) || 0;
        pagado += stats.paid;
        pendiente += stats.pending;
      }
    });
    const tasa = facturado > 0 ? (pagado / facturado) * 100 : 0;
    return { facturado, pagado, pendiente, tasa };
  }, [modalFilteredInvoices]);

  // Sorted invoices based on active column header sort
  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        const da = new Date(a.issue_date).getTime() || 0;
        const db = new Date(b.issue_date).getTime() || 0;
        comparison = da - db;
      } else if (sortField === 'number') {
        comparison = a.invoice_number.localeCompare(b.invoice_number, undefined, { numeric: true });
      } else if (sortField === 'client') {
        const na = (a.clients?.name || '').toLowerCase();
        const nb = (b.clients?.name || '').toLowerCase();
        comparison = na.localeCompare(nb);
      } else if (sortField === 'amount') {
        const ta = Number(a.total) || 0;
        const tb = Number(b.total) || 0;
        comparison = ta - tb;
      } else if (sortField === 'status') {
        const sa = getInvoiceStats(a).displayStatus;
        const sb = getInvoiceStats(b).displayStatus;
        comparison = sa.localeCompare(sb);
      } else if (sortField === 'email') {
        const ea = a.email_sent_at ? 1 : 0;
        const eb = b.email_sent_at ? 1 : 0;
        comparison = ea - eb;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredInvoices, sortField, sortOrder]);

  // Dynamically calculated stats that react to ANY active filter
  const { totalPendingUSD, totalPaidUSD, totalFacturadoUSD } = useMemo(() => {
    let pendingUSD = 0, paidUSD = 0, facturadoUSD = 0;
    filteredInvoices.forEach(inv => {
      const stats = getInvoiceStats(inv);
      if (stats.currency !== 'CRC') {
        pendingUSD += stats.pending;
        paidUSD += stats.paid;
        facturadoUSD += Number(inv.total) || 0;
      }
    });
    return { totalPendingUSD: pendingUSD, totalPaidUSD: paidUSD, totalFacturadoUSD: facturadoUSD };
  }, [filteredInvoices]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'date' || field === 'amount' ? 'desc' : 'asc');
    }
  };

  const secondaryFilterCount = [
    filterClient.trim() !== '',
    filterInvoiceNumber.trim() !== '',
    filterMinAmount.trim() !== '',
    filterMaxAmount.trim() !== '',
    dateRangePreset !== 'todos' && dateRangePreset !== 'personalizado'
  ].filter(Boolean).length;

  const hasActiveFilters =
    filterStatus !== 'Todas' ||
    filterStartDate !== '' ||
    filterEndDate !== '' ||
    filterEmail !== 'Todos' ||
    searchTerm.trim() !== '' ||
    filterClient.trim() !== '' ||
    filterInvoiceNumber.trim() !== '' ||
    filterMinAmount.trim() !== '' ||
    filterMaxAmount.trim() !== '';

  const clearAllFilters = () => {
    setFilterStatus('Todas');
    setFilterStartDate('');
    setFilterEndDate('');
    setDateRangePreset('todos');
    setFilterEmail('Todos');
    setSearchTerm('');
    setFilterClient('');
    setFilterInvoiceNumber('');
    setFilterMinAmount('');
    setFilterMaxAmount('');
  };

  const formatEmailDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica', day: '2-digit', month: '2-digit', year: 'numeric' }) + 
      ' ' + d.toLocaleTimeString('es-CR', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit' });
  };

  const activePeriodLabel = useMemo(() => {
    if (filterStartDate && filterEndDate) {
      return filterStartDate === filterEndDate ? formatDisplayDate(filterStartDate) : `${formatDisplayDate(filterStartDate)} – ${formatDisplayDate(filterEndDate)}`;
    }
    if (filterStartDate) return `Desde ${formatDisplayDate(filterStartDate)}`;
    if (filterEndDate) return `Hasta ${formatDisplayDate(filterEndDate)}`;
    return null;
  }, [filterStartDate, filterEndDate]);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Facturación y Cobros</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/15">
              Finanzas
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Gestiona las cuentas por cobrar, envía facturas y audita estados de ingresos.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={openExportModal}
            className="h-9 px-3.5 rounded-lg border border-emerald-600/30 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs inline-flex items-center gap-1.5 font-semibold text-xs transition-all active:scale-[0.98] cursor-pointer"
            title="Extraer estado de ingresos por rango de fechas (Excel / PDF)"
          >
            <Download size={14} />
            <span>Extraer Ingresos</span>
          </button>
          <button
            type="button"
            onClick={() => loadInvoices()}
            disabled={loading}
            className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-2xs inline-flex items-center gap-1.5 font-medium text-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            title="Actualizar facturas"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-brand-blue' : 'text-slate-500'} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          <Link
            href="/admin/facturacion/nueva"
            className="h-9 px-3.5 rounded-lg border border-brand-blue/20 bg-brand-blue hover:bg-[#0e354b] text-white shadow-2xs inline-flex items-center justify-center gap-1.5 font-semibold text-xs transition-all active:scale-[0.98]"
          >
            <Plus size={15} /> Crear Factura
          </Link>
        </div>
      </div>

      {/* Tarjetas de Resumen Dinámicas (se recalculan con cualquier filtro) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setFilterStatus('Todas')}
          className={`text-left bg-white rounded-xl p-4 sm:p-5 border transition-all cursor-pointer flex items-center gap-4 group ${
            filterStatus === 'Todas'
              ? 'border-brand-blue/40 ring-2 ring-brand-blue/10 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.03)]'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-slate-100/90 text-brand-blue flex items-center justify-center shrink-0 group-hover:bg-brand-blue/10 transition-colors">
            <DollarSign size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">Total Facturado</p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 tabular-nums mt-0.5 truncate">
              {formatCurrency(totalFacturadoUSD, 'USD')}
            </h2>
            <p className="text-xs text-slate-500 mt-1 truncate">
              <span className="font-semibold text-slate-600 tabular-nums">{filteredInvoices.length} fact.</span> •{' '}
              {activePeriodLabel ? activePeriodLabel : 'Volumen en vista actual'}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'Pendiente' ? 'Todas' : 'Pendiente')}
          className={`text-left bg-white rounded-xl p-4 sm:p-5 border transition-all cursor-pointer flex items-center gap-4 group ${
            filterStatus === 'Pendiente'
              ? 'border-amber-500/50 ring-2 ring-amber-500/15 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.03)]'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
            <Hourglass size={21} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">Total Pendiente</p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-amber-600 tabular-nums mt-0.5 truncate">
              {formatCurrency(totalPendingUSD, 'USD')}
            </h2>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {activePeriodLabel ? `Pendiente: ${activePeriodLabel}` : 'Saldo por cobrar'}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'Pagada' ? 'Todas' : 'Pagada')}
          className={`text-left bg-white rounded-xl p-4 sm:p-5 border transition-all cursor-pointer flex items-center gap-4 group ${
            filterStatus === 'Pagada'
              ? 'border-emerald-600/50 ring-2 ring-emerald-500/15 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300 shadow-[0_1px_3px_rgba(15,23,42,0.03)]'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <CheckCircle2 size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">Total Pagado</p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-700 tabular-nums mt-0.5 truncate">
              {formatCurrency(totalPaidUSD, 'USD')}
            </h2>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {activePeriodLabel ? `Ingresos: ${activePeriodLabel}` : 'Cobros conciliados'}
            </p>
          </div>
        </button>
      </div>

      {/* Sección de Filtros Organizada */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 sm:p-5 space-y-4">
        {/* Fila 1: Buscador principal + Pestañas rápidas de estado */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0 lg:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            <input
              type="text"
              placeholder="Buscar cliente, factura o correo"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar cliente, factura o correo"
              className="w-full h-10 pl-10 pr-8 bg-white rounded-lg border border-slate-200/90 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Opciones rápidas: Todas, Pendientes, Pagadas y Vencidas */}
          <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterStatus('Todas')}
              className={`h-8 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                filterStatus === 'Todas'
                  ? 'bg-[#0B2737] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>Todas</span>
              <span className={filterStatus === 'Todas' ? 'text-slate-200 font-bold tabular-nums' : 'text-slate-500 tabular-nums'}>
                ({statusCounts.todas})
              </span>
            </button>

            <div className="h-4 w-px bg-slate-200/90 mx-0.5 shrink-0" />

            <button
              type="button"
              onClick={() => setFilterStatus('Pendiente')}
              className={`h-8 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                filterStatus === 'Pendiente'
                  ? 'bg-[#0B2737] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span>Pendientes</span>
              <span className={filterStatus === 'Pendiente' ? 'text-slate-200 font-bold tabular-nums' : 'text-slate-500 tabular-nums'}>
                ({statusCounts.pendientes})
              </span>
            </button>

            <div className="h-4 w-px bg-slate-200/90 mx-0.5 shrink-0" />

            <button
              type="button"
              onClick={() => setFilterStatus('Pagada')}
              className={`h-8 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                filterStatus === 'Pagada'
                  ? 'bg-[#0B2737] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Pagadas</span>
              <span className={filterStatus === 'Pagada' ? 'text-slate-200 font-bold tabular-nums' : 'text-slate-500 tabular-nums'}>
                ({statusCounts.pagadas})
              </span>
            </button>

            <div className="h-4 w-px bg-slate-200/90 mx-0.5 shrink-0" />

            <button
              type="button"
              onClick={() => setFilterStatus('Vencida')}
              className={`h-8 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                filterStatus === 'Vencida'
                  ? 'bg-[#0B2737] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <span>Vencidas</span>
              <span className={filterStatus === 'Vencida' ? 'text-slate-200 font-bold tabular-nums' : 'text-slate-500 tabular-nums'}>
                ({statusCounts.vencidas})
              </span>
            </button>
          </div>
        </div>

        {/* Fila 2: Estado, Estado del correo, Fecha desde, Fecha hasta y botón "Más filtros" */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end pt-1">
          <div className="lg:col-span-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Filtrar por estado de factura"
              className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 cursor-pointer transition-colors"
            >
              <option value="Todas">Todos</option>
              <option value="Pendiente">Pendientes</option>
              <option value="Pagada">Pagadas</option>
              <option value="Vencida">Vencidas</option>
              <option value="Anulada">Anuladas</option>
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Correo</label>
            <select
              value={filterEmail}
              onChange={(e) => setFilterEmail(e.target.value)}
              aria-label="Filtrar por estado del correo"
              className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 cursor-pointer transition-colors"
            >
              <option value="Todos">Todos</option>
              <option value="Enviado">Enviado</option>
              <option value="No enviado">No enviado</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha desde</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => {
                setFilterStartDate(e.target.value);
                setDateRangePreset('personalizado');
              }}
              aria-label="Fecha desde"
              className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 cursor-pointer"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha hasta</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => {
                setFilterEndDate(e.target.value);
                setDateRangePreset('personalizado');
              }}
              aria-label="Fecha hasta"
              className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 cursor-pointer"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMoreFilters(prev => !prev)}
              aria-expanded={showMoreFilters}
              className={`w-full h-9 px-3 rounded-lg border text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all cursor-pointer ${
                showMoreFilters || secondaryFilterCount > 0
                  ? 'bg-brand-blue/[0.06] border-brand-blue/30 text-brand-blue'
                  : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700'
              }`}
            >
              <Filter size={14} />
              <span>Más filtros</span>
              {secondaryFilterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-brand-blue text-white text-[10px] font-bold tabular-nums">
                  {secondaryFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Panel desplegable de "Más filtros" (Cliente, N.º de factura, Importe mín/máx, Período rápido y Excel) */}
        {showMoreFilters && (
          <div className="pt-3 border-t border-slate-200/70 bg-slate-50/60 -mx-4 sm:-mx-5 px-4 sm:px-5 pb-1 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Cliente específico
                </label>
                <input
                  type="text"
                  list="facturacion-clients-list"
                  placeholder="Nombre o correo del cliente..."
                  value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-blue"
                />
                <datalist id="facturacion-clients-list">
                  {uniqueClientNames.map(name => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  N.º de factura
                </label>
                <input
                  type="text"
                  placeholder="Ej. F-0377"
                  value={filterInvoiceNumber}
                  onChange={(e) => setFilterInvoiceNumber(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-blue font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Importe mínimo (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={filterMinAmount}
                  onChange={(e) => setFilterMinAmount(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-blue tabular-nums"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Importe máximo (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Sin límite"
                  value={filterMaxAmount}
                  onChange={(e) => setFilterMaxAmount(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-blue tabular-nums"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Período rápido
                  </label>
                  <select
                    value={dateRangePreset}
                    onChange={(e) => applyDatePreset(e.target.value)}
                    className="w-full h-9 px-2.5 bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-blue cursor-pointer"
                  >
                    <option value="todos">Todo el historial</option>
                    <option value="hoy">Hoy</option>
                    <option value="ayer">Ayer</option>
                    <option value="7dias">Últimos 7 días</option>
                    <option value="este-mes">Este Mes</option>
                    <option value="mes-anterior">Mes Anterior</option>
                    <option value="ano">Año Actual</option>
                    <option value="personalizado">Rango personalizado</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleExportIncomeExcel(filteredInvoices, filterStartDate, filterEndDate)}
                  className="h-9 px-3 mt-5 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
                  title="Descargar vista filtrada en Microsoft Excel (.xlsx)"
                >
                  <FileSpreadsheet size={14} className="text-emerald-600" />
                  <span>Excel</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fila 3: Etiquetas de filtros aplicados + "Limpiar filtros" + "Total de resultados" */}
        <div className="pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700">Filtros activos:</span>

            {!hasActiveFilters && (
              <span className="text-slate-400">Ninguno (mostrando todas las facturas)</span>
            )}

            {filterStatus !== 'Todas' && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold border ${
                  filterStatus === 'Pendiente'
                    ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                    : filterStatus === 'Pagada'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                    : filterStatus === 'Vencida'
                    ? 'bg-red-50 text-red-800 border-red-200/80'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>
                  Estado: {filterStatus === 'Pendiente' ? 'Pendientes' : filterStatus === 'Pagada' ? 'Pagadas' : filterStatus === 'Vencida' ? 'Vencidas' : filterStatus}
                </span>
                <button
                  type="button"
                  onClick={() => setFilterStatus('Todas')}
                  aria-label="Quitar filtro de estado"
                  className="hover:opacity-75 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {filterEmail !== 'Todos' && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold border ${
                  filterEmail === 'Enviado'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>Correo: {filterEmail}</span>
                <button
                  type="button"
                  onClick={() => setFilterEmail('Todos')}
                  aria-label="Quitar filtro de correo"
                  className="hover:opacity-75 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {filterStartDate && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-700 border border-slate-200/80 tabular-nums">
                <span>
                  Desde: <strong className="font-semibold text-slate-900">{formatDisplayDate(filterStartDate)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFilterStartDate('');
                    setDateRangePreset('personalizado');
                  }}
                  aria-label="Quitar fecha desde"
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {filterEndDate && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-700 border border-slate-200/80 tabular-nums">
                <span>
                  Hasta: <strong className="font-semibold text-slate-900">{formatDisplayDate(filterEndDate)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFilterEndDate('');
                    setDateRangePreset('personalizado');
                  }}
                  aria-label="Quitar fecha hasta"
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {searchTerm.trim() !== '' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                <span>
                  Búsqueda: <strong className="font-semibold text-slate-900">&ldquo;{searchTerm.trim()}&rdquo;</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  aria-label="Quitar búsqueda"
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {filterClient.trim() !== '' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                <span>
                  Cliente: <strong className="font-semibold text-slate-900">{filterClient.trim()}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setFilterClient('')}
                  aria-label="Quitar filtro de cliente"
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {filterInvoiceNumber.trim() !== '' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-700 border border-slate-200/80 font-mono">
                <span>
                  Factura: <strong className="font-semibold text-slate-900">{filterInvoiceNumber.trim()}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setFilterInvoiceNumber('')}
                  aria-label="Quitar filtro de factura"
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {filterMinAmount.trim() !== '' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-700 border border-slate-200/80 tabular-nums">
                <span>
                  Mín: <strong className="font-semibold text-slate-900">${filterMinAmount.trim()}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setFilterMinAmount('')}
                  aria-label="Quitar importe mínimo"
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {filterMaxAmount.trim() !== '' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-700 border border-slate-200/80 tabular-nums">
                <span>
                  Máx: <strong className="font-semibold text-slate-900">${filterMaxAmount.trim()}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setFilterMaxAmount('')}
                  aria-label="Quitar importe máximo"
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue hover:text-[#0B2737] hover:underline ml-1 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Limpiar filtros</span>
              </button>
            )}
          </div>

          <div className="text-xs text-slate-600 shrink-0 tabular-nums">
            Total de resultados: <strong className="font-bold text-slate-900 text-sm">{filteredInvoices.length}</strong>
          </div>
        </div>
      </div>

      {/* Tabla de Facturas */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
        {/* Vista Móvil: Tarjetas individuales táctiles (sin scroll horizontal) */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Cargando facturas...</div>
          ) : sortedInvoices.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No se encontraron facturas con esos filtros.</div>
          ) : (
            sortedInvoices.map((inv) => {
              const stats = getInvoiceStats(inv);
              const displayStatus = stats.displayStatus;

              return (
                <div key={inv.id} className="p-4 space-y-3 bg-white hover:bg-slate-50/90 transition-colors">
                  {/* Fila 1: N.° Factura, Fecha, Estado */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={'/admin/facturacion/' + inv.id}
                        className="font-bold text-slate-900 text-sm hover:text-brand-blue transition-colors"
                      >
                        {inv.invoice_number}
                      </Link>
                      <span className="text-xs text-slate-500 tabular-nums">
                        {formatDisplayDate(inv.issue_date)}
                      </span>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      displayStatus === 'Pagada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' :
                      displayStatus === 'Vencida' ? 'bg-red-50 text-red-700 border-red-200/80' :
                      displayStatus === 'Anulada' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                      'bg-amber-50 text-amber-700 border-amber-200/80'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        displayStatus === 'Pagada' ? 'bg-emerald-500' :
                        displayStatus === 'Vencida' ? 'bg-red-500' :
                        displayStatus === 'Anulada' ? 'bg-slate-400' :
                        'bg-amber-500'
                      }`} />
                      {displayStatus}
                    </span>
                  </div>

                  {/* Fila 2: Cliente e Importe */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 text-sm truncate">
                        {inv.clients?.name || 'Cliente sin nombre'}
                      </p>
                      {inv.clients?.email && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {inv.clients.email}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <p className="text-sm font-black text-slate-900">
                        {formatCurrency(Number(inv.total), stats.currency)}
                      </p>
                      {stats.paid > 0 && stats.pending > 0 && (
                        <p className="text-[11px] text-amber-700 font-semibold">
                          Pend: {formatCurrency(stats.pending, stats.currency)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Fila 3: Estado de Correo y Acciones */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div>
                      {inv.email_sent_at ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                            <MailCheck size={12} />
                            Enviado
                          </span>
                          <button
                            type="button"
                            onClick={() => openEmailModal(inv)}
                            className="inline-flex items-center gap-1 text-xs text-brand-blue hover:underline font-semibold ml-1 cursor-pointer"
                          >
                            <RefreshCw size={11} />
                            Reenviar
                          </button>
                        </div>
                      ) : autoSendingIds[inv.id] ? (
                        <div className="flex items-center gap-1.5 text-brand-blue">
                          <RefreshCw size={13} className="animate-spin" />
                          <span className="text-[11px] font-semibold">Enviando auto...</span>
                        </div>
                      ) : isPendingClientEmail(inv.clients?.email) ? (
                        <div className="flex items-center gap-1.5 text-slate-400" title="Correo pendiente@pendiente - no se envía en automático">
                          <Mail size={13} />
                          <span className="text-[11px]">Correo pendiente</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Mail size={13} />
                          <span className="text-[11px]">No enviado</span>
                          <button
                            type="button"
                            onClick={() => openEmailModal(inv)}
                            className="text-xs text-brand-blue hover:underline font-semibold ml-1 cursor-pointer"
                          >
                            Enviar
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={'/admin/facturacion/' + inv.id}
                        className="h-8 px-3 inline-flex items-center text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        Ver detalle
                      </Link>
                      {displayStatus !== 'Pagada' && displayStatus !== 'Anulada' && (inv.clients?.id || inv.client_id) && (
                        <Link
                          href={'/admin/cuentas-por-cobrar/recibir/' + (inv.clients?.id || inv.client_id) + '?invoice_id=' + inv.id}
                          className="h-8 px-3 inline-flex items-center text-xs font-semibold text-white bg-[#0B2737] hover:bg-brand-blue rounded-lg shadow-2xs transition-colors"
                        >
                          Cobrar
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Vista Escritorio: Tabla completa con ordenamiento y legibilidad mejorada */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/90 border-b border-slate-200/90">
              <tr className="text-xs text-slate-600 font-bold select-none">
                <th
                  className="py-3.5 px-4 pl-6 cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                  onClick={() => handleSort('date')}
                  title="Ordenar por fecha"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Fecha</span>
                    {sortField === 'date' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} className="text-brand-blue" /> : <ArrowDown size={13} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={13} className="text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                  onClick={() => handleSort('number')}
                  title="Ordenar por número de factura"
                >
                  <div className="flex items-center gap-1.5">
                    <span>N.º factura</span>
                    {sortField === 'number' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} className="text-brand-blue" /> : <ArrowDown size={13} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={13} className="text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleSort('client')}
                  title="Ordenar por nombre de cliente"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Cliente</span>
                    {sortField === 'client' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} className="text-brand-blue" /> : <ArrowDown size={13} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={13} className="text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                  onClick={() => handleSort('amount')}
                  title="Ordenar por importe"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Importe</span>
                    {sortField === 'amount' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} className="text-brand-blue" /> : <ArrowDown size={13} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={13} className="text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                  onClick={() => handleSort('status')}
                  title="Ordenar por estado"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Estado</span>
                    {sortField === 'status' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} className="text-brand-blue" /> : <ArrowDown size={13} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={13} className="text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                  onClick={() => handleSort('email')}
                  title="Ordenar por estado de envío de correo"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Correo</span>
                    {sortField === 'email' ? (
                      sortOrder === 'asc' ? <ArrowUp size={13} className="text-brand-blue" /> : <ArrowDown size={13} className="text-brand-blue" />
                    ) : (
                      <ArrowUpDown size={13} className="text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-4 pr-6 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 px-6 text-center text-slate-400">Cargando facturas...</td>
                </tr>
              ) : sortedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-6 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <FileText size={26} className="text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">No se encontraron facturas con esos filtros.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedInvoices.map(inv => {
                  const stats = getInvoiceStats(inv);
                  const displayStatus = stats.displayStatus;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3.5 px-4 pl-6 text-slate-600 whitespace-nowrap tabular-nums text-[13px]">
                        {formatDisplayDate(inv.issue_date)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Link
                          href={'/admin/facturacion/' + inv.id}
                          className="inline-flex items-center gap-1 font-bold text-slate-900 group-hover:text-brand-blue transition-colors text-[13px]"
                        >
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-[13px] leading-snug">{inv.clients?.name}</div>
                        <span className="block text-xs text-slate-500 font-normal mt-0.5">{inv.clients?.email}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-right tabular-nums whitespace-nowrap text-[13px]">
                        {formatCurrency(Number(inv.total), stats.currency)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            displayStatus === 'Pagada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' :
                            displayStatus === 'Vencida' ? 'bg-red-50 text-red-700 border-red-200/80' :
                            displayStatus === 'Anulada' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                            'bg-amber-50 text-amber-800 border-amber-200/80'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              displayStatus === 'Pagada' ? 'bg-emerald-500' :
                              displayStatus === 'Vencida' ? 'bg-red-500' :
                              displayStatus === 'Anulada' ? 'bg-slate-400' :
                              'bg-amber-500'
                            }`} />
                            {displayStatus}
                          </span>
                          {stats.paid > 0 && stats.pending > 0 && (
                            <span className="text-[11px] text-slate-500">
                              Parcial · <span className="font-semibold text-amber-700 tabular-nums">{formatCurrency(stats.pending, stats.currency)}</span> pend.
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Email status column */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {inv.email_sent_at ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                              <MailCheck size={12} />
                              <span className="text-[11px] font-semibold">Enviado</span>
                            </div>
                            <span className="text-[11px] text-slate-400 tabular-nums mt-0.5">{formatEmailDate(inv.email_sent_at)}</span>
                            <button
                              type="button"
                              onClick={() => openEmailModal(inv)}
                              className="inline-flex items-center gap-1 text-xs text-brand-blue hover:underline font-semibold cursor-pointer mt-0.5"
                            >
                              <RefreshCw size={11} />
                              Reenviar
                            </button>
                          </div>
                        ) : autoSendingIds[inv.id] ? (
                          <div className="flex flex-col items-center gap-1 text-brand-blue">
                            <RefreshCw size={14} className="animate-spin" />
                            <span className="text-[11px] font-semibold">Enviando auto...</span>
                          </div>
                        ) : isPendingClientEmail(inv.clients?.email) ? (
                          <div className="flex flex-col items-center gap-0.5 text-slate-400" title="Cliente con correo pendiente@pendiente — no se envía automáticamente">
                            <div className="flex items-center gap-1">
                              <Mail size={13} />
                              <span className="text-xs font-medium">No enviado</span>
                            </div>
                            <span className="text-[11px] text-slate-400 italic">Correo pendiente</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Mail size={13} />
                              <span className="text-xs font-medium">No enviado</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => openEmailModal(inv)}
                              className="inline-flex items-center gap-1 text-xs text-brand-blue hover:underline font-semibold cursor-pointer mt-0.5"
                            >
                              Enviar
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 pr-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Link
                            href={'/admin/facturacion/' + inv.id}
                            className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center transition-colors shadow-2xs"
                          >
                            Ver detalle
                          </Link>
                          {displayStatus !== 'Pagada' && displayStatus !== 'Anulada' && (inv.clients?.id || inv.client_id) && (
                            <Link
                              href={'/admin/cuentas-por-cobrar/recibir/' + (inv.clients?.id || inv.client_id) + '?invoice_id=' + inv.id}
                              className="h-8 px-3.5 rounded-lg text-xs font-semibold text-white bg-[#0B2737] hover:bg-brand-blue inline-flex items-center transition-colors shadow-2xs"
                            >
                              Cobrar
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Tabla */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>
            Mostrando <strong className="font-semibold text-slate-700">{filteredInvoices.length}</strong> de{' '}
            <strong className="font-semibold text-slate-700">{invoices.length}</strong> facturas registradas
          </span>
          <button
            type="button"
            onClick={() => handleExportIncomeExcel(filteredInvoices, filterStartDate, filterEndDate)}
            className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Exportar resultados (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Modal: Extraer Estado de Ingresos desde Fecha X hasta Fecha Z */}
      {exportModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in"
          onClick={() => setExportModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="px-5 py-4 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">Extraer Estado de Ingresos</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/70 px-2 py-0.5 rounded-full">
                      Finanzas
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Consolidado oficial de facturación, ingresos recaudados y cuentas por cobrar por rango de fechas.
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setExportModalOpen(false)} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Presets Rápidos */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Período rápido
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'hoy', label: 'Hoy' },
                    { id: 'ayer', label: 'Ayer' },
                    { id: '7dias', label: 'Últimos 7 días' },
                    { id: 'este-mes', label: 'Este Mes' },
                    { id: 'mes-anterior', label: 'Mes Anterior' },
                    { id: 'ano', label: 'Año Actual' },
                    { id: 'todos', label: 'Histórico Completo' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyModalPreset(p.id)}
                      className={`h-7 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        modalPreset === p.id
                          ? 'bg-[#0B2737] text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selectores de Fecha: Desde Fecha X hasta Fecha Z */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Fecha Desde (X)
                  </label>
                  <div className="relative">
                    <input 
                      type="date"
                      value={modalStartDate}
                      onChange={e => {
                        setModalStartDate(e.target.value);
                        setModalPreset('personalizado');
                      }}
                      className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-blue cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Fecha Hasta (Z)
                  </label>
                  <div className="relative">
                    <input 
                      type="date"
                      value={modalEndDate}
                      onChange={e => {
                        setModalEndDate(e.target.value);
                        setModalPreset('personalizado');
                      }}
                      className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-blue cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Filtro de Estado
                  </label>
                  <select
                    value={modalStatusFilter}
                    onChange={e => setModalStatusFilter(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-blue cursor-pointer"
                  >
                    <option value="Todas">Todas las facturas</option>
                    <option value="Pagada">Solo Pagadas (Ingresos)</option>
                    <option value="Pendiente">Solo Pendientes (Cobros)</option>
                  </select>
                </div>
              </div>

              {/* Métricas consolidadas del reporte */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Facturado</span>
                  <span className="text-xl font-black text-slate-900 tabular-nums block mt-1">
                    ${modalStats.facturado.toFixed(2)} <span className="text-xs font-semibold text-slate-400">USD</span>
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    {modalFilteredInvoices.length} {modalFilteredInvoices.length === 1 ? 'factura emitida' : 'facturas emitidas'}
                  </span>
                </div>

                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/70 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Ingresos Cobrados</span>
                  <span className="text-xl font-black text-emerald-700 tabular-nums block mt-1">
                    ${modalStats.pagado.toFixed(2)} <span className="text-xs font-semibold text-emerald-600">USD</span>
                  </span>
                  <span className="text-[11px] text-emerald-700/80 mt-0.5 block font-medium">
                    {modalStats.tasa.toFixed(1)}% de cobro efectivo
                  </span>
                </div>

                <div className="p-3.5 bg-amber-50/60 border border-amber-200/70 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Pendiente por Cobrar</span>
                  <span className="text-xl font-black text-amber-600 tabular-nums block mt-1">
                    ${modalStats.pendiente.toFixed(2)} <span className="text-xs font-semibold text-amber-500">USD</span>
                  </span>
                  <span className="text-[11px] text-amber-700/80 mt-0.5 block font-medium">
                    Cuentas activas del período
                  </span>
                </div>
              </div>

              {/* Vista previa de facturas a extraer */}
              <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                <div className="px-3.5 py-2 bg-slate-100/70 border-b border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    Vista previa de comprobantes ({modalFilteredInvoices.length})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {modalStartDate && modalEndDate 
                      ? (modalStartDate === modalEndDate ? formatDisplayDate(modalStartDate) : `${formatDisplayDate(modalStartDate)} al ${formatDisplayDate(modalEndDate)}`)
                      : 'Período completo'}
                  </span>
                </div>

                {modalFilteredInvoices.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No hay facturas registradas en el rango de fechas seleccionado.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {modalFilteredInvoices.slice(0, 10).map((inv, idx) => {
                      const stats = getInvoiceStats(inv);
                      const invDate = inv.issue_date ? inv.issue_date.split('T')[0] : '';
                      return (
                        <div key={inv.id || idx} className="px-3.5 py-2 flex items-center justify-between hover:bg-slate-50">
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{inv.invoice_number}</span>
                            <span className="text-slate-400 text-[11px]">{formatDisplayDate(invDate)}</span>
                            <span className="text-slate-600 truncate max-w-[160px] sm:max-w-xs">{inv.clients?.name || 'Cliente'}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 tabular-nums">
                            <span className="font-semibold text-slate-900">${Number(inv.total || 0).toFixed(2)}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              stats.displayStatus === 'Pagada' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {stats.displayStatus}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {modalFilteredInvoices.length > 10 && (
                      <div className="px-3.5 py-2 text-center text-[11px] text-slate-400 bg-slate-50/50">
                        ... y {modalFilteredInvoices.length - 10} facturas más incluidas en la exportación
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer con Acciones de Descarga */}
            <div className="px-5 py-3.5 border-t border-slate-200/80 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setFilterStartDate(modalStartDate);
                  setFilterEndDate(modalEndDate);
                  setFilterStatus(modalStatusFilter);
                  setDateRangePreset('personalizado');
                  setExportModalOpen(false);
                }}
                className="text-xs font-semibold text-brand-blue hover:underline cursor-pointer"
              >
                Aplicar fechas a la vista principal →
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button 
                  type="button"
                  onClick={() => setExportModalOpen(false)} 
                  className="h-9 px-3.5 font-semibold text-xs text-slate-600 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  disabled={modalFilteredInvoices.length === 0}
                  onClick={() => handlePrintIncomeReport(modalFilteredInvoices, modalStartDate, modalEndDate)}
                  className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                  title="Imprimir o guardar reporte en PDF"
                >
                  <Printer size={14} className="text-slate-600" />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  type="button"
                  disabled={modalFilteredInvoices.length === 0}
                  onClick={() => handleExportIncomeExcel(modalFilteredInvoices, modalStartDate, modalEndDate)}
                  className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                  title="Descargar reporte completo en archivo nativo de Microsoft Excel (.xlsx)"
                >
                  <FileSpreadsheet size={15} />
                  <span>Descargar Excel (.xlsx)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailModalOpen && emailInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/70 shrink-0">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                {emailInvoice.email_sent_at ? (
                  <>
                    <RefreshCw size={16} className="text-brand-blue" />
                    Reenviar Factura por Correo
                  </>
                ) : (
                  <>
                    <Mail size={16} className="text-brand-blue" />
                    Enviar Factura por Correo
                  </>
                )}
              </h3>
              <button onClick={() => setEmailModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5 space-y-4 overflow-y-auto">
              {emailInvoice.email_sent_at && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200/80 rounded-lg text-xs text-emerald-700">
                  <MailCheck size={15} />
                  <span>Último envío: <strong>{formatEmailDate(emailInvoice.email_sent_at)}</strong></span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Destinatario (Para)</label>
                <p className="px-3.5 py-2 bg-slate-50 border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-700 font-medium">{emailInvoice.clients?.email}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    En Copia (CC) <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                  </label>
                  {emailCc && (
                    <span className="text-[10px] bg-brand-blue/10 text-brand-blue border border-brand-blue/20 font-semibold px-2 py-0.5 rounded-md">
                      2º Correo del cliente
                    </span>
                  )}
                </div>
                <input 
                  type="email"
                  placeholder="ejemplo2@correo.com"
                  value={emailCc}
                  onChange={e => setEmailCc(e.target.value)}
                  className="w-full h-9 px-3.5 bg-white border border-slate-200/90 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Asunto del Correo</label>
                <input 
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  className="w-full h-9 px-3.5 bg-white border border-slate-200/90 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Mensaje Adicional</label>
                <textarea 
                  value={emailMessage}
                  onChange={e => setEmailMessage(e.target.value)}
                  rows={3}
                  className="w-full p-3.5 bg-white border border-slate-200/90 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm font-medium text-slate-800 resize-none"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">Este mensaje aparecerá en el cuerpo del correo. La factura se adjuntará automáticamente.</p>
              </div>

              <div className="p-3 bg-brand-blue/[0.06] border border-brand-blue/15 rounded-lg text-xs text-slate-700 flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-brand-blue shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Este correo incluirá automáticamente el <strong>saldo pendiente total</strong> del cliente y un enlace directo y exclusivo a su <strong>estado de cuenta personal</strong> online (sin contraseña).
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/80 flex justify-end gap-2">
                <button type="button" onClick={() => setEmailModalOpen(false)} className="h-9 px-4 font-semibold text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button 
                  onClick={confirmSendEmail}
                  disabled={isSendingEmail} 
                  className="h-9 px-4 font-semibold text-xs bg-brand-blue text-white rounded-lg hover:bg-[#0e354b] disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
                >
                  {isSendingEmail ? 'Enviando...' : emailInvoice.email_sent_at ? 'Reenviar Correo' : 'Enviar Correo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
