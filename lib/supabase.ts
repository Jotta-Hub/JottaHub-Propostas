import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client simples para uso público (propostas)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client browser com sessão (admin)
export function createSupabaseBrowser() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Client server com sessão (middleware/server components)
export function createSupabaseServer() {
  const cookieStore = cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {}
      },
    },
  })
}

export type Proposal = {
  id?: string
  created_at?: string
  client: string
  contact?: string
  greeting?: string
  intro?: string
  title?: string
  objective?: string
  context?: string
  validity?: number
  status?: 'pending' | 'sent' | 'approved' | 'expired'
  logo_url?: string
  logo_mode?: 'original' | 'white'
  pillars?: { name: string; body: string }[]
  steps?: { title: string; desc: string }[]
  deliverables?: { icon: string; name: string; body: string }[]
  services?: { name: string; desc: string; value: number }[]
  timeline?: { phase: string; name: string; items: string }[]
}
