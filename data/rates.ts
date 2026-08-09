export const rates = {
  usaAir: 7, // USD/lb
  usaSea: 30, // USD/ft³
  spainAir: 15, // USD/lb
  chinaAir: 17, // USD/lb
};

export const WHATSAPP_NUMBER = '50672601238';
export const EMAIL = 'info@jrscargocr.com';
export const INSTAGRAM_URL = 'https://www.instagram.com/jrscargocr/';
export const PORTAL_REGISTER_URL = 'https://worldboxcr.com/jrscargo/register';
export const PORTAL_LOGIN_URL = 'https://worldboxcr.com/jrscargo/login';
export const MAPS_URL = 'https://maps.google.com';

export const RATES = {
  USA_AIR: { label: 'Aéreo USA', origin: 'Estados Unidos', price: rates.usaAir },
  USA_SEA: { label: 'Marítimo USA', origin: 'Estados Unidos', price: rates.usaSea },
  SPAIN_AIR: { label: 'Aéreo España', origin: 'España', price: rates.spainAir },
  CHINA_AIR: { label: 'Aéreo China', origin: 'China', price: rates.chinaAir },
};

export function kgToLb(kg: number): number {
  return kg * 2.20462;
}

export function cmToCubicFeet(l: number, w: number, h: number): number {
  return (l * w * h) / 28316.8;
}

export function calculateWeightCost(rateKey: 'USA_AIR' | 'SPAIN_AIR' | 'CHINA_AIR', lb: number): number {
  return lb * RATES[rateKey].price;
}

export function calculateSeaCost(ft3: number): number {
  return ft3 * RATES.USA_SEA.price;
}
