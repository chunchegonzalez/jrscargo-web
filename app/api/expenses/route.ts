import { NextResponse } from 'next/server';
import { getExpenses, createExpense } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getExpenses();
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error fetching expenses';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const expense = await request.json();
    const createdExpense = await createExpense(expense);
    return NextResponse.json({ success: true, data: createdExpense }, { status: 201 });
  } catch (error) {
    const err = error as Error;
    console.error('Error creating expense:', err);
    return NextResponse.json({ success: false, error: err.message || 'Error creating expense' }, { status: 500 });
  }
}
