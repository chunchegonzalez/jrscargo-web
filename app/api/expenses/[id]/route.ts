import { NextResponse } from 'next/server';
import { getExpenseById, deleteExpense, updateExpense } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await getExpenseById(params.id);
    if (!data) {
      return NextResponse.json({ success: false, error: 'Gasto no encontrado' }, { status: 404 });
    }
    const response = NextResponse.json({ success: true, data }, { status: 200 });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error fetching expense';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await deleteExpense(params.id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error deleting expense';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    await updateExpense(params.id, body);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error updating expense';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
