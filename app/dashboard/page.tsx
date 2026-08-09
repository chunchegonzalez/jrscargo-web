'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Package, 
  MapPin, 
  Bell, 
  Search, 
  Settings, 
  LogOut, 
  FileText, 
  PlaneTakeoff,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MOCK_PACKAGES = [
  { id: 'TRK-982374', description: 'Amazon - Laptop Asus', status: 'Miami', date: '2026-08-08', weight: '4.5 lb' },
  { id: 'TRK-102938', description: 'Shein - Ropa de Verano', status: 'En Tránsito', date: '2026-08-06', weight: '2.1 lb' },
  { id: 'TRK-554123', description: 'eBay - Repuestos', status: 'Entregado', date: '2026-08-01', weight: '1.2 lb' },
];

export default function DashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      
      {/* Mobile Header (Shows only on small screens) */}
      <div className="md:hidden bg-brand-blue text-white p-4 flex items-center justify-between shadow-md z-30">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="JRS" width={100} height={40} className="brightness-0 invert" />
        </Link>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || typeof window !== 'undefined' && window.innerWidth >= 768) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`fixed md:static inset-y-0 left-0 w-72 bg-white shadow-xl z-20 flex flex-col h-full border-r border-gray-100 ${!isSidebarOpen ? 'hidden md:flex' : 'flex'}`}
          >
            <div className="p-6 border-b border-gray-100 hidden md:block">
              <Link href="/">
                <Image src="/logo.png" alt="JRS CARGO" width={140} height={50} className="w-auto h-10 object-contain" />
              </Link>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="w-12 h-12 bg-brand-blue rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner">
                  JP
                </div>
                <div>
                  <p className="font-bold text-brand-blue leading-tight">Juan Pérez</p>
                  <p className="text-xs text-brand-text-gray font-semibold bg-gray-200 px-2 py-0.5 rounded-full inline-block mt-1">JRS-1054</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
              <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 bg-brand-blue/5 text-brand-blue rounded-xl font-bold transition-colors">
                <Package size={20} /> Mis Paquetes
              </Link>
              <Link href="#" className="flex items-center gap-3 px-4 py-3 text-brand-text-gray hover:bg-gray-50 hover:text-brand-blue rounded-xl font-semibold transition-colors">
                <PlaneTakeoff size={20} /> Pre-alertar
              </Link>
              <Link href="#" className="flex items-center gap-3 px-4 py-3 text-brand-text-gray hover:bg-gray-50 hover:text-brand-blue rounded-xl font-semibold transition-colors">
                <FileText size={20} /> Facturas
              </Link>
              <Link href="#" className="flex items-center gap-3 px-4 py-3 text-brand-text-gray hover:bg-gray-50 hover:text-brand-blue rounded-xl font-semibold transition-colors">
                <Settings size={20} /> Configuración
              </Link>
            </nav>

            <div className="p-4 border-t border-gray-100">
              <Link href="/" className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl font-semibold transition-colors">
                <LogOut size={20} /> Cerrar Sesión
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 py-4 px-6 md:px-10 flex items-center justify-between z-10 shrink-0">
          <h1 className="text-2xl font-black text-brand-blue tracking-tight hidden md:block">Dashboard</h1>
          
          <div className="flex-1 flex items-center justify-end gap-4 md:gap-6 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar paquete (tracking)..." 
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
              />
            </div>
            <button className="relative p-2 text-gray-400 hover:text-brand-blue transition-colors rounded-full hover:bg-gray-50 shrink-0">
              <Bell size={22} />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-brand-red rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Locker Address Card */}
            <div className="bg-gradient-to-r from-brand-blue to-[#12435e] rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-brand-blue/10 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
              
              <div className="flex items-start gap-5 relative z-10 w-full md:w-auto">
                <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
                  <MapPin size={28} className="text-brand-yellow" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white/90 mb-1">Tu Dirección en Miami</h2>
                  <p className="text-sm text-white/70 mb-3">Úsala como &quot;Shipping Address&quot; en tus tiendas favoritas.</p>
                  <div className="bg-black/20 p-4 rounded-xl border border-white/10 font-mono text-sm leading-relaxed max-w-sm">
                    <strong>Juan Pérez JRS-1054</strong><br/>
                    8456 NW 72nd St<br/>
                    Miami, FL 33166<br/>
                    Tel: (305) 592-1234
                  </div>
                </div>
              </div>

              <div className="relative z-10 w-full md:w-auto shrink-0 flex justify-center">
                <button className="btn-primary py-3 px-6 bg-brand-yellow text-brand-blue shadow-lg shadow-brand-yellow/20 font-bold hover:bg-amber-400 w-full md:w-auto">
                  Copiar Dirección
                </button>
              </div>
            </div>

            {/* Packages Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-brand-blue">Tus Paquetes Recientes</h2>
                <button className="text-sm font-semibold text-brand-red hover:text-brand-blue transition-colors">
                  Ver todos
                </button>
              </div>

              <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100 text-sm font-semibold text-brand-text-gray">
                        <th className="py-4 px-6">Tracking / Descripción</th>
                        <th className="py-4 px-6">Fecha</th>
                        <th className="py-4 px-6">Peso</th>
                        <th className="py-4 px-6">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {MOCK_PACKAGES.map((pkg, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <p className="font-bold text-brand-blue">{pkg.id}</p>
                            <p className="text-sm text-brand-text-gray">{pkg.description}</p>
                          </td>
                          <td className="py-4 px-6 text-sm text-brand-text-gray">{pkg.date}</td>
                          <td className="py-4 px-6 text-sm text-brand-text-gray font-medium">{pkg.weight}</td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                              pkg.status === 'Miami' ? 'bg-brand-blue/10 text-brand-blue' :
                              pkg.status === 'En Tránsito' ? 'bg-brand-yellow/20 text-amber-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {pkg.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Empty State example (commented out for now, using mock data instead) */}
                {/* 
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <Package size={32} className="text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-brand-blue">No tienes paquetes aún</h3>
                  <p className="text-brand-text-gray text-sm mt-2 max-w-sm">Cuando realices una compra, envíala a tu casillero en Miami y aparecerá aquí automáticamente.</p>
                </div> 
                */}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-10 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
