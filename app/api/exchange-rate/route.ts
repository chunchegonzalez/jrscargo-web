import { NextResponse } from 'next/server';
import { getStoredExchangeRate, setStoredExchangeRate } from '@/lib/supabase';
import { getLocalTodayDate } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rate = await getStoredExchangeRate();
    return NextResponse.json({
      success: true,
      rate,
      date: getLocalTodayDate()
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error fetching exchange rate';
    return NextResponse.json({ success: false, error: errorMsg, rate: 500 }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rate = Number(body.rate);
    
    if (!rate || isNaN(rate) || rate <= 0) {
      return NextResponse.json({ success: false, error: 'Tipo de cambio inválido' }, { status: 400 });
    }

    const updateTodayInvoices = body.updateTodayInvoices !== false;
    const targetDate = body.date || getLocalTodayDate();

    const result = await setStoredExchangeRate(rate, updateTodayInvoices, targetDate);
    
    return NextResponse.json({
      success: true,
      rate: result.rate,
      updatedInvoicesCount: result.updatedInvoicesCount,
      targetDate,
      message: updateTodayInvoices && result.updatedInvoicesCount > 0
        ? 'Tipo de cambio actualizado a ₡' + result.rate + '. Se actualizaron ' + result.updatedInvoicesCount + ' factura(s) de hoy (' + targetDate + ').'
        : 'Tipo de cambio actualizado a ₡' + result.rate + '.'
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error saving exchange rate';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
