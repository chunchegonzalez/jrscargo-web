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
  Package,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Plus,
  Coins,
  Save,
  RefreshCw,
  Truck,
  FileText,
  Wallet,
  Receipt,
  Calendar,
  ArrowRight,
  Scale
} from 'lucide-react';
import Link from 'next/link';
import { parseLocalDate, getLocalTodayDate } from '@/lib/billing';
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
          fetch('/api/expenses', { cache: 'no-store' }),
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

  // 1. Invoices in selected period
  const filteredInvoices = useMemo(() => {
    return invoices.filter(
      inv => inv.status !== 'Anulada' && isDateInRange(parseLocalDate(inv.issue_date))
    );
  }, [invoices, filterStart, filterEnd]);

  const totalFacturadoUSD = useMemo(() => {
    return filteredInvoices.reduce((s, inv) => {
      const val = Number(inv.total) || 0;
      return s + (inv.currency === 'CRC' ? val / (inv.exchange_rate || currentExchangeRate) : val);
    }, 0);
  }, [filteredInvoices, currentExchangeRate]);

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

  // 3. Expenses & Net Profit in selected period
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => isDateInRange(parseLocalDate(exp.date)));
  }, [expenses, filterStart, filterEnd]);

  const totalGastosUSD = useMemo(() => {
    return filteredExpenses.reduce((s, exp) => {
      const val = Number(exp.amount) || 0;
      return s + (exp.currency === 'CRC' ? val / currentExchangeRate : val);
    }, 0);
  }, [filteredExpenses, currentExchangeRate]);

  const utilidadNetaUSD = totalFacturadoUSD - totalGastosUSD;

  // 4. Global Accounts Receivable (Pending to collect)
  const { totalReceivablesUSD, pendientesCount, cobradoPeriodoUSD } = useMemo(() => {
    let recSum = 0;
    let pendCount = 0;
    let cobradoPeriodo = 0;

    invoices.forEach(inv => {
      if (inv.status === 'Anulada') return;

      let invPaid = 0;
      if (inv.invoice_payments && Array.isArray(inv.invoice_payments)) {
        invPaid = inv.invoice_payments.reduce((a, p) => a + Number(p.amount_applied), 0);
      }
      const invTotal = Number(inv.total) || 0;
      const rate = inv.exchange_rate || currentExchangeRate;
      const totalUSD = inv.currency === 'CRC' ? invTotal / rate : invTotal;
      const paidUSD = inv.currency === 'CRC' ? invPaid / rate : invPaid;
      const pendingUSD = Math.max(0, totalUSD - paidUSD);

      if (inv.status !== 'Pagada' && pendingUSD > 0.01) {
        recSum += pendingUSD;
        pendCount++;
      }

      if (isDateInRange(parseLocalDate(inv.issue_date))) {
        cobradoPeriodo += inv.status === 'Pagada' ? totalUSD : paidUSD;
      }
    });

    return {
      totalReceivablesUSD: recSum,
      pendientesCount: pendCount,
      cobradoPeriodoUSD: cobradoPeriodo
    };
  }, [invoices, currentExchangeRate, filterStart, filterEnd]);

  // Chart Data (7 days or 6 months)
  const chartData = useMemo(() => {
    if (chartRange === '7d') {
      return Array.from({ length: 7 }).map((_, i) => {
        const d = startOfDay(subDays(new Date(), 6 - i));
        const label = formatShortDay(d);

        const dayFacturado = invoices
          .filter(inv => inv.status !== 'Anulada' && isSameDay(parseLocalDate(inv.issue_date), d))
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
            if (inv.status === 'Anulada') return false;
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
        <div className="w-10 h-10 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-500">Cargando resumen del panel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-sm pb-10">
      {/* ==================== 1. HEADER & PERIOD SELECTOR ==================== */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Greeting */}
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {greeting}, <span className="text-brand-blue">{currentUser?.username || 'Equipo JRS'}</span>
              </h1>
              <span className="px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-extrabold">
                Viendo: {periodLabel}
              </span>
            </div>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              Resumen directo de facturación, paquetes entregados y estado operativo.
            </p>
          </div>

          {/* Period Filter Controls + Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Period Buttons */}
            <div className="flex flex-wrap bg-gray-100/90 rounded-2xl p-1 gap-0.5">
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    dateFilter === f.id
                      ? 'bg-brand-blue text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Editable Month Picker when "Mes" is active */}
            {dateFilter === 'mes' && (
              <div className="flex items-center gap-1.5 bg-blue-50/70 border border-brand-blue/20 rounded-2xl px-3 py-1.5">
                <Calendar size={14} className="text-brand-blue" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs font-black text-brand-blue focus:outline-none cursor-pointer"
                />
              </div>
            )}

            {/* Editable Specific Date Picker when "Día específico" is active */}
            {dateFilter === 'fecha' && (
              <div className="flex items-center gap-1.5 bg-blue-50/70 border border-brand-blue/20 rounded-2xl px-3 py-1.5">
                <Calendar size={14} className="text-brand-blue" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-black text-brand-blue focus:outline-none cursor-pointer"
                />
              </div>
            )}

            <Link
              href="/admin/bodega"
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-yellow hover:bg-brand-yellow/90 text-brand-blue font-black rounded-2xl text-xs shadow-sm transition-all"
            >
              <Plus size={15} /> Escanear
            </Link>

            <Link
              href="/admin/facturacion/nueva"
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold rounded-2xl text-xs shadow-sm transition-all"
            >
              <Plus size={15} /> Facturar
            </Link>
          </div>
        </div>

        {/* Compact Exchange Rate Strip inside Header */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Coins size={16} />
            </div>
            <span className="text-xs font-bold text-gray-700">Tipo de Cambio Oficial:</span>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-black rounded-lg border border-emerald-200">
              ₡{currentExchangeRate} CRC = $1.00 USD
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus-within:border-brand-blue focus-within:bg-white transition-all">
              <span className="text-xs font-black text-amber-600 mr-1">₡</span>
              <input
                type="number"
                min="1"
                step="1"
                value={exchangeRateInput}
                onChange={e => setExchangeRateInput(e.target.value)}
                className="w-16 bg-transparent font-black text-brand-blue text-xs focus:outline-none"
                placeholder="500"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveExchangeRate}
              disabled={isSavingExchangeRate || !exchangeRateInput}
              className="px-3.5 py-1.5 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isSavingExchangeRate ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
              <span>Guardar T.C.</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================== 2. MAIN KPI CARDS (SIMPLE & DIRECT) ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Card 1: Facturado en el Día / Período */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
              Facturado ({periodLabel})
            </span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-brand-blue flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-gray-900">
              ${totalFacturadoUSD.toFixed(2)}
            </div>
            <p className="text-xs font-bold text-gray-400 mt-0.5">
              ≈ ₡{Math.round(totalFacturadoUSD * currentExchangeRate).toLocaleString('es-CR')} CRC
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
            <span className="font-bold text-brand-blue">
              {filteredInvoices.length} {filteredInvoices.length === 1 ? 'factura emitida' : 'facturas emitidas'}
            </span>
            <span className="text-emerald-600 font-bold">
              Cobrado: ${cobradoPeriodoUSD.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Card 2: Paquetes Entregados en el Día / Período */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
              Paquetes Entregados
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600">
                {paquetesEntregadosPeriodo.length}
              </span>
              <span className="text-xs font-bold text-gray-400">
                paquetes ({periodLabel})
              </span>
            </div>
            <p className="text-xs font-bold text-gray-400 mt-0.5">
              Peso entregado: {pesoEntregadoLbs.toFixed(1)} lbs
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-600">
              Recibidos: <strong className="text-gray-900">{paquetesRecibidosPeriodo.length}</strong>
            </span>
            <Link href="/admin/inventario" className="text-brand-blue font-bold hover:underline">
              En bodega: {paquetesEnBodegaActual} →
            </Link>
          </div>
        </div>

        {/* Card 3: Utilidad & Gastos del Período */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
              Utilidad Neta ({periodLabel})
            </span>
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                utilidadNetaUSD >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}
            >
              <Wallet size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-3xl font-black ${
                utilidadNetaUSD >= 0 ? 'text-gray-900' : 'text-red-600'
              }`}
            >
              ${utilidadNetaUSD.toFixed(2)}
            </div>
            <p className="text-xs font-bold text-red-500 mt-0.5">
              Gastos registrados: ${totalGastosUSD.toFixed(2)}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">
              {filteredExpenses.length} gastos en el período
            </span>
            <Link href="/admin/gastos" className="text-brand-blue font-bold hover:underline">
              Ver gastos →
            </Link>
          </div>
        </div>

        {/* Card 4: Cuentas por Cobrar */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
              Pendiente por Cobrar
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-amber-600">
              ${totalReceivablesUSD.toFixed(2)}
            </div>
            <p className="text-xs font-bold text-gray-400 mt-0.5">
              ≈ ₡{Math.round(totalReceivablesUSD * currentExchangeRate).toLocaleString('es-CR')} CRC
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold">
              {pendientesCount} facturas pendientes
            </span>
            <Link href="/admin/cuentas-por-cobrar" className="text-brand-blue font-bold hover:underline">
              Cobrar →
            </Link>
          </div>
        </div>

        {/* Card 5: Kilos Recibidos (Worldbox / Mes) */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-indigo-100/80 bg-linear-to-b from-white to-indigo-50/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-indigo-900/70 uppercase tracking-wider">
              Kilos Recibidos ({dateFilter === 'mes' ? 'Mes' : periodLabel})
            </span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs">
              <Scale size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-indigo-700">
                {(dateFilter === 'mes' ? kilosRecibidosMesSeleccionado.totalKg : kilosRecibidosWorldboxPeriodo).toFixed(1)}
              </span>
              <span className="text-sm font-extrabold text-indigo-600">
                kg
              </span>
              <span className="text-xs font-semibold text-gray-400 ml-1">
                (≈ {((dateFilter === 'mes' ? kilosRecibidosMesSeleccionado.totalKg : kilosRecibidosWorldboxPeriodo) * 2.20462).toFixed(1)} lbs)
              </span>
            </div>
            <p className="text-xs font-bold text-gray-500 mt-0.5">
              Mes actual: <strong className="text-indigo-900 font-black">{kilosRecibidosMesSeleccionado.totalKg.toFixed(1)} kg</strong> ({kilosRecibidosMesSeleccionado.count} paq.)
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-indigo-50 flex items-center justify-between text-xs">
            <span className="font-semibold text-indigo-950">
              {dateFilter === 'mes' ? kilosRecibidosMesSeleccionado.count : paquetesRecibidosWorldboxPeriodo.length} paq. Worldbox
            </span>
            <span
              className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-extrabold text-[10px] border border-indigo-200/50"
              title="Solo contempla productos con coincidencia en Worldbox. Compras por sitio web no tomadas en cuenta."
            >
              Sin web
            </span>
          </div>
        </div>
      </div>

      {/* ==================== 3. SIMPLE CHART & PERIOD SUMMARY ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Single Clean Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl w-fit flex-wrap">
              <button
                type="button"
                onClick={() => setChartMetric('facturacion')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartMetric === 'facturacion'
                    ? 'bg-white text-brand-blue shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <DollarSign size={14} /> Facturación ($)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('paquetes')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartMetric === 'paquetes'
                    ? 'bg-white text-brand-blue shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Truck size={14} /> Paquetes Entregados vs Recibidos
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('kilos')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartMetric === 'kilos'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Scale size={14} /> Kilos Recibidos (kg)
              </button>
            </div>

            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl p-0.5 text-xs font-bold w-fit">
              <button
                type="button"
                onClick={() => setChartRange('7d')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  chartRange === '7d' ? 'bg-brand-blue text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Últimos 7 Días
              </button>
              <button
                type="button"
                onClick={() => setChartRange('6m')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  chartRange === '6m' ? 'bg-brand-blue text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Por Mes (6M)
              </button>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartMetric === 'facturacion' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `$${v}`} />
                  <RechartsTooltip
                    formatter={(val: number) => [`$${val.toFixed(2)} USD`, 'Facturado']}
                    contentStyle={{
                      borderRadius: '14px',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="Facturado" name="Facturado ($ USD)" fill="#12435E" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              ) : chartMetric === 'paquetes' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '14px',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      fontSize: '12px'
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Bar dataKey="Entregados" name="Entregados" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="Recibidos" name="Recibidos en Bodega" fill="#12435E" radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `${v} kg`} />
                  <RechartsTooltip
                    formatter={(val: number) => [
                      `${val.toFixed(2)} kg (≈ ${(val * 2.20462).toFixed(1)} lbs)`,
                      'Kilos Recibidos (Worldbox)'
                    ]}
                    contentStyle={{
                      borderRadius: '14px',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="Kilos" name="Kilos Recibidos (Worldbox)" fill="#4F46E5" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Clean Summary Box for Selected Period (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-black text-gray-900 text-base">Resumen del Período</h3>
                <p className="text-xs text-gray-400">Datos filtrados por: {periodLabel}</p>
              </div>
              <span className="px-2.5 py-1 bg-brand-blue/10 text-brand-blue text-[11px] font-black rounded-xl">
                {periodLabel}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <FileText size={16} className="text-brand-blue" />
                  <span className="text-xs font-bold text-gray-700">Total Facturado</span>
                </div>
                <span className="font-black text-gray-900 text-sm">${totalFacturadoUSD.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-900">Paquetes Entregados</span>
                </div>
                <span className="font-black text-emerald-700 text-sm">
                  {paquetesEntregadosPeriodo.length} paq.
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Package size={16} className="text-brand-blue" />
                  <span className="text-xs font-bold text-gray-700">Paquetes Recibidos</span>
                </div>
                <span className="font-black text-gray-900 text-sm">
                  {paquetesRecibidosPeriodo.length} paq.
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                <div className="flex items-center gap-2.5">
                  <Scale size={16} className="text-indigo-600" />
                  <div>
                    <span className="text-xs font-bold text-indigo-950 block">Kilos Recibidos</span>
                    <span className="text-[10px] text-indigo-700/80 font-medium">Worldbox • Sin compras web</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-indigo-700 text-sm block">
                    {kilosRecibidosWorldboxPeriodo.toFixed(2)} kg
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">
                    ≈ {librasRecibidasWorldboxPeriodo.toFixed(1)} lbs
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Receipt size={16} className="text-red-500" />
                  <span className="text-xs font-bold text-gray-700">Gastos del Período</span>
                </div>
                <span className="font-black text-red-600 text-sm">-${totalGastosUSD.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-5 pt-4 border-t border-gray-100">
            <Link
              href="/admin/facturacion"
              className="py-2.5 bg-gray-100 hover:bg-gray-200/80 text-gray-800 font-bold rounded-xl text-center text-xs transition-colors flex items-center justify-center gap-1"
            >
              Ver Facturas <ArrowRight size={13} />
            </Link>
            <Link
              href="/admin/inventario"
              className="py-2.5 bg-brand-blue text-white hover:bg-brand-blue/90 font-bold rounded-xl text-center text-xs transition-colors flex items-center justify-center gap-1"
            >
              Inventario <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* ==================== CONTROL MENSUAL DE KILOS RECIBIDOS (WORLDBOX) ==================== */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Scale size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-gray-900 tracking-tight">
                  Kilos Recibidos por Mes
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black border border-indigo-200/60">
                  Coincidencia Worldbox
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                  Compras por sitio web no tomadas en cuenta
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Total de kilogramos recibidos en bodega correspondientes a paquetes registrados en Worldbox. Se excluyen automáticamente compras asistidas o por sitio web.
              </p>
            </div>
          </div>

          {/* Month Metric Pill */}
          <div className="flex items-center gap-4 bg-indigo-50/70 border border-indigo-100/90 rounded-2xl px-5 py-3 shrink-0">
            <div>
              <span className="text-[11px] font-extrabold text-indigo-900 uppercase tracking-wider block">
                Total {kilosRecibidosMesSeleccionado.monthLabel}
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-indigo-700">
                  {kilosRecibidosMesSeleccionado.totalKg.toFixed(2)}
                </span>
                <span className="text-xs font-black text-indigo-700">kg</span>
                <span className="text-xs font-semibold text-gray-500 ml-1">
                  (≈ {kilosRecibidosMesSeleccionado.totalLbs.toFixed(1)} lbs)
                </span>
              </div>
            </div>
            <div className="pl-4 border-l border-indigo-200/60 text-right">
              <span className="text-sm font-black text-gray-900 block">
                {kilosRecibidosMesSeleccionado.count}
              </span>
              <span className="text-[10px] text-gray-500 font-bold block">
                paquetes
              </span>
            </div>
          </div>
        </div>

        {/* 6-Month History Breakdown */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
              Historial de Kilos por Mes (Últimos 6 Meses)
            </span>
            <span className="text-[11px] font-bold text-gray-500">
              {worldboxPackages.length > 0 ? `${worldboxPackages.length} paquetes indexados en Worldbox` : 'Modo inteligente activo'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {historialMensualKilos.map((m, idx) => {
              const isCurrent = idx === historialMensualKilos.length - 1;
              return (
                <div
                  key={m.name}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-indigo-50/80 border-indigo-200 shadow-xs'
                      : 'bg-slate-50/70 border-slate-100 hover:bg-white hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className={isCurrent ? 'text-indigo-950 font-black' : 'text-gray-600'}>
                      {m.name}
                    </span>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 font-black">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                        Actual
                      </span>
                    )}
                  </div>
                  <div className="text-xl font-black text-gray-900">
                    {m.kilos.toFixed(1)} <span className="text-xs font-bold text-indigo-600">kg</span>
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium mt-0.5">
                    ≈ {m.libras.toFixed(1)} lbs
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-semibold">
                    <span>{m.paquetes} paq.</span>
                    <span className="text-indigo-600 font-bold">Worldbox</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==================== 4. PERIOD ACTIVITY LISTS ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Facturas del Período */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-brand-blue" />
              <h3 className="font-bold text-gray-900 text-sm">
                Facturas Emitidas ({periodLabel}: {filteredInvoices.length})
              </h3>
            </div>
            <Link href="/admin/facturacion" className="text-xs font-bold text-brand-blue hover:underline">
              Ver todas →
            </Link>
          </div>

          <div className="divide-y divide-gray-50">
            {filteredInvoices.slice(0, 6).map(inv => (
              <Link
                key={inv.id}
                href={`/admin/facturacion/${inv.id}`}
                className="py-3 flex items-center justify-between hover:bg-gray-50/80 px-2 -mx-2 rounded-xl transition-colors"
              >
                <div>
                  <div className="font-bold text-gray-900 text-xs">#{inv.invoice_number}</div>
                  <div className="text-[11px] text-gray-500">
                    {inv.clients?.name || 'Cliente'} &bull; {inv.issue_date?.split('T')[0]}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-gray-900 text-xs">${Number(inv.total).toFixed(2)}</div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      inv.status === 'Pagada'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {inv.status}
                  </span>
                </div>
              </Link>
            ))}
            {filteredInvoices.length === 0 && (
              <p className="text-xs text-gray-400 py-8 text-center">
                No hay facturas registradas en {periodLabel.toLowerCase()}.
              </p>
            )}
          </div>
        </div>

        {/* Paquetes Entregados en el Período */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-emerald-600" />
              <h3 className="font-bold text-gray-900 text-sm">
                Paquetes Entregados ({periodLabel}: {paquetesEntregadosPeriodo.length})
              </h3>
            </div>
            <Link href="/admin/inventario" className="text-xs font-bold text-brand-blue hover:underline">
              Ver inventario →
            </Link>
          </div>

          <div className="divide-y divide-gray-50">
            {paquetesEntregadosPeriodo.slice(0, 6).map(pkg => (
              <div key={pkg.id} className="py-3 flex items-center justify-between">
                <div className="min-w-0 pr-3">
                  <div className="font-bold font-mono text-brand-blue text-xs truncate">
                    {pkg.tracking_number || pkg.id}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">
                    {pkg.client_name || pkg.client || 'Sin cliente'} &bull; {pkg.weight || '0'}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                  Entregado
                </span>
              </div>
            ))}
            {paquetesEntregadosPeriodo.length === 0 && (
              <p className="text-xs text-gray-400 py-8 text-center">
                No hay paquetes marcados como entregados en {periodLabel.toLowerCase()}.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
