import { NextRequest, NextResponse } from 'next/server'

type ImgAttach = { mime: string; data: string }
function buildContent(text: string, images: ImgAttach[]) {
  if (!images || images.length === 0) return text
  return [
    { type: 'text', text: text + `\n\nO usuário também anexou ${images.length} print(s)/imagem(ns) — analise cada um e incorpore o que for relevante (conversas, referências, valores, escopo) ao briefing.` },
    ...images.map(im => ({ type: 'image', source: { type: 'base64', media_type: im.mime, data: im.data } })),
  ]
}

export async function POST(req: NextRequest) {
  try {
    const { briefing = '', images = [] }: { briefing?: string; images?: ImgAttach[] } = await req.json()

    if (!briefing.trim() && (!images || images.length === 0)) {
      return NextResponse.json({ error: 'Briefing vazio' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY não configurada')
      return NextResponse.json({ error: 'Configuração interna inválida' }, { status: 500 })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8000,
        system: `Você é um assistente especializado em criar propostas comerciais para a JOTTA HUB, um hub estratégico de comunicação, posicionamento e produção audiovisual de Porto Alegre.

A JOTTA HUB atua em:
- Produção audiovisual (vídeos institucionais, reels, stories, cobertura de eventos)
- Estratégia de comunicação e posicionamento
- Fotografia institucional
- Criação de conteúdo
- Gestão de presença digital
- Identidade visual

TABELA DE PREÇOS DA JOTTA HUB (use como base para calcular o orçamento):
- Vídeo institucional: R$ 3.500 (produção completa)
- Cobertura de evento corporativo: R$ 1.800 (4 a 6 horas, inclui teaser para redes sociais)
- Reels / Stories (pacote): R$ 1.500
- Fotografia (sessão): R$ 1.200 a R$ 1.800 dependendo da complexidade
- Estratégia de comunicação: a partir de R$ 1.800/mês (diagnóstico, posicionamento, crescimento)
- Gestão de redes sociais: a partir de R$ 1.800/mês
- Identidade visual: a partir de R$ 900

REGRAS DE PRECIFICAÇÃO:
- Se o projeto tiver múltiplos dias de evento, multiplique o valor por dia
- Se incluir mais de um tipo de serviço, some os valores
- Se o briefing mencionar um valor fechado, use esse valor
- Se não mencionar valor, calcule com base nos serviços identificados
- Sempre gere uma justificativa clara do cálculo

Analise o briefing e responda APENAS com um JSON válido, sem markdown, sem texto extra.`,
        messages: [{
          role: 'user',
          content: buildContent(`Analise este briefing e gere os dados completos para uma proposta comercial, incluindo o orçamento estimado:

"${briefing}"

Retorne um JSON com esta estrutura exata:
{
  "client": "Nome da empresa/cliente",
  "contact": "Nome do contato",
  "greeting": "Olá, [nome]!",
  "intro": "Texto de introdução personalizado (2-3 frases)",
  "title": "Título do projeto em caixa alta",
  "objective": "Objetivo claro do projeto (2-3 frases)",
  "context": "Contexto estratégico (2-3 frases)",
  "pillars": [
    {"name": "Nome do Pilar", "body": "Descrição"}
  ],
  "steps": [
    {"title": "Nome da etapa", "desc": "Descrição"}
  ],
  "deliverables": [
    {"icon": "🎬", "name": "Nome do entregável", "body": "Descrição"}
  ],
  "services": [
    {"name": "Nome do serviço", "desc": "Descrição detalhada", "value": 0}
  ],
  "timeline": [
    {"phase": "Fase 01", "name": "Nome da fase", "items": "Item 1, Item 2"}
  ],
  "validity": 5,
  "status": "pending",
  "budget": {
    "items": [
      {"service": "Nome do serviço", "qty": 1, "unit_price": 0, "total": 0, "note": "Justificativa"}
    ],
    "subtotal": 0,
    "suggested_total": 0,
    "justification": "Explicação resumida do cálculo em 1-2 frases",
    "confidence": "alto",
    "briefing_had_price": false
  }
}

Regras para o campo budget:
- "confidence": use "alto" se o briefing tinha preço definido, "medio" se os serviços são claros mas sem preço, "baixo" se o escopo é vago
- "briefing_had_price": true se o cliente já mencionou um valor fechado
- "suggested_total": valor total sugerido baseado na tabela de preços
- Para qty, use o número de dias, sessões ou unidades identificadas no briefing
- Para os services, preencha o "value" com o mesmo valor do budget.suggested_total dividido entre os itens

Para os deliverables, use emojis relevantes: 🎬📷📱🖥️🎙️✏️📋🎯💡⭐🚀💼📢🎨`, images),
        }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic error:', err)
      return NextResponse.json({ error: 'Erro ao gerar proposta' }, { status: 500 })
    }

    const data = await response.json()

    if (data?.stop_reason === 'max_tokens') {
      return NextResponse.json({ error: 'A proposta ficou muito longa e foi cortada. Tente um briefing um pouco mais curto ou gere de novo.' }, { status: 500 })
    }
    const text = (data?.content?.[0]?.text || '').trim()
    if (!text) {
      return NextResponse.json({ error: 'A IA não retornou conteúdo. Tente novamente.' }, { status: 500 })
    }

    // Parser robusto
    let proposal
    try {
      proposal = JSON.parse(text)
    } catch {
      try {
        const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
        proposal = JSON.parse(cleaned)
      } catch {
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) {
          console.error('Nenhum JSON encontrado:', text)
          return NextResponse.json({ error: 'Erro ao processar resposta da IA' }, { status: 500 })
        }
        proposal = JSON.parse(match[0])
      }
    }

    return NextResponse.json({ proposal })
  } catch (err) {
    console.error('Erro geral:', err)
    return NextResponse.json({ error: 'Erro ao processar briefing' }, { status: 500 })
  }
}
