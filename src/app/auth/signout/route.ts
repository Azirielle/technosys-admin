import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  revalidatePath('/', 'layout')
  const loginUrl = new URL('/login', request.url)
  return new NextResponse(null, {
    status: 302,
    headers: {
      'Location': loginUrl.toString(),
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "frame-ancestors 'none';",
      'Server': 'Webserver',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    }
  })
}
