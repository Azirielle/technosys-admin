import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  
  const pathname = request.nextUrl.pathname;

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Static assets and public routes skip auth checks
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/favicon.ico') || 
    pathname.startsWith('/api') || 
    pathname.startsWith('/assets') ||
    pathname.startsWith('/icons')
  ) {
    // just apply security headers below
  } else if (!user && !pathname.startsWith('/login')) {
    // Redirect unauthenticated users to login
    const loginUrl = new URL('/login', request.url);
    response = NextResponse.redirect(loginUrl);
  } else if (user) {
    // Handle authenticated routing logic
    if (pathname === '/' || pathname.startsWith('/login')) {
      const defaultRoute = user.user_metadata?.default_dashboard_route || '/coordinator';
      const url = request.nextUrl.clone();
      url.pathname = defaultRoute;
      response = NextResponse.redirect(url);
    } else {
      // Role-based Path Protection
      const currentRoutePrefix = `/${pathname.split('/')[1]}`;
      const allowedRoute = user.user_metadata?.default_dashboard_route || '/coordinator';

      // Ensure they don't manually navigate outside their route (ignore api/assets)
      if (currentRoutePrefix !== allowedRoute && currentRoutePrefix !== '') {
        const url = request.nextUrl.clone();
        url.pathname = allowedRoute;
        response = NextResponse.redirect(url);
      }
    }
  }

  // Set security and anti-clickjacking headers on ALL responses
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Server', 'Webserver');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://*.supabase.co https://*.tile.openstreetmap.org https://unpkg.com https://images.unsplash.com https://via.placeholder.com;
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
