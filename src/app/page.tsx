import { redirect } from 'next/navigation'

export default function Home() {
  // Automatically redirect root to the dashboard (which will redirect to login if not authenticated)
  redirect('/dashboard')
}
