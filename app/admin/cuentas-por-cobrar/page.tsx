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
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-blue mb-2">Cuentas por Cobrar</h1>
          <p className="text-gray-500">Gestiona los saldos pendientes y comparte enlaces públicos de pago sin contraseña para clientes.</p>
        </div>
      </div>

      {/* Tarjeta de Resumen */}
      <div className="bg-gradient-to-br from-brand-blue to-[#0A2636] rounded-3xl p-8 shadow-lg text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <p className="text-brand-blue-light font-bold uppercase tracking-wider mb-2 text-sm flex items-center gap-2">
            <DollarSign size={18} /> Total por Cobrar
          </p>
          <h2 className="text-4xl sm:text-5xl font-black mb-1">
            ${totalGeneral.toFixed(2)} <span className="text-xl text-brand-blue-light/70">USD</span>
          </h2>
          <p className="text-sm font-extrabold text-brand-yellow flex items-center gap-1.5 mt-1">
            <span>≈ ₡{Math.round(totalGeneral * exchangeRate).toLocaleString('es-CR')} CRC</span>
            <span className="text-white/60 font-normal text-xs">(T.C. ₡{exchangeRate})</span>
          </p>
        </div>
        <div className="relative z-10 flex gap-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center min-w-[120px]">
            <p className="text-3xl font-black mb-1">{clients.length}</p>
            <p className="text-xs font-bold text-brand-blue-light uppercase tracking-wider">Clientes en Mora</p>
          </div>
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
            <FileText className="text-brand-blue" size={24} /> 
            Directorio de Saldos
          </h2>
          
          <div className="relative w-full md:w-72">
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue font-medium" 
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Facturas Pendientes</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Saldo Total</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500 font-medium">Cargando saldos...</td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500 font-medium">No hay clientes con saldos pendientes. ¡Excelente trabajo!</td>
                </tr>
              ) : (
                filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-4">
                      <p className="font-bold text-gray-800">{client.name}</p>
                      <p className="text-sm text-gray-500">{client.email || 'Sin correo'}</p>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[32px] h-8 px-2 bg-orange-50 text-orange-600 rounded-lg font-black text-sm">
                        {client.pendingInvoicesCount}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <p className="text-lg font-black text-brand-blue">${client.totalBalance.toFixed(2)}</p>
                      <p className="text-xs font-bold text-gray-400">≈ ₡{Math.round(client.totalBalance * exchangeRate).toLocaleString('es-CR')}</p>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        
                        {/* Botón Enlace Cliente (Público sin contraseña) */}
                        <button
                          onClick={() => setShareClient(client)}
                          className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-brand-blue font-bold rounded-xl text-sm transition-colors flex items-center gap-1.5"
                          title="Crear y compartir enlace público de saldo para el cliente"
                        >
                          <Link2 size={16} />
                          <span className="hidden sm:inline">Enlace</span>
                        </button>

                        {/* Botón Extracto Interno */}
                        <button 
                          onClick={() => router.push(`/admin/cuentas-por-cobrar/estado-cuenta/${client.id}`)} 
                          className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-xl text-sm transition-colors flex items-center gap-1.5"
                          title="Ver Extracto de Cuenta"
                        >
                          <Printer size={16} /> 
                          <span className="hidden sm:inline">Extracto</span>
                        </button>

                        {/* Botón Recibir Pago */}
                        <button 
                          onClick={() => router.push(`/admin/cuentas-por-cobrar/recibir/${client.id}`)} 
                          className="px-4 py-2 bg-brand-blue text-white font-bold rounded-xl text-sm hover:bg-brand-blue/90 transition-colors shadow-sm flex items-center gap-2"
                        >
                          Recibir Pago <ArrowRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Enlace para Cliente */}
      {shareClient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-100 relative">
            <button
              onClick={() => {
                setShareClient(null);
                setModalCopied(false);
              }}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-50 text-brand-blue rounded-2xl flex items-center justify-center">
                <Link2 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-brand-blue">Enlace de Saldo para Cliente</h3>
                <p className="text-xs text-gray-400">Acceso directo sin usuario ni contraseña</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-gray-100 mb-5 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-bold">Cliente:</span>
                <span className="font-black text-gray-800">{shareClient.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-bold">Saldo Pendiente:</span>
                <span className="font-black text-brand-blue text-base">
                  ${shareClient.totalBalance.toFixed(2)} USD
                  <span className="text-xs font-semibold text-gray-500 ml-1">
                    (≈ ₡{Math.round(shareClient.totalBalance * exchangeRate).toLocaleString('es-CR')})
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-bold">Facturas Pendientes:</span>
                <span className="font-bold text-orange-600">{shareClient.pendingInvoicesCount} factura(s)</span>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                Enlace Público del Cliente:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getClientPublicUrl(shareClient.id)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-700 font-mono select-all focus:outline-none focus:border-brand-blue"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getClientPublicUrl(shareClient.id));
                    setModalCopied(true);
                    setTimeout(() => setModalCopied(false), 2500);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 ${
                    modalCopied 
                      ? 'bg-green-600 text-white' 
                      : 'bg-brand-blue text-white hover:bg-brand-blue/90'
                  }`}
                >
                  {modalCopied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{modalCopied ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div className="bg-green-50/70 border border-green-200/80 rounded-2xl p-4 mb-6 text-xs text-green-900 flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-green-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                El cliente podrá ver su saldo total, desglose de facturas y opciones de pago por SINPE Móvil sin tener que iniciar sesión ni ingresar contraseñas.
              </p>
            </div>

            {/* Acciones del Modal */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={getClientPublicUrl(shareClient.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors text-center"
              >
                <ExternalLink size={15} />
                <span>Ver como Cliente</span>
              </a>

              <a
                href={`https://wa.me/${shareClient.phone ? shareClient.phone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent(`Estimado(a) ${shareClient.name}, le compartimos el enlace para consultar su saldo pendiente y estado de cuenta en JRS Cargo: ${getClientPublicUrl(shareClient.id)}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 bg-[#25D366] hover:bg-[#20b858] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors text-center shadow-sm"
              >
                <MessageCircle size={15} />
                <span>Enviar por WhatsApp</span>
              </a>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
