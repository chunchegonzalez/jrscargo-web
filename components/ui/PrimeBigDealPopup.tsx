'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { X, ExternalLink, ShoppingBag, PackageOpen, Plane } from 'lucide-react';

const STORAGE_KEY = 'jrs_prime_big_deal_last_seen_date';
// Promotion cutoff: October 7, 2026 at 23:59:59 (America/Costa_Rica timezone: UTC-6)
export const PRIME_PROMO_EXPIRATION_ISO = '2026-10-07T23:59:59-06:00';

/**
 * Returns current date string (YYYY-MM-DD) in America/Costa_Rica timezone
 */
export function getCostaRicaDateString(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Costa_Rica',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Validates if the Amazon Prime Big Deal Days promo is currently active.
 * Evaluates specifically against the Costa Rica cutoff: 2026-10-07T23:59:59-06:00
 */
export function isPrimePromoActive(): boolean {
  try {
    const now = new Date();
    const expiration = new Date(PRIME_PROMO_EXPIRATION_ISO);
    return now.getTime() <= expiration.getTime();
  } catch {
    return false;
  }
}

export default function PrimeBigDealPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Mark popup as seen for today (Costa Rica timezone)
  const markAsSeenToday = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, getCostaRicaDateString());
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, []);

  // Close handler: sets state and marks as seen today
  const handleClose = useCallback(() => {
    markAsSeenToday();
    setIsOpen(false);
  }, [markAsSeenToday]);

  // Check eligibility and schedule popup display when entering the page
  useEffect(() => {
    // 1. Verify promotion is currently active (before Oct 7, 2026 23:59:59 Costa Rica time)
    if (!isPrimePromoActive()) return;

    // 2. Check if user already saw the popup today in Costa Rica time
    try {
      const lastSeenDate = localStorage.getItem(STORAGE_KEY);
      const todayCR = getCostaRicaDateString();
      if (lastSeenDate === todayCR) return;
    } catch {
      return;
    }

    // 3. Show when entering the page (smooth 600ms delay after hydration)
    const timer = setTimeout(() => {
      // Re-verify in case cutoff expired during delay
      if (isPrimePromoActive()) {
        previousActiveElementRef.current = document.activeElement as HTMLElement;
        setIsOpen(true);
        markAsSeenToday();
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [markAsSeenToday]);

  // Lock background body scroll when open and restore when closed
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button for accessibility
    const focusTimer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = originalOverflow;
      clearTimeout(focusTimer);
      // Return focus to previous element
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen]);

  // Keyboard navigation: Escape key & Focus Trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key to close
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      // Focus trap for Tab and Shift+Tab
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-fade-in"
      onClick={handleClose}
      aria-hidden={!isOpen}
    >
      {/* Modal Dialog Card */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prime-deal-title"
        aria-describedby="prime-deal-description"
        onClick={(e) => e.stopPropagation()} // Prevent close on card click
        className="relative w-full max-w-xl md:max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto border border-slate-100 flex flex-col max-h-[92vh]"
      >
        {/* Close Button X */}
        <button
          ref={closeButtonRef}
          onClick={handleClose}
          aria-label="Cerrar ventana promocional"
          className="absolute top-3.5 right-3.5 z-30 w-9 h-9 rounded-full bg-slate-900/60 hover:bg-slate-900/85 active:scale-95 text-white backdrop-blur-md flex items-center justify-center transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white cursor-pointer"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* Visual Header Banner */}
        <div className="relative w-full bg-[#0066c0] select-none shrink-0 overflow-hidden">
          <Image
            src="/prime-big-deal-banner.png"
            alt="Prime Big Deal Days - 6 y 7 de octubre"
            width={1024}
            height={341}
            priority
            className="w-full h-auto object-cover block"
          />
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-7 overflow-y-auto">
          {/* Main Title & Description */}
          <div className="text-center mb-6">
            <h2
              id="prime-deal-title"
              className="text-xl sm:text-2xl font-black text-brand-blue tracking-tight leading-snug mb-2"
            >
              Compra en Amazon. <span className="text-[#f59e0b]">Nosotros las traemos.</span>
            </h2>
            <p
              id="prime-deal-description"
              className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed"
            >
              Compra en Amazon, envía tus paquetes a tu casillero en Miami y nosotros nos encargamos de traerlos hasta Costa Rica.
            </p>
          </div>

          {/* Visual 3-Step Process */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-6">
            {/* Step 1 */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-[#f59e0b] flex items-center justify-center mb-2 shadow-xs">
                <ShoppingBag size={20} />
              </div>
              <h3 className="font-black text-slate-800 text-xs sm:text-sm mb-0.5">
                1. Compra en Amazon
              </h3>
              <p className="text-[11px] text-slate-500 leading-snug">
                Aprovecha ofertas exclusivas Prime
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-brand-blue flex items-center justify-center mb-2 shadow-xs">
                <PackageOpen size={20} />
              </div>
              <h3 className="font-black text-slate-800 text-xs sm:text-sm mb-0.5">
                2. Envía a Miami
              </h3>
              <p className="text-[11px] text-slate-500 leading-snug">
                Usa tu casillero JRS Cargo
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center mb-2 shadow-xs">
                <Plane size={20} />
              </div>
              <h3 className="font-black text-slate-800 text-xs sm:text-sm mb-0.5">
                3. Recibe en CR
              </h3>
              <p className="text-[11px] text-slate-500 leading-snug">
                Directo a tus manos con JRS Cargo
              </p>
            </div>
          </div>


          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 mb-5">
            {/* Botón Principal: Ver ofertas en Amazon */}
            <a
              href="https://www.amazon.com/primeday"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClose}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#FF9900] hover:bg-[#e88b00] active:scale-[0.98] text-slate-950 font-black text-sm sm:text-base shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF9900]"
            >
              <span>Ver ofertas en Amazon</span>
              <ExternalLink size={16} />
            </a>

            {/* Botón Secundario: Abrir mi casillero gratis */}
            <a
              href="https://worldboxcr.com/jrscargo/register"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClose}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-brand-blue hover:bg-[#0c2f42] active:scale-[0.98] text-white font-bold text-sm sm:text-base shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
            >
              <PackageOpen size={17} className="text-brand-yellow" />
              <span>Abrir mi casillero gratis</span>
            </a>
          </div>

          {/* Legal Disclaimer */}
          <p className="text-[11px] text-slate-400 text-center leading-relaxed max-w-lg mx-auto border-t border-slate-100 pt-3">
            Amazon y Prime son marcas de Amazon.com, Inc. La promoción está sujeta a los términos, elegibilidad y disponibilidad establecidos por Amazon.
          </p>
        </div>
      </div>
    </div>
  );
}
