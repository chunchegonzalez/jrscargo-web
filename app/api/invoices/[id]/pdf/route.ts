import { NextResponse } from 'next/server';
import { getInvoiceById } from '@/lib/supabase';
import { generateInvoicePdf } from '@/lib/invoice-pdf';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await getInvoiceById(params.id);
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Factura no encontrada' }, { status: 404 });
    }

    const pdfBuffer = await generateInvoicePdf(invoice);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Factura-${invoice.invoice_number || params.id}.pdf"`,
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (err) {
    console.error('Error generating PDF download:', err);
    return NextResponse.json({ success: false, error: 'Error al generar PDF' }, { status: 500 });
  }
}
