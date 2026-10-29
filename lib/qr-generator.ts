import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Generador nativo ISO/IEC 18004 de matriz QR (Versiones 2-L y 3-L, modo Byte)
 * Permite renderizar el QR en SVG/Canvas en JRS Cargo Mobile y dibujar vectorialmente
 * cada módulo dentro de etiquetas PDF con pdf-lib sin depender de servicios externos.
 */
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function reedSolomonGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function computeReedSolomon(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = reedSolomonGeneratorPoly(ecCount);
  const msg = new Uint8Array(data.length + ecCount);
  msg.set(data, 0);

  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

export function generateQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  // Version 2-L supports up to 32 bytes (34 data codewords, 10 EC codewords, size 25x25)
  // Version 3-L supports up to 53 bytes (55 data codewords, 15 EC codewords, size 29x29)
  const useV3 = bytes.length > 32;
  const size = useV3 ? 29 : 25;
  const dataCodewords = useV3 ? 55 : 34;
  const ecCodewords = useV3 ? 15 : 10;
  const alignCenter = useV3 ? 22 : 18;

  // 1. Encode Byte Mode bitstream
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  pushBits(0b0100, 4); // Byte mode indicator
  pushBits(bytes.length, 8);
  for (let i = 0; i < bytes.length; i++) {
    pushBits(bytes[i], 8);
  }

  const maxBits = dataCodewords * 8;
  const terminator = Math.min(4, maxBits - bits.length);
  pushBits(0, terminator);
  while (bits.length % 8 !== 0) bits.push(0);

  const data = new Uint8Array(dataCodewords);
  for (let i = 0; i < bits.length / 8; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i * 8 + j];
    }
    data[i] = b;
  }
  let padToggle = true;
  for (let i = bits.length / 8; i < dataCodewords; i++) {
    data[i] = padToggle ? 0xec : 0x11;
    padToggle = !padToggle;
  }

  const ec = computeReedSolomon(data, ecCodewords);
  const fullCodewords = new Uint8Array(dataCodewords + ecCodewords);
  fullCodewords.set(data, 0);
  fullCodewords.set(ec, dataCodewords);

  // 2. Initialize grid
  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setFunctionModule = (r: number, c: number, dark: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = dark;
      isFunction[r][c] = true;
    }
  };

  // Finder patterns + separators
  const drawFinder = (topR: number, leftC: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = topR + dr;
        const c = leftC + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunctionModule(r, c, inOuter && (onBorder || inInner));
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Alignment pattern (5x5 centered at alignCenter, alignCenter)
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
      setFunctionModule(alignCenter + dr, alignCenter + dc, dark);
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // Dark module & reserve format info areas
  setFunctionModule(size - 8, 8, true);
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) setFunctionModule(8, i, false);
    if (!isFunction[i][8]) setFunctionModule(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) setFunctionModule(8, size - 1 - i, false);
    if (!isFunction[size - 1 - i][8]) setFunctionModule(size - 1 - i, 8, false);
  }

  // 3. Place data bits in upward/downward 2-column zig-zag
  let bitIdx = 0;
  const totalCodewordBits = fullCodewords.length * 8;
  let upward = true;

  for (let rightCol = size - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol = 5; // Skip vertical timing pattern column
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (let dc = 0; dc < 2; dc++) {
        const c = rightCol - dc;
        if (!isFunction[r][c]) {
          let dark = false;
          if (bitIdx < totalCodewordBits) {
            const byteVal = fullCodewords[bitIdx >>> 3];
            dark = ((byteVal >>> (7 - (bitIdx & 7))) & 1) === 1;
            bitIdx++;
          }
          // Apply Mask 0: (r + c) % 2 === 0
          if ((r + c) % 2 === 0) dark = !dark;
          modules[r][c] = dark;
        }
      }
    }
    upward = !upward;
  }

  // 4. Place Format Information for Level L (01) + Mask 0 (000) -> 0x77c4 (30660)
  const formatBits = 0x77c4;
  const getFmtBit = (i: number) => ((formatBits >>> i) & 1) === 1;

  // Around top-left finder
  for (let i = 0; i <= 5; i++) modules[8][i] = getFmtBit(14 - i);
  modules[8][7] = getFmtBit(8);
  modules[8][8] = getFmtBit(7);
  modules[7][8] = getFmtBit(6);
  for (let i = 0; i <= 5; i++) modules[5 - i][8] = getFmtBit(5 - i);

  // Along bottom-left and top-right
  for (let i = 0; i <= 6; i++) modules[size - 1 - i][8] = getFmtBit(14 - i);
  for (let i = 0; i <= 7; i++) modules[8][size - 8 + i] = getFmtBit(7 - i);

  return modules;
}

export interface PrintableShelfLabel {
  code: string;
  warehouse: string;
  zone: string;
  rack?: string;
  level: string;
  position: string;
  qrPayload: string;
}

/**
 * Genera un documento PDF descargable con una o múltiples etiquetas de estantes (2x2 por página Carta).
 */
