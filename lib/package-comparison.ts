/**
 * Módulo de normalización, comparación y exportación de cargos por paquete
 * JRS CARGO CR — Sección Administrativa de Comparación de Cargos
 */

export interface ProviderInvoiceRow {
  rowNumber: number;
  rawTracking: string;
  trackingDigits: string; // Letras y números (sin símbolos), conservando ceros iniciales
  providerAmount: number;
  weight?: string;
  notes?: string;
}

export interface SystemPackageRecord {
  id: string; // ID en local_inventory o tracking_number en invoice_items
  rawTracking: string;
  trackingDigits: string; // Letras y números (sin símbolos)
  amount: number | null; // Cobro registrado por JRS Cargo
  currency: string;
  invoiceNumber?: string;
  invoiceId?: string;
  invoiceStatus?: string;
  clientName?: string;
  serviceName?: string;
  weight?: string;
  date?: string;
}

export type ComparisonStatus =
  | 'mayor_al_costo' // JRS cobró más que el proveedor (diferencia positiva)
  | 'revisar' // Proveedor cobró más que JRS (diferencia negativa)
  | 'exacto' // Diferencia = 0
  | 'sin_coincidencia' // No se encontró paquete en el sistema
  | 'ambiguo' // Múltiples paquetes en el sistema con exactamente los mismos dígitos
  | 'duplicado' // Tracking repetido en la factura del proveedor
  | 'moneda_distinta'; // Diferencia de moneda que impide cálculo automático seguro

export interface ComparisonResultItem {
  id: string; // Unique key for react rendering
  rowNumber: number;
  rawTracking: string;
  trackingDigits: string;
  providerAmount: number;
  systemAmount: number | null;
  difference: number | null; // JRS Cargo - Proveedor
  status: ComparisonStatus;
  statusLabel: string;
  systemRecord?: SystemPackageRecord;
  multipleMatches?: SystemPackageRecord[];
  notes?: string;
  currency: string;
}

export interface ComparisonSummary {
  totalRows: number;
  matchedCount: number;
  differencesCount: number;
  unmatchedCount: number;
  ambiguousCount: number;
  higherThanCostCount: number;
  exactCount: number;
  totalProvider: number;
  totalSystem: number;
  netDifference: number;
}

/**
 * Normaliza un número de tracking conservando únicamente letras y números (alfanumérico estricto):
 * Elimina símbolos, espacios, guiones, puntos y caracteres especiales, manteniendo letras y dígitos (con ceros iniciales).
 * Convierte a mayúsculas para asegurar coincidencia consistente.
 * Ej: "1ZW-864440339939763" -> "1ZW864440339939763"
 * Ej: "00123-456 A" -> "00123456A"
 */
export function normalizeTrackingAlphanumeric(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return '';
  const str = String(raw).trim();
  return str.replace(/[^a-zA-Z0-9]+/g, '').toUpperCase();
}

// Alias para retrocompatibilidad
export const normalizeTrackingNumbersOnly = normalizeTrackingAlphanumeric;
export const normalizeTracking = normalizeTrackingAlphanumeric;

/**
 * Limpia y convierte montos de cualquier formato (moneda, comas, espacios) a número flotante.
 * Ej: "$10.40" -> 10.40, "₡ 5,500.00" -> 5500.00
 */
