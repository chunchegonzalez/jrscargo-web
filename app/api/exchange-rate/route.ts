import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('https://api.hacienda.go.cr/indicadores/tc', {
      headers: {
        'Accept': 'application/json'
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch from Hacienda API');
    }
    
    const data = await res.json();
    
    if (data && data.dolar && data.dolar.venta && data.dolar.venta.valor) {
      return NextResponse.json({
        success: true,
        source: 'hacienda',
        rate: data.dolar.venta.valor
      });
    }
    
    throw new Error('Invalid data format from API');
    
  } catch (error) {
    console.error('Exchange rate error:', error);
    // Fallback rate if API is down
    return NextResponse.json({
      success: true,
      source: 'fallback',
      rate: 510.00
    });
  }
}
