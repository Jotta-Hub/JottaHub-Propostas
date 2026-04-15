'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createSupabaseBrowser()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      padding: '20px',
    }}>
      {/* Background dots */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
        pointerEvents: 'none',
      }} />
      {/* Red glow */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(232,50,26,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%', maxWidth: 400,
        animation: 'fadeUp 0.6s ease forwards',
        position: 'relative', zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2, marginBottom: 8 }}>
            <span className="nl-t">Jott</span>
            <span className="nl-tri" />
            <span className="nl-t" style={{ marginLeft: 1 }}>Hub</span>
            <span className="nl-dot" style={{ marginLeft: 4 }} />
          </div>
          <div style={{
            fontFamily: 'var(--fd)', fontSize: '0.6rem', letterSpacing: '0.25em',
            textTransform: 'uppercase', color: 'var(--mid)', marginTop: 6,
          }}>
            Sistema de Propostas
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--gray)',
          border: '1px solid var(--gray2)',
          borderRadius: 4,
          overflow: 'hidden',
        }}>
          {/* Card header */}
          <div style={{
            padding: '24px 32px 20px',
            borderBottom: '1px solid var(--gray2)',
          }}>
            <div style={{
              fontFamily: 'var(--fd)', fontWeight: 900, fontSize: '1.4rem',
              textTransform: 'uppercase', letterSpacing: '-0.01em',
            }}>
              Acesso <span style={{ color: 'var(--red)' }}>Restrito</span>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--mid)', marginTop: 4 }}>
              Entre com suas credenciais para continuar
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ padding: '24px 32px 32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="form-label">E-mail</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="rennan@jottahub.com.br"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="form-label">Senha</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div style={{
                  background: 'rgba(232,50,26,0.1)',
                  border: '1px solid rgba(232,50,26,0.3)',
                  borderRadius: 2,
                  padding: '10px 14px',
                  fontSize: '0.82rem',
                  color: '#ff6b6b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <span>⚠</span> {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-main"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: 8, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Entrando...' : 'Entrar →'}
              </button>
            </div>
          </form>
        </div>

        <div style={{
          textAlign: 'center', marginTop: 24,
          fontSize: '0.68rem', color: 'var(--gray3)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          JOTTA HUB © 2026 — POA | RS
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  )
}
