'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Mail,
  Send,
  Download,
  FileSpreadsheet,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  Users,
  Settings,
  ArrowRight,
  Calendar,
  Filter,
  Loader2,
  Save,
} from 'lucide-react';
import { useModal } from '@/app/components/ModalProvider';

interface ARPendingInvoiceDetail {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  totalUsd: number;
  paidUsd: number;
  pendingUsd: number;
  pendingCrc: number;
  status: string;
}

interface ARClientReportRow {
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  pendingInvoicesCount: number;
  totalBilledUsd: number;
  totalPaidUsd: number;
  totalPendingUsd: number;
  totalPendingCrc: number;
  invoices: ARPendingInvoiceDetail[];
}

interface ARReportSnapshot {
  generatedAtIso: string;
  generatedAtDisplay: string;
  reportDateCr: string;
  exchangeRate: number;
  excludeWebPurchases: boolean;
  totalPendingUsd: number;
  totalPendingCrc: number;
  totalClientsCount: number;
  totalPendingInvoicesCount: number;
  excludedWebCount: number;
  excludedWebBalanceUsd: number;
  clients: ARClientReportRow[];
}

interface ARDailyReportHistoryEntry {
  id: string;
  sentAtIso: string;
  sentAtDisplay: string;
  reportDateCr: string;
  recipientEmail: string;
  ccEmail?: string;
  trigger: 'manual' | 'auto_daily' | 'cron';
  status: 'sent' | 'error';
  totalPendingUsd: number;
  totalPendingCrc: number;
  clientsCount: number;
  invoicesCount: number;
  exchangeRate: number;
  excludeWebPurchases: boolean;
  errorMessage?: string;
}

interface ARDailyReportConfigState {
  enabled: boolean;
  recipientEmail: string;
  ccEmail: string;
  sendTimeCr: string;
  excludeWebPurchases: boolean;
  lastAutoSentDateCr: string | null;
  lastSentAtIso: string | null;
  history: ARDailyReportHistoryEntry[];
}

