'use client'

import { useState } from 'react'

type ProposalData = {
  client: string
  contact: string
  greeting: string
  intro: string
  title: string
  objective: string
  context: string
  pillars: { name: string; body: string }[]
  steps: { title: string; desc: string }[]
  deliverables: { icon: string; name: string; body: string }[]
  services: { name: string; desc: string; value: number }[]
  timeline: { phase: string; name: string; items: string }[]
  validity: number
  status: string
}

type Props = {
  onGenerated: (data: ProposalData) => void
}

const EXAMPLES = [
  {
    label: '📱 Evento',
    text: 'O Vini me mandou mensagem pedindo cobertura completa de um evento chamado Mais Afro. São 3 dias: 14, 15 e 16 de maio em Porto Alegre. Querem vídeo institucional, reels, stories e fotos. Nossa equipe vai ser eu + mais um, com drone. Fechamos R$ 4.650.',
  },
  {
    label: '🏥 Clínica',
    text: 'A Dra. Karen da Cora Centro Pesquisa Clínica quer um projeto audiovisual institucional. Precisam de vídeos com médicos sobre estudos de recrutamento, vídeo institucional do centro e fotos da equipe para o site. Será captação, direção e edição completa.',
  },
  {
    label: '📊 Estratégia',
    text: 'O Roberto tem uma loja de roupas e quer estruturar a presença digital do zero. Quer crescer nas redes, aumentar vendas online e construir autoridade. Precisa de diagnóstico, posicionamento, calendário editorial e criação de conteúdo mensal.',
  },
]

const LOADING_STEPS = [
  'Analisando o briefing...',
  'Identificando cliente e escopo...',
  'Estruturando entregáveis...',
  'Montando cronograma...',
  'Finalizando proposta...',
]

