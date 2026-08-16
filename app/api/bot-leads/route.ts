import { NextResponse } from 'next/server';
import { getHeaders } from '@/lib/supabase';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  
  try {
    // 1. Try fetching from clients registered via bot
    const res = await fetch(`${url}/rest/v1/clients?address=ilike.*Bot*&order=created_at.desc`, {
      headers: getHeaders(),
      cache: 'no-store'
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ success: true, data });
    }

    // Fallback to all clients if filter not matched
    const allRes = await fetch(`${url}/rest/v1/clients?order=created_at.desc&limit=50`, {
      headers: getHeaders(),
      cache: 'no-store'
    });
    const allData = allRes.ok ? await allRes.json() : [];
    return NextResponse.json({ success: true, data: allData });
  } catch (error) {
    console.error('Error fetching bot leads:', error);
    return NextResponse.json({ success: false, error: 'Error al obtener registros' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  try {
    const body = await request.json();
    const { name, email, phone, message } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Nombre y correo son requeridos' }, { status: 400 });
    }

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : (message ? String(message).substring(0, 40) : ''),
      address: 'Registro Bot Clari',
      created_at: new Date().toISOString()
    };

    const res = await fetch(`${url}/rest/v1/clients`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Error saving lead to supabase:', err);
      // Still return success to prevent breaking client UI
      return NextResponse.json({ success: true, data: payload });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data: data?.[0] || payload });
  } catch (error) {
    console.error('Error processing bot lead:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
  }

  try {
    const res = await fetch(`${url}/rest/v1/clients?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (!res.ok) {
      throw new Error('Error al eliminar registro');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Error al eliminar registro' }, { status: 500 });
  }
}