export function parseCurrencyAmount(raw: unknown): number {
  if (typeof raw === 'number') {
    return isNaN(raw) ? 0 : Math.round(raw * 100) / 100;
  }
  if (!raw) return 0;
  const str = String(raw).trim();
  // Quitar símbolos de moneda y espacios
  const clean = str.replace(/[$€₡¢\s]/g, '');
  // Manejar comas como separador de miles o decimales
  let normalized = clean;
  if (normalized.includes(',') && normalized.includes('.')) {
    // Caso 1,234.56
    normalized = normalized.replace(/,/g, '');
  } else if (normalized.includes(',') && !normalized.includes('.')) {
    // Si solo tiene coma y tiene 2 dígitos al final: 12,50 -> 12.50
    if (/,\d{2}$/.test(normalized)) {
      normalized = normalized.replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  }
  const val = parseFloat(normalized);
  return isNaN(val) ? 0 : Math.round(val * 100) / 100;
}

/**
 * Compara los registros de la factura del proveedor contra los registros del sistema JRS Cargo.
 * Aplica coincidencia exacta por dígitos normalizados.
 */
export function compareInvoiceWithSystem(
  providerRows: ProviderInvoiceRow[],
  systemRecords: SystemPackageRecord[]
): { results: ComparisonResultItem[]; summary: ComparisonSummary } {
  // Indexar registros del sistema por dígitos exactos
  const systemMap = new Map<string, SystemPackageRecord[]>();
  for (const sys of systemRecords) {
    if (!sys.trackingDigits) continue;
    if (!systemMap.has(sys.trackingDigits)) {
      systemMap.set(sys.trackingDigits, []);
    }
    systemMap.get(sys.trackingDigits)!.push(sys);
  }

  // Detectar duplicados en la factura del proveedor
  const providerDigitsCount = new Map<string, number>();
  for (const r of providerRows) {
    if (!r.trackingDigits) continue;
    providerDigitsCount.set(
      r.trackingDigits,
      (providerDigitsCount.get(r.trackingDigits) || 0) + 1
    );
  }

  const results: ComparisonResultItem[] = [];

  let matchedCount = 0;
  let differencesCount = 0;
  let unmatchedCount = 0;
  let ambiguousCount = 0;
  let higherThanCostCount = 0;
  let exactCount = 0;
  let totalProvider = 0;
  let totalSystem = 0;

  for (let idx = 0; idx < providerRows.length; idx++) {
    const row = providerRows[idx];
    const digits = row.trackingDigits;
    const isDuplicateInProvider = (providerDigitsCount.get(digits) || 0) > 1;
    totalProvider += row.providerAmount;

    if (!digits) {
      results.push({
        id: `row-${idx}-${row.rawTracking}`,
        rowNumber: row.rowNumber || idx + 1,
        rawTracking: row.rawTracking,
        trackingDigits: '',
        providerAmount: row.providerAmount,
        systemAmount: null,
        difference: null,
        status: 'sin_coincidencia',
        statusLabel: 'Sin tracking válido',
        notes: 'El tracking no contiene letras ni números para comparar.',
        currency: 'USD',
      });
      unmatchedCount++;
      continue;
    }

    const matches = systemMap.get(digits) || [];

    if (matches.length === 0) {
      // Sin coincidencia en el sistema
      results.push({
        id: `row-${idx}-${digits}`,
        rowNumber: row.rowNumber || idx + 1,
        rawTracking: row.rawTracking,
        trackingDigits: digits,
        providerAmount: row.providerAmount,
        systemAmount: null,
        difference: null,
        status: 'sin_coincidencia',
        statusLabel: 'Sin coincidencia',
        notes: isDuplicateInProvider ? 'Tracking repetido en la factura del proveedor.' : undefined,
        currency: 'USD',
      });
      unmatchedCount++;
      continue;
    }

    if (matches.length > 1) {
      // Coincidencia ambigua: existen múltiples registros en el sistema con exactamente este tracking normalizado
      results.push({
        id: `row-${idx}-${digits}`,
        rowNumber: row.rowNumber || idx + 1,
        rawTracking: row.rawTracking,
        trackingDigits: digits,
        providerAmount: row.providerAmount,
        systemAmount: null,
        difference: null,
        status: 'ambiguo',
        statusLabel: 'Revisar (Ambiguo)',
        multipleMatches: matches,
        notes: `Se encontraron ${matches.length} paquetes en el sistema con el mismo tracking normalizado. Requiere verificación manual.`,
        currency: matches[0]?.currency || 'USD',
      });
      ambiguousCount++;
      differencesCount++;
      continue;
    }

    // Coincidencia exacta única
    const sysMatch = matches[0];
    const sysAmount = sysMatch.amount;

    if (sysAmount === null || sysAmount === undefined) {
      // El paquete existe en el sistema pero no tiene monto facturado registrado
      results.push({
        id: `row-${idx}-${digits}`,
        rowNumber: row.rowNumber || idx + 1,
        rawTracking: row.rawTracking,
        trackingDigits: digits,
        providerAmount: row.providerAmount,
        systemAmount: null,
        difference: null,
        status: 'sin_coincidencia',
        statusLabel: 'Sin cobro registrado',
        systemRecord: sysMatch,
        notes: 'El paquete existe en bodega pero no tiene factura ni cobro asociado en el sistema.',
        currency: sysMatch.currency || 'USD',
      });
      unmatchedCount++;
      continue;
    }

    matchedCount++;
    totalSystem += sysAmount;
    const diff = Math.round((sysAmount - row.providerAmount) * 100) / 100;

    let status: ComparisonStatus = 'exacto';
    let statusLabel = 'Exacto';

    if (isDuplicateInProvider) {
      status = 'duplicado';
      statusLabel = 'Duplicado en factura';
      differencesCount++;
    } else if (diff > 0) {
      status = 'mayor_al_costo';
      statusLabel = 'Mayor al costo';
      higherThanCostCount++;
    } else if (diff < 0) {
      status = 'revisar';
      statusLabel = 'Revisar';
      differencesCount++;
    } else {
      status = 'exacto';
      statusLabel = 'Exacto';
      exactCount++;
    }

    results.push({
      id: `row-${idx}-${digits}`,
      rowNumber: row.rowNumber || idx + 1,
      rawTracking: row.rawTracking,
      trackingDigits: digits,
      providerAmount: row.providerAmount,
      systemAmount: sysAmount,
      difference: diff,
      status,
      statusLabel,
      systemRecord: sysMatch,
      notes: isDuplicateInProvider ? 'Tracking repetido en la factura del proveedor.' : undefined,
      currency: sysMatch.currency || 'USD',
    });
  }

  const netDiff = Math.round((totalSystem - totalProvider) * 100) / 100;

  const summary: ComparisonSummary = {
    totalRows: providerRows.length,
    matchedCount,
    differencesCount,
    unmatchedCount,
    ambiguousCount,
    higherThanCostCount,
    exactCount,
    totalProvider: Math.round(totalProvider * 100) / 100,
    totalSystem: Math.round(totalSystem * 100) / 100,
    netDifference: netDiff,
  };

  return { results, summary };
}

/**
 * Genera y descarga un archivo CSV compatible con Excel de los resultados de comparación.
 */
export function exportComparisonToCsv(results: ComparisonResultItem[], filenameSuffix = 'comparacion'): void {
  const headers = [
    'Fila',
    'Tracking (Letras y Números)',
    'Tracking Original',
    'Cobro Proveedor (USD)',
    'Cobro JRS Cargo (USD)',
    'Diferencia (JRS - Proveedor)',
    'Estado',
    'Factura JRS',
    'Cliente JRS',
    'Notas'
  ];

  const rows = results.map(r => {
    const sysAmount = r.systemAmount !== null ? r.systemAmount.toFixed(2) : 'Sin registro';
    const diff = r.difference !== null ? (r.difference > 0 ? `+${r.difference.toFixed(2)}` : r.difference.toFixed(2)) : '—';
    const inv = r.systemRecord?.invoiceNumber || '';
    const client = (r.systemRecord?.clientName || '').replace(/"/g, '""');
    const notes = (r.notes || '').replace(/"/g, '""');
    return [
      r.rowNumber,
      `="${r.trackingDigits}"`, // Preservar ceros iniciales en Excel
      `"${r.rawTracking.replace(/"/g, '""')}"`,
      r.providerAmount.toFixed(2),
      sysAmount,
      diff,
      `"${r.statusLabel}"`,
      `"${inv}"`,
      `"${client}"`,
      `"${notes}"`
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jrs-cargos-${filenameSuffix}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
