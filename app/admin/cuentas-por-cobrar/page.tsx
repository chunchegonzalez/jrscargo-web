'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Search, DollarSign, FileText, ArrowRight, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getInvoiceStats } from '@/lib/billing';

type ClientBalance = {
  id: string;
  name: string;
  email: string;
  pendingInvoicesCount: number;
  totalBalance: number;
};

export default function CuentasPorCobrarPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalGeneral, setTotalGeneral] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [clientsRes, invoicesRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/invoices')
      ]);

      const clientsData = await clientsRes.json();
      const invoicesData = await invoicesRes.json();

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
          <p className="text-gray-500">Gestiona los saldos pendientes y registra pagos masivos de clientes.</p>
        </div>
      </div>

      {/* Tarjeta de Resumen */}
      <div className="bg-gradient-to-br from-brand-blue to-[#0A2636] rounded-3xl p-8 shadow-lg text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <p className="text-brand-blue-light font-bold uppercase tracking-wider mb-2 text-sm flex items-center gap-2">
            <DollarSign size={18} /> Total por Cobrar
          </p>
          <h2 className="text-5xl font-black">${totalGeneral.toFixed(2)} <span className="text-2xl text-brand-blue-light/70">USD</span></h2>
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
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => router.push(`/admin/cuentas-por-cobrar/estado-cuenta/${client.id}`)} 
                          className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-xl text-sm transition-colors flex items-center gap-2"
                          title="Ver Estado de Cuenta"
                        >
                          <Printer size={16} /> <span className="hidden sm:inline">Extracto</span>
                        </button>
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
    </div>
  );
}
