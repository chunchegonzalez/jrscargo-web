import { NextResponse } from 'next/server';
import { getHeaders } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!url) {
    return NextResponse.json({ success: true, data: [] });
  }
  
  try {
    // 1. Fetch from contact_submissions (contains bot leads + website quote requests)
    // 2. Fetch from clients where address indicates Bot, Clari, or Web
    const [subsRes, clientsRes] = await Promise.all([
      fetch(`${url}/rest/v1/contact_submissions?order=created_at.desc&limit=100`, {
        headers: getHeaders(),
        cache: 'no-store'
      }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${url}/rest/v1/clients?or=(address.ilike.*Bot*,address.ilike.*Clari*,address.ilike.*Web*)&order=created_at.desc&limit=100`, {
        headers: getHeaders(),
        cache: 'no-store'
      }).then(r => r.ok ? r.json() : []).catch(() => [])
    ]);

    const leadList: Array<{
      id: string;
      name: string;
      email: string;
      phone?: string;
      address?: string;
      created_at: string;
    }> = [];

    const seenEmails = new Set<string>();

    // Process contact_submissions first (newest interactions)
    if (Array.isArray(subsRes)) {
      for (const item of subsRes) {
        const itemEmail = (item.email || '').trim().toLowerCase();
        const leadName = item.contact_name || item.company_name || 'Contacto Web';
        const isBot = (item.company_name || '').toLowerCase().includes('bot') || 
                      (item.company_name || '').toLowerCase().includes('clari') ||
                      (item.message || '').toLowerCase().includes('bot') ||
                      (item.message || '').toLowerCase().includes('clari');
                      
        const badgeText = isBot 
          ? 'Bot Clari' 
          : (item.company_name ? `Cotización (${item.company_name})` : 'Formulario Web');

        leadList.push({
          id: `cs-${item.id}`,
          name: leadName,
          email: item.email || 'Sin correo',
          phone: item.phone || '',
          address: badgeText,
          created_at: item.created_at || new Date().toISOString()
        });

        if (itemEmail) seenEmails.add(itemEmail);
      }
    }

    // Process bot clients that haven't been added yet
    if (Array.isArray(clientsRes)) {
      for (const cl of clientsRes) {
        const clEmail = (cl.email || '').trim().toLowerCase();
        if (clEmail && seenEmails.has(clEmail)) continue;

        leadList.push({
          id: String(cl.id),
          name: cl.name || 'Usuario Bot',
          email: cl.email || '',
          phone: cl.phone || '',
          address: cl.address || 'Registro Bot Clari',
          created_at: cl.created_at || new Date().toISOString()
        });

        if (clEmail) seenEmails.add(clEmail);
      }
    }

    // Sort all leads by created_at desc
    leadList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ success: true, data: leadList });
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

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = phone ? String(phone).trim() : '';
    const cleanMessage = message ? String(message).trim() : 'Inicio de chat con Clari';

    // 1. Save to contact_submissions (reliable table for leads & form submissions)
    try {
      await fetch(`${url}/rest/v1/contact_submissions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          company_name: 'Bot Clari',
          contact_name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          message: cleanMessage,
          status: 'nuevo'
        })
      });
    } catch (e) {
      console.error('Error inserting into contact_submissions:', e);
    }

    // 2. Also try to upsert/insert in clients
    try {
      const checkRes = await fetch(`${url}/rest/v1/clients?email=eq.${encodeURIComponent(cleanEmail)}`, {
        headers: getHeaders(),
        cache: 'no-store'
      });
      const existing = checkRes.ok ? await checkRes.json() : [];

      if (existing && existing.length > 0) {
        await fetch(`${url}/rest/v1/clients?id=eq.${existing[0].id}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({
            phone: cleanPhone || existing[0].phone || '',
            address: existing[0].address || 'Registro Bot Clari'
          })
        });
      } else {
        await fetch(`${url}/rest/v1/clients`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            address: 'Registro Bot Clari',
            created_at: new Date().toISOString()
          })
        });
      }
    } catch (e) {
      console.error('Error inserting client:', e);
    }

    return NextResponse.json({ success: true });
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
    if (id.startsWith('cs-')) {
      const realId = id.replace('cs-', '');
      await fetch(`${url}/rest/v1/contact_submissions?id=eq.${encodeURIComponent(realId)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
    } else {
      await fetch(`${url}/rest/v1/clients?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      await fetch(`${url}/rest/v1/contact_submissions?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Error al eliminar registro' }, { status: 500 });
  }
}
