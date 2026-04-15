import { supabase, type Proposal } from '@/lib/supabase'
import { fmtBRL, fmtDate, addWorkdays, calcTotal, DEFAULT_STEPS } from '@/lib/utils'
import { notFound } from 'next/navigation'

export const revalidate = 60

async function getProposal(id: string): Promise<Proposal | null> {
  const { data } = await supabase.from('proposals').select('*').eq('id', id).single()
  return data
}

export default async function PropostaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await getProposal(id)

  const services = p.services || []
  const total = calcTotal(services)
  const steps = p.steps?.length ? p.steps : DEFAULT_STEPS
  const validDate = p.created_at ? addWorkdays(p.created_at.slice(0, 10), p.validity || 5) : ''

  return (
    <>
      <a href="/admin" className="back-btn">← Painel</a>

      {/* HERO */}
      <section className="p-hero">
        <div className="p-hero-dots" />
        {p.logo_url && (
          <div className={`p-hero-client-logo has-logo${p.logo_mode === 'white' ? ' white-mode' : ''}`}>
            <img src={p.logo_url} alt={p.client} />
          </div>
        )}
        <div className="p-hero-tag">
          <span className="p-tag-dot" />
          <span>Proposta Comercial</span>
          <span className="p-tag-dot" />
          <span>{fmtDate(p.created_at?.slice(0, 10))}</span>
        </div>
        <div className="p-hero-eyebrow">JOTTA HUB</div>
        <h1 className="p-hero-title">
          <span className="ghost">{p.client}</span>
          <span>{p.title || 'Projeto'}</span>
        </h1>
        <div className="p-hero-meta">
          <div>
            <div className="p-hello">{p.greeting || `Olá, ${p.contact || p.client}!`}</div>
            <p className="p-intro" dangerouslySetInnerHTML={{ __html: (p.intro || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
          <div className="p-hero-info">
            <div className="p-info-item">Cliente: <span>{p.client}</span></div>
            <div className="p-info-item">Emitida em: <span>{fmtDate(p.created_at?.slice(0, 10))}</span></div>
            <div className="p-validity">
              <div className="p-validity-label">Válida até</div>
              <div className="p-validity-date">{fmtDate(validDate)}</div>
            </div>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="p-ticker">
        <div className="p-ticker-inner">
          {['Estratégia','Posicionamento','Crescimento','Comunicação','Produção Audiovisual','Dados e Performance','Narrativa','Resultado Real','Autoridade',
            'Estratégia','Posicionamento','Crescimento','Comunicação','Produção Audiovisual','Dados e Performance','Narrativa','Resultado Real','Autoridade'
          ].map((t, i) => (
            <span key={i}>{i % 1 === 0 && i > 0 ? <span className="p-td" /> : null}<span className="p-ti">{t}</span></span>
          ))}
        </div>
      </div>

      {/* OBJETIVO */}
      <section className="p-sec">
        <div className="p-sec-label">Briefing</div>
        <h2 className="p-sec-title">Objetivo do <span className="r">Projeto</span></h2>
        <p className="p-body" dangerouslySetInnerHTML={{ __html: (p.objective || 'Desenvolver materiais audiovisuais institucionais de alto padrão.').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        {p.context && <p className="p-body" dangerouslySetInnerHTML={{ __html: p.context.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />}

        {p.pillars && p.pillars.length > 0 && (
          <div className="p-pillars" style={{ display: 'grid', marginTop: 44 }}>
            {p.pillars.map((pl, i) => (
              <div key={i} className="p-pillar">
                <div className="p-pillar-num">0{i + 1}</div>
                <div className="p-pillar-title">{pl.name}</div>
                <div className="p-pillar-body">{pl.body}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* INVESTIMENTO */}
      <section className="p-sec alt">
        <div className="p-sec-label">Investimento</div>
        <h2 className="p-sec-title">Escopo &amp; <span className="r">Valor</span></h2>
        <p className="p-body">Detalhamento completo dos serviços incluídos nesta proposta.</p>
        <div className="p-services">
          <div className="p-svc-head"><span>Serviço</span><span>Valor</span></div>
          {services.map((s, i) => (
            <div key={i} className="p-svc-row">
              <div>
                <div className="p-svc-name">{s.name}</div>
                {s.desc && <div className="p-svc-desc">{s.desc}</div>}
              </div>
              <div className="p-svc-value">{s.value > 0 ? fmtBRL(s.value) : '—'}</div>
            </div>
          ))}
          {total > 0 && (
            <div className="p-total-row">
              <div className="p-total-label">Investimento Total</div>
              <div className="p-total-value">{fmtBRL(total)}</div>
            </div>
          )}
        </div>
      </section>

      {/* COMO TRABALHAMOS */}
      <section className="p-sec">
        <div className="p-sec-label">Processo</div>
        <h2 className="p-sec-title">Como <span className="g">trabalhamos</span></h2>
        <div className="p-steps">
          {steps.map((s, i) => (
            <div key={i} className="p-step">
              <div className="p-step-n">0{i + 1}</div>
              <div>
                <div className="p-step-t">{s.title}</div>
                <div className="p-step-d">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ENTREGÁVEIS */}
      {p.deliverables && p.deliverables.length > 0 && (
        <section className="p-sec alt">
          <div className="p-sec-label">O que você recebe</div>
          <h2 className="p-sec-title"><span className="g">Entre</span>gáveis</h2>
          <div className="p-deliverables">
            {p.deliverables.map((d, i) => (
              <div key={i} className="p-deliv">
                <span className="p-deliv-icon">{d.icon}</span>
                <div className="p-deliv-title">{d.name}</div>
                <div className="p-deliv-body">{d.body}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CRONOGRAMA */}
      {p.timeline && p.timeline.length > 0 && (
        <section className="p-sec">
          <div className="p-sec-label">Planejamento</div>
          <h2 className="p-sec-title">Crono<span className="r">grama</span></h2>
          <div className="p-timeline">
            {p.timeline.map((t, i) => (
              <div key={i} className="p-tl-row">
                <div className="p-tl-phase">
                  <div className="p-tl-phase-n">{t.phase}</div>
                  <div className="p-tl-phase-name">{t.name}</div>
                </div>
                <div className="p-tl-content">
                  <div className="p-tl-items">
                    {t.items.split(',').filter(x => x.trim()).map((item, j) => (
                      <span key={j} className="p-tl-item">{item.trim()}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* PAGAMENTO */}
      <section className="p-sec alt">
        <div className="p-sec-label">Condições</div>
        <h2 className="p-sec-title">Forma de <span className="r">Pagamento</span></h2>
        <p className="p-body">Emissão de nota fiscal inclusa. Pagamento via PIX ou transferência bancária.</p>
        <div className="p-payment-grid">
          <div className="p-pay-card">
            <div className="p-pay-step">50%</div>
            <div className="p-pay-title">Na Aprovação</div>
            <div className="p-pay-pct">{fmtBRL(total * 0.5)}</div>
            <div className="p-pay-desc">Na aprovação e assinatura do contrato para início do projeto.</div>
          </div>
          <div className="p-pay-card">
            <div className="p-pay-step">50%</div>
            <div className="p-pay-title">Na Entrega</div>
            <div className="p-pay-pct">{fmtBRL(total * 0.5)}</div>
            <div className="p-pay-desc">Na entrega final de todos os materiais após aprovação.</div>
          </div>
        </div>
      </section>

      {/* SOBRE */}
      <section className="p-sobre">
        <div className="p-sec-label">Quem está por trás disso</div>
        <div style={{ maxWidth: 780, marginBottom: 64 }}>
          <h2 className="p-sec-title">Não somos <span className="r">uma agência.</span></h2>
          <p className="p-body" style={{ fontSize: '1.05rem' }}><strong>A JOTTA HUB é um hub estratégico de crescimento.</strong> A gente entra no negócio para entender, estruturar e escalar — não para vender post.</p>
          <p className="p-body">Construímos posicionamento, geramos percepção de valor e impulsionamos resultado real. Com estratégia, comunicação e dados — não achismo.</p>
        </div>
        <div className="p-pillars" style={{ display: 'grid', marginBottom: 56 }}>
          {[
            { n: '01', t: 'Pensamento Estratégico', b: 'Diagnóstico do negócio, identificação de gargalos, definição de posicionamento e construção de narrativa.' },
            { n: '02', t: 'Comunicação e Conteúdo', b: 'Produção audiovisual profissional, copywriting estratégico e presença digital estruturada com intenção real.' },
            { n: '03', t: 'Crescimento e Performance', b: 'Estrutura de marketing e vendas, leitura de dados e métricas, otimização de resultados e escala de faturamento.' },
          ].map(pl => (
            <div key={pl.n} className="p-pillar">
              <div className="p-pillar-num">{pl.n}</div>
              <div className="p-pillar-title">{pl.t}</div>
              <div className="p-pillar-body">{pl.b}</div>
            </div>
          ))}
        </div>
        <div className="p-sobre-grid">
          <div>
            <div className="p-sec-label" style={{ marginBottom: 20 }}>O que nos diferencia</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { t: 'Visão de negócio', b: 'A gente não pensa só em marketing — pensa no todo. Estratégia, posicionamento, resultado.' },
                { t: 'Base em dados', b: 'Decisão sem dado é achismo. A gente não trabalha assim.' },
                { t: 'Execução forte', b: 'Não ficamos só na estratégia. Planejamos e entregamos.' },
                { t: 'Experiência real', b: 'Mais de 10 anos no audiovisual e atuação direta com empresas em saúde, educação e negócios locais.' },
              ].map((d, i) => (
                <div key={i} className="p-sobre-diferencial">
                  <div className="p-sobre-dif-title">{d.t}</div>
                  <div className="p-sobre-dif-body">{d.b}</div>
                </div>
              ))}
            </div>
            <div className="p-sobre-cta">
              <a href="https://jottahub.com.br" target="_blank" className="btn-red">↗ Conheça o site</a>
              <a href="https://wa.me/5551993009391" target="_blank" className="btn-outline">WhatsApp</a>
            </div>
          </div>
          <div className="p-sobre-right">
            <div className="p-sobre-stat">
              <div className="p-sobre-stat-n">+<span style={{ color: 'var(--red)' }}>10</span></div>
              <div className="p-sobre-stat-l">Anos no audiovisual profissional</div>
            </div>
            <div className="p-sobre-stat">
              <div className="p-sobre-stat-n" style={{ fontSize: '1.4rem', lineHeight: 1.3 }}>Saúde<span style={{ color: 'var(--red)' }}>.</span> Educação<span style={{ color: 'var(--red)' }}>.</span> Negócios</div>
              <div className="p-sobre-stat-l">Segmentos onde já atuamos</div>
            </div>
            <div className="p-sobre-stat">
              <div className="p-sobre-stat-n" style={{ fontSize: '1rem', fontWeight: 400, fontFamily: 'var(--fb)', lineHeight: 1.6 }}>
                <em style={{ color: 'rgba(245,243,239,0.55)' }}>"Não é sobre entregar peças soltas. É sobre criar um sistema que faz o negócio crescer."</em>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="p-cta">
        <div className="p-cta-wm">JOTTA</div>
        <div className="p-cta-label">Próximo passo</div>
        <h2 className="p-cta-title"><span className="g">Vamos</span>Criar</h2>
        <p className="p-cta-sub">Proposta válida por <strong>{p.validity || 5}</strong> dias úteis a partir da data de envio.</p>
        <div className="p-cta-contacts">
          <div className="p-cta-contact"><strong>51 99300 9391</strong>WhatsApp</div>
          <div className="p-cta-contact"><strong>rennan@jottahub.com.br</strong>E-mail</div>
          <div className="p-cta-contact"><strong>@jottahub</strong>Instagram</div>
        </div>
        <div className="p-cta-btns">
          <a href="https://wa.me/5551993009391" className="btn-red" target="_blank">↗ WhatsApp</a>
          <a href="mailto:rennan@jottahub.com.br" className="btn-outline">E-mail</a>
        </div>
      </section>

      <footer className="p-footer">
        <div className="nav-logo">
          <span className="nl-t">Jott</span>
          <span className="nl-tri" />
          <span className="nl-t" style={{ marginLeft: 1 }}>Hub</span>
          <span className="nl-dot" style={{ marginLeft: 4 }} />
        </div>
        <div className="p-footer-copy">POA | RS 🇧🇷</div>
        <div className="p-footer-copy">© 2026 JOTTA HUB</div>
      </footer>
    </>
  )
}
