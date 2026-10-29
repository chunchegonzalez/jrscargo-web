import { getHeaders, getInventory } from './supabase';

export interface ShelfLocation {
  id: string;
  code: string;        // Ej: CR-A-01-01
  name: string;        // Ej: Estante A · Nivel 01 · Posición 01
  warehouse: string;   // Ej: CR
  zone: string;        // Ej: A
  rack: string;        // Ej: 01
  level: string;       // Ej: 01
  position: string;    // Ej: 01
  qrPayload: string;   // Ej: JRS-LOC:CR-A-01-01 (solo identificador de ubicación, sin datos personales)
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveShelfAssignment {
  trackingId: string;
  shelfId: string;
  shelfCode: string;
  assignedBy: string;
  assignedAt: string;
}

export type ShelfMovementType =
  | 'ASIGNACION'
  | 'TRASLADO'
  | 'SALIDA_ENTREGADO'
  | 'LIBERACION_MANUAL';

export interface ShelfMovement {
  id: string;
  trackingId: string;
  clientName: string;
  fromShelfCode: string | null;
  toShelfCode: string | null;
  movementType: ShelfMovementType;
  performedBy: string;
  reason: string;
  createdAt: string;
}

export interface MobilePersistedState {
  shelves: ShelfLocation[];
  assignments: Record<string, ActiveShelfAssignment>; // key: uppercase trackingId
  movements: ShelfMovement[];
}

export const MOBILE_CONFIG_ROW_ID = '__JRS_MOBILE_SHELVES_STATE__';

const DEFAULT_INITIAL_SHELVES: ShelfLocation[] = [
  {
    id: 'shelf-cr-a-01-01',
    code: 'CR-A-01-01',
    name: 'Bodega CR · Zona A · Estante 01 · Nivel 01 · Posición 01',
    warehouse: 'CR',
    zone: 'A',
    rack: '01',
    level: '01',
    position: '01',
    qrPayload: 'JRS-LOC:CR-A-01-01',
    isActive: true,
    createdAt: '2026-10-28T00:00:00.000Z',
    updatedAt: '2026-10-28T00:00:00.000Z',
  },
  {
    id: 'shelf-cr-a-01-02',
    code: 'CR-A-01-02',
    name: 'Bodega CR · Zona A · Estante 01 · Nivel 01 · Posición 02',
    warehouse: 'CR',
    zone: 'A',
    rack: '01',
    level: '01',
    position: '02',
    qrPayload: 'JRS-LOC:CR-A-01-02',
    isActive: true,
    createdAt: '2026-10-28T00:00:00.000Z',
    updatedAt: '2026-10-28T00:00:00.000Z',
  },
  {
    id: 'shelf-cr-a-02-01',
    code: 'CR-A-02-01',
    name: 'Bodega CR · Zona A · Estante 01 · Nivel 02 · Posición 01',
    warehouse: 'CR',
    zone: 'A',
    rack: '01',
    level: '02',
    position: '01',
    qrPayload: 'JRS-LOC:CR-A-02-01',
    isActive: true,
    createdAt: '2026-10-28T00:00:00.000Z',
    updatedAt: '2026-10-28T00:00:00.000Z',
  },
  {
    id: 'shelf-cr-a-02-03',
    code: 'CR-A-02-03',
    name: 'Bodega CR · Zona A · Estante 01 · Nivel 02 · Posición 03',
    warehouse: 'CR',
    zone: 'A',
    rack: '01',
    level: '02',
    position: '03',
    qrPayload: 'JRS-LOC:CR-A-02-03',
    isActive: true,
    createdAt: '2026-10-28T00:00:00.000Z',
    updatedAt: '2026-10-28T00:00:00.000Z',
  },
  {
    id: 'shelf-cr-b-01-01',
    code: 'CR-B-01-01',
    name: 'Bodega CR · Zona B · Estante 01 · Nivel 01 · Posición 01',
    warehouse: 'CR',
    zone: 'B',
    rack: '01',
    level: '01',
    position: '01',
    qrPayload: 'JRS-LOC:CR-B-01-01',
    isActive: true,
    createdAt: '2026-10-28T00:00:00.000Z',
    updatedAt: '2026-10-28T00:00:00.000Z',
  },
];

export function normalizeShelfQrInput(rawInput: string): string {
  const trimmed = (rawInput || '').trim().toUpperCase();
  if (trimmed.startsWith('JRS-LOC:')) {
    return trimmed.replace(/^JRS-LOC:/, '').trim();
  }
  return trimmed;
}

export async function loadMobileState(): Promise<MobilePersistedState> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!url) {
    return {
      shelves: DEFAULT_INITIAL_SHELVES,
      assignments: {},
      movements: [],
    };
  }

  try {
    const res = await fetch(
      `${url}/rest/v1/local_inventory?id=eq.${encodeURIComponent(MOBILE_CONFIG_ROW_ID)}&limit=1`,
      {
        headers: getHeaders(),
        cache: 'no-store',
      }
    );

    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const rawHistory = rows[0].history;
        const container = Array.isArray(rawHistory) ? rawHistory[0] : rawHistory;
        if (container && typeof container === 'object') {
          return {
            shelves: Array.isArray(container.shelves) && container.shelves.length > 0
              ? container.shelves
              : DEFAULT_INITIAL_SHELVES,
            assignments: container.assignments && typeof container.assignments === 'object'
              ? container.assignments
              : {},
            movements: Array.isArray(container.movements) ? container.movements : [],
          };
        }
      }
    }
  } catch (err) {
    console.error('Error loading mobile shelf state:', err);
  }

  const initialState: MobilePersistedState = {
    shelves: DEFAULT_INITIAL_SHELVES,
    assignments: {},
    movements: [],
  };
  await saveMobileState(initialState).catch(() => null);
  return initialState;
}

