import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'JRS CARGO — Casillero en Miami gratis para Costa Rica';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #0B1D2B 0%, #12435E 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 800, color: '#F9B233', marginBottom: 20 }}>
          JRS CARGO COSTA RICA
        </div>
        <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.05 }}>Casillero en Miami</div>
        <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.05, color: '#F9B233' }}>100% gratis</div>
        <div style={{ fontSize: 32, marginTop: 30, color: '#CBD5E1' }}>
          Comprá en USA, España y China · Aéreo desde $7/lb · Tracking en vivo
        </div>
        <div style={{ fontSize: 28, marginTop: 40, fontWeight: 700 }}>www.jrscargocr.com</div>
      </div>
    ),
    { ...size }
  );
}
