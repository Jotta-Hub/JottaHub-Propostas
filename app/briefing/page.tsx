'use client'

import { useState } from 'react'

type Step = 'service' | 'questions' | 'sending' | 'done'

const SERVICES = [
  { id: 'hora_certa', label: '📅 Hora Certa', desc: 'Sistema de agendamento online personalizado' },
  { id: 'identidade_visual', label: '🎨 Identidade Visual', desc: 'Logo, paleta, tipografia e direção visual' },
  { id: 'landing_page', label: '🖥️ Landing Page', desc: 'Página de conversão para seu negócio' },
  { id: 'gestao_redes', label: '📱 Gestão de Redes', desc: 'Estratégia e conteúdo para redes sociais' },
  { id: 'estrategia', label: '🎯 Estratégia de Comunicação', desc: 'Posicionamento, narrativa e plano de comunicação' },
  { id: 'audiovisual', label: '🎬 Produção Audiovisual', desc: 'Vídeos institucionais, reels, cobertura de eventos' },
  { id: 'outro', label: '💡 Outro', desc: 'Descreva o que você precisa' },
]

const QUESTIONS: Record<string, { id: string; label: string; placeholder: string; type?: string }[]> = {
  hora_certa: [
    { id: 'nome', label: 'Qual é o seu nome e profissão?', placeholder: 'Ex: Kamila Marques, Biomédica especializada em harmonização facial' },
    { id: 'servicos', label: 'Quais serviços você oferece e quais são os valores?', placeholder: 'Ex: Botox R$600, Preenchimento labial R$800, Harmonização facial R$1.500' },
    { id: 'local', label: 'Onde você atende? (cidade, bairro ou online)', placeholder: 'Ex: Florianópolis, SC — atendo em clínica própria no centro' },
    { id: 'agenda', label: 'Quais dias e horários você costuma atender?', placeholder: 'Ex: Segunda a sexta, das 9h às 18h. Sábados das 9h às 13h' },
    { id: 'publico', label: 'Quem é o seu público ideal?', placeholder: 'Ex: Mulheres entre 25 e 45 anos que buscam procedimentos estéticos naturais e seguros' },
    { id: 'identidade', label: 'Como você quer que sua página seja visualmente? (cores, estilo, referências)', placeholder: 'Ex: Tons neutros, bege e dourado. Sofisticado mas acessível. Referência: @dra.fulana' },
    { id: 'diferencial', label: 'O que te diferencia dos outros profissionais?', placeholder: 'Ex: Especialista em resultados naturais, atendimento humanizado, 5 anos de experiência' },
  ],
  identidade_visual: [
    { id: 'nome', label: 'Nome do negócio ou profissional', placeholder: 'Ex: Studio Kamila Marques' },
    { id: 'segmento', label: 'Qual é o segmento e o que você faz?', placeholder: 'Ex: Clínica de estética especializada em harmonização facial e íntima' },
    { id: 'publico', label: 'Quem é o seu público ideal?', placeholder: 'Ex: Mulheres 25-40, poder aquisitivo médio-alto, buscam procedimentos estéticos sofisticados' },
    { id: 'personalidade', label: 'Como você quer que a marca seja percebida?', placeholder: 'Ex: Sofisticada, confiável, moderna, feminina mas com autoridade médica' },
    { id: 'referencias', label: 'Marcas ou visuais que você admira (pode ser fora do seu setor)', placeholder: 'Ex: Gosto da elegância da Dior, da modernidade da Apple, da simplicidade da Clinique' },
    { id: 'cores', label: 'Tem alguma preferência de cores? Algo que definitivamente não quer?', placeholder: 'Ex: Gosto de tons terrosos e dourado. Não quero rosa muito óbvio nem nada muito chamativo' },
    { id: 'onde_usa', label: 'Onde a identidade vai ser usada?', placeholder: 'Ex: Instagram, site, cartão de visita, materiais de atendimento, fachada da clínica' },
  ],
  landing_page: [
    { id: 'nome', label: 'Nome do negócio ou produto', placeholder: 'Ex: Kamila Marques — Biomédica Estética' },
    { id: 'objetivo', label: 'Qual é o objetivo principal da página?', placeholder: 'Ex: Fazer as pessoas agendarem uma consulta de harmonização facial' },
    { id: 'servico', label: 'O que você vai oferecer/vender na página?', placeholder: 'Ex: Consulta de avaliação gratuita para harmonização facial' },
    { id: 'publico', label: 'Para quem é essa página?', placeholder: 'Ex: Mulheres de Florianópolis que querem fazer harmonização pela primeira vez' },
    { id: 'diferencial', label: 'Por que alguém deve escolher você?', placeholder: 'Ex: 5 anos de experiência, resultados naturais, atendimento personalizado, parcela em até 12x' },
    { id: 'tom', label: 'Qual deve ser o tom da página?', placeholder: 'Ex: Profissional mas acolhedor. Técnico mas acessível. Não quero parecer fria ou distante' },
    { id: 'referencias', label: 'Tem alguma página que você gosta como referência?', placeholder: 'Ex: gosto do estilo da [nome do site], principalmente pela forma como apresenta os resultados' },
  ],
  gestao_redes: [
    { id: 'nome', label: 'Nome e profissão/negócio', placeholder: 'Ex: Kamila Marques, Biomédica' },
    { id: 'redes', label: 'Quais redes você usa ou quer usar?', placeholder: 'Ex: Instagram (principal), TikTok (quero começar), LinkedIn (tenho mas não uso)' },
    { id: 'objetivo', label: 'Qual é o seu objetivo principal com as redes?', placeholder: 'Ex: Atrair novos clientes para minha clínica em Florianópolis' },
    { id: 'publico', label: 'Quem você quer atingir?', placeholder: 'Ex: Mulheres 25-40 anos em Florianópolis interessadas em procedimentos estéticos' },
    { id: 'conteudo', label: 'Que tipo de conteúdo você já produz ou gostaria de produzir?', placeholder: 'Ex: Resultados de procedimentos, educacional sobre botox, bastidores da clínica, minha rotina' },
    { id: 'frequencia', label: 'Quantas vezes por semana você consegue/quer postar?', placeholder: 'Ex: 3 vezes por semana no feed + stories diários' },
    { id: 'concorrentes', label: 'Perfis que você admira na sua área (podem ser nacionais)', placeholder: 'Ex: @dra.fulana, @clinica.tal — gosto porque mostram resultados naturais e têm linguagem educativa' },
  ],
  estrategia: [
    { id: 'nome', label: 'Nome e segmento do negócio', placeholder: 'Ex: Kamila Marques — Clínica de harmonização em Florianópolis' },
    { id: 'momento', label: 'Em que momento está o seu negócio hoje?', placeholder: 'Ex: Tenho 1.300 seguidores, atendo bem mas quero crescer. Ainda não tenho identidade visual definida' },
    { id: 'problema', label: 'Qual é o maior desafio de comunicação que você enfrenta?', placeholder: 'Ex: As pessoas não entendem a diferença entre o que faço e uma biomédica comum. Perco clientes por isso' },
    { id: 'objetivo', label: 'O que você quer conquistar nos próximos 6 meses?', placeholder: 'Ex: Dobrar o número de agendamentos, aumentar o ticket médio, ser reconhecida como referência em Floripa' },
    { id: 'publico', label: 'Quem é o seu cliente ideal?', placeholder: 'Ex: Mulheres 28-45, poder aquisitivo médio-alto, que valorizam resultado natural e atendimento de qualidade' },
    { id: 'diferencial', label: 'O que você faz que nenhum concorrente faz igual?', placeholder: 'Ex: Foco em resultados naturais, atendimento individualizado, explicação técnica de cada procedimento' },
    { id: 'investimento', label: 'Você tem ideia de quanto quer investir em comunicação/mês?', placeholder: 'Ex: Tenho até R$ 2.000/mês disponível para isso' },
  ],
  audiovisual: [
    { id: 'nome', label: 'Nome e segmento', placeholder: 'Ex: Kamila Marques — Clínica de Estética' },
    { id: 'tipo', label: 'Que tipo de conteúdo você precisa?', placeholder: 'Ex: Vídeo institucional para o site + reels para Instagram + cobertura de um evento' },
    { id: 'objetivo', label: 'Qual é o objetivo desse material?', placeholder: 'Ex: Apresentar a clínica para novos clientes e mostrar o ambiente e os procedimentos' },
    { id: 'publico', label: 'Para quem é esse conteúdo?', placeholder: 'Ex: Mulheres que estão pesquisando clínicas de harmonização em Florianópolis' },
    { id: 'tom', label: 'Qual deve ser o tom e a linguagem visual?', placeholder: 'Ex: Sofisticado, limpo, com iluminação natural. Referência: @clinicathatiana' },
    { id: 'data', label: 'Tem data prevista para a captação?', placeholder: 'Ex: Gostaria de fazer em junho, de preferência numa semana' },
    { id: 'local', label: 'Onde seria a captação?', placeholder: 'Ex: Na minha clínica no centro de Florianópolis' },
  ],
  outro: [
    { id: 'nome', label: 'Seu nome e profissão/negócio', placeholder: 'Ex: Kamila Marques, Biomédica' },
    { id: 'necessidade', label: 'O que você precisa? Descreva com o máximo de detalhes', placeholder: 'Conte tudo sobre o que você precisa, seu negócio, seus objetivos...' },
    { id: 'objetivo', label: 'Qual é o resultado que você espera?', placeholder: 'Ex: Quero que mais pessoas me encontrem online e agendem consultas' },
    { id: 'prazo', label: 'Tem algum prazo ou urgência?', placeholder: 'Ex: Preciso para o início de julho' },
    { id: 'investimento', label: 'Tem ideia de quanto quer investir?', placeholder: 'Ex: Tenho até R$ 3.000 disponível' },
  ],
}

