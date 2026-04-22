'use client'

import { useState } from 'react'

type Step = 'idle' | 'form' | 'code' | 'success'

type Props = {
  proposalId: string
  proposalClient: string
  totalValue: number
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function maskCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
}

export default function SignatureModal({ proposalId, proposalClient, totalValue }: Props) {
  const [step, setStep] = useState<Step>('idle')
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [signedAt, setSignedAt] = useState('')
  const [hash, setHash] = useState('')

  function open() { setStep('form'); setError('') }
  function close() {
    if (step === 'success') return
    setStep('idle'); setError('')
    setName(''); setCpf(''); setEmail(''); setCode(['', '', '', '', '', ''])
  }

  async function sendCode() {
    if (!name.trim() || !email.trim() || !cpf.trim()) {
      setError('Preencha todos os campos.'); return
    }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, proposal_id: proposalId, signer_name: name }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao enviar código.'); return }
      setStep('code')
    } catch { setError('Erro de conexão. Tente novamente.') }
    finally { setLoading(false) }
  }

  function handleCodeInput(idx: number, val: string) {
    const newCode = [...code]
    newCode[idx] = val.replace(/\D/g, '').slice(0, 1)
    setCode(newCode)
    if (val && idx < 5) {
      const next = document.getElementById(`code-${idx + 1}`)
      next?.focus()
    }
  }

  function handleCodeKey(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      document.getElementById(`code-${idx - 1}`)?.focus()
    }
  }

  async function verifyCode() {
    const fullCode = code.join('')
    if (fullCode.length < 6) { setError('Digite o código completo.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/verify-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal_id: proposalId,
          email,
          code: fullCode,
          signer_name: name,
          signer_cpf: cpf,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Código inválido.'); return }
      setSignedAt(new Date().toLocaleString('pt-BR'))
      setHash(data.hash?.slice(0, 16) + '...')
      setStep('success')
    } catch { setError('Erro de conexão. Tente novamente.') }
    finally { setLoading(false) }
  }

  if (step === 'idle') return (
    <div style={{ textAlign: 'center', marginTop: 40 }}>
      <button onClick={open} style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        background: 'var(--red)', color: 'var(--white)',
        fontFamily: 'var(--fd)', fontWeight: 800, fontSize: '1rem',
        letterSpacing: '0.1em', textTransform: 'uppercase',
        padding: '16px 36px', borderRadius: 2, border: 'none',
        cursor: 'pointer', transition: 'all 0.2s',
      }}
        onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
        onMouseOut={e => (e.currentTarget.style.transform = 'none')}
      >
        ✍️ Assinar esta Proposta
      </button>
      <p style={{ fontSize: '0.72rem', color: 'var(--mid)', marginTop: 10 }}>
        Assinatura com validade jurídica — Lei 14.063/2020
      </p>
    </div>
  )

  return (
    <>
      {/* OVERLAY */}
      <div onClick={close} style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(8,8,8,0.93)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: 'var(--gray)', border: '1px solid var(--gray2)',
          borderRadius: 4, width: '100%', maxWidth: 460,
          animation: 'modalIn 0.28s ease',
          overflow: 'hidden',
        }}>
          {/* Steps indicator */}
          {step !== 'success' && (
            <div style={{ display: 'flex', gap: 1, background: 'var(--gray2)' }}>
              {[
                { key: 'form', label: '1. Dados' },
                { key: 'code', label: '2. Verificação' },
              ].map(s => (
                <div key={s.key} style={{
                  flex: 1, padding: '12px 8px', textAlign: 'center',
                  fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.65rem',
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                  color: step === s.key ? 'var(--white)' : 'var(--mid)',
                  borderBottom: step === s.key ? '2px solid var(--red)' : '2px solid transparent',
                  background: 'var(--gray)',
                  transition: 'all 0.2s',
                }}>{s.label}</div>
              ))}
            </div>
          )}

          {/* STEP: FORM */}
          {step === 'form' && (
            <>
              <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--gray2)', position: 'relative' }}>
                <div style={{ fontFamily: 'var(--fd)', fontWeight: 900, fontSize: '1.3rem', textTransform: 'uppercase' }}>
                  Assinar Proposta
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--mid)', marginTop: 4 }}>
                  {proposalClient} · {totalValue > 0 ? fmtBRL(totalValue) : '—'}
                </div>
                <button onClick={close} style={{
                  position: 'absolute', top: 20, right: 20,
                  background: 'none', border: '1px solid var(--gray3)', color: 'var(--mid)',
                  width: 28, height: 28, borderRadius: 2, cursor: 'pointer', fontSize: '0.85rem',
                }}>✕</button>
              </div>
              <div style={{ padding: '24px 28px 28px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--mid)' }}>Nome Completo *</label>
                    <input className="form-input" type="text" placeholder="Seu nome completo" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--mid)' }}>CPF *</label>
                      <input className="form-input" type="text" placeholder="000.000.000-00" value={cpf} onChange={e => setCpf(maskCPF(e.target.value))} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--mid)' }}>E-mail *</label>
                      <input className="form-input" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ background: 'rgba(232,50,26,0.06)', border: '1px solid rgba(232,50,26,0.2)', borderRadius: 2, padding: '12px 14px', fontSize: '0.74rem', color: 'rgba(245,243,239,0.6)', lineHeight: 1.6 }}>
                    🔒 Seus dados serão registrados com data, hora e IP como evidência jurídica pela <strong style={{ color: 'var(--white)' }}>Lei 14.063/2020</strong>.
                  </div>
                  {error && <div style={{ background: 'rgba(232,50,26,0.1)', border: '1px solid rgba(232,50,26,0.3)', borderRadius: 2, padding: '10px 14px', fontSize: '0.8rem', color: '#ff6b6b' }}>⚠ {error}</div>}
                  <button onClick={sendCode} disabled={loading} style={{
                    background: 'var(--red)', color: 'var(--white)', fontFamily: 'var(--fd)', fontWeight: 800,
                    fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '13px', borderRadius: 2, border: 'none', cursor: loading ? 'wait' : 'pointer',
                    opacity: loading ? 0.7 : 1, marginTop: 4,
                  }}>
                    {loading ? 'Enviando código...' : 'Continuar → Verificar E-mail'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* STEP: CODE */}
          {step === 'code' && (
            <>
              <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--gray2)', position: 'relative' }}>
                <div style={{ fontFamily: 'var(--fd)', fontWeight: 900, fontSize: '1.3rem', textTransform: 'uppercase' }}>Verificar E-mail</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--mid)', marginTop: 4 }}>Código enviado para <strong style={{ color: 'var(--white)' }}>{email}</strong></div>
                <button onClick={close} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: '1px solid var(--gray3)', color: 'var(--mid)', width: 28, height: 28, borderRadius: 2, cursor: 'pointer', fontSize: '0.85rem' }}>✕</button>
              </div>
              <div style={{ padding: '24px 28px 28px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {code.map((c, i) => (
                    <input
                      key={i}
                      id={`code-${i}`}
                      type="text"
                      maxLength={1}
                      value={c}
                      onChange={e => handleCodeInput(i, e.target.value)}
                      onKeyDown={e => handleCodeKey(i, e)}
                      style={{
                        width: 48, height: 56, background: 'var(--black)',
                        border: `1px solid ${c ? 'var(--red)' : 'var(--gray3)'}`,
                        color: 'var(--white)', fontFamily: 'var(--fd)', fontWeight: 900,
                        fontSize: '1.8rem', textAlign: 'center', borderRadius: 2, outline: 'none',
                      }}
                    />
                  ))}
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--mid)', marginBottom: 4 }}>
                  Não recebeu? <span onClick={sendCode} style={{ color: 'var(--red)', cursor: 'pointer' }}>Reenviar código</span>
                </p>
                {error && <div style={{ background: 'rgba(232,50,26,0.1)', border: '1px solid rgba(232,50,26,0.3)', borderRadius: 2, padding: '10px 14px', fontSize: '0.8rem', color: '#ff6b6b', marginBottom: 12 }}>⚠ {error}</div>}
                <button onClick={verifyCode} disabled={loading} style={{
                  width: '100%', background: 'var(--red)', color: 'var(--white)', fontFamily: 'var(--fd)',
                  fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: 13, borderRadius: 2, border: 'none', cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.7 : 1, marginTop: 8,
                }}>
                  {loading ? 'Verificando...' : 'Confirmar Assinatura'}
                </button>
                <button onClick={() => setStep('form')} style={{
                  width: '100%', background: 'transparent', color: 'var(--mid)', fontFamily: 'var(--fd)',
                  fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '10px', borderRadius: 2, border: '1px solid var(--gray3)', cursor: 'pointer', marginTop: 8,
                }}>← Voltar</button>
              </div>
            </>
          )}

          {/* STEP: SUCCESS */}
          {step === 'success' && (
            <div style={{ padding: '32px 28px' }}>
              <div style={{ width: 64, height: 64, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '1.8rem' }}>✅</div>
              <div style={{ fontFamily: 'var(--fd)', fontWeight: 900, fontSize: '1.5rem', textTransform: 'uppercase', textAlign: 'center', marginBottom: 8 }}>Proposta Assinada!</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--mid)', textAlign: 'center', lineHeight: 1.7, marginBottom: 24 }}>Sua assinatura foi registrada. Você receberá uma cópia por e-mail.</p>
              <div style={{ background: 'var(--black)', border: '1px solid var(--gray2)', borderRadius: 3, padding: 16, marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: 10 }}>Evidências Registradas</div>
                {[
                  ['Signatário', name],
                  ['CPF', cpf],
                  ['E-mail', email],
                  ['Data/Hora', signedAt],
                  ['Hash', hash],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--gray2)', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--mid)', fontFamily: 'var(--fd)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.65rem' }}>{k}</span>
                    <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => window.location.reload()} style={{
                width: '100%', background: '#22c55e', color: 'var(--white)', fontFamily: 'var(--fd)',
                fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: 13, borderRadius: 2, border: 'none', cursor: 'pointer',
              }}>Fechar</button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalIn { from { opacity:0; transform: translateY(16px) scale(0.97); } to { opacity:1; transform: none; } }
      `}</style>
    </>
  )
}
