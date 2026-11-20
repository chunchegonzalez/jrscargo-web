'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Plus,
  Coins,
  Save,
  RefreshCw,
  Wallet,
  Calendar,
  ArrowRight,
  Scale,
  ShoppingBag,
  Anchor
} from 'lucide-react';
import Link from 'next/link';
import {
  parseLocalDate,
  getLocalTodayDate,
  isCompraSitioWebInvoice,
  isMaritimoService,
  parseCubicFeetValue,
  extractPackageTransportAndNote,
} from '@/lib/billing';
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

interface InventoryHistoryEvent {
  date?: string;
  action?: string;
  user?: string;
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
  history?: InventoryHistoryEvent[];
}

interface ExpenseData {
  id: string;
  provider_name: string;
  date: string;
  amount: number | string;
  currency?: string;
  category: string;
}

interface WorldboxPackageItem {
  trackingNumber?: string;
  tenantName?: string;
  clientName?: string;
  clientCode?: string;
  consignatario?: string;
  weight?: string | number;
}

function parseWeightToKg(rawWeight: string | number | undefined | null): number {
  if (rawWeight === undefined || rawWeight === null) return 0;
  const str = String(rawWeight).trim().toLowerCase();
  if (!str) return 0;

  const isKg = str.includes('kg') || str.includes('kilo');

  let clean = str.replace(/[^\d.,]/g, '');
  if (clean.includes(',') && clean.includes('.')) {
    if (clean.indexOf(',') < clean.indexOf('.')) {
      clean = clean.replace(/,/g, '');
    } else {
      clean = clean.replace(/\./g, '').replace(',', '.');
    }
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  }

  const val = parseFloat(clean);
  if (isNaN(val) || val <= 0) return 0;

  if (isKg) {
    return val;
  }
  // Standard freight unit in JRS Cargo / Miami is lbs (pounds) -> convert to kg (1 lb = 0.45359237 kg)
  return val * 0.45359237;
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}

function subDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - n);
  return r;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatShortDay(d: Date): string {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return `${days[d.getDay()]} ${d.getDate()}`;
}

function parseFlexibleDate(dateStr?: string | null, fallbackStr?: string | null): Date {
  const raw = (dateStr || fallbackStr || '').trim();
  if (!raw) return new Date(0);

  // Check DD/MM/YYYY format from formatCostaRicaDateTime (e.g. "20/10/2026, 9:45:00 p. m.")
  const dmyMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month - 1, day);
  }

  return parseLocalDate(raw);
}

function getPackageDeliveryDate(pkg: InventoryItem): Date {
  if (Array.isArray(pkg.history) && pkg.history.length > 0) {
    const deliveredEvt = pkg.history.find(h =>
      (h.action || '').toLowerCase().includes('entregad')
    );
    if (deliveredEvt?.date) {
      return parseFlexibleDate(deliveredEvt.date, pkg.updated_at || pkg.created_at);
    }
  }
  return parseFlexibleDate(pkg.updated_at, pkg.received_date || pkg.created_at);
}

function getPackageReceivedDate(pkg: InventoryItem): Date {
  return parseFlexibleDate(pkg.received_date || pkg.created_at);
}

