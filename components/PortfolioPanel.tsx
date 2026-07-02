'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { upload } from '@vercel/blob/client'

type Item = {
  id: string
  kind: 'photo' | 'video'
  source: 'upload' | 'link'
  title: string | null
  category: string | null
  media_url: string
  thumb_url: string | null
  aspect: string | null
  sort: number
  active: boolean
}

const ASPECTS: { id: string; label: string }[] = [
  { id: '16x9', label: '16:9 Vídeo' },
  { id: '1x1', label: '1:1 Post' },
  { id: '9x16', label: '9:16 Reels' },
  { id: 'natural', label: 'Natural' },
]

// extrai thumbnail de link de vídeo (YouTube). Vimeo/MP4 ficam sem thumb.
function videoThumb(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/.*[?&]v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/)
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`
  return null
}

export default function PortfolioPanel() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [kind, setKind] = useState<'photo' | 'video'>('photo')
  const [source, setSource] = useState<'upload' | 'link'>('upload')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [link, setLink] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [aspect, setAspect] = useState('16x9')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('portfolio').select('*').order('sort').order('created_at')
    if (error) setError(error.message)
    else setItems((data as Item[]) || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function add() {
    setError('')
    if (source === 'link' && !link.trim()) { setError('Cole o link do vídeo/imagem.'); return }
    if (source === 'upload' && !file) { setError('Escolha um arquivo.'); return }
    setSaving(true)
    try {
      let media_url = link.trim()
      let thumb_url: string | null = null

      if (source === 'upload' && file) {
        if (file.size > 1024 * 1024 * 1024) throw new Error('Arquivo muito grande (máx. 1GB).')
        const blob = await upload(`portfolio/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`, file, {
          access: 'public',
          handleUploadUrl: '/api/portfolio-upload',
        })
        media_url = blob.url
      }
      if (kind === 'video' && source === 'link') thumb_url = videoThumb(media_url)

      const sort = items.length
      const { error } = await supabase.from('portfolio').insert({ kind, source, title: title.trim() || null, category: category.trim() || null, media_url, thumb_url, aspect, sort, active: true })
      if (error) throw new Error(error.message)
      setTitle(''); setCategory(''); setLink(''); setFile(null)
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao adicionar.')
    }
    setSaving(false)
  }

  async function remove(it: Item) {
    if (!confirm(`Remover "${it.title || 'este item'}" do portfólio?`)) return
    // remove o arquivo do Vercel Blob se foi upload (best-effort)
    if (it.source === 'upload') {
      fetch('/api/portfolio-upload', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: it.media_url }) }).catch(() => {})
    }
    await supabase.from('portfolio').delete().eq('id', it.id)
    load()
  }

  async function move(it: Item, dir: -1 | 1) {
    const idx = items.findIndex(x => x.id === it.id)
    const swap = items[idx + dir]
    if (!swap) return
    await supabase.from('portfolio').update({ sort: swap.sort }).eq('id', it.id)
    await supabase.from('portfolio').update({ sort: it.sort }).eq('id', swap.id)
    load()
  }

  const label: React.CSSProperties = { fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: 6, display: 'block' }
  const input: React.CSSProperties = { background: 'var(--black)', border: '1px solid var(--gray3)', color: 'var(--white)', fontFamily: 'var(--fb)', fontSize: '0.9rem', padding: '10px 12px', borderRadius: 2, outline: 'none', width: '100%' }
  const seg = (active: boolean): React.CSSProperties => ({ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 2, cursor: 'pointer', border: `1px solid ${active ? 'var(--red)' : 'var(--gray3)'}`, background: active ? 'rgba(134,54,242,0.15)' : 'transparent', color: active ? 'var(--purple-bright)' : 'var(--mid)' })

  return (
    <div className="proposals-section">
      <div className="section-head">
        <div className="section-title-row">
          <span className="section-title">Portfólio</span>
          <span className="section-count">{items.length}</span>
        </div>
      </div>

      {/* Form */}
      <div style={{ background: 'var(--gray)', border: '1px solid var(--gray2)', borderRadius: 4, padding: 22, marginBottom: 24, maxWidth: 760 }}>
        <div style={{ fontFamily: 'var(--fd)', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--purple-bright)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="bolt" />Novo item
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <button onClick={() => setKind('photo')} style={seg(kind === 'photo')}>📷 Foto</button>
          <button onClick={() => setKind('video')} style={seg(kind === 'video')}>🎬 Vídeo</button>
          <span style={{ width: 1, background: 'var(--gray3)', margin: '0 4px' }} />
          <button onClick={() => setSource('upload')} style={seg(source === 'upload')}>⬆ Upload</button>
          <button onClick={() => setSource('link')} style={seg(source === 'link')}>🔗 Link</button>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: '0.62rem', fontFamily: 'var(--fd)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: 8 }}>Proporção</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ASPECTS.map(a => (
              <button key={a.id} onClick={() => setAspect(a.id)} style={seg(aspect === a.id)}>{a.label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div><label style={label}>Título</label><input style={input} placeholder="Ex: Vídeo institucional — Clínica X" value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div><label style={label}>Categoria</label><input style={input} placeholder="Ex: Audiovisual, Foto, Evento" value={category} onChange={e => setCategory(e.target.value)} /></div>
          <div style={{ gridColumn: '1 / -1' }}>
            {source === 'link' ? (
              <><label style={label}>Link {kind === 'video' ? '(YouTube, Vimeo ou MP4)' : '(URL da imagem)'}</label>
                <input style={input} placeholder={kind === 'video' ? 'https://youtube.com/watch?v=...' : 'https://...'} value={link} onChange={e => setLink(e.target.value)} /></>
            ) : (
              <><label style={label}>Arquivo ({kind === 'video' ? 'vídeo até 1GB' : 'imagem'})</label>
                <input style={{ ...input, padding: '8px' }} type="file" accept={kind === 'video' ? 'video/*' : 'image/*'} onChange={e => setFile(e.target.files?.[0] || null)} /></>
            )}
          </div>
        </div>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 2, padding: '10px 14px', fontSize: '0.82rem', color: '#ff6b6b', marginTop: 14 }}>{error}</div>}
        <button className="btn-red" onClick={add} disabled={saving} style={{ marginTop: 16, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Salvando…' : '+ Adicionar ao portfólio'}
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ color: 'var(--mid)', fontSize: '0.85rem', padding: 20 }}>Carregando…</div>
      ) : items.length === 0 ? (
        <div style={{ color: 'var(--mid)', fontSize: '0.85rem', padding: 20 }}>Nenhum item ainda. Adicione fotos e vídeos acima.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {items.map((it, i) => (
            <div key={it.id} style={{ background: 'var(--gray)', border: '1px solid var(--gray2)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ aspectRatio: '16/10', background: 'var(--black)', position: 'relative', overflow: 'hidden' }}>
                {it.kind === 'video' && !it.thumb_url
                  ? <video src={it.media_url} muted preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={it.kind === 'video' ? it.thumb_url! : it.media_url} alt={it.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                {it.kind === 'video' && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,.6)', pointerEvents: 'none' }}>▶</div>}
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title || '—'}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--mid)' }}>{it.category || it.kind}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button onClick={() => move(it, -1)} disabled={i === 0} style={{ flex: 1, fontSize: '0.7rem', padding: '5px', borderRadius: 2, border: '1px solid var(--gray3)', background: 'transparent', color: i === 0 ? 'var(--gray3)' : 'var(--mid)', cursor: i === 0 ? 'default' : 'pointer' }}>↑</button>
                  <button onClick={() => move(it, 1)} disabled={i === items.length - 1} style={{ flex: 1, fontSize: '0.7rem', padding: '5px', borderRadius: 2, border: '1px solid var(--gray3)', background: 'transparent', color: i === items.length - 1 ? 'var(--gray3)' : 'var(--mid)', cursor: i === items.length - 1 ? 'default' : 'pointer' }}>↓</button>
                  <button onClick={() => remove(it)} style={{ flex: 1, fontSize: '0.65rem', padding: '5px', borderRadius: 2, border: '1px solid var(--gray3)', background: 'transparent', color: '#ff6b6b', cursor: 'pointer' }}>Excluir</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
