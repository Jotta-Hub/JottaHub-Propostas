'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type User = {
  id: string
  email: string
  name: string
  created_at: string
  last_sign_in_at: string | null
}

async function authedFetch(url: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  return fetch(url, {
    ...init,
    headers: { ...(init?.headers || {}), 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  })
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function UsersPanel() {
  const [users, setUsers] = useState<User[]>([])
  const [me, setMe] = useState('')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await authedFetch('/api/users')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar.')
      setUsers(data.users); setMe(data.me)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar usuários.')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createUser() {
    setSaving(true); setError(''); setOk('')
    try {
      const res = await authedFetch('/api/users', { method: 'POST', body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao criar.')
      setOk(`Usuário ${form.name} criado.`)
      setForm({ name: '', email: '', password: '' })
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao criar usuário.')
    }
    setSaving(false)
  }

  async function removeUser(u: User) {
    if (!confirm(`Excluir o acesso de ${u.name || u.email}? Esta ação não pode ser desfeita.`)) return
    setError(''); setOk('')
    try {
      const res = await authedFetch(`/api/users?id=${u.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao excluir.')
      setOk(`Acesso de ${u.name || u.email} removido.`)
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir usuário.')
    }
  }

  const label: React.CSSProperties = { fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: 6, display: 'block' }
  const input: React.CSSProperties = { background: 'var(--black)', border: '1px solid var(--gray3)', color: 'var(--white)', fontFamily: 'var(--fb)', fontSize: '0.9rem', padding: '10px 12px', borderRadius: 2, outline: 'none', width: '100%' }

  return (
    <div className="proposals-section">
      <div className="section-head">
        <div className="section-title-row">
          <span className="section-title">Usuários</span>
          <span className="section-count">{users.length}</span>
        </div>
      </div>

      {/* Form de criação */}
      <div style={{ background: 'var(--gray)', border: '1px solid var(--gray2)', borderRadius: 4, padding: 22, marginBottom: 24, maxWidth: 720 }}>
        <div style={{ fontFamily: 'var(--fd)', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--purple-bright)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="bolt" />Novo usuário
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div><label style={label}>Nome</label><input style={input} placeholder="Nome completo" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label style={label}>E-mail</label><input style={input} type="email" placeholder="pessoa@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={label}>Senha (mín. 6 caracteres)</label><input style={input} type="text" placeholder="Senha de acesso" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
        </div>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 2, padding: '10px 14px', fontSize: '0.82rem', color: '#ff6b6b', marginTop: 14 }}>{error}</div>}
        {ok && <div style={{ background: 'rgba(217,164,65,0.12)', border: '1px solid rgba(217,164,65,0.3)', borderRadius: 2, padding: '10px 14px', fontSize: '0.82rem', color: 'var(--gold)', marginTop: 14 }}>{ok}</div>}
        <button className="btn-red" onClick={createUser} disabled={saving} style={{ marginTop: 16, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Criando…' : '+ Criar acesso'}
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ color: 'var(--mid)', fontSize: '0.85rem', padding: 20 }}>Carregando…</div>
      ) : (
        <div style={{ border: '1px solid var(--gray2)', borderRadius: 4, overflow: 'hidden', maxWidth: 720 }}>
          {users.map((u, i) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderTop: i === 0 ? 'none' : '1px solid var(--gray2)' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--grad-btn)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fd)', fontWeight: 900, color: 'var(--white)', flexShrink: 0 }}>
                {(u.name || u.email || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  {u.name || '—'} {u.id === me && <span style={{ fontSize: '0.6rem', color: 'var(--gold)', marginLeft: 6 }}>(você)</span>}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--mid)' }}>{u.email}</div>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--mid)', textAlign: 'right', flexShrink: 0 }}>
                <div>Criado {fmtDate(u.created_at)}</div>
                <div>Último acesso {fmtDate(u.last_sign_in_at)}</div>
              </div>
              <button
                onClick={() => removeUser(u)}
                disabled={u.id === me}
                title={u.id === me ? 'Você não pode se excluir' : 'Excluir acesso'}
                style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 12px', borderRadius: 2, border: '1px solid var(--gray3)', background: 'transparent', color: u.id === me ? 'var(--gray3)' : '#ff6b6b', cursor: u.id === me ? 'not-allowed' : 'pointer', flexShrink: 0 }}
              >
                Excluir
              </button>
            </div>
          ))}
          {users.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--mid)', fontSize: '0.85rem' }}>Nenhum usuário.</div>}
        </div>
      )}
    </div>
  )
}
