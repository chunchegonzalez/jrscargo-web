import Link from 'next/link';
import Image from 'next/image';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa';

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-brand-bg-section py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl shadow-soft">
        
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
          <h2 className="text-3xl font-black text-brand-blue tracking-tight">Iniciar Sesión</h2>
          <p className="mt-3 text-brand-text-gray text-sm">
            Bienvenido de vuelta a tu casillero internacional.
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" action="/dashboard">
          <div className="space-y-4">
            
            {/* Correo */}
            <div>
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
                  autoComplete="current-password"
                  required
                  className="input-field pl-11 w-full"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-brand-blue focus:ring-brand-blue border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-brand-text-gray">
                Recordarme
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-semibold text-brand-blue hover:text-brand-red transition-colors">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full btn-primary py-3 px-4 shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2"
            >
              Entrar al Casillero
              <ArrowRight size={18} />
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-brand-text-light">O continúa con</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl shadow-sm bg-white text-sm font-semibold text-brand-text-gray hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <FaGoogle size={18} className="text-[#DB4437]" />
              Iniciar sesión con Google
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-brand-text-gray">
          ¿No tienes un casillero?{' '}
          <Link href="/registro" className="font-semibold text-brand-blue hover:text-brand-red transition-colors">
            Crea uno gratis aquí
          </Link>
        </p>

      </div>
    </div>
  );
}
