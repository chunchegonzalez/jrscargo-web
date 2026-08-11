import { NextResponse } from 'next/server';
import { deleteExpense } from '@/lib/supabase';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await deleteExpense(params.id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error deleting expense';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
