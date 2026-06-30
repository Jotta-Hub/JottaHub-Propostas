import { supabase } from '@/lib/supabase'

type Item = {
  id: string
  kind: 'photo' | 'video'
  title: string | null
  category: string | null
  media_url: string
  thumb_url: string | null
}

function embedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/.*[?&]v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  return null
}

// Seção de portfólio na proposta pública. Busca os itens ativos e renderiza
// fotos (img) e vídeos (embed YouTube/Vimeo ou player nativo pra MP4/upload).
export default async function PortfolioSection() {
  const { data } = await supabase.from('portfolio').select('*').eq('active', true).order('sort')
  const items = (data as Item[]) || []
  if (items.length === 0) return null

  return (
    <section className="p-sec alt">
      <div className="p-sec-label">Portfólio</div>
      <h2 className="p-sec-title">Trabalhos <span className="r">reais</span></h2>
      <p className="p-body" style={{ marginBottom: 8 }}>Uma amostra do que a gente entrega — vídeo, foto e direção.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 40 }}>
        {items.map(it => {
          const emb = it.kind === 'video' ? embedUrl(it.media_url) : null
          return (
            <div key={it.id} style={{ border: '1px solid var(--gray2)', borderRadius: 4, overflow: 'hidden', background: 'var(--gray)' }}>
              <div style={{ aspectRatio: '16/9', background: 'var(--black)', position: 'relative' }}>
                {it.kind === 'photo' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.media_url} alt={it.title || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : emb ? (
                  <iframe src={emb} title={it.title || 'vídeo'} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ width: '100%', height: '100%', border: 'none' }} />
                ) : (
                  <video controls preload="metadata" poster={it.thumb_url || undefined} style={{ width: '100%', height: '100%', objectFit: 'cover' }}>
                    <source src={it.media_url} />
                  </video>
                )}
              </div>
              {(it.title || it.category) && (
                <div style={{ padding: '12px 14px' }}>
                  {it.title && <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.92rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{it.title}</div>}
                  {it.category && <div style={{ fontSize: '0.74rem', color: 'var(--mid)', marginTop: 2 }}>{it.category}</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
