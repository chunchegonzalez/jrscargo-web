// WhatsApp Notification Helpers for JRS Cargo Costa Rica

export function formatWhatsAppPhone(rawPhone?: string | null): string {
  if (!rawPhone) return "";
  const digits = String(rawPhone).replace(/\D/g, "");
  if (!digits) return "";

  // Standard Costa Rica 8-digit local phone number (e.g. 72601238)
  if (digits.length === 8) {
    return `506${digits}`;
  }
  // Already has 506 country code (11 digits: 506 + 8 digits)
  if (digits.length === 11 && digits.startsWith("506")) {
    return digits;
  }
  return digits;
}

export function generateInvoiceWhatsAppMessage(params: {
  clientName: string;
  invoiceNumber: string;
  items?: Array<{
    tracking_number?: string;
    weight?: string | number;
    service_name?: string;
  }>;
  totalAmount: number;
  pendingAmount: number;
  currency?: string;
  exchangeRate?: number;
  isPaid?: boolean;
}): string {
  const {
    clientName,
    invoiceNumber,
    items = [],
    totalAmount,
    pendingAmount,
    currency = "USD",
    exchangeRate = 510,
    isPaid = false,
  } = params;

  const validItems = items.filter(it => it && (it.tracking_number || it.service_name));
  
  let packagesList = "";
  if (validItems.length > 0) {
    packagesList = validItems.map(it => {
      const track = it.tracking_number ? `Tracking: ${it.tracking_number}` : (it.service_name || "Paquete");
      const w = it.weight && Number(it.weight) > 0 ? ` (${it.weight} lbs)` : "";
      return `• ${track}${w}`;
    }).join("\n");
  } else {
    packagesList = `• Factura ${invoiceNumber} (Carga general)`;
  }

  const curr = currency || "USD";
  let montoTexto = "";
  
  if (isPaid || pendingAmount <= 0.01) {
    montoTexto = `✅ *Estado:* Totalmente Pagada (${curr === "USD" ? `$${totalAmount.toFixed(2)} USD` : `₡${Math.round(totalAmount).toLocaleString()} CRC`})`;
  } else {
    if (curr === "USD") {
      const approxCRC = Math.round(pendingAmount * (exchangeRate || 510));
      montoTexto = `💰 *Monto Pendiente:* $${pendingAmount.toFixed(2)} USD (aprox. ₡${approxCRC.toLocaleString()} CRC)`;
    } else {
      const approxUSD = (pendingAmount / (exchangeRate || 510)).toFixed(2);
      montoTexto = `💰 *Monto Pendiente:* ₡${Math.round(pendingAmount).toLocaleString()} CRC (aprox. $${approxUSD} USD)`;
    }
  }

  return `👋 ¡Hola ${clientName.trim()}! 📦 Te saludamos de *JRS CARGO COSTA RICA*.

Te informamos que tus paquetes ya se encuentran listos para ser retirados en sucursal:

📄 *Factura:* ${invoiceNumber}
📦 *Paquetes / Guías listas:*
${packagesList}

${montoTexto}

📍 *Horario y Sucursal de Retiro:*
Lunes a Viernes de 8:00 am a 5:30 pm | Sábados de 9:00 am a 1:00 pm.

Si deseas coordinar entrega a domicilio o tienes alguna consulta, con gusto te atendemos por este medio. ¡Muchas gracias por tu preferencia! ✈️🇨🇷`;
}

export function openWhatsAppWeb(phone: string, text: string) {
  const cleanPhone = formatWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(text);
  const url = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
