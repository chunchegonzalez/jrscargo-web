import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trackingNumber = searchParams.get('number');

  if (!trackingNumber) {
    return NextResponse.json({ error: 'Tracking number is required' }, { status: 400 });
  }

  const apiToken = process.env.TRACKING_API_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NTgyNiwiZW1haWwiOiJqb3NlZ29uMjAwMEBob3RtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsInJvbGVJZCI6MTIsInRlbmFudElkIjoiOWRjZGFlZGItZmZlMS00M2Y3LWI1ZTgtMDMzOGVjYjk4NmQwIiwiY2xpZW50SWQiOjYwODMsImNsaWVudENvZGUiOiJKUlMtMTAwMSIsImlzVG9wTWFzdGVyIjpmYWxzZSwiaXNNYXlvcmlzdGEiOnRydWUsImlhdCI6MTc4NjIzNzE1Mn0.ZLEBwa8iR_wLw59Akpl-PpR_Mwq3h3IBO6XKVi2PZpQ";

  if (!apiToken) {
    return NextResponse.json({ error: 'System configuration error' }, { status: 500 });
  }

  try {
    // Calling the correct tracking endpoint.
    // Most standard tracking APIs append the tracking number to the URL for a GET request.
    const res = await fetch(`https://worldboxcr.com/api/jrscargo/tracking/${encodeURIComponent(trackingNumber)}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) {
      console.error('Tracking API error:', res.status, await res.text());
      return NextResponse.json({ error: 'Tracking API responded with an error' }, { status: res.status });
    }

    const data = await res.json();
    
    // We pass the raw data to the frontend so it can be mapped.
    return NextResponse.json({
      trackingNumber,
      status: 'SUCCESS',
      rawData: data
    });

  } catch (error) {
    console.error('Error fetching tracking data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
