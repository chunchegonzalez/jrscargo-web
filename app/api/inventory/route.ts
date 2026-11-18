import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  getInventory,
  getTrackingInvoiceMap,
  getTrackingShelfMap,
  insertInventoryItem
} from '@/lib/supabase';
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeMeta = searchParams.get('includeMeta') === 'true';

    if (includeMeta) {
      // Execute inventory, invoice map, and shelf assignments in PARALLEL on server
      const [data, invoiceMap, shelfMap] = await Promise.all([
        getInventory(),
        getTrackingInvoiceMap(),
        getTrackingShelfMap()
      ]);

      const response = NextResponse.json(
        {
          success: true,
          data,
          invoiceMap,
          shelfMap
        },
        { status: 200 }
      );
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return response;
    }

    const data = await getInventory();
    const response = NextResponse.json({ success: true, data }, { status: 200 });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch {
    return NextResponse.json({ success: false, error: 'Error fetching inventory' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const agentUsername = await getCurrentAgentUsername();

    if (agentUsername) {
      const incomingHistory = Array.isArray(body.history) ? (body.history as HistoryEntry[]) : [];
      if (incomingHistory.length > 0) {
        body.history = incomingHistory.map((ev, idx) =>
          idx === 0 && isGenericAgentLabel(ev?.user) ? { ...ev, user: agentUsername } : ev
        );
      } else {
        const isDelivered = String(body.status || '').toLowerCase().includes('entregad');
        body.history = [
          {
            date: formatCostaRicaDateTime(),
            action: isDelivered
              ? 'Paquete Entregado al Cliente'
              : 'Paquete Recibido en Bodega Costa Rica',
            user: agentUsername,
          },
        ];
      }
    }

    const data = await insertInventoryItem(body);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inserting item';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
