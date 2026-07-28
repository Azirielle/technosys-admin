import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { token } = await req.json()
  // Mock verification logic for now until Google Cloud is hooked up
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'No integrity token provided' }),
      { headers: { 'Content-Type': 'application/json' }, status: 400 }
    )
  }
  return new Response(
    JSON.stringify({ success: true, message: 'Device integrity verified' }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
