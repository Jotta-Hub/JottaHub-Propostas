import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { briefing } = await req.json()

    if (!briefing) {
      return NextResponse.json({ error: 'Briefing vazio' }, { status: 400 })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: `Você é um assistente especializado em criar propostas comerciais para a JOTTA HUB, um hub estratégico de comunicação, posicionamento e produção audiovisual de Porto Alegre.

A JOTTA HUB atua em:
- Produção audiovisual (vídeos institucionais, reels, stories, cobertura de eventos)
- Estratégia de comunicação e posicionamento
- Fotografia institucional
- Criação de conteúdo
- Gestão de presença digital

Analise o briefing fornecido e extraia/estruture as informações para preencher uma proposta comercial. Responda APENAS com um JSON válido, sem markdown, sem texto extra.`,
        messages: [{
          role: 'user',
          content: `Analise este briefing e gere os dados para uma proposta comercial:

"${briefing}"

Retorne um JSON com esta estrutura exata (preencha todos os campos com base no briefing, inferindo quando necessário):
{
  "client": "Nome da empresa/cliente",
  "contact": "Nome do contato",
  "greeting": "Olá, [nome]!",
  "intro": "Texto de introdução personalizado para o cliente (2-3 frases)",
  "title": "Título do projeto em caixa alta (ex: COBERTURA AUDIOVISUAL — EVENTO X)",
  "objective": "Objetivo claro do projeto (2-3 frases)",
  "context": "Contexto estratégico do projeto (2-3 frases)",
  "pillars": [
    {"name": "Nome do Pilar 1", "body": "Descrição do pilar"},
    {"name": "Nome do Pilar 2", "body": "Descrição do pilar"},
    {"name": "Nome do Pilar 3", "body": "Descrição do pilar"}
  ],
  "steps": [
    {"title": "Nome da etapa", "desc": "Descrição da etapa"},
    {"title": "Nome da etapa", "desc": "Descrição da etapa"},
    {"title": "Nome da etapa", "desc": "Descrição da etapa"},
    {"title": "Nome da etapa", "desc": "Descrição da etapa"},
    {"title": "Nome da etapa", "desc": "Descrição da etapa"}
  ],
  "deliverables": [
    {"icon": "🎬", "name": "Nome do entregável", "body": "Descrição"},
    {"icon": "📷", "name": "Nome do entregável", "body": "Descrição"},
    {"icon": "📱", "name": "Nome do entregável", "body": "Descrição"}
  ],
  "services": [
    {"name": "Nome do serviço", "desc": "Descrição detalhada", "value": 0}
  ],
  "timeline": [
    {"phase": "Fase 01", "name": "Nome da fase", "items": "Item 1, Item 2, Item 3"},
    {"phase": "Fase 02", "name": "Nome da fase", "items": "Item 1, Item 2"},
    {"phase": "Fase 03", "name": "Nome da fase", "items": "Item 1, Item 2"}
  ],
  "validity": 5,
  "status": "pending"
}

Para o campo "value" dos serviços, use o valor mencionado no briefing. Se não mencionado, use 0.
Para os steps, adapte as etapas ao tipo de serviço (audiovisual, estratégia, conteúdo, etc).
Para os deliverables, use emojis relevantes: 🎬📷📱🖥️🎙️✏️📋🎯💡⭐🚀💼📢🎨.`,
        }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic error:', err)
      return NextResponse.json({ error: 'Erro ao gerar proposta' }, { status: 500 })
    }

    const data = await response.json()
    const text = data.content[0].text.trim()

    // Parse JSON
    const cleaned = text.replace(/```json|```/g, '').trim()
    const proposal = JSON.parse(cleaned)

    return NextResponse.json({ proposal })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erro ao processar briefing' }, { status: 500 })
  }
}
