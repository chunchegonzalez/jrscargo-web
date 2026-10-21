import { NextResponse } from 'next/server';
import { getHeaders } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export interface BotChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'agent' | 'system';
  senderName?: string;
  content: string;
  createdAt: string;
}

export interface BotSessionPayload {
  sessionId: string;
  mode: 'bot' | 'agent' | 'closed';
  takenBy?: string;
  takenAt?: string;
  unreadForAdmin: number;
  trackings: string[];
  notes?: string;
  updatedAt: string;
  messages: BotChatMessage[];
}

export interface BotSessionRecord {
  dbId: number;
  sessionId: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  mode: 'bot' | 'agent' | 'closed';
  takenBy?: string;
  takenAt?: string;
  unreadForAdmin: number;
  trackings: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  messages: BotChatMessage[];
}

function extractTrackingsFromMessages(messages: BotChatMessage[]): string[] {
  const found = new Set<string>();
  const blacklist = new Set([
    'casillero', 'casilleros', 'direccion', 'costarica', 'informacion',
    'cotizacion', 'registrarse', 'registrado', 'bienvenido', 'paquetes',
    'maritimo', 'seguimiento', 'rastrear', 'rastreo', 'costarricense',
    'telefono', 'whatsapp', 'preguntas', 'servicios', 'consulta'
  ]);

  for (const m of messages) {
    if (m.role !== 'user') continue;
    const words = (m.content || '').replace(/[,;?!()"'`]/g, ' ').split(/\s+/);
    for (const w of words) {
      const t = w.trim();
      if (!t || blacklist.has(t.toLowerCase())) continue;
      if (/^(TBA\w+|1Z\w+|9\d{15,25}|\d{10,25}|JRS-\w+|AT-\w+|[A-Z]{2}\d{9}[A-Z]{2})/i.test(t)) {
        found.add(t.toUpperCase());
      }
    }
  }
  return Array.from(found);
}

function parseRowToSession(row: Record<string, unknown>): BotSessionRecord | null {
  const company = String(row.company_name || '');
  if (!company.toLowerCase().includes('clari') && !company.toLowerCase().includes('bot')) {
    return null;
  }

  const dbId = Number(row.id);
  const name = String(row.contact_name || 'Visitante Web');
  const email = String(row.email || '');
  const phone = String(row.phone || '');
  const status = String(row.status || 'nuevo');
  const createdAt = String(row.created_at || new Date().toISOString());
  const rawMessage = String(row.message || '');

  try {
    if (rawMessage.trim().startsWith('{')) {
      const parsed = JSON.parse(rawMessage) as Partial<BotSessionPayload>;
      const messages = Array.isArray(parsed.messages) ? parsed.messages : [];
      const trackings = Array.isArray(parsed.trackings) && parsed.trackings.length > 0
        ? parsed.trackings
        : extractTrackingsFromMessages(messages);

      return {
        dbId,
        sessionId: parsed.sessionId || `session-${dbId}`,
        name,
        email,
        phone,
        status,
        mode: parsed.mode || 'bot',
        takenBy: parsed.takenBy,
        takenAt: parsed.takenAt,
        unreadForAdmin: typeof parsed.unreadForAdmin === 'number' ? parsed.unreadForAdmin : (status === 'nuevo' ? 1 : 0),
        trackings,
        notes: parsed.notes || '',
        createdAt,
        updatedAt: parsed.updatedAt || createdAt,
        messages,
      };
    }
  } catch {
    // Fallback for plain text legacy message
  }

  const fallbackMessages: BotChatMessage[] = rawMessage
    ? [
        {
          id: `legacy-${dbId}`,
          role: 'user',
          content: rawMessage,
          createdAt,
        },
      ]
    : [];

  return {
    dbId,
    sessionId: `legacy-${dbId}`,
    name,
    email,
    phone,
    status,
    mode: 'bot',
    unreadForAdmin: status === 'nuevo' ? 1 : 0,
    trackings: extractTrackingsFromMessages(fallbackMessages),
    notes: '',
    createdAt,
    updatedAt: createdAt,
    messages: fallbackMessages,
  };
}

async function upsertLeadInClients(name: string, email: string, phone: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!url || !email) return;

  try {
    const cleanEmail = email.trim().toLowerCase();
    const checkRes = await fetch(`${url}/rest/v1/clients?email=eq.${encodeURIComponent(cleanEmail)}`, {
      headers: getHeaders(),
      cache: 'no-store',
    });
    const existing = checkRes.ok ? await checkRes.json() : [];

    if (Array.isArray(existing) && existing.length > 0) {
      await fetch(`${url}/rest/v1/clients?id=eq.${existing[0].id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          name: name || existing[0].name,
          phone: phone || existing[0].phone || '',
          address: existing[0].address || 'Registro Bot Clari',
        }),
      });
    } else {
      await fetch(`${url}/rest/v1/clients`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: name || 'Cliente Bot Clari',
          email: cleanEmail,
          phone: phone || '',
          address: 'Registro Bot Clari',
          created_at: new Date().toISOString(),
        }),
      });
    }
  } catch (e) {
    console.error('Error upserting lead in clients:', e);
  }
}

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!url) {
    return NextResponse.json({ success: true, sessions: [], unreadCount: 0 });
  }

  const { searchParams } = new URL(request.url);
  const querySessionId = searchParams.get('sessionId');
  const queryDbId = searchParams.get('dbId');

  try {
    const res = await fetch(
      `${url}/rest/v1/contact_submissions?order=created_at.desc&limit=150`,
      {
        headers: getHeaders(),
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      return NextResponse.json({ success: true, sessions: [], unreadCount: 0 });
    }

    const rows = (await res.json()) as Record<string, unknown>[];
    const allSessions: BotSessionRecord[] = [];

    for (const row of rows) {
      const parsed = parseRowToSession(row);
      if (parsed) {
        allSessions.push(parsed);
      }
    }

    // Sort by updatedAt descending so active conversations jump to top
    allSessions.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    if (queryDbId) {
      const match = allSessions.find((s) => String(s.dbId) === String(queryDbId));
      return NextResponse.json({ success: true, session: match || null });
    }

    if (querySessionId) {
      const match = allSessions.find((s) => s.sessionId === querySessionId);
      return NextResponse.json({ success: true, session: match || null });
    }

    const unreadCount = allSessions.reduce(
      (acc, s) => acc + (s.unreadForAdmin > 0 ? 1 : 0),
      0
    );

    return NextResponse.json({
      success: true,
      sessions: allSessions,
      unreadCount,
    });
  } catch (error) {
    console.error('Error in GET /api/bot-sessions:', error);
    return NextResponse.json({ success: false, sessions: [], unreadCount: 0 }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!url) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      action = 'sync',
      sessionId,
      dbId,
      name,
      email,
      phone,
      messages,
      agentName,
      content,
      notes,
    } = body;

    // Fetch existing rows to locate session
    const res = await fetch(
      `${url}/rest/v1/contact_submissions?order=created_at.desc&limit=150`,
      {
        headers: getHeaders(),
        cache: 'no-store',
      }
    );
    const rows = res.ok ? ((await res.json()) as Record<string, unknown>[]) : [];

    let existingRecord: BotSessionRecord | null = null;
    for (const row of rows) {
      const parsed = parseRowToSession(row);
      if (!parsed) continue;
      if (dbId && String(parsed.dbId) === String(dbId)) {
        existingRecord = parsed;
        break;
      }
      if (sessionId && parsed.sessionId === sessionId) {
        existingRecord = parsed;
        break;
      }
    }

    const nowIso = new Date().toISOString();

    // 1. Create a brand new session if none found
    if (!existingRecord) {
      const cleanName = String(name || 'Visitante Web').trim();
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanPhone = String(phone || '').trim();
      const newSessionId = sessionId || `clari-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const initialMessages: BotChatMessage[] = Array.isArray(messages) ? messages : [];
      const payload: BotSessionPayload = {
        sessionId: newSessionId,
        mode: 'bot',
        unreadForAdmin: 1,
        trackings: extractTrackingsFromMessages(initialMessages),
        notes: notes || '',
        updatedAt: nowIso,
        messages: initialMessages,
      };

      if (cleanEmail) {
        await upsertLeadInClients(cleanName, cleanEmail, cleanPhone);
      }

      const insertRes = await fetch(`${url}/rest/v1/contact_submissions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          company_name: 'Chat Clari',
          contact_name: cleanName,
          email: cleanEmail || 'sin-correo@jrscargocr.com',
          phone: cleanPhone,
          message: JSON.stringify(payload),
          status: 'nuevo',
        }),
      });

      const inserted = insertRes.ok ? await insertRes.json() : [];
      const createdRow = Array.isArray(inserted) && inserted.length > 0 ? parseRowToSession(inserted[0]) : null;

      return NextResponse.json({
        success: true,
        session: createdRow || {
          dbId: 0,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          status: 'nuevo',
          ...payload,
          createdAt: nowIso,
        },
      });
    }

    // 2. Update existing session according to action
    const updatedMessages = [...existingRecord.messages];
    let updatedMode = existingRecord.mode;
    let updatedTakenBy = existingRecord.takenBy;
    let updatedTakenAt = existingRecord.takenAt;
    let updatedUnread = existingRecord.unreadForAdmin;
    let updatedStatus = existingRecord.status;
    let updatedName = name ? String(name).trim() : existingRecord.name;
    let updatedEmail = email ? String(email).trim().toLowerCase() : existingRecord.email;
    let updatedPhone = phone !== undefined ? String(phone).trim() : existingRecord.phone;
    let updatedNotes = notes !== undefined ? String(notes) : (existingRecord.notes || '');

    if (action === 'sync_messages' && Array.isArray(messages)) {
      // Preserve any agent/system messages that exist in DB while syncing user/assistant messages from widget
      const incomingIds = new Set(messages.map((m: BotChatMessage) => m.id));
      const merged: BotChatMessage[] = [...messages];

      for (const dbMsg of existingRecord.messages) {
        if ((dbMsg.role === 'agent' || dbMsg.role === 'system') && !incomingIds.has(dbMsg.id)) {
          merged.push(dbMsg);
        }
      }
      merged.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

      const hadNewUserMessage = merged.length > existingRecord.messages.length;
      updatedMessages.splice(0, updatedMessages.length, ...merged);
      if (hadNewUserMessage) {
        updatedUnread = existingRecord.unreadForAdmin + 1;
        if (updatedStatus === 'cerrado') updatedStatus = 'nuevo';
      }
    } else if (action === 'customer_message' && content) {
      updatedMessages.push({
        id: `usr-${Date.now()}`,
        role: 'user',
        senderName: existingRecord.name,
        content: String(content).trim(),
        createdAt: nowIso,
      });
      updatedUnread = existingRecord.unreadForAdmin + 1;
      if (updatedMode !== 'agent') {
        updatedStatus = 'nuevo';
      }
    } else if (action === 'takeover') {
      const advisor = String(agentName || 'Asesor JRS').trim();
      updatedMode = 'agent';
      updatedTakenBy = advisor;
      updatedTakenAt = nowIso;
      updatedUnread = 0;
      updatedStatus = 'en_atencion';
      updatedMessages.push({
        id: `sys-${Date.now()}`,
        role: 'system',
        senderName: advisor,
        content: `👨‍💻 El asesor *${advisor}* ha tomado el mando de la conversación para atenderte en tiempo real.`,
        createdAt: nowIso,
      });
    } else if (action === 'release_to_bot') {
      updatedMode = 'bot';
      updatedUnread = 0;
      updatedStatus = 'contactado';
      updatedMessages.push({
        id: `sys-${Date.now()}`,
        role: 'system',
        content: `🤖 La atención personalizada ha finalizado. Clari AI queda a tu disposición para cualquier otra consulta.`,
        createdAt: nowIso,
      });
    } else if (action === 'agent_message' && content) {
      const advisor = String(agentName || existingRecord.takenBy || 'Asesor JRS').trim();
      updatedMode = 'agent';
      updatedTakenBy = advisor;
      updatedUnread = 0;
      updatedStatus = 'en_atencion';
      updatedMessages.push({
        id: `agt-${Date.now()}`,
        role: 'agent',
        senderName: advisor,
        content: String(content).trim(),
        createdAt: nowIso,
      });
    } else if (action === 'mark_read') {
      updatedUnread = 0;
      if (updatedStatus === 'nuevo') {
        updatedStatus = 'contactado';
      }
    } else if (action === 'close') {
      updatedMode = 'bot';
      updatedUnread = 0;
      updatedStatus = 'cerrado';
    } else if (action === 'update_lead_info') {
      await upsertLeadInClients(updatedName, updatedEmail, updatedPhone);
    }

    const updatedPayload: BotSessionPayload = {
      sessionId: existingRecord.sessionId,
      mode: updatedMode,
      takenBy: updatedTakenBy,
      takenAt: updatedTakenAt,
      unreadForAdmin: updatedUnread,
      trackings: extractTrackingsFromMessages(updatedMessages),
      notes: updatedNotes,
      updatedAt: nowIso,
      messages: updatedMessages,
    };

    const patchRes = await fetch(
      `${url}/rest/v1/contact_submissions?id=eq.${existingRecord.dbId}`,
      {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          company_name: 'Chat Clari',
          contact_name: updatedName,
          email: updatedEmail,
          phone: updatedPhone,
          status: updatedStatus,
          message: JSON.stringify(updatedPayload),
        }),
      }
    );

    const patchedRows = patchRes.ok ? await patchRes.json() : [];
    const updatedSession =
      Array.isArray(patchedRows) && patchedRows.length > 0
        ? parseRowToSession(patchedRows[0])
        : {
            ...existingRecord,
            name: updatedName,
            email: updatedEmail,
            phone: updatedPhone,
            status: updatedStatus,
            ...updatedPayload,
          };

    return NextResponse.json({
      success: true,
      session: updatedSession,
    });
  } catch (error) {
    console.error('Error in POST /api/bot-sessions:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const { searchParams } = new URL(request.url);
  const dbId = searchParams.get('dbId');

  if (!dbId) {
    return NextResponse.json({ error: 'dbId required' }, { status: 400 });
  }

  try {
    await fetch(`${url}/rest/v1/contact_submissions?id=eq.${encodeURIComponent(dbId)}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
