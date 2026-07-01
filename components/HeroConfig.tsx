'use client'

import { useState } from 'react'
import { upload } from '@vercel/blob/client'

type Mode = 'clean' | 'photo' | 'video'
type Format = 'compact' | 'medium' | 'cinema' | 'full'

// Configuração da capa (hero) da proposta: limpo, foto ou vídeo de fundo + formato.
export default function HeroConfig({ mode, setMode, media, setMedia, format, setFormat }: {
  mode: Mode
  setMode: (m: Mode) => void
  media: string
  setMedia: (u: string) => void
  format: Format
  setFormat: (f: Format) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>, expect: 'image' | 'video') {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    if (file.size > 1024 * 1024 * 1024) { setError('Arquivo muito grande (máx. 1GB).'); return }
    setUploading(true); setError('')
    try {
      const blob = await upload(`hero/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`, file, { access: 'public', handleUploadUrl: '/api/portfolio-upload' })
      setMedia(blob.url)
      setMode(expect === 'image' ? 'photo' : 'video')
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha no upload.') }
    setUploading(false)
  }

  const seg = (active: boolean): React.CSSProperties => ({ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '9px 16px', borderRadius: 2, cursor: 'pointer', border: `1px solid ${active ? 'var(--red)' : 'var(--gray3)'}`, background: active ? 'var(--red)' : 'transparent', color: active ? 'var(--white)' : 'var(--mid)' })
  const fmtBtn = (active: boolean): React.CSSProperties => ({ ...seg(active), fontSize: '0.64rem', padding: '7px 12px' })

  return (
    <div className="form-group full">
      <label className="form-label">Capa da Proposta</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" onClick={() => setMode('clean')} style={seg(mode === 'clean')}>Limpo</button>
        <button type="button" onClick={() => setMode('photo')} style={seg(mode === 'photo')}>Foto de fundo</button>
        <button type="button" onClick={() => setMode('video')} style={seg(mode === 'video')}>Vídeo de fundo</button>
      </div>

      {mode !== 'clean' && (
        <div style={{ background: 'var(--black)', border: '1px solid var(--gray3)', borderRadius: 3, padding: 14 }}>
          {media ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 90, height: 54, borderRadius: 3, overflow: 'hidden', background: 'var(--gray2)', flexShrink: 0 }}>
                {mode === 'photo'
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={media} alt="capa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <video src={media} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <button type="button" onClick={() => setMedia('')} style={{ fontSize: '0.7rem', color: '#ff6b6b', background: 'transparent', border: '1px solid var(--gray3)', borderRadius: 2, padding: '5px 10px', cursor: 'pointer' }}>Remover</button>
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ ...seg(false), cursor: uploading ? 'wait' : 'pointer', color: uploading ? 'var(--purple-bright)' : 'var(--mid)' }}>
              {uploading ? '⏳ Enviando…' : (mode === 'photo' ? '⬆ Enviar foto' : '⬆ Enviar vídeo')}
              <input type="file" accept={mode === 'photo' ? 'image/*' : 'video/*'} onChange={e => handleFile(e, mode === 'photo' ? 'image' : 'video')} disabled={uploading} style={{ display: 'none' }} />
            </label>
            <span style={{ color: 'var(--mid)', fontSize: '0.72rem' }}>ou</span>
            <input value={media} onChange={e => setMedia(e.target.value)} placeholder={mode === 'photo' ? 'Cole o link da imagem' : 'Cole o link do vídeo (MP4)'} style={{ flex: 1, minWidth: 160, background: 'var(--gray)', border: '1px solid var(--gray3)', color: 'var(--white)', fontSize: '0.82rem', padding: '8px 10px', borderRadius: 2, outline: 'none' }} />
          </div>
          {error && <div style={{ fontSize: '0.72rem', color: '#ff6b6b', marginTop: 8 }}>⚠ {error}</div>}
          {mode === 'video' && <div style={{ fontSize: '0.72rem', color: 'var(--mid)', marginTop: 8 }}>Dica: vídeo horizontal (16:9) em MP4 encaixa melhor como fundo.</div>}

          <div style={{ marginTop: 14 }}>
            <div className="form-label" style={{ marginBottom: 6 }}>Formato da capa</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['compact', 'medium', 'cinema', 'full'] as Format[]).map(f => (
                <button key={f} type="button" onClick={() => setFormat(f)} style={fmtBtn(format === f)}>
                  {f === 'compact' ? 'Compacta' : f === 'medium' ? 'Média' : f === 'cinema' ? 'Cinema' : 'Tela cheia'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
