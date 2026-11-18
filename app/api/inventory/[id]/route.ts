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

    if (incomingHistory && incomingHistory.length > 0 && agentUsername) {
      // Estampar automáticamente el agente real autenticado en el evento más reciente
      body.history = incomingHistory.map((ev, idx) =>
        idx === 0 && isGenericAgentLabel(ev?.user) ? { ...ev, user: agentUsername } : ev
      );
    } else if (!incomingHistory && typeof body.status === 'string') {
      // Si se cambia el estado desde Inventario CR u otro módulo sin enviar history,
      // conservamos el historial existente y agregamos el evento con el agente real
      try {
        const existing = await getInventoryItem(params.id);
        if (existing) {
          const prevStatus = String(existing.status || '').toLowerCase();
          const nextStatus = body.status.toLowerCase();
          const wasDelivered = prevStatus.includes('entregad');
          const willBeDelivered = nextStatus.includes('entregad');

          if (wasDelivered !== willBeDelivered) {
            const oldHistory: HistoryEntry[] = Array.isArray(existing.history) ? existing.history : [];
            const newEvent: HistoryEntry = {
              date: formatCostaRicaDateTime(),
              action: willBeDelivered
                ? 'Paquete Entregado al Cliente'
                : 'Reversión: Paquete devuelto a Bodega',
              user: agentUsername || 'Operador Bodega',
            };
            body.history = [newEvent, ...oldHistory];
          }
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