export async function saveMobileState(state: MobilePersistedState): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!url) return;

  const payload = {
    id: MOBILE_CONFIG_ROW_ID,
    client: 'SYSTEM_MOBILE_CONFIG',
    company: 'JRS CARGO',
    weight: '0 lbs',
    status: 'Eliminado', // Ignorado por completo en vistas administrativas de paquetes
    history: [
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        shelves: state.shelves,
        assignments: state.assignments,
        movements: state.movements.slice(0, 1000), // Conservar hasta 1000 movimientos auditables
      },
    ],
  };

  const checkRes = await fetch(
    `${url}/rest/v1/local_inventory?id=eq.${encodeURIComponent(MOBILE_CONFIG_ROW_ID)}&select=id`,
    {
      headers: getHeaders(),
      cache: 'no-store',
    }
  );
  const existing = checkRes.ok ? await checkRes.json() : [];

  if (Array.isArray(existing) && existing.length > 0) {
    await fetch(`${url}/rest/v1/local_inventory?id=eq.${encodeURIComponent(MOBILE_CONFIG_ROW_ID)}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        status: 'Eliminado',
        history: payload.history,
      }),
    });
  } else {
    await fetch(`${url}/rest/v1/local_inventory`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
  }
}

/**
 * Libera automáticamente la ubicación física de un paquete cuando cambia a estado 'Entregado'.
 * Seguro ante eventos repetidos (idempotente) y ejecutado desde el backend sin depender de que Mobile esté abierto.
 */
export async function releasePackageOnDelivered(
  trackingId: string,
  performedBy: string = 'Sistema Administrativo',
  clientNameFallback: string = ''
): Promise<{ released: boolean; previousShelfCode: string | null }> {
  const cleanKey = (trackingId || '').trim().toUpperCase();
  if (!cleanKey) return { released: false, previousShelfCode: null };

  const state = await loadMobileState();
  const activeAssignment = state.assignments[cleanKey];

  if (!activeAssignment) {
    return { released: false, previousShelfCode: null };
  }

  const previousShelfCode = activeAssignment.shelfCode;
  delete state.assignments[cleanKey];

  const movement: ShelfMovement = {
    id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    trackingId: activeAssignment.trackingId,
    clientName: clientNameFallback || 'Cliente JRS',
    fromShelfCode: previousShelfCode,
    toShelfCode: null,
    movementType: 'SALIDA_ENTREGADO',
    performedBy,
    reason: 'Liberación automática por cambio de estado a Entregado',
    createdAt: new Date().toISOString(),
  };

  state.movements = [movement, ...state.movements];
  await saveMobileState(state);

  return { released: true, previousShelfCode };
}

/**
 * Reconcilia el estado de asignaciones activas con `local_inventory`:
 * Si algún paquete asignado pasó a `Entregado` o `Eliminado`, libera su estante automáticamente y registra la salida.
 */
export async function getSynchronizedMobileData() {
  const [rawInventory, state] = await Promise.all([
    getInventory(),
    loadMobileState(),
  ]);

  const validPackages = (Array.isArray(rawInventory) ? rawInventory : []).filter(
    (item: { id?: string; status?: string }) =>
      item.id &&
      item.id !== MOBILE_CONFIG_ROW_ID &&
      item.status !== 'Eliminado'
  );

  let stateModified = false;
  const packageByKey = new Map<string, Record<string, unknown>>();

  for (const pkg of validPackages) {
    const key = String(pkg.id || '').trim().toUpperCase();
    packageByKey.set(key, pkg);

    const isDelivered = String(pkg.status || '').toLowerCase().includes('entregad');
    if (isDelivered && state.assignments[key]) {
      const prevShelf = state.assignments[key].shelfCode;
      delete state.assignments[key];
      state.movements.unshift({
        id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        trackingId: String(pkg.id),
        clientName: String(pkg.client || 'Cliente JRS'),
        fromShelfCode: prevShelf,
        toShelfCode: null,
        movementType: 'SALIDA_ENTREGADO',
        performedBy: 'Sincronización Automática',
        reason: 'Liberación automática al pasar a estado Entregado en inventario administrativo',
        createdAt: new Date().toISOString(),
      });
      stateModified = true;
    }
  }

  // Limpiar asignaciones de paquetes que hayan sido eliminados del inventario administrativo
  for (const assignedKey of Object.keys(state.assignments)) {
    if (!packageByKey.has(assignedKey)) {
      const prevShelf = state.assignments[assignedKey].shelfCode;
      const trk = state.assignments[assignedKey].trackingId;
      delete state.assignments[assignedKey];
      state.movements.unshift({
        id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        trackingId: trk,
        clientName: 'Retirado de inventario',
        fromShelfCode: prevShelf,
        toShelfCode: null,
        movementType: 'LIBERACION_MANUAL',
        performedBy: 'Sincronización Automática',
        reason: 'Paquete retirado o eliminado del inventario administrativo',
        createdAt: new Date().toISOString(),
      });
      stateModified = true;
    }
  }

  if (stateModified) {
    await saveMobileState(state);
  }

  return {
    inventory: validPackages,
    state,
  };
}
