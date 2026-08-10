import { NextResponse } from 'next/server';
import { getUsers, createUser } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getUsers();
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: 'Error fetching users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await createUser(body);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error creating user';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
