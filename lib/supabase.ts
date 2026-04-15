import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function createSupabaseBrowser() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
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
