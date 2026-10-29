'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Search, DollarSign, FileText, ArrowRight, Printer, 
  Link2, Copy, Check, ExternalLink, MessageCircle, X,
  ShieldCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getInvoiceStats } from '@/lib/billing';

type ClientBalance = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  pendingInvoicesCount: number;
  totalBalance: number;
};

export default function CuentasPorCobrarPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalGeneral, setTotalGeneral] = useState(0);
  const [exchangeRate, setExchangeRate] = useState<number>(500);

  // State for sharing client link
  const [shareClient, setShareClient] = useState<ClientBalance | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [modalCopied, setModalCopied] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [clientsRes, invoicesRes, rateRes] = await Promise.all([
        fetch('/api/clients', { cache: 'no-store' }),
        fetch('/api/invoices', { cache: 'no-store' }),
        fetch('/api/exchange-rate', { cache: 'no-store' })
      ]);

      const clientsData = await clientsRes.json();
      const invoicesData = await invoicesRes.json();

      if (rateRes.ok) {
        const rateData = await rateRes.json();
        if (rateData.success && Number(rateData.rate) > 0) {
          setExchangeRate(Number(rateData.rate));
        }
      }

      if (!clientsData.success || !invoicesData.success) {
        throw new Error('Failed to load data');
      }

      // Procesar todas las facturas para calcular saldos
      const allInvoices = invoicesData.data;
      
      const balancesMap: Record<string, ClientBalance> = {};

      clientsData.data.forEach((c: Record<string, unknown>) => {
        balancesMap[c.id as string] = {
          id: c.id as string,
          name: c.name as string,
          email: (c.email as string) || '',
          phone: (c.phone as string) || '',
          pendingInvoicesCount: 0,
          totalBalance: 0
        };
      });

      let total = 0;

      allInvoices.forEach((inv: Record<string, unknown>) => {
        if (!inv.client_id || !balancesMap[inv.client_id as string]) return;
        
        const stats = getInvoiceStats(inv);
        
        if (stats.pending > 0) {
          balancesMap[inv.client_id as string].totalBalance += stats.pending;
          balancesMap[inv.client_id as string].pendingInvoicesCount += 1;
          total += stats.pending;
        }
      });

      // Filtrar solo los que tienen saldo
      const clientsWithBalance = Object.values(balancesMap)
        .filter(c => c.totalBalance > 0)
        .sort((a, b) => b.totalBalance - a.totalBalance);

      setClients(clientsWithBalance);
      setTotalGeneral(total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getClientPublicUrl = (clientId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.jrscargocr.com';
    return `${origin}/estado-cuenta/${clientId}`;
  };

  const handleCopyLink = (client: ClientBalance, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = getClientPublicUrl(client.id);
    navigator.clipboard.writeText(url);
    setCopiedId(client.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cuentas por Cobrar</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-blue/10 text-brand-blue border border-brand-blue/15">
              Cartera Activa
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Gestiona los saldos pendientes y comparte enlaces públicos de pago sin contraseña para clientes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/admin/contabilidad/pagos')}
            className="h-9 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-2xs inline-flex items-center gap-1.5 font-semibold text-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <FileText size={14} className="text-slate-500" />
            <span>Historial de Pagos</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total por Cobrar (USD)</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 tabular-nums">
                ${totalGeneral.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-slate-400">USD</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Saldo pendiente acumulado</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
            <DollarSign size={19} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Equivalente en Colones</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-brand-blue tabular-nums">
                ₡{Math.round(totalGeneral * exchangeRate).toLocaleString('es-CR')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">T.C. de referencia: ₡{exchangeRate}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-sm">
            ₡
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Clientes con Saldo</p>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-amber-600 tabular-nums">
                {clients.length}
              </span>
              <span className="text-xs font-medium text-slate-400">cuentas</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Con facturas por liquidar</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <FileText size={19} />
          </div>
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
            <input 
              type="text" 
              placeholder="Buscar cliente por nombre o correo..." 
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
            <span className="h-9 px-3 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center tabular-nums">
              {filteredClients.length} {filteredClients.length === 1 ? 'cliente' : 'clientes'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/95 border-b border-slate-200/90">
              <tr className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                <th className="py-2.5 px-3.5 pl-5">Cliente</th>
                <th className="py-2.5 px-3.5 text-center">Facturas Pendientes</th>
                <th className="py-2.5 px-3.5 text-right">Saldo Total</th>
                <th className="py-2.5 px-3.5 pr-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 px-6 text-center text-slate-400">Cargando saldos...</td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 px-6 text-center text-slate-400">
                    No hay clientes con saldos pendientes. ¡Excelente trabajo!
                  </td>
                </tr>
              ) : (
                filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-slate-50/90 transition-colors group">
                    <td className="py-2.5 px-3.5 pl-5">
                      <p className="font-semibold text-slate-900">{client.name}</p>
                      <p className="text-xs text-slate-400">{client.email || 'Sin correo'}</p>
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-full font-semibold text-xs tabular-nums">
                        {client.pendingInvoicesCount} {client.pendingInvoicesCount === 1 ? 'factura' : 'facturas'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right tabular-nums whitespace-nowrap">
                      <p className="text-sm font-black text-slate-900">${client.totalBalance.toFixed(2)}</p>
                      <p className="text-[11px] font-medium text-slate-400">≈ ₡{Math.round(client.totalBalance * exchangeRate).toLocaleString('es-CR')}</p>
                    </td>
                    <td className="py-2.5 px-3.5 pr-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        
                        {/* Botón Enlace Cliente (Público sin contraseña) */}
                        <button
                          onClick={() => setShareClient(client)}
                          className="h-8 px-2.5 bg-brand-blue/[0.08] hover:bg-brand-blue/15 text-brand-blue border border-brand-blue/15 font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                          title="Crear y compartir enlace público de saldo para el cliente"
                        >
                          <Link2 size={14} />
                          <span className="hidden sm:inline">Enlace</span>
                        </button>

                        {/* Botón Extracto Interno */}
                        <button 
                          onClick={() => router.push(`/admin/cuentas-por-cobrar/estado-cuenta/${client.id}`)} 
                          className="h-8 px-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                          title="Ver Extracto de Cuenta"
                        >
                          <Printer size={14} className="text-slate-500" /> 
                          <span className="hidden sm:inline">Extracto</span>
                        </button>

                        {/* Botón Recibir Pago */}
                        <button 
                          onClick={() => router.push(`/admin/cuentas-por-cobrar/recibir/${client.id}`)} 
                          className="h-8 px-3 bg-brand-blue text-white font-semibold rounded-lg text-xs hover:bg-[#0e354b] transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Recibir Pago</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Tabla */}
        <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>
            Mostrando <strong className="font-semibold text-slate-700">{filteredClients.length}</strong> de{' '}
            <strong className="font-semibold text-slate-700">{clients.length}</strong> clientes con saldo pendiente
          </span>
        </div>
      </div>

      {/* Modal de Enlace para Cliente */}
      {shareClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200/80 relative">
            <button
              onClick={() => {
                setShareClient(null);
                setModalCopied(false);
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-brand-blue/10 text-brand-blue rounded-xl flex items-center justify-center shrink-0">
                <Link2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Enlace de Saldo para Cliente</h3>
                <p className="text-xs text-slate-500">Acceso directo sin usuario ni contraseña</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 mb-4 space-y-2">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-slate-500 font-medium">Cliente:</span>
                <span className="font-bold text-slate-900">{shareClient.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-slate-500 font-medium">Saldo Pendiente:</span>
                <span className="font-black text-brand-blue tabular-nums">
                  ${shareClient.totalBalance.toFixed(2)} USD
                  <span className="text-xs font-medium text-slate-500 ml-1">
                    (≈ ₡{Math.round(shareClient.totalBalance * exchangeRate).toLocaleString('es-CR')})
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-slate-500 font-medium">Facturas Pendientes:</span>
                <span className="font-semibold text-amber-700">{shareClient.pendingInvoicesCount} factura(s)</span>
              </div>
            </div>

            <div className="space-y-1.5 mb-4">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Enlace Público del Cliente:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getClientPublicUrl(shareClient.id)}
                  className="w-full h-9 bg-slate-50 border border-slate-200/90 rounded-lg px-3 text-xs text-slate-700 font-mono select-all focus:outline-none focus:border-brand-blue"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getClientPublicUrl(shareClient.id));
                    setModalCopied(true);
                    setTimeout(() => setModalCopied(false), 2500);
                  }}
                  className={`h-9 px-3.5 rounded-lg font-semibold text-xs inline-flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                    modalCopied 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-brand-blue text-white hover:bg-[#0e354b]'
                  }`}
                >
                  {modalCopied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{modalCopied ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 mb-5 text-xs text-emerald-900 flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                El cliente podrá ver su saldo total, desglose de facturas y opciones de pago por SINPE Móvil sin tener que iniciar sesión ni ingresar contraseñas.
              </p>
            </div>

            {/* Acciones del Modal */}
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={getClientPublicUrl(shareClient.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-xs inline-flex items-center justify-center gap-1.5 transition-colors text-center"
              >
                <ExternalLink size={14} />
                <span>Ver como Cliente</span>
              </a>

              <a
                href={`https://wa.me/${shareClient.phone ? shareClient.phone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent(`Estimado(a) ${shareClient.name}, le compartimos el enlace para consultar su saldo pendiente y estado de cuenta en JRS Cargo: ${getClientPublicUrl(shareClient.id)}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 px-4 bg-[#25D366] hover:bg-[#20b858] text-white font-semibold rounded-lg text-xs inline-flex items-center justify-center gap-1.5 transition-colors text-center shadow-2xs"
              >
                <MessageCircle size={14} />
                <span>Enviar por WhatsApp</span>
              </a>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
