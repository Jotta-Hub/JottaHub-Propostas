import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Gestão de usuários do admin das Propostas (auth.users).
// Requer JWT no header Authorization (usuário logado) — o Propostas não tem
// níveis, então qualquer usuário autenticado pode gerir. Usa service_role.

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function adminClient() {
  return createClient(SUPA_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// valida que quem chama está autenticado; devolve o client admin + o usuário
async function exigirAuth(req: NextRequest) {
  if (!SERVICE_KEY) return { erro: 'SUPABASE_SERVICE_ROLE_KEY não configurada.', status: 500 as const }
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { erro: 'Não autorizado.', status: 401 as const }
  const admin = adminClient()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return { erro: 'Sessão inválida.', status: 401 as const }
  return { admin, user: data.user }
}

export async function GET(req: NextRequest) {
  const auth = await exigirAuth(req)
  if ('erro' in auth) return NextResponse.json({ error: auth.erro }, { status: auth.status })

  const { data, error } = await auth.admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const users = data.users
    .map(u => ({
      id: u.id,
      email: u.email,
      name: (u.user_metadata?.name as string) || '',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }))
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))

  return NextResponse.json({ users, me: auth.user.id })
}

export async function POST(req: NextRequest) {
  const auth = await exigirAuth(req)
  if ('erro' in auth) return NextResponse.json({ error: auth.erro }, { status: auth.status })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })

  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const name = String(body.name || '').trim()

  if (!EMAIL_REGEX.test(email)) return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'A senha precisa ter pelo menos 6 caracteres.' }, { status: 400 })
  if (!name) return NextResponse.json({ error: 'Informe o nome.' }, { status: 400 })

  const { data, error } = await auth.admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })
  if (error) {
    const dup = /already registered|already exists|duplicate/i.test(error.message || '')
    return NextResponse.json({ error: dup ? 'Já existe um usuário com esse e-mail.' : error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, user: { id: data.user?.id, email, name } })
}

export async function DELETE(req: NextRequest) {
  const auth = await exigirAuth(req)
  if ('erro' in auth) return NextResponse.json({ error: auth.erro }, { status: auth.status })

  const id = new URL(req.url).searchParams.get('id') || ''
  if (!id) return NextResponse.json({ error: 'ID não informado.' }, { status: 400 })
  if (id === auth.user.id) return NextResponse.json({ error: 'Você não pode excluir a si mesmo.' }, { status: 400 })

  const { error } = await auth.admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
