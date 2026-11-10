import { NextResponse } from 'next/server';
import {
  getInventory,
  getTrackingInvoiceMap,
  getTrackingShelfMap,
  insertInventoryItem
} from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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
    const body = await request.json();
    const data = await insertInventoryItem(body);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inserting item';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
