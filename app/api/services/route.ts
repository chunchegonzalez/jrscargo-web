import { NextResponse } from 'next/server';
import { getServices, createService } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getServices();
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error fetching services';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await createService(body);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error creating service';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
