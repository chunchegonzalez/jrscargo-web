import { NextResponse } from 'next/server';
import { getHeaders } from '@/lib/supabase'; // We'll need to export getHeaders from supabase or implement it directly

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const headers = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    };

    // Get the most recent invoice that starts with "F-"
    const res = await fetch(`${url}/rest/v1/invoices?invoice_number=like.F-*&order=created_at.desc&limit=1`, {
      headers,
      cache: 'no-store'
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch latest invoice');
    }

    const data = await res.json();
    let nextNumber = 1;

    if (data && data.length > 0) {
      const latestInvoice = data[0];
      const match = latestInvoice.invoice_number.match(/F-(\d+)/);
      if (match && match[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const formattedNumber = `F-${nextNumber.toString().padStart(4, '0')}`;

    return NextResponse.json({ success: true, nextNumber: formattedNumber }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error fetching next invoice number';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