export default function BriefingPage() {
  const [step, setStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [contact, setContact] = useState({ name: '', email: '', phone: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [protocol, setProtocol] = useState('')

  function selectService(id: string) {
    setSelectedService(id)
    setAnswers({})
    setStep('questions')
  }

  function handleAnswer(id: string, value: string) {
    setAnswers(a => ({ ...a, [id]: value }))
  }

  async function submitBriefing() {
    const questions = QUESTIONS[selectedService] || []
    const unanswered = questions.filter(q => !answers[q.id]?.trim())
    if (unanswered.length > 0) { setError('Por favor preencha todos os campos antes de continuar.'); return }
    if (!contact.name.trim() || !contact.email.trim()) { setError('Informe seu nome e e-mail para continuar.'); return }
    setError('')
    setLoading(true)
    setStep('sending')

    try {
      const res = await fetch('/api/process-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: selectedService,
          answers,
          contact,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao enviar briefing.'); setStep('questions'); return }
      setProtocol(data.protocol)
      setStep('done')
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setStep('questions')
    } finally {
      setLoading(false)
    }
  }

  const serviceLabel = SERVICES.find(s => s.id === selectedService)?.label || ''
  const questions = QUESTIONS[selectedService] || []

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #08070B; color: #F4F4F6; font-family: 'Helvetica Neue', sans-serif; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ minHeight: '100vh', padding: '0 0 80px' }}>

        {/* HEADER */}
        <div style={{ padding: '32px 24px 0', maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 40 }}>
            <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Jott</span>
            <span style={{ display: 'inline-block', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '13px solid #F4F4F6', margin: '0 2px', position: 'relative', top: '-2px' }} />
            <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Hub</span>
            <span style={{ width: 5, height: 5, background: '#8636F2', borderRadius: '50%', display: 'inline-block', marginLeft: 3, position: 'relative', top: '-1px' }} />
          </div>

          {/* STEP: SERVIÇO */}
          {step === 'service' && (
            <div style={{ animation: 'fadeUp 0.5s ease' }}>
              <div style={{ fontSize: '0.62rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#8636F2', marginBottom: 12 }}>Novo Projeto</div>
              <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 900, fontSize: 'clamp(2rem, 6vw, 3rem)', lineHeight: 1.05, marginBottom: 12 }}>
                O que você<br /><span style={{ color: '#8636F2' }}>precisa?</span>
              </h1>
              <p style={{ fontSize: '0.9rem', color: '#888', lineHeight: 1.7, marginBottom: 36 }}>
                Selecione o tipo de projeto e vamos montar um briefing personalizado juntos.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {SERVICES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => selectService(s.id)}
                    style={{
                      background: '#111', border: '1px solid #2E2E2E', borderRadius: 3,
                      padding: '16px 20px', cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 14,
                    }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = '#8636F2'; e.currentTarget.style.background = 'rgba(134,54,242,0.04)' }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = '#2E2E2E'; e.currentTarget.style.background = '#111' }}
                  >
                    <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{s.label.split(' ')[0]}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#F4F4F6', marginBottom: 2 }}>{s.label.split(' ').slice(1).join(' ')}</div>
                      <div style={{ fontSize: '0.76rem', color: '#666' }}>{s.desc}</div>
                    </div>
                    <span style={{ marginLeft: 'auto', color: '#444', fontSize: '1rem' }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP: PERGUNTAS */}
          {step === 'questions' && (
            <div style={{ animation: 'fadeUp 0.5s ease' }}>
              <button onClick={() => setStep('service')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.78rem', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
                ← Voltar
              </button>
              <div style={{ fontSize: '0.62rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#8636F2', marginBottom: 12 }}>{serviceLabel}</div>
              <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 900, fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', lineHeight: 1.1, marginBottom: 8 }}>
                Conta pra<br /><span style={{ color: '#8636F2' }}>a gente</span>
              </h1>
              <p style={{ fontSize: '0.85rem', color: '#888', lineHeight: 1.7, marginBottom: 36 }}>
                Responda com o máximo de detalhes. Quanto mais você contar, melhor será a proposta.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {questions.map((q, i) => (
                  <div key={q.id} style={{ animation: `fadeUp 0.4s ease ${i * 0.05}s both` }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', color: '#F4F4F6', marginBottom: 8 }}>
                      <span style={{ color: '#8636F2', marginRight: 6 }}>{String(i + 1).padStart(2, '0')}.</span>
                      {q.label}
                    </label>
                    <textarea
                      value={answers[q.id] || ''}
                      onChange={e => handleAnswer(q.id, e.target.value)}
                      placeholder={q.placeholder}
                      rows={3}
                      style={{
                        width: '100%', background: '#111', border: '1px solid #2E2E2E',
                        color: '#F4F4F6', fontSize: '0.87rem', padding: '12px 14px',
                        borderRadius: 2, outline: 'none', resize: 'vertical', lineHeight: 1.6,
                        fontFamily: 'inherit', transition: 'border-color 0.2s',
                      }}
                      onFocus={e => e.target.style.borderColor = '#8636F2'}
                      onBlur={e => e.target.style.borderColor = '#2E2E2E'}
                    />
                  </div>
                ))}

                {/* DADOS DE CONTATO */}
                <div style={{ borderTop: '1px solid #1C1C1C', paddingTop: 24 }}>
                  <div style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: 16 }}>Seus dados para contato</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { id: 'name', label: 'Nome completo *', placeholder: 'Kamila Marques' },
                      { id: 'email', label: 'E-mail *', placeholder: 'kamila@email.com' },
                      { id: 'phone', label: 'WhatsApp', placeholder: '48 99999-9999' },
                    ].map(f => (
                      <div key={f.id}>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#888', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{f.label}</label>
                        <input
                          type={f.id === 'email' ? 'email' : 'text'}
                          value={(contact as any)[f.id]}
                          onChange={e => setContact(c => ({ ...c, [f.id]: e.target.value }))}
                          placeholder={f.placeholder}
                          style={{
                            width: '100%', background: '#111', border: '1px solid #2E2E2E',
                            color: '#F4F4F6', fontSize: '0.87rem', padding: '11px 14px',
                            borderRadius: 2, outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s',
                          }}
                          onFocus={e => e.target.style.borderColor = '#8636F2'}
                          onBlur={e => e.target.style.borderColor = '#2E2E2E'}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <div style={{ background: 'rgba(134,54,242,0.1)', border: '1px solid rgba(134,54,242,0.3)', borderRadius: 2, padding: '10px 14px', fontSize: '0.8rem', color: '#ff6b6b' }}>
                    ⚠ {error}
                  </div>
                )}

                <button
                  onClick={submitBriefing}
                  disabled={loading}
                  style={{
                    background: '#8636F2', color: '#F4F4F6', border: 'none', borderRadius: 2,
                    padding: '15px', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.1em',
                    textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer',
                    opacity: loading ? 0.7 : 1, fontFamily: 'inherit',
                  }}
                >
                  Enviar Briefing →
                </button>
              </div>
            </div>
          )}

          {/* STEP: ENVIANDO */}
          {step === 'sending' && (
            <div style={{ animation: 'fadeUp 0.5s ease', textAlign: 'center', paddingTop: 80 }}>
              <div style={{ width: 48, height: 48, border: '3px solid #2E2E2E', borderTop: '3px solid #8636F2', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 24px' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>Processando seu briefing...</div>
              <div style={{ fontSize: '0.82rem', color: '#888' }}>A IA está analisando suas respostas e montando a proposta.</div>
            </div>
          )}

          {/* STEP: DONE */}
          {step === 'done' && (
            <div style={{ animation: 'fadeUp 0.5s ease', textAlign: 'center', paddingTop: 60 }}>
              <div style={{ width: 72, height: 72, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '2rem' }}>✅</div>
              <div style={{ fontSize: '0.62rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 12 }}>Briefing recebido</div>
              <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 900, fontSize: '2rem', lineHeight: 1.1, marginBottom: 16 }}>
                Recebemos tudo!
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#888', lineHeight: 1.8, maxWidth: 400, margin: '0 auto 32px' }}>
                Seu briefing foi processado. Acompanhe o status da sua proposta usando o protocolo abaixo.
              </p>

              {protocol && (
                <div style={{ background: '#111', border: '1px solid #2E2E2E', borderRadius: 3, padding: '20px 24px', marginBottom: 24 }}>
                  <div style={{ fontSize: '0.62rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', marginBottom: 8 }}>Seu Protocolo</div>
                  <div style={{ fontWeight: 700, fontSize: '1.4rem', color: '#F4F4F6', fontFamily: 'monospace', letterSpacing: '0.15em', marginBottom: 4 }}>{protocol}</div>
                  <div style={{ fontSize: '0.72rem', color: '#555' }}>Guarde este código — você vai precisar dele para acompanhar a proposta</div>
                </div>
              )}

              <a
                href="/status"
                style={{
                  display: 'block', background: '#8636F2', color: '#F4F4F6',
                  padding: '14px', borderRadius: 2, fontWeight: 800, fontSize: '0.85rem',
                  letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none',
                  marginBottom: 10,
                }}
              >
                Acompanhar minha proposta →
              </a>

              <a
                href="https://wa.me/5551993009391"
                target="_blank"
                style={{
                  display: 'block', background: 'transparent', color: '#888',
                  padding: '12px', borderRadius: 2, fontWeight: 700, fontSize: '0.78rem',
                  letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none',
                  border: '1px solid #2E2E2E',
                }}
              >
                Falar pelo WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
