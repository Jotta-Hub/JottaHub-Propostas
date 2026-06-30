import { NextRequest, NextResponse } from 'next/server'

// Nina — assistente comercial da JOTTA HUB no painel de propostas.
// mode 'greeting': gera a saudação + resumo do dia. mode 'ask': responde perguntas.

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'IA não configurada.' }, { status: 500 })

  const { mode = 'ask', question = '', context = '', userName = 'Rennan' } = await req.json().catch(() => ({}))

  const hour = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false })
  const periodo = Number(hour) < 12 ? 'manhã' : Number(hour) < 18 ? 'tarde' : 'noite'

  const system = `Você é a Nina, assistente comercial da JOTTA HUB dentro do sistema de propostas. Fala em português do Brasil, tom próximo, direto e motivador — sem corporativês, sem enrolação. Seu foco é ajudar ${userName} a CONVERTER propostas: o que enviar, o que retomar, o que cobrar. Seja específica citando nomes de cliente quando fizer sentido.`

  const userMsg = mode === 'greeting'
    ? `Agora é de ${periodo}. Estado das propostas:\n${context}\n\nDê um cumprimento curto pro ${userName} (saudação certa pra ${periodo}, com seu nome) e, em no máximo 2-3 frases, resuma o que merece atenção hoje (rascunhos a enviar, expiradas a retomar, enviadas paradas aguardando resposta). Sem listar tudo — só o que importa pra fechar mais.`
    : `Estado das propostas:\n${context}\n\nPergunta do ${userName}: "${question}"\n\nResponda de forma prática, específica e curta (até 4 frases).`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system,
        messages: [{ role: 'user', content: userMsg }],
      }),
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data?.error?.message || 'A Nina não respondeu.' }, { status: 500 })
    return NextResponse.json({ text: (data?.content?.[0]?.text || '').trim() })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao falar com a Nina.' }, { status: 500 })
  }
}
