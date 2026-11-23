'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AlertCircle, MessageCircle, RefreshCw } from 'lucide-react';

export type NameState = 'pending' | 'ready' | 'unavailable';

const MIN_VISIBLE_MS = 700;

function BrandLogo({ className = '' }: { className?: string }) {
  // logo.png tiene márgenes amplios: se recorta el área visible con object-cover para mostrarlo grande y nítido.
  return (
    <div className={`relative aspect-[819/470] ${className}`}>
      <Image
        src="/logo.png"
        alt="JRS Cargo"
        fill
        priority
        unoptimized
        sizes="(max-width: 640px) 240px, 300px"
        className="object-cover select-none"
        style={{ objectPosition: '50% 47%' }}
        draggable={false}
      />
    </div>
  );
}

// Techo de avance "estimado" mientras se espera el siguiente hito real (nunca llega a 100 %).
function creepCeiling(milestone: number): number {
  if (milestone < 20) return 18;
  if (milestone < 55) return 52;
  if (milestone < 85) return 82;
  return 97;
}

function stageLabel(percent: number): string {
  if (percent >= 100) return 'Listo';
  if (percent < 30) return 'Validando tu enlace…';
  if (percent < 85) return 'Preparando tu estado de cuenta…';
  return 'Casi listo…';
}

interface StatementLoaderProps {
  name?: string | null;
  nameState: NameState;
  /** Hito real de carga (0-100) según las etapas completadas de la consulta. */
  milestone: number;
  /** true cuando el estado de cuenta ya está cargado y listo para mostrarse. */
  ready: boolean;
  /** true mientras se desvanece la pantalla para abrir el estado de cuenta. */
  fading: boolean;
  /** Se invoca una sola vez cuando la barra llega realmente a 100 %. */
  onComplete: () => void;
}

export function StatementLoader({ name, nameState, milestone, ready, fading, onComplete }: StatementLoaderProps) {
  const [displayed, setDisplayed] = useState(0);
  const displayedRef = useRef(0);
  const milestoneRef = useRef(milestone);
  const readyRef = useRef(ready);
  const startRef = useRef<number>(0);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    milestoneRef.current = milestone;
  }, [milestone]);
  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let frame = 0;
    let last = 0;
    startRef.current = performance.now();

    const tick = (now: number) => {
      if (!last) last = now;
      const dt = Math.min(0.064, (now - last) / 1000);
      last = now;

      let d = displayedRef.current;
      const m = milestoneRef.current;
      const canFinish = readyRef.current && now - startRef.current >= MIN_VISIBLE_MS;

      if (canFinish) {
        d = Math.min(100, d + Math.max(30 * dt, (100 - d) * 5 * dt));
      } else {
        const cap = Math.min(97, creepCeiling(m));
        if (d < m) {
          d = Math.min(m, d + Math.max(12 * dt, (m - d) * 7 * dt));
        } else if (d < cap) {
          d = Math.min(cap, d + (cap - d) * 0.32 * dt);
        }
        d = Math.min(d, 99);
      }

      if (Math.abs(d - displayedRef.current) > 0.05) {
        displayedRef.current = d;
        setDisplayed(d);
      }

      if (d >= 100) {
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current();
        }
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const percent = Math.min(100, Math.floor(displayed));
  const hasName = nameState === 'ready' && Boolean(name);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cargando estado de cuenta"
      className={`fixed inset-0 z-[100] bg-white flex items-center justify-center p-6 select-none print:hidden transition-opacity duration-500 ease-out motion-reduce:transition-none ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="w-full max-w-md flex flex-col items-center text-center">
        <div className="jrs-loader-float">
          <BrandLogo className="w-56 sm:w-72" />
        </div>

        <div className="mt-8 min-h-[4.5rem] flex flex-col items-center justify-start">
          {nameState === 'pending' ? (
            <div className="space-y-2.5 pt-1" aria-hidden="true">
              <div className="h-5 w-56 rounded-md bg-slate-100 animate-pulse motion-reduce:animate-none mx-auto" />
              <div className="h-7 w-44 rounded-md bg-slate-100 animate-pulse motion-reduce:animate-none mx-auto" />
            </div>
          ) : hasName ? (
            <>
              <h1 className="text-lg sm:text-xl font-bold text-[#0B2737] leading-snug">
                Cargando el estado de cuenta de
              </h1>
              <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#0B2737] leading-tight break-words max-w-full">
                {name}
              </p>
            </>
          ) : (
            <h1 className="text-xl sm:text-2xl font-bold text-[#0B2737] leading-snug">
              Cargando tu estado de cuenta
            </h1>
          )}
        </div>

        <div className="w-full max-w-sm mt-6">
          <div
            role="progressbar"
            aria-label="Progreso de carga del estado de cuenta"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="relative h-2.5 w-full rounded-full bg-slate-200/80 overflow-hidden"
          >
            <div
              className="jrs-loader-bar relative h-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#FFC95C]"
              style={{ width: `${displayed}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
            <p role="status" aria-live="polite" className="text-slate-500 font-medium text-left">
              {stageLabel(percent)}
            </p>
            <span className="text-slate-400 font-semibold tabular-nums">{percent} %</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatementLoadErrorProps {
  title: string;
  message: string;
  onRetry: () => void;
}

export function StatementLoadError({ title, message, onRetry }: StatementLoadErrorProps) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col items-center text-center">
        <BrandLogo className="w-44 sm:w-52" />

        <div className="mt-7 w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
          <AlertCircle size={24} aria-hidden="true" />
        </div>

        <h1 className="mt-4 text-xl sm:text-2xl font-bold text-[#0B2737] leading-snug">{title}</h1>
        <p role="alert" className="mt-2 text-sm sm:text-[15px] text-slate-500 leading-relaxed">
          {message}
        </p>

        <div className="mt-6 w-full max-w-xs flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onRetry}
            className="w-full h-11 rounded-xl bg-[#0B2737] hover:bg-[#12435E] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#12435E] focus-visible:ring-offset-2"
          >
            <RefreshCw size={16} aria-hidden="true" />
            <span>Reintentar</span>
          </button>
          <a
            href="https://wa.me/50672601238"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-[#0B2737] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#12435E] focus-visible:ring-offset-2"
          >
            <MessageCircle size={16} aria-hidden="true" />
            <span>Contactar a JRS Cargo</span>
          </a>
        </div>
      </div>
    </div>
  );
}
