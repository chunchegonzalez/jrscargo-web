import Link from 'next/link';
import Image from 'next/image';
import { Mail, Lock, User, Phone, MapPin, ArrowRight } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa';

export default function RegisterPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-brand-bg-section py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl shadow-soft">
        
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block mb-6">
            <Image 
              src="/logo.png" 
              alt="JRS CARGO" 
              width={180} 
              height={70} 
              className="w-auto h-12 object-contain mx-auto"
            />
          </Link>
          <h2 className="text-3xl font-black text-brand-blue tracking-tight">Crear mi Casillero</h2>
          <p className="mt-3 text-brand-text-gray text-sm">
            Regístrate gratis y obtén tu dirección física en Miami hoy mismo.
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" action="/dashboard">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-brand-text-gray mb-1">
                Nombre
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-text-light">
                  <User size={18} />
                </div>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="input-field pl-11 w-full"
                  placeholder="Juan"
                />
              </div>
            </div>

            {/* Apellido */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-brand-text-gray mb-1">
                Apellidos
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-text-light">
                  <User size={18} />
                </div>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="input-field pl-11 w-full"
                  placeholder="Pérez"
                />
              </div>
            </div>

            {/* Correo */}
            <div className="md:col-span-2">
              <label htmlFor="email" className="block text-sm font-medium text-brand-text-gray mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-text-light">
                  <Mail size={18} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input-field pl-11 w-full"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>

            {/* Teléfono */}
            <div className="md:col-span-2">
              <label htmlFor="phone" className="block text-sm font-medium text-brand-text-gray mb-1">
                Teléfono en Costa Rica
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-text-light">
                  <Phone size={18} />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className="input-field pl-11 w-full"
                  placeholder="+506 8888 8888"
                />
              </div>
            </div>

            {/* Provincia */}
            <div className="md:col-span-2">
              <label htmlFor="province" className="block text-sm font-medium text-brand-text-gray mb-1">
                Provincia de Entrega
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-text-light">
                  <MapPin size={18} />
                </div>
                <select
                  id="province"
                  name="province"
                  required
                  className="select-field pl-11 w-full"
                >
                  <option value="">Selecciona una provincia...</option>
                  <option value="sanjose">San José</option>
                  <option value="alajuela">Alajuela</option>
                  <option value="cartago">Cartago</option>
                  <option value="heredia">Heredia</option>
                  <option value="guanacaste">Guanacaste</option>
                  <option value="puntarenas">Puntarenas</option>
                  <option value="limon">Limón</option>
                </select>
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-brand-text-gray mb-1">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-text-light">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="input-field pl-11 w-full"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Confirmar Contraseña */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-brand-text-gray mb-1">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-text-light">
                  <Lock size={18} />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="input-field pl-11 w-full"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-brand-blue focus:ring-brand-blue border-gray-300 rounded mt-1"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="text-brand-text-gray">
                He leído y acepto los{' '}
                <Link href="/terminos-y-condiciones" className="text-brand-blue hover:text-brand-red underline">
                  Términos y Condiciones
                </Link>{' '}
                y la{' '}
                <Link href="/politica-de-privacidad" className="text-brand-blue hover:text-brand-red underline">
                  Política de Privacidad
                </Link>
                .
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full btn-primary py-4 px-4 shadow-xl shadow-brand-blue/20 flex items-center justify-center gap-2 text-lg"
            >
              Crear mi Casillero Ahora
              <ArrowRight size={20} />
            </button>
          </div>
        </form>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-brand-text-light">O regístrate rápidamente con</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl shadow-sm bg-white text-sm font-semibold text-brand-text-gray hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <FaGoogle size={18} className="text-[#DB4437]" />
              Crear cuenta con Google
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-brand-text-gray">
          ¿Ya tienes un casillero?{' '}
          <Link href="/login" className="font-semibold text-brand-blue hover:text-brand-red transition-colors">
            Inicia sesión aquí
          </Link>
        </p>

      </div>
    </div>
  );
}
