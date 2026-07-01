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

// Seção de portfólio na proposta pública — galeria de fotos e vídeos.
export default async function PortfolioSection() {
  const { data } = await supabase.from('portfolio').select('*').eq('active', true).order('sort')
  const items = (data as Item[]) || []
  if (items.length === 0) return null

  return (
    <section className="p-sec alt">
      <div className="p-sec-label">Portfólio</div>
      <h2 className="p-sec-title">Trabalhos <span className="r">reais</span></h2>
      <p className="p-body" style={{ marginBottom: 8 }}>Uma amostra do que a gente entrega — vídeo, foto e direção.</p>

      <div className="pf-grid">
        {items.map(it => {
          const emb = it.kind === 'video' ? embedUrl(it.media_url) : null
          return (
            <div key={it.id} className="pf-item">
              <div className="pf-media">
                {it.kind === 'photo' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.media_url} alt={it.title || ''} loading="lazy" />
                ) : emb ? (
                  <iframe src={emb} title={it.title || 'vídeo'} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                ) : (
                  <video controls preload="metadata" poster={it.thumb_url || undefined}><source src={it.media_url} /></video>
                )}
                {it.kind === 'photo' && (it.title || it.category) && (
                  <div className="pf-overlay">
                    {it.title && <div className="pf-overlay-t">{it.title}</div>}
                    {it.category && <div className="pf-overlay-c">{it.category}</div>}
                  </div>
                )}
              </div>
              {it.kind === 'video' && (it.title || it.category) && (
                <div className="pf-cap">
                  {it.title && <div className="pf-cap-t">{it.title}</div>}
                  {it.category && <div className="pf-cap-c">{it.category}</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