export default function BriefingGenerator({ onGenerated }: Props) {
  const [open, setOpen] = useState(false)
  const [briefing, setBriefing] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<ProposalData | null>(null)

  async function generate() {
    if (!briefing.trim()) { setError('Cole o briefing do cliente primeiro.'); return }
    setLoading(true); setError(''); setResult(null)

    let i = 0
    const interval = setInterval(() => {
      setLoadingText(LOADING_STEPS[i % LOADING_STEPS.length]); i++
    }, 800)

    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefing }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao gerar proposta.'); return }
      setResult(data.proposal)
    } catch { setError('Erro de conexão. Tente novamente.') }
    finally { clearInterval(interval); setLoading(false) }
  }

  function useProposal() {
    if (!result) return
    onGenerated(result)
    setOpen(false)
    setResult(null)
    setBriefing('')
  }

  return (
    <>
      {/* Botão trigger */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'transparent', color: 'var(--mid)',
          fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.75rem',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '9px 14px', borderRadius: 2,
          border: '1px dashed rgba(232,50,26,0.4)',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
        onMouseOver={e => {
          e.currentTarget.style.borderColor = 'var(--red)'
          e.currentTarget.style.color = 'var(--red)'
        }}
        onMouseOut={e => {
          e.currentTarget.style.borderColor = 'rgba(232,50,26,0.4)'
          e.currentTarget.style.color = 'var(--mid)'
        }}
      >
        ✦ Gerar com IA
      </button>

      {/* Modal */}
      {open && (
        <div
          onClick={() => !loading && setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 600,
            background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--gray)', border: '1px solid var(--gray2)',
              borderRadius: 4, width: '100%', maxWidth: 640,
              maxHeight: '90vh', overflow: 'auto',
              animation: 'modalIn 0.28s ease',
            }}
          >
            {/* Header */}
            <div style={{ padding: '22px 28px 18px', borderBottom: '1px solid var(--gray2)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: 'var(--gray)', zIndex: 10 }}>
              <div>
                <div style={{ fontFamily: 'var(--fd)', fontWeight: 900, fontSize: '1.3rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 10 }}>
                  Gerar com IA
                  <span style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: 'rgba(232,50,26,0.15)', color: 'var(--red)', border: '1px solid rgba(232,50,26,0.3)' }}>✦ IA</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--mid)', marginTop: 3 }}>Cole o briefing — texto, áudio transcrito ou anotações</div>
              </div>
              <button onClick={() => !loading && setOpen(false)} style={{ background: 'none', border: '1px solid var(--gray3)', color: 'var(--mid)', width: 28, height: 28, borderRadius: 2, cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0 }}>✕</button>
            </div>

            <div style={{ padding: '22px 28px 28px' }}>
              {/* Textarea */}
              <textarea
                value={briefing}
                onChange={e => setBriefing(e.target.value)}
                placeholder="Ex: 'O cliente me pediu cobertura de foto e vídeo pra um evento de 3 dias, dias 14, 15 e 16 de maio. Querem vídeo institucional, reels, stories e fotos. Somos 2 pessoas + drone. Valor fechamos em R$ 4.650...'"
                disabled={loading}
                style={{
                  width: '100%', minHeight: 120, background: 'var(--black)',
                  border: '1px solid var(--gray3)', color: 'var(--white)',
                  fontFamily: 'var(--fb)', fontSize: '0.87rem', fontWeight: 300,
                  padding: '12px 14px', borderRadius: 2, outline: 'none',
                  resize: 'vertical', lineHeight: 1.7,
                  opacity: loading ? 0.5 : 1,
                }}
              />

              {/* Exemplos */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, marginBottom: 16 }}>
                {EXAMPLES.map(ex => (
                  <button
                    key={ex.label}
                    onClick={() => setBriefing(ex.text)}
                    disabled={loading}
                    style={{
                      fontSize: '0.72rem', color: 'var(--mid)', background: 'var(--gray2)',
                      padding: '5px 10px', borderRadius: 2, cursor: 'pointer',
                      border: '1px solid var(--gray3)', transition: 'all 0.2s',
                    }}
                  >{ex.label}</button>
                ))}
              </div>

              {/* Loading */}
              {loading && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ height: 2, background: 'var(--gray2)', borderRadius: 1, overflow: 'hidden', marginBottom: 10 }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg,var(--red),rgba(232,50,26,0.3),var(--red))', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--mid)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 5, height: 5, background: 'var(--red)', borderRadius: '50%', animation: 'blink 1s infinite', display: 'inline-block' }} />
                    {loadingText}
                  </div>
                </div>
              )}

              {/* Erro */}
              {error && (
                <div style={{ background: 'rgba(232,50,26,0.1)', border: '1px solid rgba(232,50,26,0.3)', borderRadius: 2, padding: '10px 14px', fontSize: '0.8rem', color: '#ff6b6b', marginBottom: 14 }}>
                  ⚠ {error}
                </div>
              )}

              {/* Resultado */}
              {result && !loading && (
                <div style={{ background: 'var(--black)', border: '1px solid var(--gray2)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ padding: '12px 18px', background: 'rgba(232,50,26,0.06)', borderBottom: '1px solid var(--gray2)', fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--red)' }}>
                    ✦ Proposta gerada — revise antes de usar
                  </div>
                  <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      ['Cliente', result.client],
                      ['Contato', result.contact],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: 4 }}>{k}</div>
                        <div style={{ background: 'rgba(232,50,26,0.05)', border: '1px solid rgba(232,50,26,0.2)', borderRadius: 2, padding: '8px 10px', fontSize: '0.84rem', fontFamily: 'var(--fd)', fontWeight: 700 }}>{v}</div>
                      </div>
                    ))}
                    <div style={{ gridColumn: '1/-1' }}>
                      <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: 4 }}>Título</div>
                      <div style={{ background: 'rgba(232,50,26,0.05)', border: '1px solid rgba(232,50,26,0.2)', borderRadius: 2, padding: '8px 10px', fontSize: '0.84rem', fontFamily: 'var(--fd)', fontWeight: 700 }}>{result.title}</div>
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: 4 }}>Entregáveis ({result.deliverables?.length || 0})</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--mid)', lineHeight: 1.7 }}>
                        {result.deliverables?.map(d => `${d.icon} ${d.name}`).join(' · ')}
                      </div>
                    </div>
                    {result.services?.[0] && (
                      <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--mid)' }}>Valor detectado</div>
                        <div style={{ fontFamily: 'var(--fd)', fontWeight: 900, fontSize: '1.3rem', color: result.services[0].value > 0 ? 'var(--red)' : 'var(--mid)' }}>
                          {result.services[0].value > 0
                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(result.services[0].value)
                            : 'Não informado'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botões */}
              <div style={{ display: 'flex', gap: 10 }}>
                {result && !loading ? (
                  <>
                    <button onClick={useProposal} style={{
                      flex: 1, background: 'var(--red)', color: 'var(--white)',
                      fontFamily: 'var(--fd)', fontWeight: 800, fontSize: '0.83rem',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      padding: 13, borderRadius: 2, border: 'none', cursor: 'pointer',
                    }}>Usar esta proposta →</button>
                    <button onClick={() => { setResult(null); generate() }} style={{
                      background: 'transparent', color: 'var(--mid)',
                      fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.78rem',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      padding: '13px 16px', borderRadius: 2, border: '1px solid var(--gray3)', cursor: 'pointer',
                    }}>↺ Gerar novamente</button>
                  </>
                ) : (
                  <button onClick={generate} disabled={loading} style={{
                    flex: 1, background: 'var(--red)', color: 'var(--white)',
                    fontFamily: 'var(--fd)', fontWeight: 800, fontSize: '0.83rem',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: 13, borderRadius: 2, border: 'none',
                    cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    {loading ? loadingText : '✦ Gerar com IA'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalIn { from { opacity:0; transform:translateY(16px) scale(0.97); } to { opacity:1; transform:none; } }
        @keyframes shimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
        @keyframes blink { 0%,100% { opacity:0.2; } 50% { opacity:1; } }
      `}</style>
    </>
  )
}
