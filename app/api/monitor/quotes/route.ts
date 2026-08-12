import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const getHeaders = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json'
  };
};

const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || '';
};

export async function GET() {
  try {
    const url = getBaseUrl() + '/rest/v1/contact_submissions?select=*&order=created_at.desc';
    const res = await fetch(url, { headers: getHeaders() });
    const data = await res.json() as Record<string, unknown>[];
    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const url = getBaseUrl() + '/rest/v1/contact_submissions';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(body)
    });
    const data = await res.json() as Record<string, unknown>[];
    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { id?: number, status?: string };
    if (!body.id || !body.status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }
    const url = getBaseUrl() + '/rest/v1/contact_submissions?id=eq.' + body.id.toString();
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        ...getHeaders(),
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ status: body.status })
    });
    const data = await res.json() as Record<string, unknown>[];
    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
