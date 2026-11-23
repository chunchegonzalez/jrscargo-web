import { NextResponse } from 'next/server';
import { getHeaders } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Consulta ligera para la pantalla de carga del estado de cuenta:
 * valida que el enlace corresponda a un cliente y devuelve únicamente su nombre.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = String(params.id || '').trim();
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'ID de cliente requerido' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const res = await fetch(
      `${url}/rest/v1/clients?id=eq.${encodeURIComponent(clientId)}&select=id,name&limit=1`,
      { headers: getHeaders(), cache: 'no-store' }
    );

    if (!res.ok) {
      return NextResponse.json({ success: false, error: 'Error al validar el enlace' }, { status: 502 });
    }

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Cliente no encontrado' }, { status: 404 });
    }

    const name = String(rows[0]?.name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    return NextResponse.json({ success: true, name });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al validar el enlace';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
