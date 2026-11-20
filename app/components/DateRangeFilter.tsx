'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, X } from 'lucide-react';

export interface DatePresetOption {
  id: string;
  label: string;
}

interface DateRangeFilterProps {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  presets?: DatePresetOption[];
  activePreset?: string;
  onPresetSelect?: (presetId: string) => void;
  onClear?: () => void;
  label?: string;
  className?: string;
}

function formatDMY(ymd: string): string {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}

/**
 * Filtro de fechas compacto: un solo botón con el rango seleccionado que abre un panel
 * con períodos rápidos y los campos Desde / Hasta.
 */
export default function DateRangeFilter({
  start,
  end,
  onStartChange,
  onEndChange,
  presets = [],
  activePreset,
  onPresetSelect,
  onClear,
  label = 'Fecha',
  className = '',
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const activePresetLabel = presets.find(p => p.id === activePreset)?.label;
  const hasRange = Boolean(start || end);

  let summary = 'Todas las fechas';
  if (start && end) {
    summary = start === end ? formatDMY(start) : `${formatDMY(start)} – ${formatDMY(end)}`;
  } else if (start) {
    summary = `Desde ${formatDMY(start)}`;
  } else if (end) {
    summary = `Hasta ${formatDMY(end)}`;
  }

  const showPresetHint =
    hasRange && activePresetLabel && activePreset !== 'personalizado' && activePreset !== 'todos';

  const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
    const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
    try {
      el.showPicker?.();
    } catch {
      // Algunos navegadores bloquean showPicker fuera de gestos del usuario
    }
  };

  const inputClass =
    'w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800 tabular-nums focus:outline-none focus:border-[#12435E] focus:ring-2 focus:ring-[#12435E]/10 cursor-pointer';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`w-full h-9 px-3 rounded-lg border bg-white text-left inline-flex items-center gap-2 transition-colors cursor-pointer ${
          open
            ? 'border-[#12435E] ring-2 ring-[#12435E]/10'
            : 'border-slate-200/90 hover:border-slate-300'
        }`}
      >
        <CalendarDays size={15} className="text-[#12435E] shrink-0" />
        <span className="flex-1 min-w-0 truncate text-xs sm:text-sm font-medium text-slate-800 tabular-nums">
          {summary}
        </span>
        {showPresetHint && (
          <span className="hidden xl:inline-flex shrink-0 px-1.5 py-0.5 rounded bg-[#0B2737]/[0.07] text-[#0B2737] text-[10px] font-semibold">
            {activePresetLabel}
          </span>
        )}
        <ChevronDown
          size={14}
          className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Seleccionar rango de fechas"
          className="absolute left-0 top-full mt-1.5 z-40 w-[min(92vw,26rem)] rounded-xl border border-slate-200 bg-white shadow-xl p-3.5 space-y-3"
        >
          {presets.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Período rápido
              </p>
              <div className="flex flex-wrap gap-1.5">
                {presets.map(p => {
                  const isActive = activePreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onPresetSelect?.(p.id)}
                      className={`h-7 px-2.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#0B2737] text-white border-[#0B2737]'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-[#12435E] hover:text-[#0B2737]'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Desde
              </label>
              <input
                type="date"
                value={start}
                max={end || undefined}
                onChange={e => onStartChange(e.target.value)}
                onClick={openPicker}
                aria-label="Fecha desde"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={end}
                min={start || undefined}
                onChange={e => onEndChange(e.target.value)}
                onClick={openPicker}
                aria-label="Fecha hasta"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onClear?.();
                if (!onClear) {
                  onStartChange('');
                  onEndChange('');
                }
              }}
              disabled={!hasRange}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-600 disabled:opacity-40 disabled:hover:text-slate-500 cursor-pointer"
            >
              <X size={12} /> Limpiar fechas
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-8 px-4 rounded-lg bg-[#0B2737] hover:bg-[#12435E] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
