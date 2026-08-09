'use client';

import React, { useEffect, useState } from 'react';
import { Package, Search, Filter, RefreshCw } from 'lucide-react';

interface InventoryItem {
  id: string;
  client: string;
  weight: string;
  status: string;
  date: string;
}

export default function BodegaInventario() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const loadInventory = () => {
      const saved = JSON.parse(localStorage.getItem('jrs_inventory') || '[]');
      setInventory(saved);
    };
    loadInventory();
  }, []);

  const activePackages = inventory.filter(p => p.status === 'En Bodega CR').length;

  if (!mounted) return null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-blue mb-2">Inventario Local</h1>
          <p className="text-gray-500">Gestión de paquetes físicos en la bodega de Costa Rica.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <span className="font-bold text-brand-blue">{activePackages} Paquetes Activos</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Barra de herramientas */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por tracking, cliente..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-blue focus:ring-0 text-sm"
            />
          </div>
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-brand-blue font-semibold text-sm hover:bg-gray-50 transition-colors">
            <Filter size={16} /> Filtrar
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                <th className="p-4 pl-6">Tracking</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Peso</th>
                <th className="p-4">Fecha de Ingreso</th>
                <th className="p-4">Estado Interno</th>
                <th className="p-4 pr-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {inventory.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">No hay paquetes registrados localmente aún.</td>
                </tr>
              )}
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-4 pl-6 font-bold text-brand-blue flex items-center gap-3">
                    <Package size={16} className="text-gray-400" />
                    {item.id}
                  </td>
                  <td className="p-4 font-medium text-gray-700">{item.client}</td>
                  <td className="p-4 text-gray-500">{item.weight}</td>
                  <td className="p-4 text-gray-500">{item.date}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      item.status === 'En Bodega CR' 
                        ? 'bg-brand-blue/10 text-brand-blue'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <button className="text-brand-blue font-bold text-xs hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Footer Tabla */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 text-center font-medium">
          Mostrando {inventory.length} de {inventory.length} paquetes
        </div>
      </div>
    </div>
  );
}
