import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function checkSite(url: string) {
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const end = Date.now();
    return {
      status: 'online',
      responseTime: end - start,
      statusCode: res.status,
      ssl: 'Valid'
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    return {
      status: 'offline',
      responseTime: 0,
      statusCode: 0,
      ssl: 'Unknown'
    };
  }
}

export async function GET() {
  const publicSite = await checkSite('https://www.jrscargocr.com');
  const adminSite = await checkSite('https://www.jrscargocr.com/admin');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const headers = {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json'
  };

  let quotes: Record<string, unknown>[] = [];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const quotesRes = await fetch(supabaseUrl + '/rest/v1/contact_submissions?select=*', {
      headers: headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (quotesRes.ok) {
      quotes = await quotesRes.json() as Record<string, unknown>[];
    }
  } catch (error: unknown) {
    // ignore
  }

  return NextResponse.json({
    publicSite: publicSite,
    adminSite: adminSite,
    quotes: quotes,
    server: 'Next.js API Route',
    timestamp: new Date().toISOString()
  });
}