export default function AdminDashboard() {
  const { showAlert } = useModal();
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [worldboxPackages, setWorldboxPackages] = useState<WorldboxPackageItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Default to 'hoy' so daily billing & delivered packages are immediately visible
  const [dateFilter, setDateFilter] = useState<'hoy' | 'ayer' | 'semana' | 'mes' | 'fecha' | 'todos'>('hoy');

  // Editable month ("YYYY-MM") and custom date ("YYYY-MM-DD")
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalTodayDate());

  // Simple chart toggle ('facturacion' | 'paquetes' | 'kilos')
  const [chartMetric, setChartMetric] = useState<'facturacion' | 'paquetes' | 'kilos'>('facturacion');
  const [chartRange, setChartRange] = useState<'7d' | '6m'>('7d');

  // Exchange rate state
  const [currentExchangeRate, setCurrentExchangeRate] = useState<number>(500);
  const [exchangeRateInput, setExchangeRateInput] = useState<string>('500');
  const [isSavingExchangeRate, setIsSavingExchangeRate] = useState<boolean>(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [userRes, invRes, pkgRes, expRes, rateRes, wbRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/invoices?includeItems=true', { cache: 'no-store' }),
          fetch('/api/inventory', { cache: 'no-store' }),
          fetch('/api/expenses?minimal=true', { cache: 'no-store' }),
          fetch('/api/exchange-rate', { cache: 'no-store' }),
          fetch('/api/worldbox/packages', { cache: 'no-store' }).catch(() => null)
        ]);

        if (userRes && userRes.ok) {
          const ud = await userRes.json();
          if (ud.authenticated) setCurrentUser(ud.user);
        }
        if (invRes && invRes.ok) {
          const id = await invRes.json();
          setInvoices(id.data || []);
        }
        if (pkgRes && pkgRes.ok) {
          const pd = await pkgRes.json();
          setInventory((pd.data || []).filter((p: InventoryItem) => p.status !== 'Eliminado'));
        }
        if (expRes && expRes.ok) {
          const ed = await expRes.json();
          setExpenses(ed.data || []);
        }
        if (rateRes && rateRes.ok) {
          const rd = await rateRes.json();
          if (rd.success && Number(rd.rate) > 0) {
            setCurrentExchangeRate(Number(rd.rate));
            setExchangeRateInput(String(rd.rate));
          }
        }
        if (wbRes && wbRes.ok) {
          const wd = await wbRes.json();
          if (wd.success && Array.isArray(wd.data)) {
            setWorldboxPackages(wd.data);
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

  // Compute start & end dates for the selected period
  const { filterStart, filterEnd, periodLabel } = useMemo(() => {
    const now = new Date();
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    switch (dateFilter) {
      case 'hoy':
        return {
          filterStart: startOfDay(now),
          filterEnd: endOfDay(now),
          periodLabel: 'Hoy'
        };
      case 'ayer': {
        const y = subDays(now, 1);
        return {
          filterStart: startOfDay(y),
          filterEnd: endOfDay(y),
          periodLabel: 'Ayer'
        };
      }
      case 'semana':
        return {
          filterStart: startOfWeek(now),
          filterEnd: endOfDay(now),
          periodLabel: 'Esta Semana'
        };
      case 'mes': {
        const [yStr, mStr] = selectedMonth.split('-');
        const year = parseInt(yStr, 10) || now.getFullYear();
        const monthIndex = (parseInt(mStr, 10) || now.getMonth() + 1) - 1;
        const firstDay = new Date(year, monthIndex, 1, 0, 0, 0, 0);
        const lastDay = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
        return {
          filterStart: firstDay,
          filterEnd: lastDay,
          periodLabel: `${monthNames[monthIndex]} ${year}`
        };
      }
      case 'fecha': {
        const d = parseLocalDate(selectedDate);
        return {
          filterStart: startOfDay(d),
          filterEnd: endOfDay(d),
          periodLabel: selectedDate.split('-').reverse().join('/')
        };
      }
      default:
        return {
          filterStart: new Date(2000, 0, 1),
          filterEnd: endOfDay(now),
          periodLabel: 'Histórico Total'
        };
    }
  }, [dateFilter, selectedMonth, selectedDate]);

  const isDateInRange = (d: Date) => d >= filterStart && d <= filterEnd;

  // Set of tracking numbers that belong to website purchases (from invoice lines)
  const websitePurchaseTrackings = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach(inv => {
      if (inv.invoice_items && Array.isArray(inv.invoice_items)) {
        inv.invoice_items.forEach(item => {
          const sUpper = (item.service_name || '').toUpperCase();
          if (sUpper.includes('COMPRA') || sUpper.includes('SITIO WEB')) {
            if (item.tracking_number) {
              set.add(item.tracking_number.trim().toUpperCase());
            }
          }
        });
      }
    });
    return set;
  }, [invoices]);

  // Helper to exclude website purchases
  const isWebsitePurchase = useCallback((pkg: InventoryItem): boolean => {
    const trk = (pkg.id || pkg.tracking_number || '').trim().toUpperCase();
    if (trk && websitePurchaseTrackings.has(trk)) return true;

    const compUpper = (pkg.company || '').toUpperCase();
    if (
      compUpper.includes('SITIO WEB') ||
      compUpper.includes('COMPRA WEB') ||
      compUpper.includes('COMPRAS WEB')
    ) {
      return true;
    }

    const clientUpper = (pkg.client_name || pkg.client || '').toUpperCase();
    if (clientUpper.includes('SITIO WEB') || clientUpper.includes('COMPRA WEB')) {
      return true;
    }

    return false;
  }, [websitePurchaseTrackings]);

  // Build fast normalized tracking set for Worldbox match
  const worldboxTrackingSet = useMemo(() => {
    const exact = new Set<string>();
    const list: string[] = [];

    worldboxPackages.forEach(p => {
      const raw = (p.trackingNumber || '').trim().toUpperCase();
      if (!raw) return;
      exact.add(raw);
      list.push(raw);

      const stripped = raw
        .replace(/^420(?:\d{9}|\d{5})(?=9\d{14,})/i, '')
        .replace(/^420\d{5}/i, '');
      if (stripped && stripped !== raw) {
        exact.add(stripped);
        list.push(stripped);
      }
    });

    return { exact, list };
  }, [worldboxPackages]);

  // Helper: ONLY packages that have a match with Worldbox
  const hasWorldboxMatch = useCallback((pkg: InventoryItem): boolean => {
    const rawTrk = (pkg.id || pkg.tracking_number || '').trim().toUpperCase();
    if (!rawTrk) return false;

    const strippedUSPS = rawTrk
      .replace(/^420(?:\d{9}|\d{5})(?=9\d{14,})/i, '')
      .replace(/^420\d{5}/i, '');

    // 1. Direct match with Worldbox packages API list
    if (worldboxTrackingSet.exact.size > 0) {
      if (worldboxTrackingSet.exact.has(rawTrk) || worldboxTrackingSet.exact.has(strippedUSPS)) {
        return true;
      }

      const matched = worldboxTrackingSet.list.some(wbTrk => {
        if (!wbTrk || wbTrk.length < 8) return false;
        return (
          rawTrk.endsWith(wbTrk) ||
          wbTrk.endsWith(rawTrk) ||
          (strippedUSPS.length >= 8 && (wbTrk.includes(strippedUSPS) || strippedUSPS.includes(wbTrk)))
        );
      });
      if (matched) return true;
    }

    // 2. Fallback if API returned 0 packages (offline or token error):
    // Match against official Worldbox carrier accounts
    if (worldboxTrackingSet.exact.size === 0) {
      const compUpper = (pkg.company || '').toUpperCase();
      return (
        compUpper === 'JRS CARGO' ||
        compUpper === 'ATLANTIC IMPORTS' ||
        compUpper === 'TRINITY BOX' ||
        compUpper === 'JR LOGISTICS' ||
        compUpper.includes('JRS') ||
        compUpper.includes('ATLANTIC') ||
        compUpper.includes('TRINITY') ||
        compUpper.includes('LOGISTICS')
      );
    }

    return false;
  }, [worldboxTrackingSet]);

  // 1. Invoices in selected period (separadas por rubro: Operativas vs Compra en Sitio Web)
  const filteredInvoices = useMemo(() => {
    return invoices.filter(
      inv => inv.status !== 'Anulada' && isDateInRange(parseLocalDate(inv.issue_date))
    );
  }, [invoices, filterStart, filterEnd]);

  const filteredOperationalInvoices = useMemo(() => {
    return filteredInvoices.filter(inv => !isCompraSitioWebInvoice(inv));
  }, [filteredInvoices]);

  const filteredWebInvoices = useMemo(() => {
    return filteredInvoices.filter(inv => isCompraSitioWebInvoice(inv));
  }, [filteredInvoices]);

  const totalFacturadoUSD = useMemo(() => {
    return filteredOperationalInvoices.reduce((s, inv) => {
      const val = Number(inv.total) || 0;
      return s + (inv.currency === 'CRC' ? val / (inv.exchange_rate || currentExchangeRate) : val);
    }, 0);
  }, [filteredOperationalInvoices, currentExchangeRate]);

  // 2. Packages Delivered & Received in selected period
  const paquetesEntregadosPeriodo = useMemo(() => {
    return inventory.filter(
      p =>
        p.status?.toLowerCase().includes('entregad') &&
        isDateInRange(getPackageDeliveryDate(p))
    );
  }, [inventory, filterStart, filterEnd]);

  const paquetesRecibidosPeriodo = useMemo(() => {
    return inventory.filter(p => isDateInRange(getPackageReceivedDate(p)));
  }, [inventory, filterStart, filterEnd]);

  const paquetesEnBodegaActual = useMemo(() => {
    return inventory.filter(p => !p.status?.toLowerCase().includes('entregad')).length;
  }, [inventory]);

  const pesoEntregadoLbs = useMemo(() => {
    return paquetesEntregadosPeriodo.reduce((sum, p) => {
      const raw = String(p.weight || '0').replace(/[^0-9.]/g, '');
      return sum + (parseFloat(raw) || 0);
    }, 0);
  }, [paquetesEntregadosPeriodo]);

  // Packages received matching Worldbox and excluding website purchases
  const paquetesRecibidosWorldboxPeriodo = useMemo(() => {
    return inventory.filter(p => {
      if (!isDateInRange(getPackageReceivedDate(p))) return false;
      if (isWebsitePurchase(p)) return false;
      return hasWorldboxMatch(p);
    });
  }, [inventory, isDateInRange, isWebsitePurchase, hasWorldboxMatch]);

  const kilosRecibidosWorldboxPeriodo = useMemo(() => {
    return paquetesRecibidosWorldboxPeriodo.reduce((sum, p) => sum + parseWeightToKg(p.weight), 0);
  }, [paquetesRecibidosWorldboxPeriodo]);

  const librasRecibidasWorldboxPeriodo = kilosRecibidosWorldboxPeriodo * 2.20462262;

  // Selected Month (YYYY-MM) specific calculation for Kilos
  const kilosRecibidosMesSeleccionado = useMemo(() => {
    const now = new Date();
    const [yStr, mStr] = selectedMonth.split('-');
    const targetYear = parseInt(yStr, 10) || now.getFullYear();
    const targetMonth = (parseInt(mStr, 10) || now.getMonth() + 1) - 1;

    const monthPackages = inventory.filter(p => {
      const d = getPackageReceivedDate(p);
      if (d.getFullYear() !== targetYear || d.getMonth() !== targetMonth) return false;
      if (isWebsitePurchase(p)) return false;
      return hasWorldboxMatch(p);
    });

    const totalKg = monthPackages.reduce((sum, p) => sum + parseWeightToKg(p.weight), 0);
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return {
      totalKg,
      totalLbs: totalKg * 2.20462262,
      count: monthPackages.length,
      monthLabel: `${monthNames[targetMonth]} ${targetYear}`
    };
  }, [inventory, selectedMonth, isWebsitePurchase, hasWorldboxMatch]);

  // Historical Monthly Breakdown (Last 6 Months) for Worldbox Kilos
  const historialMensualKilos = useMemo(() => {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthFullNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const now = new Date();
    return Array.from({ length: 6 }).map((_, idx) => {
      const i = 5 - idx;
      const target = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = target.getFullYear();
      const m = target.getMonth();
      const label = `${monthNames[m]} ${String(y).slice(2)}`;
      const fullLabel = `${monthFullNames[m]} ${y}`;

      const monthPackages = inventory.filter(p => {
        const d = getPackageReceivedDate(p);
        if (d.getFullYear() !== y || d.getMonth() !== m) return false;
        if (isWebsitePurchase(p)) return false;
        return hasWorldboxMatch(p);
      });

      const kg = monthPackages.reduce((sum, p) => sum + parseWeightToKg(p.weight), 0);
      return {
        name: label,
        fullName: fullLabel,
        kilos: Number(kg.toFixed(2)),
        libras: Number((kg * 2.20462262).toFixed(1)),
        paquetes: monthPackages.length
      };
    });
  }, [inventory, isWebsitePurchase, hasWorldboxMatch]);

  // 3. Expenses in selected period
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => isDateInRange(parseLocalDate(exp.date)));
  }, [expenses, filterStart, filterEnd]);

  const totalGastosUSD = useMemo(() => {
    return filteredExpenses.reduce((s, exp) => {
      const val = Number(exp.amount) || 0;
      return s + (exp.currency === 'CRC' ? val / currentExchangeRate : val);
    }, 0);
  }, [filteredExpenses, currentExchangeRate]);

  // 4. Rubros separados: Cuentas por Cobrar (sin web), Compras en Sitio Web y Cobros efectivos del período
  const {
    totalReceivablesUSD,
    pendientesCount,
    cobradoPeriodoUSD,
    pendientePeriodoOperativoUSD,
    webBilledPeriodoUSD,
    webPaidPeriodoUSD,
    webPendingPeriodoUSD,
    webPendingGlobalUSD,
    webPendingGlobalCount,
  } = useMemo(() => {
    let recSum = 0;
    let pendCount = 0;
    let cobradoPeriodo = 0;
    let pendientePeriodoOp = 0;

    let webBilledPer = 0;
    let webPaidPer = 0;
    let webPendingPer = 0;
    let webPendingAll = 0;
    let webPendingAllCnt = 0;

    invoices.forEach(inv => {
      if (inv.status === 'Anulada') return;

      let invPaid = 0;
      if (inv.invoice_payments && Array.isArray(inv.invoice_payments)) {
        invPaid = inv.invoice_payments.reduce((a, p) => a + Number(p.amount_applied), 0);
      }
      const invTotal = Number(inv.total) || 0;
      const rate = inv.exchange_rate || currentExchangeRate;
      const totalUSD = inv.currency === 'CRC' ? invTotal / rate : invTotal;
      const paidUSD = inv.status === 'Pagada' ? totalUSD : (inv.currency === 'CRC' ? invPaid / rate : invPaid);
      const pendingUSD = inv.status === 'Pagada' ? 0 : Math.max(0, totalUSD - paidUSD);

      const isWeb = isCompraSitioWebInvoice(inv);
      const inRange = isDateInRange(parseLocalDate(inv.issue_date));

      if (isWeb) {
        if (pendingUSD > 0.01) {
          webPendingAll += pendingUSD;
          webPendingAllCnt++;
        }
        if (inRange) {
          webBilledPer += totalUSD;
          webPaidPer += paidUSD;
          webPendingPer += pendingUSD;
        }
        return;
      }

      // Facturas operativas (sin compras en sitio web)
      if (pendingUSD > 0.01) {
        recSum += pendingUSD;
        pendCount++;
      }

      if (inRange) {
        cobradoPeriodo += paidUSD;
        pendientePeriodoOp += pendingUSD;
      }
    });

    return {
      totalReceivablesUSD: recSum,
      pendientesCount: pendCount,
      cobradoPeriodoUSD: cobradoPeriodo,
      pendientePeriodoOperativoUSD: pendientePeriodoOp,
      webBilledPeriodoUSD: webBilledPer,
      webPaidPeriodoUSD: webPaidPer,
      webPendingPeriodoUSD: webPendingPer,
      webPendingGlobalUSD: webPendingAll,
      webPendingGlobalCount: webPendingAllCnt,
    };
  }, [invoices, currentExchangeRate, filterStart, filterEnd]);

  // Utilidad Neta: Facturado Operativo del período (sin compras en sitio web, incluyendo pendientes) - Gastos del período
  const utilidadNetaUSD = totalFacturadoUSD - totalGastosUSD;

  // 5. Reporte de Productos Marítimos del Período Consultado
  const maritimeStatsPeriodo = useMemo(() => {
    let totalCubicFeet = 0;
    let shipmentsCount = 0;
    let totalBilledUsd = 0;
    let totalPaidUsd = 0;
    let totalPendingUsd = 0;
    const recentLines: Array<{
      key: string;
      invoiceId: string;
      invoiceNumber: string;
      clientName: string;
      tracking: string;
      cubicFeet: number;
      amountUsd: number;
      status: string;
      issueDate: string;
    }> = [];

    filteredOperationalInvoices.forEach(inv => {
      const items = Array.isArray(inv.invoice_items) ? inv.invoice_items : [];
      const marItems = items.filter(it => isMaritimoService(it.service_name, it.weight));
      if (marItems.length === 0) return;

      const invTotal = Number(inv.total) || 0;
      const rate = inv.exchange_rate || currentExchangeRate;
      let invPaid = 0;
      if (inv.invoice_payments && Array.isArray(inv.invoice_payments)) {
        invPaid = inv.invoice_payments.reduce((a, p) => a + Number(p.amount_applied), 0);
      }
      const isPaid = inv.status === 'Pagada' || (invTotal > 0 && invTotal - invPaid <= 0.01);
      const paidRatio = isPaid ? 1 : invTotal > 0 ? Math.min(1, invPaid / invTotal) : 0;

      marItems.forEach((it, idx) => {
        const ft3 = parseCubicFeetValue(it.weight);
        const rawAmt = Number(it.amount) || 0;
        const amtUsd = inv.currency === 'CRC' ? rawAmt / rate : rawAmt;
        const linePaid = amtUsd * paidRatio;

        totalCubicFeet += ft3;
        shipmentsCount += 1;
        totalBilledUsd += amtUsd;
        totalPaidUsd += linePaid;
        totalPendingUsd += Math.max(0, amtUsd - linePaid);

        recentLines.push({
          key: `${inv.id}-${idx}`,
          invoiceId: inv.id,
          invoiceNumber: inv.invoice_number,
          clientName: inv.clients?.name || 'Cliente',
          tracking: String(it.tracking_number || '—'),
          cubicFeet: ft3,
          amountUsd: amtUsd,
          status: isPaid ? 'Pagada' : inv.status || 'Pendiente',
          issueDate: inv.issue_date,
        });
      });
    });

    const inventoryMaritimoCount = inventory.filter(p => {
      if (!isDateInRange(getPackageReceivedDate(p))) return false;
      const meta = extractPackageTransportAndNote(p);
      return meta.transportType === 'Marítimo';
    }).length;

    return {
      totalCubicFeet,
      shipmentsCount,
      totalBilledUsd,
      totalPaidUsd,
      totalPendingUsd,
      inventoryMaritimoCount,
      recentLines: recentLines.slice(0, 6),
    };
  }, [filteredOperationalInvoices, inventory, currentExchangeRate, filterStart, filterEnd]);

  // Chart Data (7 days or 6 months)
  const chartData = useMemo(() => {
    if (chartRange === '7d') {
      return Array.from({ length: 7 }).map((_, i) => {
        const d = startOfDay(subDays(new Date(), 6 - i));
        const label = formatShortDay(d);

        const dayFacturado = invoices
          .filter(
            inv =>
              inv.status !== 'Anulada' &&
              !isCompraSitioWebInvoice(inv) &&
              isSameDay(parseLocalDate(inv.issue_date), d)
          )
          .reduce((s, inv) => {
            const val = Number(inv.total) || 0;
            return s + (inv.currency === 'CRC' ? val / (inv.exchange_rate || currentExchangeRate) : val);
          }, 0);

        const dayEntregados = inventory.filter(
          p => p.status?.toLowerCase().includes('entregad') && isSameDay(getPackageDeliveryDate(p), d)
        ).length;

        const dayRecibidos = inventory.filter(p => isSameDay(getPackageReceivedDate(p), d)).length;

        const dayKilosWorldbox = inventory
          .filter(p => isSameDay(getPackageReceivedDate(p), d) && !isWebsitePurchase(p) && hasWorldboxMatch(p))
          .reduce((s, p) => s + parseWeightToKg(p.weight), 0);

        return {
          name: label,
          Facturado: Number(dayFacturado.toFixed(2)),
          Entregados: dayEntregados,
          Recibidos: dayRecibidos,
          Kilos: Number(dayKilosWorldbox.toFixed(2))
        };
      });
    } else {
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const now = new Date();
      return Array.from({ length: 6 }).map((_, idx) => {
        const i = 5 - idx;
        const target = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = target.getFullYear();
        const m = target.getMonth();
        const label = `${monthNames[m]} ${String(y).slice(2)}`;

        const mFacturado = invoices
          .filter(inv => {
            if (inv.status === 'Anulada' || isCompraSitioWebInvoice(inv)) return false;
            const d = parseLocalDate(inv.issue_date);
            return d.getFullYear() === y && d.getMonth() === m;
          })
          .reduce((s, inv) => {
            const val = Number(inv.total) || 0;
            return s + (inv.currency === 'CRC' ? val / (inv.exchange_rate || currentExchangeRate) : val);
          }, 0);

        const mEntregados = inventory.filter(p => {
          if (!p.status?.toLowerCase().includes('entregad')) return false;
          const d = getPackageDeliveryDate(p);
          return d.getFullYear() === y && d.getMonth() === m;
        }).length;

        const mRecibidos = inventory.filter(p => {
          const d = getPackageReceivedDate(p);
          return d.getFullYear() === y && d.getMonth() === m;
        }).length;

        const mKilosWorldbox = inventory
          .filter(p => {
            const d = getPackageReceivedDate(p);
            return d.getFullYear() === y && d.getMonth() === m && !isWebsitePurchase(p) && hasWorldboxMatch(p);
          })
          .reduce((s, p) => s + parseWeightToKg(p.weight), 0);

        return {
          name: label,
          Facturado: Number(mFacturado.toFixed(2)),
          Entregados: mEntregados,
          Recibidos: mRecibidos,
          Kilos: Number(mKilosWorldbox.toFixed(2))
        };
      });
    }
  }, [chartRange, invoices, inventory, currentExchangeRate, isWebsitePurchase, hasWorldboxMatch]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-80 gap-3">
        <div className="w-8 h-8 border-3 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Cargando resumen operativo...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 animate-fade-in text-sm pb-8">
      {/* ==================== 1. ENCABEZADO COMPACTO Y BARRA DE CONTROL ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {greeting}, <span className="text-brand-blue">{currentUser?.username || 'Equipo JRS'}</span>
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-brand-blue/10 text-brand-blue border border-brand-blue/15 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
              Viendo: {periodLabel}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Resumen directo de facturación, paquetes entregados y estado operativo.
          </p>
        </div>

        {/* Acciones rápidas alineadas a la derecha */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/bodega"
            className="h-9 px-3.5 rounded-lg border border-brand-yellow/40 bg-brand-yellow hover:bg-brand-yellow/90 text-[#0B1D2B] shadow-2xs inline-flex items-center gap-1.5 font-bold text-xs transition-all active:scale-[0.98]"
          >
            <Plus size={14} />
            <span>Escanear</span>
          </Link>

          <Link
            href="/admin/facturacion/nueva"
            className="h-9 px-3.5 rounded-lg border border-brand-blue/20 bg-brand-blue hover:bg-[#0e354b] text-white shadow-2xs inline-flex items-center gap-1.5 font-semibold text-xs transition-all active:scale-[0.98]"
          >
            <Plus size={14} />
            <span>Facturar</span>
          </Link>
        </div>
      </div>

      {/* Barra unificada: Selector de Período + Tipo de Cambio Oficial */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Selector de Período */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap bg-slate-100/90 border border-slate-200/60 rounded-lg p-0.5 gap-0.5">
            {[
              { id: 'hoy' as const, label: 'Hoy' },
              { id: 'ayer' as const, label: 'Ayer' },
              { id: 'semana' as const, label: 'Semana' },
              { id: 'mes' as const, label: 'Mes' },
              { id: 'fecha' as const, label: 'Día específico' },
              { id: 'todos' as const, label: 'Histórico' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setDateFilter(f.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  dateFilter === f.id
                    ? 'bg-brand-blue text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {dateFilter === 'mes' && (
            <div className="inline-flex items-center gap-1.5 h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5">
              <Calendar size={13} className="text-brand-blue" />
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              />
            </div>
          )}

          {dateFilter === 'fecha' && (
            <div className="inline-flex items-center gap-1.5 h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5">
              <Calendar size={13} className="text-brand-blue" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Tipo de Cambio Oficial compacto */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 pt-2.5 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center shrink-0">
              <Coins size={14} />
            </div>
            <span className="text-xs font-medium text-slate-600">Tipo de Cambio:</span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-200/80 tabular-nums">
              ₡{currentExchangeRate} = $1 USD
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center h-8 bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 focus-within:border-brand-blue focus-within:bg-white transition-all">
              <span className="text-xs font-bold text-amber-600 mr-1">₡</span>
              <input
                type="number"
                min="1"
                step="1"
                value={exchangeRateInput}
                onChange={e => setExchangeRateInput(e.target.value)}
                className="w-14 bg-transparent font-bold text-slate-800 text-xs focus:outline-none tabular-nums"
                placeholder="500"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveExchangeRate}
              disabled={isSavingExchangeRate || !exchangeRateInput}
              className="h-8 px-3 bg-brand-blue hover:bg-[#0e354b] text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
            >
              {isSavingExchangeRate ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
              <span>Guardar T.C.</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================== 2. INDICADORES PRINCIPALES ==================== */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* 1. Facturado Operativo */}
          <div className="p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500 truncate">
                  Facturado · {periodLabel}
                </span>
                <DollarSign size={14} className="text-slate-400 shrink-0" />
              </div>
              <div className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                ${totalFacturadoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums truncate">
                ≈ ₡{Math.round(totalFacturadoUSD * currentExchangeRate).toLocaleString('es-CR')} · sin web
              </p>
            </div>
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                {filteredOperationalInvoices.length}{' '}
                {filteredOperationalInvoices.length === 1 ? 'factura' : 'facturas'}
              </span>
              <span className="font-medium text-emerald-700 tabular-nums">
                Cobrado ${cobradoPeriodoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* 2. Paquetes Entregados */}
          <div className="p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500 truncate">
                  Entregados · {periodLabel}
                </span>
                <CheckCircle2 size={14} className="text-slate-400 shrink-0" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                  {paquetesEntregadosPeriodo.length}
                </span>
                <span className="text-xs text-slate-400">paquetes</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums truncate">
                Peso entregado: {pesoEntregadoLbs.toFixed(1)} lbs
              </p>
            </div>
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                Recibidos: <strong className="font-semibold text-slate-700">{paquetesRecibidosPeriodo.length}</strong>
              </span>
              <Link href="/admin/inventario" className="font-medium text-brand-blue hover:underline">
                En bodega: {paquetesEnBodegaActual} →
              </Link>
            </div>
          </div>

          {/* 3. Utilidad Neta */}
          <div className="p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500 truncate">
                  Utilidad neta · {periodLabel}
                </span>
                <Wallet size={14} className="text-slate-400 shrink-0" />
              </div>
              <div
                className={`mt-1.5 text-2xl font-semibold tracking-tight tabular-nums ${
                  utilidadNetaUSD >= 0 ? 'text-slate-900' : 'text-red-600'
                }`}
              >
                ${utilidadNetaUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums truncate">
                Gastos:{' '}
                <span className="text-red-600 font-medium">
                  -${totalGastosUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </p>
            </div>
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span title="Facturado operativo del período (incluyendo pendientes) menos gastos. Excluye compras en sitio web.">
                Operativo (sin web)
              </span>
              <Link href="/admin/gastos" className="font-medium text-brand-blue hover:underline">
                Ver gastos →
              </Link>
            </div>
          </div>

          {/* 4. Pendiente por Cobrar */}
          <div className="p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500 truncate">
                  Por cobrar (operativo)
                </span>
                <AlertCircle size={14} className="text-slate-400 shrink-0" />
              </div>
              <div className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                ${totalReceivablesUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums truncate">
                ≈ ₡{Math.round(totalReceivablesUSD * currentExchangeRate).toLocaleString('es-CR')} · sin web
              </p>
            </div>
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-medium text-amber-700">
                {pendientesCount} pendientes
              </span>
              <Link href="/admin/cuentas-por-cobrar" className="font-medium text-brand-blue hover:underline">
                Cobrar →
              </Link>
            </div>
          </div>

          {/* 5. Kilos Recibidos */}
          <div className="p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500 truncate">
                  Kilos recibidos · {dateFilter === 'mes' ? 'Mes' : periodLabel}
                </span>
                <Scale size={14} className="text-slate-400 shrink-0" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                  {(dateFilter === 'mes' ? kilosRecibidosMesSeleccionado.totalKg : kilosRecibidosWorldboxPeriodo).toFixed(1)}
                </span>
                <span className="text-xs font-medium text-slate-500">kg</span>
                <span className="text-[11px] text-slate-400 ml-1 tabular-nums">
                  ({((dateFilter === 'mes' ? kilosRecibidosMesSeleccionado.totalKg : kilosRecibidosWorldboxPeriodo) * 2.20462).toFixed(1)} lbs)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums truncate">
                Mes actual: {kilosRecibidosMesSeleccionado.totalKg.toFixed(1)} kg ({kilosRecibidosMesSeleccionado.count} paq.)
              </p>
            </div>
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                {dateFilter === 'mes' ? kilosRecibidosMesSeleccionado.count : paquetesRecibidosWorldboxPeriodo.length} paq. Worldbox
              </span>
              <span className="text-slate-400" title="Solo contempla productos con coincidencia en Worldbox. Compras por sitio web no tomadas en cuenta.">
                Sin web
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 2.5 DESGLOSE POR RUBRO ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rubro 1: Balance Operativo */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Wallet size={14} className="text-slate-400 shrink-0" />
              <h3 className="text-[13px] font-semibold text-slate-900 truncate">
                Balance operativo
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 shrink-0">{periodLabel}</span>
          </div>

          <div className="px-4 py-1 divide-y divide-slate-100 text-xs flex-1">
            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-slate-600">Facturado operativo (sin web)</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                ${totalFacturadoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-slate-600">Gastos registrados</span>
              <span className="font-semibold text-red-600 tabular-nums">
                -${totalGastosUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-slate-500">Cobrado / pendiente</span>
              <span className="font-semibold tabular-nums">
                <span className="text-emerald-700">
                  ${cobradoPeriodoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-slate-300 mx-1">/</span>
                <span className="text-amber-700">
                  ${pendientePeriodoOperativoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Rubro 2: Compras en Sitio Web */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ShoppingBag size={14} className="text-slate-400 shrink-0" />
              <h3 className="text-[13px] font-semibold text-slate-900 truncate">
                Compras en sitio web
              </h3>
            </div>
            <Link
              href="/admin/compra-en-sitio-web"
              className="text-[11px] font-medium text-brand-blue hover:underline shrink-0"
            >
              Ver detalle →
            </Link>
          </div>

          <div className="px-4 py-1 divide-y divide-slate-100 text-xs flex-1">
            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-slate-600">Facturado ({filteredWebInvoices.length} fact.)</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                ${webBilledPeriodoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-slate-600">Cobrado en el período</span>
              <span className="font-semibold text-emerald-700 tabular-nums">
                ${webPaidPeriodoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-slate-500">Saldo por cobrar ({webPendingGlobalCount} pend.)</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                ${webPendingGlobalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Rubro 3: Envíos Marítimos */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Anchor size={14} className="text-slate-400 shrink-0" />
              <h3 className="text-[13px] font-semibold text-slate-900 truncate">
                Envíos marítimos
              </h3>
            </div>
            <Link
              href="/admin/reporte-maritimo"
              className="text-[11px] font-medium text-brand-blue hover:underline shrink-0"
            >
              Ver reporte →
            </Link>
          </div>

          <div className="px-4 py-1 divide-y divide-slate-100 text-xs flex-1">
            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-slate-600">Pies cúbicos facturados</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {maritimeStatsPeriodo.totalCubicFeet.toFixed(2)} ft³
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-slate-600">Envíos / paquetes</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {maritimeStatsPeriodo.shipmentsCount} fact. · {maritimeStatsPeriodo.inventoryMaritimoCount} en bodega
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-slate-500">Monto facturado</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                ${maritimeStatsPeriodo.totalBilledUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 3. GRÁFICO Y RESUMEN DEL PERÍODO ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Dynamic JRS Telemetry Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-5 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3.5 border-b border-slate-100">
            <div className="inline-flex items-center gap-1 bg-slate-100/90 p-1 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setChartMetric('facturacion')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  chartMetric === 'facturacion'
                    ? 'bg-[#0B2737] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Facturación
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('paquetes')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  chartMetric === 'paquetes'
                    ? 'bg-[#0B2737] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paquetes
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('kilos')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  chartMetric === 'kilos'
                    ? 'bg-[#0B2737] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kilos (kg)
              </button>
            </div>

            <div className="inline-flex items-center gap-1 bg-slate-100/90 rounded-lg p-1 text-xs font-semibold w-fit">
              <button
                type="button"
                onClick={() => setChartRange('7d')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  chartRange === '7d' ? 'bg-white text-[#0B2737] shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                7 días
              </button>
              <button
                type="button"
                onClick={() => setChartRange('6m')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  chartRange === '6m' ? 'bg-white text-[#0B2737] shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                6 meses
              </button>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartMetric === 'facturacion' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="jrsBarNavy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1C6289" />
                      <stop offset="100%" stopColor="#0B2737" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `$${v}`} />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(18, 67, 94, 0.06)', radius: 6 }}
                    formatter={(val: number) => [
                      `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
                      'Facturado'
                    ]}
                    contentStyle={{
                      backgroundColor: '#0B2737',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      boxShadow: '0 10px 25px rgba(11, 39, 55, 0.22)',
                      fontSize: '12px'
                    }}
                    labelStyle={{ color: '#F59E0B', fontWeight: 700, marginBottom: '2px' }}
                    itemStyle={{ color: '#ffffff', fontWeight: 600 }}
                  />
                  <Bar dataKey="Facturado" name="Facturado ($ USD)" fill="url(#jrsBarNavy)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              ) : chartMetric === 'paquetes' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(18, 67, 94, 0.06)', radius: 6 }}
                    contentStyle={{
                      backgroundColor: '#0B2737',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      boxShadow: '0 10px 25px rgba(11, 39, 55, 0.22)',
                      fontSize: '12px'
                    }}
                    labelStyle={{ color: '#F59E0B', fontWeight: 700, marginBottom: '2px' }}
                    itemStyle={{ color: '#ffffff', fontWeight: 600 }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11.5px', paddingTop: '8px' }} />
                  <Bar dataKey="Recibidos" name="Recibidos" fill="#12435E" radius={[6, 6, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="Entregados" name="Entregados" fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={24} />
                </BarChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="jrsBarGold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#12435E" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `${v} kg`} />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(18, 67, 94, 0.06)', radius: 6 }}
                    formatter={(val: number) => [
                      `${val.toFixed(2)} kg (${(val * 2.20462).toFixed(1)} lbs)`,
                      'Kilos Worldbox'
                    ]}
                    contentStyle={{
                      backgroundColor: '#0B2737',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      boxShadow: '0 10px 25px rgba(11, 39, 55, 0.22)',
                      fontSize: '12px'
                    }}
                    labelStyle={{ color: '#F59E0B', fontWeight: 700, marginBottom: '2px' }}
                    itemStyle={{ color: '#ffffff', fontWeight: 600 }}
                  />
                  <Bar dataKey="Kilos" name="Kilos Worldbox" fill="url(#jrsBarGold)" radius={[6, 6, 0, 0]} maxBarSize={30} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Clean JRS Financial Summary Panel (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-3.5 bg-[#0B2737] text-white flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[13px] tracking-tight">Resumen del período</h3>
                <p className="text-[11px] text-slate-300 mt-0.5">{periodLabel}</p>
              </div>
              <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
            </div>

            {/* Dynamic collection ratio bar */}
            <div className="px-5 pt-3.5 pb-2 border-b border-slate-100">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-slate-500">Cobranza operativa</span>
                <span className="font-semibold text-[#0B2737] tabular-nums">
                  {totalFacturadoUSD > 0 ? Math.min(100, Math.round((cobradoPeriodoUSD / totalFacturadoUSD) * 100)) : 0}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#12435E] to-[#F59E0B] transition-all duration-500"
                  style={{
                    width: `${totalFacturadoUSD > 0 ? Math.min(100, Math.round((cobradoPeriodoUSD / totalFacturadoUSD) * 100)) : 0}%`
                  }}
                />
              </div>
            </div>

            <div className="px-5 divide-y divide-slate-100 text-xs">
              <div className="py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-1 h-5 rounded-full bg-[#12435E] shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium text-slate-800 block truncate">Facturado operativo</span>
                    <span className="text-[10.5px] text-slate-400">Sin compras web</span>
                  </div>
                </div>
                <span className="font-semibold text-slate-900 tabular-nums shrink-0">
                  ${totalFacturadoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-1 h-5 rounded-full bg-[#F59E0B] shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium text-slate-800 block truncate">Cobrado del período</span>
                    <span className="text-[10.5px] text-slate-400 tabular-nums">
                      Pendiente: ${pendientePeriodoOperativoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <span className="font-semibold text-[#12435E] tabular-nums shrink-0">
                  ${cobradoPeriodoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-1 h-5 rounded-full bg-[#EF4444] shrink-0" />
                  <span className="font-medium text-slate-800 truncate">Gastos del período</span>
                </div>
                <span className="font-semibold text-[#EF4444] tabular-nums shrink-0">
                  -${totalGastosUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-1 h-5 rounded-full bg-slate-300 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium text-slate-800 block truncate">Compras en sitio web</span>
                    <span className="text-[10.5px] text-slate-400">{filteredWebInvoices.length} fact. · separado</span>
                  </div>
                </div>
                <span className="font-semibold text-slate-900 tabular-nums shrink-0">
                  ${webBilledPeriodoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-1 h-5 rounded-full bg-[#1C6289] shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium text-slate-800 block truncate">Envíos marítimos</span>
                    <span className="text-[10.5px] text-slate-400 tabular-nums">
                      {maritimeStatsPeriodo.totalCubicFeet.toFixed(2)} ft³ · {maritimeStatsPeriodo.shipmentsCount} envíos
                    </span>
                  </div>
                </div>
                <span className="font-semibold text-slate-900 tabular-nums shrink-0">
                  ${maritimeStatsPeriodo.totalBilledUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 px-5 py-3.5 bg-slate-50/70 border-t border-slate-100">
            <Link
              href="/admin/facturacion"
              className="h-9 bg-white border border-slate-200 hover:border-[#12435E] text-slate-700 hover:text-[#0B2737] font-semibold rounded-lg text-center text-xs transition-colors flex items-center justify-center gap-1"
            >
              Facturas <ArrowRight size={13} />
            </Link>
            <Link
              href="/admin/inventario"
              className="h-9 bg-[#0B2737] text-white hover:bg-[#12435E] font-semibold rounded-lg text-center text-xs transition-colors flex items-center justify-center gap-1"
            >
              Inventario <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* ==================== 3.5 REPORTE DE PRODUCTOS Y SERVICIOS MARÍTIMOS ==================== */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-1 h-7 rounded-full bg-gradient-to-b from-[#12435E] to-[#F59E0B] shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Reporte de productos y servicios marítimos
                </h2>
                <span className="text-[11px] font-medium text-slate-400">· {periodLabel}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Volumen en pies cúbicos (ft³), cantidad de envíos y facturación marítima.
              </p>
            </div>
          </div>

          <Link
            href="/admin/reporte-maritimo"
            className="h-8 px-3.5 rounded-lg bg-[#0B2737] hover:bg-[#12435E] text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors shrink-0 w-fit"
          >
            <span>Reporte completo</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* 4 indicadores clave en barra continua */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="p-4">
            <span className="text-[11px] font-medium text-slate-500 block">Pies cúbicos facturados</span>
            <div className="flex items-baseline gap-1 mt-1 tabular-nums">
              <span className="text-2xl font-semibold text-[#0B2737]">
                {maritimeStatsPeriodo.totalCubicFeet.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-[#F59E0B]">ft³</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Volumen del período</span>
          </div>

          <div className="p-4">
            <span className="text-[11px] font-medium text-slate-500 block">Envíos / paquetes</span>
            <div className="flex items-baseline gap-1.5 mt-1 tabular-nums">
              <span className="text-2xl font-semibold text-slate-900">
                {maritimeStatsPeriodo.shipmentsCount}
              </span>
              <span className="text-xs text-slate-500">facturados</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              En bodega CR: <strong className="font-semibold text-slate-700">{maritimeStatsPeriodo.inventoryMaritimoCount}</strong>
            </span>
          </div>

          <div className="p-4">
            <span className="text-[11px] font-medium text-slate-500 block">Monto facturado</span>
            <div className="flex items-baseline gap-1 mt-1 tabular-nums">
              <span className="text-2xl font-semibold text-slate-900">
                ${maritimeStatsPeriodo.totalBilledUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-slate-400">USD</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block tabular-nums">
              ≈ ₡{Math.round(maritimeStatsPeriodo.totalBilledUsd * currentExchangeRate).toLocaleString('es-CR')}
            </span>
          </div>

          <div className="p-4">
            <span className="text-[11px] font-medium text-slate-500 block">Estado de cobro</span>
            <div className="text-base font-semibold text-[#12435E] mt-1.5 truncate">
              {periodLabel}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block tabular-nums">
              Cobrado <strong className="text-[#12435E]">${maritimeStatsPeriodo.totalPaidUsd.toFixed(2)}</strong> · Pend.{' '}
              <strong className="text-[#B45309]">${maritimeStatsPeriodo.totalPendingUsd.toFixed(2)}</strong>
            </span>
          </div>
        </div>

        {maritimeStatsPeriodo.recentLines.length > 0 && (
          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/40">
            <p className="text-[11px] font-semibold text-slate-500 mb-2.5">
              Envíos marítimos recientes · {periodLabel}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {maritimeStatsPeriodo.recentLines.map(line => (
                <Link
                  key={line.key}
                  href={`/admin/facturacion/${line.invoiceId}`}
                  className="px-3 py-2.5 rounded-lg bg-white border border-slate-200/80 hover:border-[#12435E] transition-all flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-[#0B2737]">#{line.invoiceNumber}</span>
                      <span className="text-[11px] font-mono font-semibold text-[#B45309]">
                        {line.cubicFeet.toFixed(2)} ft³
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {line.clientName} · {line.tracking}
                    </p>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <span className="font-semibold text-slate-900 block">
                      ${line.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-400">{line.issueDate?.split('T')[0]}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ==================== CONTROL MENSUAL DE KILOS RECIBIDOS (WORLDBOX) ==================== */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
        <div className="px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-1 h-7 rounded-full bg-gradient-to-b from-[#0B2737] to-[#EF4444] shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
                  Kilos recibidos por mes
                </h2>
                <span className="text-[11px] text-slate-400">· Worldbox · Sin compras web</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Seguimiento mensual de peso ingresado en bodega CR ({worldboxPackages.length > 0 ? `${worldboxPackages.length} paq. indexados` : 'sincronizado'}).
              </p>
            </div>
          </div>

          {/* Sleek JRS Navy total pill */}
          <div className="flex items-center gap-4 bg-[#0B2737] text-white rounded-xl px-4 py-2.5 shrink-0 w-fit">
            <div>
              <span className="text-[10px] font-medium text-slate-300 uppercase tracking-wider block">
                {kilosRecibidosMesSeleccionado.monthLabel}
              </span>
              <div className="flex items-baseline gap-1 mt-0.5 tabular-nums">
                <span className="text-xl font-semibold text-white">
                  {kilosRecibidosMesSeleccionado.totalKg.toFixed(2)}
                </span>
                <span className="text-xs font-semibold text-[#F59E0B]">kg</span>
                <span className="text-[11px] text-slate-300 ml-1">
                  ({kilosRecibidosMesSeleccionado.totalLbs.toFixed(1)} lbs)
                </span>
              </div>
            </div>
            <div className="pl-3.5 border-l border-white/15 text-right tabular-nums">
              <span className="text-base font-semibold text-white block leading-tight">
                {kilosRecibidosMesSeleccionado.count}
              </span>
              <span className="text-[10px] text-slate-300 block">paquetes</span>
            </div>
          </div>
        </div>

        {/* Dynamic 6-Month Visual Trend Grid */}
        <div className="p-5">
          {(() => {
            const maxKg = Math.max(...historialMensualKilos.map(item => item.kilos), 1);
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {historialMensualKilos.map((m, idx) => {
                  const isCurrent = idx === historialMensualKilos.length - 1;
                  const pct = Math.max(4, Math.round((m.kilos / maxKg) * 100));
                  return (
                    <div
                      key={m.name}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-[#0B2737] border-[#0B2737] text-white shadow-sm'
                          : 'bg-white border-slate-200/80 hover:border-[#12435E]/60 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className={isCurrent ? 'font-semibold text-white' : 'font-medium text-slate-600'}>
                          {m.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-semibold text-[#F59E0B] uppercase tracking-wider">
                            Actual
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="text-lg font-semibold tabular-nums leading-tight">
                          {m.kilos.toFixed(1)}{' '}
                          <span className={`text-xs font-medium ${isCurrent ? 'text-[#F59E0B]' : 'text-[#12435E]'}`}>
                            kg
                          </span>
                        </div>
                        <div className={`text-[11px] tabular-nums mt-0.5 ${isCurrent ? 'text-slate-300' : 'text-slate-400'}`}>
                          {m.libras.toFixed(1)} lbs
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className={`h-1 w-full rounded-full overflow-hidden ${isCurrent ? 'bg-white/15' : 'bg-slate-100'}`}>
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCurrent ? 'bg-[#F59E0B]' : 'bg-[#12435E]'
                            }`}
                            style={{ width: `${m.kilos > 0 ? pct : 0}%` }}
                          />
                        </div>
                        <div
                          className={`mt-2 flex items-center justify-between text-[10.5px] tabular-nums ${
                            isCurrent ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          <span>{m.paquetes} paq.</span>
                          <span className={isCurrent ? 'text-white/80 font-medium' : 'text-slate-500 font-medium'}>
                            {m.kilos > 0 ? `${pct}%` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ==================== 4. LISTAS DE ACTIVIDAD DEL PERÍODO ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Facturas Operativas del Período */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-1 h-4 rounded-full bg-[#12435E]" />
              <h3 className="font-semibold text-slate-900 text-[13px]">
                Facturas emitidas
              </h3>
              <span className="text-[11px] font-medium text-slate-400 tabular-nums">
                {periodLabel} · {filteredOperationalInvoices.length}
              </span>
            </div>
            <Link href="/admin/facturacion" className="text-xs font-medium text-[#12435E] hover:underline">
              Ver todas →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredOperationalInvoices.slice(0, 6).map(inv => (
              <Link
                key={inv.id}
                href={`/admin/facturacion/${inv.id}`}
                className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/90 transition-colors"
              >
                <div className="min-w-0 pr-3">
                  <div className="font-semibold text-[#0B2737] text-xs font-mono">#{inv.invoice_number}</div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {inv.clients?.name || 'Cliente'} · {inv.issue_date?.split('T')[0]}
                  </div>
                </div>
                <div className="text-right flex items-center gap-3 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                      inv.status === 'Pagada' ? 'text-[#12435E]' : 'text-[#B45309]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        inv.status === 'Pagada' ? 'bg-[#12435E]' : 'bg-[#F59E0B]'
                      }`}
                    />
                    {inv.status}
                  </span>
                  <div className="font-semibold text-slate-900 text-xs tabular-nums min-w-[68px]">
                    ${Number(inv.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </Link>
            ))}
            {filteredOperationalInvoices.length === 0 && (
              <p className="text-xs text-slate-400 py-8 text-center">
                No hay facturas operativas registradas en {periodLabel.toLowerCase()}.
              </p>
            )}
          </div>
        </div>

        {/* Paquetes Entregados en el Período */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-1 h-4 rounded-full bg-[#F59E0B]" />
              <h3 className="font-semibold text-slate-900 text-[13px]">
                Paquetes entregados
              </h3>
              <span className="text-[11px] font-medium text-slate-400 tabular-nums">
                {periodLabel} · {paquetesEntregadosPeriodo.length}
              </span>
            </div>
            <Link href="/admin/inventario" className="text-xs font-medium text-[#12435E] hover:underline">
              Ver inventario →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {paquetesEntregadosPeriodo.slice(0, 6).map(pkg => (
              <div key={pkg.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/90 transition-colors">
                <div className="min-w-0 pr-3">
                  <div className="font-semibold font-mono text-[#0B2737] text-xs truncate">
                    {pkg.tracking_number || pkg.id}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {pkg.client_name || pkg.client || 'Sin cliente'} · {pkg.weight || '0'}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#12435E] shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#12435E]" />
                  Entregado
                </span>
              </div>
            ))}
            {paquetesEntregadosPeriodo.length === 0 && (
              <p className="text-xs text-slate-400 py-8 text-center">
                No hay paquetes marcados como entregados en {periodLabel.toLowerCase()}.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