export async function generateShelfLabelsPdf(shelves: PrintableShelfLabel[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pageWidth = 612; // Letter width (8.5 in)
  const pageHeight = 792; // Letter height (11 in)

  const cols = 2;
  const rows = 2;
  const perPage = cols * rows;
  const marginX = 36;
  const marginY = 36;
  const gapX = 24;
  const gapY = 24;

  const cardWidth = (pageWidth - marginX * 2 - gapX) / cols;
  const cardHeight = (pageHeight - marginY * 2 - gapY) / rows;

  for (let i = 0; i < shelves.length; i++) {
    const pageIndex = Math.floor(i / perPage);
    const slotIndex = i % perPage;

    if (slotIndex === 0) {
      pdfDoc.addPage([pageWidth, pageHeight]);
    }

    const pages = pdfDoc.getPages();
    const page = pages[pageIndex];

    const col = slotIndex % cols;
    const row = Math.floor(slotIndex / cols);

    const x = marginX + col * (cardWidth + gapX);
    const y = pageHeight - marginY - (row + 1) * cardHeight - row * gapY;

    const shelf = shelves[i];

    // Borde de la etiqueta
    page.drawRectangle({
      x,
      y,
      width: cardWidth,
      height: cardHeight,
      borderColor: rgb(0.07, 0.26, 0.37),
      borderWidth: 2,
      color: rgb(1, 1, 1),
    });

    // Franja superior corporativa JRS CARGO
    const headerHeight = 44;
    page.drawRectangle({
      x,
      y: y + cardHeight - headerHeight,
      width: cardWidth,
      height: headerHeight,
      color: rgb(0.04, 0.11, 0.17), // #0B1D2B
    });

    const brandTitle = 'JRS CARGO';
    const brandWidth = fontBold.widthOfTextAtSize(brandTitle, 18);
    page.drawText(brandTitle, {
      x: x + (cardWidth - brandWidth) / 2,
      y: y + cardHeight - 29,
      size: 18,
      font: fontBold,
      color: rgb(0.96, 0.65, 0.14), // #F5A623
    });

    // Subtítulo: ESTANTE X
    const estanteText = `ESTANTE ${shelf.zone}`;
    const estanteWidth = fontBold.widthOfTextAtSize(estanteText, 16);
    page.drawText(estanteText, {
      x: x + (cardWidth - estanteWidth) / 2,
      y: y + cardHeight - 72,
      size: 16,
      font: fontBold,
      color: rgb(0.07, 0.26, 0.37),
    });

    // NIVEL XX — POSICIÓN XX
    const levelPosText = `NIVEL ${shelf.level} — POSICIÓN ${shelf.position}`;
    const levelPosWidth = fontRegular.widthOfTextAtSize(levelPosText, 11);
    page.drawText(levelPosText, {
      x: x + (cardWidth - levelPosWidth) / 2,
      y: y + cardHeight - 92,
      size: 11,
      font: fontRegular,
      color: rgb(0.35, 0.4, 0.45),
    });

    // Dibujar código QR vectorial centrado
    const matrix = generateQrMatrix(shelf.qrPayload || `JRS-LOC:${shelf.code}`);
    const qrModules = matrix.length;
    const qrBoxSize = 155;
    const moduleSize = qrBoxSize / (qrModules + 4);
    const qrStartX = x + (cardWidth - qrBoxSize) / 2;
    const qrStartY = y + 72;

    // Marco del QR
    page.drawRectangle({
      x: qrStartX,
      y: qrStartY,
      width: qrBoxSize,
      height: qrBoxSize,
      borderColor: rgb(0.85, 0.88, 0.9),
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });

    for (let r = 0; r < qrModules; r++) {
      for (let c = 0; c < qrModules; c++) {
        if (matrix[r][c]) {
          page.drawRectangle({
            x: qrStartX + (c + 2) * moduleSize,
            y: qrStartY + qrBoxSize - (r + 3) * moduleSize,
            width: moduleSize + 0.15,
            height: moduleSize + 0.15,
            color: rgb(0.04, 0.11, 0.17),
          });
        }
      }
    }

    // Código legible debajo del QR (Ej: CR-A-02-03)
    const codeBadgeWidth = cardWidth - 40;
    const codeBadgeHeight = 36;
    const codeBadgeX = x + 20;
    const codeBadgeY = y + 20;

    page.drawRectangle({
      x: codeBadgeX,
      y: codeBadgeY,
      width: codeBadgeWidth,
      height: codeBadgeHeight,
      color: rgb(0.95, 0.97, 0.99),
      borderColor: rgb(0.07, 0.26, 0.37),
      borderWidth: 1.5,
    });

    const codeWidth = fontBold.widthOfTextAtSize(shelf.code, 18);
    page.drawText(shelf.code, {
      x: x + (cardWidth - codeWidth) / 2,
      y: codeBadgeY + 11,
      size: 18,
      font: fontBold,
      color: rgb(0.04, 0.11, 0.17),
    });
  }

  return pdfDoc.save();
}
