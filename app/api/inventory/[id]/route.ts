import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getInventoryItem, updateInventoryItem, deleteInventoryItem } from '@/lib/supabase';
import { verifySignedCookie } from '@/lib/auth';
import { formatCostaRicaDateTime, isGenericAgentLabel } from '@/lib/billing';

export const dynamic = 'force-dynamic';

type HistoryEntry = {
  date?: string;
  action?: string;
  user?: string;
  transportType?: string;
  note?: string;
  description?: string;
};

async function getCurrentAgentUsername(): Promise<string | null> {
  try {
    const cookieStore = cookies();
    const raw = cookieStore.get('jrs_admin_auth')?.value;
    const user = await verifySignedCookie(raw);
    return user?.username || null;
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await getInventoryItem(params.id);
    if (!data) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    const response = NextResponse.json({ success: true, data }, { status: 200 });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch {
    return NextResponse.json({ success: false, error: 'Error fetching item' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const agentUsername = await getCurrentAgentUsername();

    // Siempre registrar updated_at real en cada actualización
    if (!body.updated_at) {
      body.updated_at = new Date().toISOString();
    }

    const incomingHistory = Array.isArray(body.history) ? (body.history as HistoryEntry[]) : null;
    const incomingTransportType =
      typeof body.transportType === 'string' ? body.transportType.trim() : undefined;
    const incomingNote = typeof body.note === 'string' ? body.note.trim() : undefined;

    // Eliminar campos virtuales para no enviar columnas inexistentes a PostgREST
    delete body.transportType;
    delete body.note;

    if (incomingHistory && incomingHistory.length > 0) {
      body.history = incomingHistory.map((ev, idx) => {
        if (idx !== 0) return ev;
        const nextEv: HistoryEntry = { ...ev };
        if (agentUsername && isGenericAgentLabel(nextEv.user)) {
          nextEv.user = agentUsername;
        }
        if (incomingTransportType) nextEv.transportType = incomingTransportType;
        if (incomingNote !== undefined) nextEv.note = incomingNote;
        return nextEv;
      });
    } else if (
      typeof body.status === 'string' ||
      incomingTransportType !== undefined ||
      incomingNote !== undefined
    ) {
      // Si se cambia el estado, vía o nota desde Inventario CR sin enviar history,
      // conservamos el historial existente y actualizamos metadatos + evento de estado
      try {
        const existing = await getInventoryItem(params.id);
        if (existing) {
          let currentHistory: HistoryEntry[] = Array.isArray(existing.history)
            ? [...existing.history]
            : [];

          if (typeof body.status === 'string') {
            const prevStatus = String(existing.status || '').toLowerCase();
            const nextStatus = body.status.toLowerCase();
            const wasDelivered = prevStatus.includes('entregad');
            const willBeDelivered = nextStatus.includes('entregad');

            if (wasDelivered !== willBeDelivered) {
              const newEvent: HistoryEntry = {
                date: formatCostaRicaDateTime(),
                action: willBeDelivered
                  ? 'Paquete Entregado al Cliente'
                  : 'Reversión: Paquete devuelto a Bodega',
                user: agentUsername || 'Operador Bodega',
              };
              currentHistory = [newEvent, ...currentHistory];
            }
          }

          if (incomingTransportType !== undefined || incomingNote !== undefined) {
            if (currentHistory.length === 0) {
              currentHistory = [
                {
                  date: formatCostaRicaDateTime(),
                  action:
                    incomingTransportType === 'Marítimo'
                      ? 'Paquete Marítimo Registrado en Bodega CR'
                      : 'Paquete Aéreo Registrado en Bodega CR',
                  user: agentUsername || 'Operador Bodega',
                  ...(incomingTransportType ? { transportType: incomingTransportType } : {}),
                  ...(incomingNote !== undefined ? { note: incomingNote } : {}),
                },
              ];
            } else {
              currentHistory = currentHistory.map((ev, idx) => ({
                ...ev,
                ...(incomingTransportType ? { transportType: incomingTransportType } : {}),
                ...(idx === 0 && incomingNote !== undefined ? { note: incomingNote } : {}),
              }));
            }
          }

          body.history = currentHistory;
        }
      } catch {
        // Non-critical: continuar con la actualización principal
      }
    }

    const data = await updateInventoryItem(params.id, body);
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: 'Error updating item' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await deleteInventoryItem(params.id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error deleting item';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
