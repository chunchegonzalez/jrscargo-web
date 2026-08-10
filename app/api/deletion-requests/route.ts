import { NextResponse } from 'next/server';
import { getDeletionRequests, createDeletionRequest } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getDeletionRequests();
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Error fetching requests' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await createDeletionRequest(body);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Error creating request' }, { status: 500 });
  }
}
