import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export interface InvoiceDataForPdf {
  invoice_number: string;
  issue_date?: string;
  due_date?: string;
  status: string;
  subtotal: number;
  discount_percent: number;
  total: number;
  exchange_rate?: number;
  notes?: string;
  clients?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  } | null;
  items: Array<{
    service_name: string;
    tracking_number?: string;
    weight?: string | number;
    rate?: string | number;
    amount: number;
  }>;
}

export async function generateInvoicePdf(invoice: InvoiceDataForPdf): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 (595.28 x 841.89 pt)
  const { width, height } = page.getSize();

  // Fonts
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

  // Colors
  const brandBlue = rgb(0.07, 0.26, 0.37); // #12435E
  const brandNavy = rgb(0.04, 0.15, 0.21); // #0A2636
  const textDark = rgb(0.15, 0.15, 0.15);
  const textGray = rgb(0.45, 0.45, 0.45);
  const textLight = rgb(0.65, 0.65, 0.65);
  const borderGray = rgb(0.88, 0.88, 0.88);
  const bgLight = rgb(0.96, 0.97, 0.98);
  const successGreen = rgb(0.06, 0.65, 0.40);
  const amberColor = rgb(0.90, 0.55, 0.05);

  const margin = 40;
  let y = height - margin;

  // Try to embed logo image
  let logoDrawn = false;
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      const logoImg = await pdfDoc.embedPng(logoBytes);
      const logoDims = logoImg.scale(0.25);
      page.drawImage(logoImg, {
        x: width - margin - logoDims.width,
        y: y - logoDims.height + 10,
        width: logoDims.width,
        height: logoDims.height,
      });
      logoDrawn = true;
    }
  } catch (e) {
    console.warn('Could not embed PNG logo in PDF, rendering vector text header', e);
  }

  // 1. Company Header
  page.drawText('FACTURA', {
    x: margin,
    y,
    size: 22,
    font: fontBold,
    color: brandBlue,
  });
  y -= 20;

  page.drawText('JRS CARGO S.A.', {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: textDark,
  });
  y -= 14;

  page.drawText('Heredia, San Pablo de Heredia, Costa Rica', {
    x: margin,
    y,
    size: 9,
    font: fontRegular,
    color: textGray,
  });
  y -= 12;

  page.drawText('Tel: +506 7260-1238  |  info@jrscargocr.com  |  www.jrscargocr.com', {
    x: margin,
    y,
    size: 8.5,
    font: fontRegular,
    color: textGray,
  });
  y -= 20;

  // Divider Line
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: borderGray,
  });
  y -= 22;

  // 2. Invoice Meta & Client Info Box
  const clientName = invoice.clients?.name || 'Cliente';
  const clientEmail = invoice.clients?.email || '';
  const clientPhone = invoice.clients?.phone || '';
  const [yearStr, monthStr, dayStr] = (invoice.issue_date || '').split('T')[0].split('-');
  const formattedDate = yearStr && monthStr && dayStr ? `${dayStr}/${monthStr}/${yearStr}` : new Date().toLocaleDateString('es-CR');

  // Left Column: Client Details
  page.drawText('FACTURAR A:', {
    x: margin,
    y,
    size: 8.5,
    font: fontBold,
    color: textLight,
  });
  y -= 14;

  page.drawText(clientName, {
    x: margin,
    y,
    size: 13,
    font: fontBold,
    color: textDark,
  });
  y -= 13;

  if (clientEmail) {
    page.drawText(clientEmail, {
      x: margin,
      y,
      size: 9,
      font: fontRegular,
      color: textGray,
    });
    y -= 12;
  }
  if (clientPhone) {
    page.drawText(clientPhone, {
      x: margin,
      y,
      size: 9,
      font: fontRegular,
      color: textGray,
    });
    y -= 12;
  }

  // Right Column (Invoice Number, Date, Status)
  const metaX = width - margin - 170;
  let metaY = y + (clientEmail ? 39 : 27);

  page.drawText(`N° de Factura:`, { x: metaX, y: metaY, size: 9, font: fontRegular, color: textGray });
  page.drawText(invoice.invoice_number, { x: width - margin - 60, y: metaY, size: 10, font: fontBold, color: brandBlue });
  metaY -= 14;

  page.drawText(`Fecha de Emisión:`, { x: metaX, y: metaY, size: 9, font: fontRegular, color: textGray });
  page.drawText(formattedDate, { x: width - margin - 60, y: metaY, size: 9, font: fontRegular, color: textDark });
  metaY -= 14;

  const statusText = (invoice.status || 'PENDIENTE').toUpperCase();
  const statusColor = statusText === 'PAGADA' ? successGreen : (statusText === 'ANULADA' ? rgb(0.8, 0.2, 0.2) : amberColor);
  page.drawText(`Estado:`, { x: metaX, y: metaY, size: 9, font: fontRegular, color: textGray });
  page.drawText(statusText, { x: width - margin - 60, y: metaY, size: 9, font: fontBold, color: statusColor });

  y -= 25;

  // 3. Table Header
  const colX = {
    service: margin + 8,
    tracking: margin + 175,
    weight: margin + 315,
    rate: margin + 380,
    amount: width - margin - 10,
  };

  const tableTop = y;
  page.drawRectangle({
    x: margin,
    y: tableTop - 18,
    width: width - (margin * 2),
    height: 24,
    color: brandBlue,
  });

  page.drawText('PRODUCTO / SERVICIO', { x: colX.service, y: tableTop - 10, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('N° DE RASTREO', { x: colX.tracking, y: tableTop - 10, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('PESO', { x: colX.weight, y: tableTop - 10, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('TARIFA', { x: colX.rate, y: tableTop - 10, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('IMPORTE (USD)', { x: colX.amount - 65, y: tableTop - 10, size: 8, font: fontBold, color: rgb(1, 1, 1) });

  y = tableTop - 24;

  // 4. Table Rows
  const items = invoice.items || [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowHeight = 22;
    const isEven = i % 2 === 0;

    if (isEven) {
      page.drawRectangle({
        x: margin,
        y: y - rowHeight + 6,
        width: width - (margin * 2),
        height: rowHeight,
        color: bgLight,
      });
    }

    // Service name
    const serviceName = (item.service_name || 'Transporte Internacional').substring(0, 32);
    page.drawText(serviceName, { x: colX.service, y: y - 8, size: 8.5, font: fontRegular, color: textDark });

    // Tracking
    const tracking = (item.tracking_number || '-').substring(0, 24);
    page.drawText(tracking, { x: colX.tracking, y: y - 8, size: 8, font: fontMono, color: brandNavy });

    // Weight
    const weightStr = item.weight !== undefined && item.weight !== null && item.weight !== '' ? `${item.weight} lb` : '-';
    page.drawText(weightStr, { x: colX.weight, y: y - 8, size: 8.5, font: fontRegular, color: textGray });

    // Rate
    const rateStr = item.rate !== undefined && item.rate !== null && item.rate !== '' ? `$${Number(item.rate).toFixed(2)}` : '-';
    page.drawText(rateStr, { x: colX.rate, y: y - 8, size: 8.5, font: fontRegular, color: textGray });

    // Amount
    const amountStr = `$${Number(item.amount || 0).toFixed(2)}`;
    const amtWidth = fontBold.widthOfTextAtSize(amountStr, 9);
    page.drawText(amountStr, { x: colX.amount - amtWidth, y: y - 8, size: 9, font: fontBold, color: textDark });

    // Bottom row border
    page.drawLine({
      start: { x: margin, y: y - rowHeight + 6 },
      end: { x: width - margin, y: y - rowHeight + 6 },
      thickness: 0.5,
      color: borderGray,
    });

    y -= rowHeight;
  }

  y -= 15;

  // 5. Totals Box (Right Aligned)
  const totalsWidth = 200;
  const totalsX = width - margin - totalsWidth;
  const exchangeRate = invoice.exchange_rate || 530;
  const totalUSD = Number(invoice.total || 0);
  const totalCRC = totalUSD * exchangeRate;
  const formattedColones = totalCRC.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Subtotal
  page.drawText('Subtotal:', { x: totalsX, y, size: 9, font: fontRegular, color: textGray });
  const subStr = `$${Number(invoice.subtotal || invoice.total).toFixed(2)}`;
  page.drawText(subStr, { x: width - margin - fontRegular.widthOfTextAtSize(subStr, 9), y, size: 9, font: fontRegular, color: textDark });
  y -= 14;

  // Discount (if any)
  if (invoice.discount_percent && invoice.discount_percent > 0) {
    const discAmt = ((Number(invoice.subtotal) * invoice.discount_percent) / 100).toFixed(2);
    page.drawText(`Descuento (${invoice.discount_percent}%):`, { x: totalsX, y, size: 9, font: fontRegular, color: successGreen });
    const discStr = `-$${discAmt}`;
    page.drawText(discStr, { x: width - margin - fontRegular.widthOfTextAtSize(discStr, 9), y, size: 9, font: fontRegular, color: successGreen });
    y -= 14;
  }

  // Total USD Highlight Box
  page.drawRectangle({
    x: totalsX - 8,
    y: y - 18,
    width: totalsWidth + 8,
    height: 28,
    color: bgLight,
    borderColor: brandBlue,
    borderWidth: 1,
  });

  page.drawText('TOTAL USD:', { x: totalsX, y: y - 10, size: 11, font: fontBold, color: brandBlue });
  const totalStr = `$${totalUSD.toFixed(2)}`;
  const totalWidth = fontBold.widthOfTextAtSize(totalStr, 14);
  page.drawText(totalStr, { x: width - margin - totalWidth, y: y - 10, size: 14, font: fontBold, color: brandBlue });

  y -= 32;

  // Total Colones
  page.drawText('Total Colones:', { x: totalsX, y, size: 9, font: fontRegular, color: textGray });
  const crcStr = `₡${formattedColones}`;
  page.drawText(crcStr, { x: width - margin - fontBold.widthOfTextAtSize(crcStr, 9), y, size: 9, font: fontBold, color: textDark });
  y -= 12;

  page.drawText(`T.C. ₡${exchangeRate} por $1 USD`, { x: width - margin - fontRegular.widthOfTextAtSize(`T.C. ₡${exchangeRate} por $1 USD`, 7.5), y, size: 7.5, font: fontRegular, color: textLight });

  // 6. Notes / Mensaje de Cliente (Left Side)
  let notesY = y + 45;
  const notesText = invoice.notes || 'Gracias por elegir a JRS CARGO';
  page.drawRectangle({
    x: margin,
    y: notesY - 35,
    width: 280,
    height: 48,
    color: bgLight,
    borderColor: borderGray,
    borderWidth: 0.5,
  });

  page.drawText('NOTAS & CONDICIONES:', { x: margin + 8, y: notesY - 2, size: 7.5, font: fontBold, color: brandBlue });
  page.drawText(notesText.substring(0, 75), { x: margin + 8, y: notesY - 14, size: 8, font: fontRegular, color: textGray });
  page.drawText('Servicio de Casillero y Envíos Internacionales.', { x: margin + 8, y: notesY - 26, size: 7.5, font: fontRegular, color: textLight });

  // 7. Footer
  const footerY = 35;
  page.drawLine({
    start: { x: margin, y: footerY + 18 },
    end: { x: width - margin, y: footerY + 18 },
    thickness: 0.5,
    color: borderGray,
  });

  const footerText1 = 'JRS CARGO S.A. • San Pablo de Heredia, Costa Rica';
  const footerText2 = 'info@jrscargocr.com • Tel: +506 7260-1238 • www.jrscargocr.com';
  
  page.drawText(footerText1, {
    x: (width - fontBold.widthOfTextAtSize(footerText1, 8)) / 2,
    y: footerY + 6,
    size: 8,
    font: fontBold,
    color: brandBlue,
  });

  page.drawText(footerText2, {
    x: (width - fontRegular.widthOfTextAtSize(footerText2, 7.5)) / 2,
    y: footerY - 5,
    size: 7.5,
    font: fontRegular,
    color: textLight,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
