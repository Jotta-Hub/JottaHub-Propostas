'use client'

import { useState } from 'react'
import { uploadToCloudinary } from '@/lib/cloudinary'

export type PfItem = { kind: 'photo' | 'video'; source: 'upload' | 'link'; media_url: string; title?: string; category?: string; aspect?: string; thumb_url?: string }

const ASPECTS = [
  { id: '16x9', label: '16:9' },
  { id: '1x1', label: '1:1' },
  { id: '9x16', label: '9:16' },
  { id: 'natural', label: 'Natural' },
]

function videoThumb(url: string): string | undefined {
  const yt = url.match(/(?:youtube\.com\/.*[?&]v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/)
  return yt ? `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg` : undefined
}

// Editor de portfólio específico DESTA proposta (upload via Vercel Blob).
export default function ProposalPortfolioEditor({ items, setItems }: {
  items: PfItem[]
  setItems: React.Dispatch<React.SetStateAction<PfItem[]>>
}) {
  const [kind, setKind] = useState<'photo' | 'video'>('photo')
  const [source, setSource] = useState<'upload' | 'link'>('upload')
  const [aspect, setAspect] = useState('16x9')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [link, setLink] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function add() {
    setErr('')
    if (source === 'link' && !link.trim()) { setErr('Cole o link.'); return }
    if (source === 'upload' && !file) { setErr('Escolha um arquivo.'); return }
    setBusy(true)
    try {
      let media_url = link.trim()
      if (source === 'upload' && file) {
        if (file.size > 1024 * 1024 * 1024) throw new Error('Arquivo muito grande (máx. 1GB).')
        const url = await uploadToCloudinary(file)
        media_url = url
      }
      const thumb_url = kind === 'video' && source === 'link' ? videoThumb(media_url) : undefined
      setItems(prev => [...prev, { kind, source, media_url, title: title.trim() || undefined, category: category.trim() || undefined, aspect, thumb_url }])
      setTitle(''); setCategory(''); setLink(''); setFile(null)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erro ao adicionar.') }
    setBusy(false)
  }

  const seg = (a: boolean): React.CSSProperties => ({ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.66rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '6px 11px', borderRadius: 2, cursor: 'pointer', border: `1px solid ${a ? 'var(--red)' : 'var(--gray3)'}`, background: a ? 'rgba(134,54,242,0.15)' : 'transparent', color: a ? 'var(--purple-bright)' : 'var(--mid)' })
  const inp: React.CSSProperties = { background: 'var(--black)', border: '1px solid var(--gray3)', color: 'var(--white)', fontFamily: 'var(--fb)', fontSize: '0.85rem', padding: '8px 10px', borderRadius: 2, outline: 'none', width: '100%' }

  return (
    <div className="form-group full">
      <label className="form-label">Portfólio desta proposta (além da galeria padrão)</label>
      <div style={{ background: 'var(--black)', border: '1px solid var(--gray3)', borderRadius: 3, padding: 14 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <button type="button" onClick={() => setKind('photo')} style={seg(kind === 'photo')}>📷 Foto</button>
          <button type="button" onClick={() => setKind('video')} style={seg(kind === 'video')}>🎬 Vídeo</button>
          <span style={{ width: 1, background: 'var(--gray3)', margin: '0 3px' }} />
          <button type="button" onClick={() => setSource('upload')} style={seg(source === 'upload')}>⬆ Upload</button>
          <button type="button" onClick={() => setSource('link')} style={seg(source === 'link')}>🔗 Link</button>
          <span style={{ width: 1, background: 'var(--gray3)', margin: '0 3px' }} />
          {ASPECTS.map(a => <button key={a.id} type="button" onClick={() => setAspect(a.id)} style={seg(aspect === a.id)}>{a.label}</button>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <input style={inp} placeholder="Título (opcional)" value={title} onChange={e => setTitle(e.target.value)} />
          <input style={inp} placeholder="Categoria (opcional)" value={category} onChange={e => setCategory(e.target.value)} />
          <div style={{ gridColumn: '1 / -1' }}>
            {source === 'link'
              ? <input style={inp} placeholder={kind === 'video' ? 'Link YouTube/Vimeo/MP4' : 'URL da imagem'} value={link} onChange={e => setLink(e.target.value)} />
              : <input style={{ ...inp, padding: 6 }} type="file" accept={kind === 'video' ? 'video/*' : 'image/*'} onChange={e => setFile(e.target.files?.[0] || null)} />}
          </div>
        </div>
        {err && <div style={{ fontSize: '0.72rem', color: '#ff6b6b', marginBottom: 8 }}>⚠ {err}</div>}
        <button type="button" className="btn-sm red" onClick={add} disabled={busy} style={{ opacity: busy ? 0.7 : 1 }}>{busy ? 'Enviando…' : '+ Adicionar item'}</button>

        {items.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8, marginTop: 12 }}>
            {items.map((it, i) => (
              <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--gray3)', background: 'var(--gray2)' }}>
                {it.kind === 'video' && !it.thumb_url
                  ? <video src={it.media_url} muted preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={it.kind === 'video' ? it.thumb_url! : it.media_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                {it.kind === 'video' && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem', textShadow: '0 1px 4px #000', pointerEvents: 'none' }}>▶</div>}
                <button type="button" onClick={() => setItems(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.7)', color: '#fff', fontSize: '.55rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
