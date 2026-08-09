'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, Camera, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-brand-blue text-white pt-16 pb-8">
      <div className="container-max px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* Brand */}
          <div className="space-y-6">
            <Link href="/" className="inline-block">
              <Image 
                src="/logo.png" 
                alt="JRS CARGO" 
                width={200} 
                height={75} 
                className="w-auto h-12 md:h-14 object-contain brightness-0 invert opacity-90 hover:opacity-100 transition-opacity"
              />
            </Link>
            <p className="text-white/80 text-sm leading-relaxed text-balance">
              Conectamos Costa Rica con el mundo mediante soluciones de transporte aéreo y marítimo diseñadas para hacer tus compras internacionales más simples.
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-6">Servicios</h3>
            <ul className="space-y-4">
              <li>
                <Link href="/#tarifas" className="text-white/80 hover:text-brand-yellow transition-colors text-sm">
                  Aéreo Estados Unidos
                </Link>
              </li>
              <li>
                <Link href="/#tarifas" className="text-white/80 hover:text-brand-yellow transition-colors text-sm">
                  Marítimo Estados Unidos
                </Link>
              </li>
              <li>
                <Link href="/#tarifas" className="text-white/80 hover:text-brand-yellow transition-colors text-sm">
                  Aéreo España
                </Link>
              </li>
              <li>
                <Link href="/#tarifas" className="text-white/80 hover:text-brand-yellow transition-colors text-sm">
                  Aéreo China
                </Link>
              </li>
            </ul>
          </div>

          {/* Customers */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-6">Clientes</h3>
            <ul className="space-y-4">
              <li>
                <a href="https://worldboxcr.com/jrscargo/register" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-brand-yellow transition-colors text-sm">
                  Crear casillero
                </a>
              </li>
              <li>
                <a href="https://worldboxcr.com/jrscargo/login" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-brand-yellow transition-colors text-sm">
                  Iniciar sesión
                </a>
              </li>
              <li>
                <Link href="/#tracking" className="text-white/80 hover:text-brand-yellow transition-colors text-sm">
                  Tracking
                </Link>
              </li>
              <li>
                <Link href="/#cotizador" className="text-white/80 hover:text-brand-yellow transition-colors text-sm">
                  Cotizador
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-6">Contacto</h3>
            <ul className="space-y-4">
              <li>
                <a href="https://wa.me/50672601238" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white/80 hover:text-brand-yellow transition-colors text-sm group">
                  <Phone size={18} className="group-hover:scale-110 transition-transform" />
                  +506 7260 1238
                </a>
              </li>
              <li>
                <a href="mailto:info@jrscargocr.com" className="flex items-center gap-3 text-white/80 hover:text-brand-yellow transition-colors text-sm group">
                  <Mail size={18} className="group-hover:scale-110 transition-transform" />
                  info@jrscargocr.com
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com/jrscargocr/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white/80 hover:text-brand-yellow transition-colors text-sm group">
                  <Camera size={18} className="group-hover:scale-110 transition-transform" />
                  @jrscargocr
                </a>
              </li>
              <li>
                <a href="https://www.google.com/maps/place/JRS+CARGO+CR/@9.9999918,-84.0962979,253m/data=!3m2!1e3!4b1!4m6!3m5!1s0x8fa0e50070b2b9c3:0x57e9993aae41eab2!8m2!3d9.9999905!4d-84.0956542!16s%2Fg%2F11zd7mddck?entry=ttu&g_ep=EgoyMDI2MDgwNS4xIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white/80 hover:text-brand-yellow transition-colors text-sm group">
                  <MapPin size={18} className="group-hover:scale-110 transition-transform" />
                  Heredia, Costa Rica
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 mt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm text-white/60 text-center md:text-left">
            JRS CARGO CR &copy; 2026. Todos los derechos reservados.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 md:pr-20">
            <Link href="/politica-de-privacidad" className="text-sm text-white/60 hover:text-white transition-colors p-2 -m-2">
              Política de privacidad
            </Link>
            <Link href="/terminos-y-condiciones" className="text-sm text-white/60 hover:text-white transition-colors p-2 -m-2">
              Términos y condiciones
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
