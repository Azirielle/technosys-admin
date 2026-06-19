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
    }
  })
}
