import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  
  const response = NextResponse.next();

  // Set security and anti-clickjacking headers on ALL responses
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://*.supabase.co https://*.tile.openstreetmap.org https://unpkg.com;
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org;
    upgrade-insecure-requests;
  `;
  response.headers.set('Content-Security-Policy', cspHeader.replace(/\s{2,}/g, ' ').trim());

  // Handle CORS for API routes
  if (request.nextUrl.pathname.startsWith('/api/') && origin) {
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isSameOrigin = host ? origin.includes(host) : false;

    if (isSameOrigin || isLocalhost) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    } else {
      response.headers.set('Access-Control-Allow-Origin', 'null');
    }
  }
  
  return response;
}

export const config = {
  matcher: '/:path*',
};
