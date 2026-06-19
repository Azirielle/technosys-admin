import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  
  const response = NextResponse.next();

  if (origin) {
    // Check if the request is same-origin or localhost
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isSameOrigin = host ? origin.includes(host) : false;

    if (isSameOrigin || isLocalhost) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    } else {
      // Block or restrict cross-origin access from untrusted domains
      response.headers.set('Access-Control-Allow-Origin', 'null');
    }
  }
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
