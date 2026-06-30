'use client'

import { useEffect, useState } from 'react'
import { supabase, type Proposal } from '@/lib/supabase'

const STATUS_PT: Record<string, string> = { pending: 'Rascunho', sent: 'Enviada', approved: 'Aprovada', expired: 'Expirada', archived: 'Arquivada' }
const FOLLOW_REASON: Record<string, string> = {
  expired: 'expirou sem fechar, vale retomar',
  pending: 'rascunho — precisa ser enviada',
  sent: 'enviada, aguardando resposta — vale um follow-up',
}

function saudacaoLocal() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export default function NinaAssistant({ proposals }: { proposals: Proposal[] }) {
  const [userName, setUserName] = useState('Rennan')
  const [greeting, setGreeting] = useState('')
  const [loadingG, setLoadingG] = useState(true)
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState('')
  const [asking, setAsking] = useState(false)

  const resumo = proposals.length
    ? proposals.map(p => `- ${p.client}${p.title ? ` (${p.title})` : ''}: ${STATUS_PT[p.status || 'pending'] || p.status}`).join('\n')
    : 'Nenhuma proposta cadastrada ainda.'

  const followups = proposals.filter(p => ['expired', 'pending', 'sent'].includes(p.status || '')).slice(0, 4)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const nome = ((user?.user_metadata?.name as string) || user?.email?.split('@')[0] || 'Rennan').split(' ')[0]
      if (!alive) return
      setUserName(nome)
      try {
        const res = await fetch('/api/nina', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'greeting', context: resumo, userName: nome }) })
        const d = await res.json()
        if (alive) setGreeting(d.text || `${saudacaoLocal()}, ${nome}! Sou a Nina. 👋`)
      } catch { if (alive) setGreeting(`${saudacaoLocal()}, ${nome}! Sou a Nina. 👋`) }
      if (alive) setLoadingG(false)
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals.length])

  async function ask() {
    if (!q.trim() || asking) return
    setAsking(true); setAnswer('')
    try {
      const res = await fetch('/api/nina', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'ask', question: q, context: resumo, userName }) })
      const d = await res.json()
      setAnswer(res.ok ? (d.text || 'Não consegui responder agora.') : (d.error || 'Não consegui responder agora.'))
    } catch { setAnswer('Erro ao falar com a Nina.') }
    setAsking(false)
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(134,54,242,0.10), rgba(83,34,166,0.05))', border: '1px solid rgba(134,54,242,0.28)', borderRadius: 6, padding: 24, marginBottom: 28, position: 'relative', overflow: 'hidden' }}>
      {/* topo: avatar + saudação */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--grad-btn)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fd)', fontWeight: 900, fontSize: '1.1rem', color: '#fff', flexShrink: 0, boxShadow: '0 0 16px rgba(134,54,242,0.5)' }}>N</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {loadingG ? (
            <div style={{ color: 'var(--mid)', fontSize: '0.9rem', fontStyle: 'italic' }}>A Nina está olhando suas propostas…</div>
          ) : (
            <div style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--white)', whiteSpace: 'pre-wrap' }}>{greeting}</div>
          )}
        </div>
      </div>

      {/* follow-ups sugeridos */}
      {followups.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--purple-bright)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="bolt" style={{ width: 10, height: 15 }} />Follow-ups sugeridos
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {followups.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'rgba(0,0,0,0.25)', border: '1px solid var(--gray2)', borderRadius: 3, padding: '10px 14px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.85rem' }}>{p.client}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--mid)' }}> — {FOLLOW_REASON[p.status || ''] || STATUS_PT[p.status || '']}</span>
                </div>
                <a href={`/proposta/${p.id}`} target="_blank" rel="noopener" style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--purple-bright)', border: '1px solid rgba(134,54,242,0.4)', borderRadius: 2, padding: '6px 12px', textDecoration: 'none', flexShrink: 0 }}>Ver</a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* resposta da pergunta */}
      {answer && (
        <div style={{ marginTop: 18, background: 'rgba(0,0,0,0.25)', border: '1px solid var(--gray2)', borderRadius: 3, padding: '14px 16px', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--white)', whiteSpace: 'pre-wrap' }}>{answer}</div>
      )}

      {/* campo de pergunta */}
      <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') ask() }}
          placeholder='Pergunte à Nina: "quais propostas estão paradas?"'
          style={{ flex: 1, minWidth: 200, background: 'var(--black)', border: '1px solid var(--gray3)', color: 'var(--white)', fontFamily: 'var(--fb)', fontSize: '0.9rem', padding: '11px 14px', borderRadius: 2, outline: 'none' }}
        />
        <button onClick={ask} disabled={asking} className="btn-red" style={{ opacity: asking ? 0.7 : 1, cursor: asking ? 'wait' : 'pointer' }}>
          {asking ? 'Pensando…' : 'Perguntar'}
        </button>
      </div>
    </div>
  )
}