export default function ReportesCobrosControlPage() {
  const { showAlert } = useModal();

  const [loading, setLoading] = useState(true);
  const [sendingNow, setSendingNow] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const [config, setConfig] = useState<ARDailyReportConfigState>({
    enabled: true,
    recipientEmail: 'jose.gonzalez@jrscargocr.com',
    ccEmail: '',
    sendTimeCr: '07:00',
    excludeWebPurchases: true,
    lastAutoSentDateCr: null,
    lastSentAtIso: null,
    history: [],
  });

  const [snapshot, setSnapshot] = useState<ARReportSnapshot | null>(null);

  const loadControlData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reports/accounts-receivable', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        if (data.config) setConfig(data.config);
        if (data.snapshot) setSnapshot(data.snapshot);
      }
    } catch (e) {
      console.error('Error loading AR report control data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadControlData();
  }, [loadControlData]);

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!config.recipientEmail.trim() || !config.recipientEmail.includes('@')) {
      await showAlert('Correo inválido', 'Por favor ingresa un correo destinatario válido.', 'warning');
      return;
    }

    setSavingConfig(true);
    try {
      const res = await fetch('/api/reports/accounts-receivable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_config',
          enabled: config.enabled,
          recipientEmail: config.recipientEmail.trim(),
          ccEmail: config.ccEmail.trim(),
          sendTimeCr: config.sendTimeCr,
          excludeWebPurchases: config.excludeWebPurchases,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.config) setConfig(data.config);
        if (data.snapshot) setSnapshot(data.snapshot);
        await showAlert(
          'Configuración guardada',
          `El reporte diario automático quedó configurado para enviarse a ${config.recipientEmail.trim()} a las ${config.sendTimeCr} (hora CR).`,
          'success'
        );
      } else {
        await showAlert('Error', data.error || 'No se pudo guardar la configuración.', 'error');
      }
    } catch {
      await showAlert('Error', 'Error de conexión al guardar la configuración.', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSendReportNow = async () => {
    if (!config.recipientEmail.trim() || !config.recipientEmail.includes('@')) {
      await showAlert('Correo requerido', 'Ingresa un correo electrónico válido para enviar el reporte.', 'warning');
      return;
    }

    setSendingNow(true);
    try {
      const res = await fetch('/api/reports/accounts-receivable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_now',
          recipientEmail: config.recipientEmail.trim(),
          ccEmail: config.ccEmail.trim(),
          excludeWebPurchases: config.excludeWebPurchases,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.config) setConfig(data.config);
        if (data.snapshot) setSnapshot(data.snapshot);
        await showAlert(
          'Reporte enviado con éxito',
          `Se envió el reporte de Cuentas por Cobrar en formato Excel (.xlsx) y PDF (.pdf) a ${config.recipientEmail.trim()}.`,
          'success'
        );
      } else {
        await showAlert('Error al enviar', data.error || 'No se pudo enviar el reporte por correo.', 'error');
      }
    } catch {
      await showAlert('Error', 'Error de conexión al intentar enviar el reporte.', 'error');
    } finally {
      setSendingNow(false);
    }
  };

  const handleDownloadFile = (format: 'xlsx' | 'pdf') => {
    const url = `/api/reports/accounts-receivable?format=${format}&excludeWeb=${config.excludeWebPurchases}`;
    window.open(url, '_blank');
  };

  const todaySent =
    snapshot?.reportDateCr && config.lastAutoSentDateCr === snapshot.reportDateCr;

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Reporte Diario de Cuentas por Cobrar
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                config.enabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  config.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              {config.enabled ? `Automático Activo (${config.sendTimeCr} CR)` : 'Automático Pausado'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Control de envíos diarios automáticos y manuales en Excel (.xlsx) y PDF (.pdf) a{' '}
            <strong className="text-slate-700">{config.recipientEmail}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleDownloadFile('xlsx')}
            className="h-9 px-3.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>Descargar Excel</span>
          </button>

          <button
            type="button"
            onClick={() => handleDownloadFile('pdf')}
            className="h-9 px-3.5 rounded-lg border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-800 font-semibold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <FileText size={15} className="text-red-600" />
            <span>Descargar PDF</span>
          </button>

          <button
            type="button"
            onClick={handleSendReportNow}
            disabled={sendingNow || loading}
            className="h-9 px-4 rounded-lg bg-[#0B2737] hover:bg-brand-blue text-white font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            {sendingNow ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
            <span>{sendingNow ? 'Enviando Excel + PDF...' : 'Enviar Reporte Ahora'}</span>
          </button>
        </div>
      </div>

      {/* KPIs del Corte Actual */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total por Cobrar (USD)
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 tabular-nums">
                ${snapshot ? snapshot.totalPendingUsd.toFixed(2) : '0.00'}
              </span>
              <span className="text-xs font-semibold text-slate-400">USD</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {config.excludeWebPurchases ? 'Sin Compra en sitio web' : 'Incluye Compra en sitio web'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
            <DollarSign size={19} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Equivalente en Colones
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-brand-blue tabular-nums">
                ₡{snapshot ? snapshot.totalPendingCrc.toLocaleString('es-CR') : '0'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              T.C. de referencia: ₡{snapshot?.exchangeRate || 500}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-sm">
            ₡
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Cartera en el Reporte
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-amber-600 tabular-nums">
                {snapshot?.totalClientsCount ?? 0}
              </span>
              <span className="text-xs font-medium text-slate-400">clientes</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {snapshot?.totalPendingInvoicesCount ?? 0} facturas pendientes
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Users size={19} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Estado del Envío de Hoy
            </p>
            <div className="flex items-center gap-1.5 mt-1.5">
              {todaySent ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={13} />
                  <span>Enviado Hoy</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock size={13} />
                  <span>Programado ({config.sendTimeCr})</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 truncate">
              Último: {config.history[0]?.sentAtDisplay || 'Sin envíos previos'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Mail size={19} />
          </div>
        </div>
      </div>

      {/* Configuración + Vista Previa / Historial */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Panel izquierdo: Configuración del Envío Diario */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-brand-blue" />
              <h2 className="text-sm font-bold text-slate-900">Configuración de Envío Diario</h2>
            </div>
            <button
              type="button"
              onClick={loadControlData}
              className="text-slate-400 hover:text-brand-blue p-1 rounded-md transition-colors cursor-pointer"
              title="Refrescar datos"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <form onSubmit={handleSaveConfig} className="p-5 space-y-4">
            {/* Switch Automático */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900">Envío Diario Automático</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Envía automáticamente el Excel y PDF una vez al día.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  config.enabled ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                    config.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Correo Destinatario Principal */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Correo Destinatario Principal
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={config.recipientEmail}
                  onChange={e => setConfig({ ...config, recipientEmail: e.target.value })}
                  placeholder="jose.gonzalez@jrscargocr.com"
                  className="w-full h-10 pl-9 pr-3.5 rounded-lg border border-slate-200/90 bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm font-semibold text-slate-800"
                />
              </div>
            </div>

            {/* Correo en Copia (CC) opcional */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Copia (CC) Opcional
              </label>
              <input
                type="text"
                value={config.ccEmail}
                onChange={e => setConfig({ ...config, ccEmail: e.target.value })}
                placeholder="Ej. contabilidad@jrscargocr.com (opcional)"
                className="w-full h-10 px-3.5 rounded-lg border border-slate-200/90 bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm text-slate-800"
              />
            </div>

            {/* Hora Programada y Filtro de Compra en Sitio Web */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Hora Diaria (Costa Rica)
                </label>
                <div className="relative">
                  <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="time"
                    value={config.sendTimeCr}
                    onChange={e => setConfig({ ...config, sendTimeCr: e.target.value })}
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200/90 bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Filtro de Cartera
                </label>
                <select
                  value={config.excludeWebPurchases ? 'exclude' : 'include'}
                  onChange={e =>
                    setConfig({
                      ...config,
                      excludeWebPurchases: e.target.value === 'exclude',
                    })
                  }
                  className="w-full h-10 px-3 rounded-lg border border-slate-200/90 bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 focus:outline-none text-xs sm:text-sm font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="exclude">Excluir Compra en Sitio Web</option>
                  <option value="include">Incluir Compra en Sitio Web</option>
                </select>
              </div>
            </div>

            {/* Formatos Adjuntos */}
            <div className="p-3.5 rounded-xl bg-brand-blue/[0.04] border border-brand-blue/15 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-blue">
                Archivos Adjuntos Incluidos en Cada Correo
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-emerald-200 text-emerald-800 font-semibold">
                  <FileSpreadsheet size={13} className="text-emerald-600" />
                  <span>Excel (.xlsx con 2 hojas)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-red-200 text-red-800 font-semibold">
                  <FileText size={13} className="text-red-600" />
                  <span>Reporte Ejecutivo (.pdf)</span>
                </span>
              </div>
            </div>

            <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
              <button
                type="submit"
                disabled={savingConfig}
                className="flex-1 h-10 px-4 rounded-lg bg-brand-blue hover:bg-[#0e354b] text-white font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {savingConfig ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                <span>{savingConfig ? 'Guardando...' : 'Guardar Configuración'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Panel derecho: Historial de Envíos y Bitácora de Control */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Historial de Reportes Enviados ({config.history.length})
              </h2>
              <p className="text-[11px] text-slate-500">
                Registro auditable de cada envío automático y manual con monto y destinatario.
              </p>
            </div>
            <Link
              href="/admin/cuentas-por-cobrar"
              className="text-xs font-semibold text-brand-blue hover:underline inline-flex items-center gap-1"
            >
              <span>Ver Cuentas por Cobrar</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1 max-h-[430px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50/95 border-b border-slate-200/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Fecha y Hora (CR)</th>
                  <th className="py-2.5 px-3">Destinatario</th>
                  <th className="py-2.5 px-3 text-center">Tipo</th>
                  <th className="py-2.5 px-3 text-right">Saldo Reportado</th>
                  <th className="py-2.5 px-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {config.history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 px-6 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <Mail size={26} className="text-slate-300" />
                        <p className="font-semibold text-slate-600">
                          Aún no hay envíos registrados en el historial
                        </p>
                        <p className="text-xs text-slate-400 max-w-sm">
                          Haz clic en el botón superior &ldquo;Enviar Reporte Ahora&rdquo; para mandar el primer reporte en Excel y PDF a {config.recipientEmail}.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  config.history.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-700">
                        {item.sentAtDisplay}
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-slate-900 truncate max-w-[200px]" title={item.recipientEmail}>
                          {item.recipientEmail}
                        </p>
                        {item.ccEmail && (
                          <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                            CC: {item.ccEmail}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            item.trigger === 'manual'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}
                        >
                          {item.trigger === 'manual' ? 'Manual' : 'Automático Diario'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap tabular-nums">
                        {item.status === 'sent' ? (
                          <>
                            <p className="font-bold text-slate-900">${item.totalPendingUsd.toFixed(2)} USD</p>
                            <p className="text-[10px] text-slate-400">
                              {item.clientsCount} clientes · {item.invoicesCount} fact.
                            </p>
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        {item.status === 'sent' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={11} />
                            <span>Enviado</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200"
                            title={item.errorMessage}
                          >
                            <AlertTriangle size={11} />
                            <span>Error</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Vista Previa de los Clientes Incluidos en el Reporte Actual */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Vista Previa del Reporte Actual ({snapshot?.clients.length ?? 0} clientes con saldo pendiente)
            </h2>
            <p className="text-[11px] text-slate-500">
              Esta es la información exacta que se incluye hoy en el Excel y el PDF adjuntos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Corte: <strong className="text-slate-800">{snapshot?.generatedAtDisplay || 'Cargando...'}</strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50/95 border-b border-slate-200/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              <tr>
                <th className="py-2.5 px-4 w-12">#</th>
                <th className="py-2.5 px-3.5">Cliente</th>
                <th className="py-2.5 px-3.5 text-center">Facturas Pendientes</th>
                <th className="py-2.5 px-3.5">Detalle de Comprobantes</th>
                <th className="py-2.5 px-3.5 text-right">Saldo (USD)</th>
                <th className="py-2.5 px-4 text-right">Equivalente (CRC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Generando vista previa de cuentas por cobrar...
                  </td>
                </tr>
              ) : !snapshot || snapshot.clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No hay clientes con saldos pendientes en este momento.
                  </td>
                </tr>
              ) : (
                snapshot.clients.map((client, idx) => (
                  <tr key={client.clientId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 text-xs font-semibold text-slate-400 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <p className="font-semibold text-slate-900">{client.clientName}</p>
                      <p className="text-xs text-slate-400">{client.clientEmail || 'Sin correo'}</p>
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-full font-semibold text-xs tabular-nums">
                        {client.pendingInvoicesCount}{' '}
                        {client.pendingInvoicesCount === 1 ? 'factura' : 'facturas'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-xs text-slate-600 max-w-xs truncate">
                      {client.invoices.map(i => `${i.invoiceNumber} ($${i.pendingUsd.toFixed(2)})`).join(', ')}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-black text-slate-900 tabular-nums whitespace-nowrap">
                      ${client.totalPendingUsd.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-xs font-semibold text-slate-500 tabular-nums whitespace-nowrap">
                      ₡{client.totalPendingCrc.toLocaleString('es-CR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
