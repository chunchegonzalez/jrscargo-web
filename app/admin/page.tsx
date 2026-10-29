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
  Scale,
  QrCode
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
            href="/mobile"
            className="h-9 px-3.5 rounded-lg border border-[#0B1D2B] bg-[#0B1D2B] hover:bg-[#123147] text-brand-yellow shadow-2xs inline-flex items-center gap-1.5 font-semibold text-xs transition-all active:scale-[0.98]"
            title="Abrir JRS Cargo Mobile (QR)"
          >
            <QrCode size={14} />
            <span>JRS Mobile</span>
          </Link>

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

      {/* ==================== 2. TARJETAS KPI PRINCIPALES ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* Card 1: Facturado en el Día / Período */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Facturado ({periodLabel})
            </span>
            <div className="w-8 h-8 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black tracking-tight text-slate-900 tabular-nums">
              ${totalFacturadoUSD.toFixed(2)}
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5 tabular-nums">
              ≈ ₡{Math.round(totalFacturadoUSD * currentExchangeRate).toLocaleString('es-CR')} CRC
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-600">
              {filteredInvoices.length} {filteredInvoices.length === 1 ? 'emitida' : 'emitidas'}
            </span>
            <span className="text-emerald-600 font-semibold tabular-nums">
              Cobrado: ${cobradoPeriodoUSD.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Card 2: Paquetes Entregados en el Día / Período */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Paquetes Entregados
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tracking-tight text-emerald-700 tabular-nums">
                {paquetesEntregadosPeriodo.length}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                paq. ({periodLabel})
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5 tabular-nums">
              Peso entregado: {pesoEntregadoLbs.toFixed(1)} lbs
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-500">
              Recibidos: <strong className="text-slate-800 font-semibold">{paquetesRecibidosPeriodo.length}</strong>
            </span>
            <Link href="/admin/inventario" className="text-brand-blue font-semibold hover:underline">
              En bodega: {paquetesEnBodegaActual} →
            </Link>
          </div>
        </div>

        {/* Card 3: Utilidad & Gastos del Período */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Utilidad Neta ({periodLabel})
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                utilidadNetaUSD >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}
            >
              <Wallet size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <div
              className={`text-2xl font-black tracking-tight tabular-nums ${
                utilidadNetaUSD >= 0 ? 'text-slate-900' : 'text-red-600'
              }`}
            >
              ${utilidadNetaUSD.toFixed(2)}
            </div>
            <p className="text-[11px] font-medium text-red-500 mt-0.5 tabular-nums">
              Gastos registrados: ${totalGastosUSD.toFixed(2)}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">
              {filteredExpenses.length} gastos en período
            </span>
            <Link href="/admin/gastos" className="text-brand-blue font-semibold hover:underline">
              Ver gastos →
            </Link>
          </div>
        </div>

        {/* Card 4: Cuentas por Cobrar */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Pendiente por Cobrar
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <AlertCircle size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black tracking-tight text-amber-600 tabular-nums">
              ${totalReceivablesUSD.toFixed(2)}
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5 tabular-nums">
              ≈ ₡{Math.round(totalReceivablesUSD * currentExchangeRate).toLocaleString('es-CR')} CRC
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60 font-semibold">
              {pendientesCount} pendientes
            </span>
            <Link href="/admin/cuentas-por-cobrar" className="text-brand-blue font-semibold hover:underline">
              Cobrar →
            </Link>
          </div>
        </div>

        {/* Card 5: Kilos Recibidos (Worldbox / Mes) */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Kilos Recibidos ({dateFilter === 'mes' ? 'Mes' : periodLabel})
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Scale size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black tracking-tight text-indigo-700 tabular-nums">
                {(dateFilter === 'mes' ? kilosRecibidosMesSeleccionado.totalKg : kilosRecibidosWorldboxPeriodo).toFixed(1)}
              </span>
              <span className="text-xs font-bold text-indigo-600">kg</span>
              <span className="text-[11px] font-medium text-slate-400 ml-1 tabular-nums">
                (≈ {((dateFilter === 'mes' ? kilosRecibidosMesSeleccionado.totalKg : kilosRecibidosWorldboxPeriodo) * 2.20462).toFixed(1)} lbs)
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5 tabular-nums">
              Mes actual: <strong className="text-slate-800 font-semibold">{kilosRecibidosMesSeleccionado.totalKg.toFixed(1)} kg</strong> ({kilosRecibidosMesSeleccionado.count} paq.)
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-600">
              {dateFilter === 'mes' ? kilosRecibidosMesSeleccionado.count : paquetesRecibidosWorldboxPeriodo.length} paq. Worldbox
            </span>
            <span
              className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[10px] border border-indigo-200/60"
              title="Solo contempla productos con coincidencia en Worldbox. Compras por sitio web no tomadas en cuenta."
            >
              Sin web
            </span>
          </div>
        </div>
      </div>

      {/* ==================== 3. GRÁFICO Y RESUMEN DEL PERÍODO ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Single Clean Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1 bg-slate-100/90 border border-slate-200/60 p-0.5 rounded-lg w-fit flex-wrap">
              <button
                type="button"
                onClick={() => setChartMetric('facturacion')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartMetric === 'facturacion'
                    ? 'bg-white text-brand-blue shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <DollarSign size={13} /> Facturación ($)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('paquetes')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartMetric === 'paquetes'
                    ? 'bg-white text-brand-blue shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Truck size={13} /> Paquetes Entregados vs Recibidos
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('kilos')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartMetric === 'kilos'
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Scale size={13} /> Kilos Recibidos (kg)
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-100/90 border border-slate-200/60 rounded-lg p-0.5 text-xs font-semibold w-fit">
              <button
                type="button"
                onClick={() => setChartRange('7d')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  chartRange === '7d' ? 'bg-brand-blue text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Últimos 7 Días
              </button>
              <button
                type="button"
                onClick={() => setChartRange('6m')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  chartRange === '6m' ? 'bg-brand-blue text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `$${v}`} />
                  <RechartsTooltip
                    formatter={(val: number) => [`$${val.toFixed(2)} USD`, 'Facturado']}
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="Facturado" name="Facturado ($ USD)" fill="#12435E" radius={[5, 5, 0, 0]} maxBarSize={34} />
                </BarChart>
              ) : chartMetric === 'paquetes' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
                      fontSize: '12px'
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Bar dataKey="Entregados" name="Entregados" fill="#10B981" radius={[5, 5, 0, 0]} maxBarSize={26} />
                  <Bar dataKey="Recibidos" name="Recibidos en Bodega" fill="#12435E" radius={[5, 5, 0, 0]} maxBarSize={26} />
                </BarChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `${v} kg`} />
                  <RechartsTooltip
                    formatter={(val: number) => [
                      `${val.toFixed(2)} kg (≈ ${(val * 2.20462).toFixed(1)} lbs)`,
                      'Kilos Recibidos (Worldbox)'
                    ]}
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="Kilos" name="Kilos Recibidos (Worldbox)" fill="#4F46E5" radius={[5, 5, 0, 0]} maxBarSize={30} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Clean Summary Box for Selected Period (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Resumen del Período</h3>
                <p className="text-[11px] text-slate-400">Datos filtrados por: {periodLabel}</p>
              </div>
              <span className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue border border-brand-blue/15 text-[11px] font-semibold rounded-md">
                {periodLabel}
              </span>
            </div>

            <div className="mt-3.5 space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/60">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-brand-blue" />
                  <span className="text-xs font-medium text-slate-700">Total Facturado</span>
                </div>
                <span className="font-bold text-slate-900 text-xs tabular-nums">${totalFacturadoUSD.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200/60">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-900">Paquetes Entregados</span>
                </div>
                <span className="font-bold text-emerald-700 text-xs tabular-nums">
                  {paquetesEntregadosPeriodo.length} paq.
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/60">
                <div className="flex items-center gap-2">
                  <Package size={15} className="text-brand-blue" />
                  <span className="text-xs font-medium text-slate-700">Paquetes Recibidos</span>
                </div>
                <span className="font-bold text-slate-900 text-xs tabular-nums">
                  {paquetesRecibidosPeriodo.length} paq.
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-200/60">
                <div className="flex items-center gap-2">
                  <Scale size={15} className="text-indigo-600" />
                  <div>
                    <span className="text-xs font-medium text-indigo-950 block">Kilos Recibidos</span>
                    <span className="text-[10px] text-indigo-600/80 font-medium">Worldbox • Sin compras web</span>
                  </div>
                </div>
                <div className="text-right tabular-nums">
                  <span className="font-bold text-indigo-700 text-xs block">
                    {kilosRecibidosWorldboxPeriodo.toFixed(2)} kg
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    ≈ {librasRecibidasWorldboxPeriodo.toFixed(1)} lbs
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/60">
                <div className="flex items-center gap-2">
                  <Receipt size={15} className="text-red-500" />
                  <span className="text-xs font-medium text-slate-700">Gastos del Período</span>
                </div>
                <span className="font-bold text-red-600 text-xs tabular-nums">-${totalGastosUSD.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-slate-100">
            <Link
              href="/admin/facturacion"
              className="h-9 bg-slate-100 hover:bg-slate-200/70 text-slate-700 font-semibold rounded-lg text-center text-xs transition-colors flex items-center justify-center gap-1"
            >
              Ver Facturas <ArrowRight size={13} />
            </Link>
            <Link
              href="/admin/inventario"
              className="h-9 bg-brand-blue text-white hover:bg-[#0e354b] font-semibold rounded-lg text-center text-xs transition-colors flex items-center justify-center gap-1"
            >
              Inventario <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* ==================== CONTROL MENSUAL DE KILOS RECIBIDOS (WORLDBOX) ==================== */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Scale size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Kilos Recibidos por Mes
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-200/60">
                  Coincidencia Worldbox
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                  Sin compras web
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Total de kilogramos recibidos en bodega correspondientes a paquetes registrados en Worldbox.
              </p>
            </div>
          </div>

          {/* Month Metric Pill */}
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 shrink-0">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Total {kilosRecibidosMesSeleccionado.monthLabel}
              </span>
              <div className="flex items-baseline gap-1 mt-0.5 tabular-nums">
                <span className="text-xl font-black text-indigo-700">
                  {kilosRecibidosMesSeleccionado.totalKg.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-indigo-700">kg</span>
                <span className="text-[11px] font-medium text-slate-400 ml-1">
                  (≈ {kilosRecibidosMesSeleccionado.totalLbs.toFixed(1)} lbs)
                </span>
              </div>
            </div>
            <div className="pl-3.5 border-l border-slate-200 text-right tabular-nums">
              <span className="text-sm font-black text-slate-900 block">
                {kilosRecibidosMesSeleccionado.count}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold block">
                paquetes
              </span>
            </div>
          </div>
        </div>

        {/* 6-Month History Breakdown */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Historial de Kilos por Mes (Últimos 6 Meses)
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {worldboxPackages.length > 0 ? `${worldboxPackages.length} paquetes indexados en Worldbox` : 'Modo inteligente activo'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {historialMensualKilos.map((m, idx) => {
              const isCurrent = idx === historialMensualKilos.length - 1;
              return (
                <div
                  key={m.name}
                  className={`p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-indigo-50/50 border-indigo-200/90'
                      : 'bg-slate-50/60 border-slate-200/60 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span className={isCurrent ? 'text-indigo-950 font-bold' : 'text-slate-600'}>
                      {m.name}
                    </span>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                        Actual
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-black text-slate-900 tabular-nums">
                    {m.kilos.toFixed(1)} <span className="text-xs font-bold text-indigo-600">kg</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium tabular-nums">
                    ≈ {m.libras.toFixed(1)} lbs
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>{m.paquetes} paq.</span>
                    <span className="text-indigo-600 font-semibold">Worldbox</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==================== 4. LISTAS DE ACTIVIDAD DEL PERÍODO ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Facturas del Período */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
          <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-brand-blue" />
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Facturas Emitidas ({periodLabel}: {filteredInvoices.length})
              </h3>
            </div>
            <Link href="/admin/facturacion" className="text-xs font-semibold text-brand-blue hover:underline">
              Ver todas →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredInvoices.slice(0, 6).map(inv => (
              <Link
                key={inv.id}
                href={`/admin/facturacion/${inv.id}`}
                className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/90 transition-colors"
              >
                <div>
                  <div className="font-bold text-slate-900 text-xs font-mono">#{inv.invoice_number}</div>
                  <div className="text-[11px] text-slate-500">
                    {inv.clients?.name || 'Cliente'} &bull; {inv.issue_date?.split('T')[0]}
                  </div>
                </div>
                <div className="text-right flex items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      inv.status === 'Pagada'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                        : 'bg-amber-50 text-amber-700 border-amber-200/80'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${inv.status === 'Pagada' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {inv.status}
                  </span>
                  <div className="font-bold text-slate-900 text-xs tabular-nums min-w-[64px]">
                    ${Number(inv.total).toFixed(2)}
                  </div>
                </div>
              </Link>
            ))}
            {filteredInvoices.length === 0 && (
              <p className="text-xs text-slate-400 py-8 text-center">
                No hay facturas registradas en {periodLabel.toLowerCase()}.
              </p>
            )}
          </div>
        </div>

        {/* Paquetes Entregados en el Período */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
          <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={15} className="text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Paquetes Entregados ({periodLabel}: {paquetesEntregadosPeriodo.length})
              </h3>
            </div>
            <Link href="/admin/inventario" className="text-xs font-semibold text-brand-blue hover:underline">
              Ver inventario →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {paquetesEntregadosPeriodo.slice(0, 6).map(pkg => (
              <div key={pkg.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/90 transition-colors">
                <div className="min-w-0 pr-3">
                  <div className="font-bold font-mono text-slate-900 text-xs truncate">
                    {pkg.tracking_number || pkg.id}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {pkg.client_name || pkg.client || 'Sin cliente'} &bull; {pkg.weight || '0'}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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
