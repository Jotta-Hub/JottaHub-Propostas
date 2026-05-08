'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type StatusData = {
  status: string
  client: string
  title: string
  protocol: string
  proposal_id: string
  created_at: string
}

const STATUS_INFO: Record<string, { label: string; desc: string; color: string; icon: string; showLink: boolean }> = {
  pending: {
    label: 'Em análise',
    desc: 'Recebemos seu briefing e estamos preparando sua proposta personalizada. Em breve entraremos em contato.',
    color: '#f59e0b',
    icon: '⏳',
    showLink: false,
  },
  sent: {
    label: 'Proposta pronta',
    desc: 'Sua proposta está pronta! Clique abaixo para visualizar e assinar.',
    color: '#60a5fa',
    icon: '📋',
    showLink: true,
  },
  approved: {
    label: 'Proposta assinada',
    desc: 'Contrato assinado por ambas as partes. Estamos prontos para começar!',
    color: '#22c55e',
    icon: '✅',
    showLink: true,
  },
  expired: {
    label: 'Proposta expirada',
    desc: 'O prazo desta proposta expirou. Entre em contato para renovar.',
    color: '#888',
    icon: '⌛',
    showLink: false,
  },
}

export default function StatusPage() {
  const [protocol, setProtocol] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<StatusData | null>(null)

  async function search() {
    const cleaned = protocol.trim().toUpperCase()
    if (!cleaned) { setError('Digite o protocolo.'); return }
    setLoading(true); setError(''); setData(null)

    const { data: proposal, error: err } = await supabase
      .from('proposals')
      .select('id, status, client, title, protocol, created_at')
      .eq('protocol', cleaned)
      .single()

    if (err || !proposal) {
      setError('Protocolo não encontrado. Verifique o código e tente novamente.')
      setLoading(false)
      return
    }

    setData({
      status: proposal.status || 'pending',
      client: proposal.client,
      title: proposal.title || 'Proposta Comercial',
      protocol: proposal.protocol,
      proposal_id: proposal.id,
      created_at: proposal.created_at,
    })
    setLoading(false)
  }

  const statusInfo = data ? STATUS_INFO[data.status] || STATUS_INFO.pending : null

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080808; color: #F5F3EF; font-family: 'Helvetica Neue', sans-serif; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:0.4; transform:scale(1); } 50% { opacity:1; transform:scale(1.05); } }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>

        {/* LOGO */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 48 }}>
          <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Jott</span>
          <span style={{ display: 'inline-block', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '13px solid #F5F3EF', margin: '0 2px', position: 'relative', top: '-2px' }} />
          <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Hub</span>
          <span style={{ width: 5, height: 5, background: '#E8321A', borderRadius: '50%', display: 'inline-block', marginLeft: 3, position: 'relative', top: '-1px' }} />
        </div>

        <div style={{ width: '100%', maxWidth: 480, animation: 'fadeUp 0.5s ease' }}>

          {!data ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: 36 }}>
                <div style={{ fontSize: '0.62rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#E8321A', marginBottom: 12 }}>Acompanhe sua proposta</div>
                <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 900, fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', lineHeight: 1.1, marginBottom: 12 }}>
                  Digite seu<br /><span style={{ color: '#E8321A' }}>protocolo</span>
                </h1>
                <p style={{ fontSize: '0.88rem', color: '#888', lineHeight: 1.7 }}>
                  Você recebeu o protocolo por e-mail após enviar o briefing.
                </p>
              </div>

              <div style={{ background: '#111', border: '1px solid #2E2E2E', borderRadius: 3, padding: '28px 24px' }}>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: 10 }}>
                  Código do Protocolo
                </label>
                <input
                  type="text"
                  value={protocol}
                  onChange={e => setProtocol(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && search()}
                  placeholder="JH-XXXXXX"
                  maxLength={10}
                  style={{
                    width: '100%', background: '#080808', border: '1px solid #2E2E2E',
                    color: '#F5F3EF', fontSize: '1.4rem', fontWeight: 700, fontFamily: 'monospace',
                    padding: '14px 16px', borderRadius: 2, outline: 'none',
                    letterSpacing: '0.15em', textAlign: 'center', marginBottom: 16,
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#E8321A'}
                  onBlur={e => e.target.style.borderColor = '#2E2E2E'}
                />

                {error && (
                  <div style={{ background: 'rgba(232,50,26,0.1)', border: '1px solid rgba(232,50,26,0.3)', borderRadius: 2, padding: '10px 14px', fontSize: '0.8rem', color: '#ff6b6b', marginBottom: 14, textAlign: 'center' }}>
                    ⚠ {error}
                  </div>
                )}

                <button
                  onClick={search}
                  disabled={loading}
                  style={{
                    width: '100%', background: '#E8321A', color: '#F5F3EF', border: 'none',
                    borderRadius: 2, padding: '14px', fontWeight: 800, fontSize: '0.85rem',
                    letterSpacing: '0.1em', textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer',
                    opacity: loading ? 0.7 : 1, fontFamily: 'inherit', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                      Buscando...
                    </>
                  ) : 'Verificar Protocolo →'}
                </button>
              </div>

              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#444', marginTop: 20 }}>
                Dúvidas? Fale pelo{' '}
                <a href="https://wa.me/5551993009391" style={{ color: '#E8321A', textDecoration: 'none' }}>WhatsApp</a>
              </p>
            </>
          ) : (
            <div style={{ animation: 'fadeUp 0.4s ease' }}>
              {/* STATUS CARD */}
              <div style={{ background: '#111', border: `1px solid ${statusInfo!.color}33`, borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ height: 3, background: statusInfo!.color }} />
                <div style={{ padding: '28px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${statusInfo!.color}15`, border: `1px solid ${statusInfo!.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0, animation: data.status === 'pending' ? 'pulse 2s ease infinite' : 'none' }}>
                      {statusInfo!.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: statusInfo!.color, marginBottom: 4 }}>Status da proposta</div>
                      <div style={{ fontFamily: 'Georgia, serif', fontWeight: 900, fontSize: '1.3rem' }}>{statusInfo!.label}</div>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.87rem', color: '#888', lineHeight: 1.7, marginBottom: 20 }}>
                    {statusInfo!.desc}
                  </p>

                  <div style={{ background: '#080808', border: '1px solid #1C1C1C', borderRadius: 2, padding: '14px 16px', marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1C1C1C', fontSize: '0.78rem' }}>
                      <span style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}>Cliente</span>
                      <span style={{ fontWeight: 600 }}>{data.client}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1C1C1C', fontSize: '0.78rem' }}>
                      <span style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}>Projeto</span>
                      <span style={{ fontWeight: 600, maxWidth: 220, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.title}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.78rem' }}>
                      <span style={{ color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}>Protocolo</span>
                      <span style={{ fontWeight: 700, fontFamily: 'monospace', color: statusInfo!.color }}>{data.protocol}</span>
                    </div>
                  </div>

                  {statusInfo!.showLink && (
                    <a
                      href={`/proposta/${data.proposal_id}`}
                      target="_blank"
                      style={{
                        display: 'block', background: '#E8321A', color: '#F5F3EF',
                        textAlign: 'center', padding: '14px', borderRadius: 2,
                        fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.1em',
                        textTransform: 'uppercase', textDecoration: 'none', marginBottom: 10,
                      }}
                    >
                      {data.status === 'approved' ? 'Ver Contrato Assinado →' : 'Ver Minha Proposta →'}
                    </a>
                  )}

                  <button
                    onClick={() => { setData(null); setProtocol('') }}
                    style={{
                      width: '100%', background: 'transparent', color: '#555',
                      fontFamily: 'inherit', fontWeight: 700, fontSize: '0.75rem',
                      letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px',
                      borderRadius: 2, border: '1px solid #2E2E2E', cursor: 'pointer',
                    }}
                  >
                    ← Buscar outro protocolo
                  </button>
                </div>
              </div>

              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#444' }}>
                Dúvidas? Fale pelo{' '}
                <a href="https://wa.me/5551993009391" style={{ color: '#E8321A', textDecoration: 'none' }}>WhatsApp</a>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
