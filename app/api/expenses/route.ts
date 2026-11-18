import { NextResponse } from 'next/server';
import { getExpenses, createExpense } from '@/lib/supabase';
import { parseExpenseMetadata } from '@/lib/expense-attachments';

export const dynamic = 'force-dynamic';

type RawExpenseRow = Record<string, unknown> & {
  receipt_image?: string | null;
  receipt_url?: string | null;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const minimal = searchParams.get('minimal') === 'true';
    const includeReceipts = searchParams.get('includeReceipts') === 'true';

    if (minimal) {
      const data = await getExpenses({ minimal: true });
      const response = NextResponse.json({ success: true, data }, { status: 200 });
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return response;
    }

    const rows = (await getExpenses()) as RawExpenseRow[];

    if (includeReceipts) {
      const response = NextResponse.json({ success: true, data: rows }, { status: 200 });
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return response;
    }

    // Por defecto devolvemos metadatos livianos (sin los base64 pesados de PDFs/imágenes)
    // para que la tabla cargue instantáneamente; cada documento se carga bajo demanda en GET /api/expenses/[id]
    const lightweight = (Array.isArray(rows) ? rows : []).map(row => {
      const rawReceipt = row.receipt_image || row.receipt_url || null;
      const meta = parseExpenseMetadata(rawReceipt);
      const { receipt_image: _ignoredImg, receipt_url: _ignoredUrl, ...rest } = row;
      void _ignoredImg;
      void _ignoredUrl;
      return {
        ...rest,
        document_number: meta.documentNumber || '',
        attachment_count: meta.attachments.length,
        has_receipt: meta.attachments.length > 0,
      };
    });

    const response = NextResponse.json({ success: true, data: lightweight }, { status: 200 });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
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
