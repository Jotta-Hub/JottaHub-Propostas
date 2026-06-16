import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SERVICE_LABELS: Record<string, string> = {
  hora_certa: 'Hora Certa — Sistema de Agendamento',
  identidade_visual: 'Identidade Visual',
  landing_page: 'Landing Page',
  gestao_redes: 'Gestão de Redes Sociais',
  estrategia: 'Estratégia de Comunicação',
  audiovisual: 'Produção Audiovisual',
  outro: 'Projeto Personalizado',
}

export async function POST(req: NextRequest) {
  try {
    const { service, answers, contact } = await req.json()

    if (!service || !answers || !contact?.name || !contact?.email) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Configuração interna inválida' }, { status: 500 })
    }

    const serviceLabel = SERVICE_LABELS[service] || service
    const briefingText = Object.entries(answers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')

    const fullBriefing = `
TIPO DE SERVIÇO: ${serviceLabel}
CLIENTE: ${contact.name}
EMAIL: ${contact.email}
TELEFONE: ${contact.phone || 'Não informado'}

RESPOSTAS DO BRIEFING:
${briefingText}
    `.trim()

    // Gera proposta com IA
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        system: `Você é um assistente especializado em criar propostas comerciais para a JOTTA HUB, um hub estratégico de comunicação, posicionamento e produção audiovisual de Porto Alegre.

A JOTTA HUB oferece:
- Hora Certa: sistema de agendamento online personalizado para profissionais liberais (página com identidade visual única, calendário funcional, protocolo automático). Valor: a partir de R$ 900 setup + mensalidade
- Identidade visual: logo, paleta, tipografia, direção visual. Valor: a partir de R$ 900
- Landing page: página de conversão. Valor: a partir de R$ 1.500
- Gestão de redes sociais: estratégia e conteúdo. Valor: a partir de R$ 1.800/mês
- Estratégia de comunicação: posicionamento, narrativa, plano. Valor: a partir de R$ 1.800/mês
- Produção audiovisual: vídeos institucionais R$ 3.500, cobertura de evento R$ 1.800, reels/stories R$ 1.500

Analise o briefing e gere uma proposta comercial personalizada. Responda APENAS com JSON válido, sem markdown.`,
        messages: [{
          role: 'user',
          content: `Analise este briefing e gere uma proposta:

${fullBriefing}

Retorne JSON com esta estrutura:
{
  "client": "Nome da empresa ou profissional",
  "contact": "Nome do contato",
  "greeting": "Saudação personalizada",
  "intro": "Introdução personalizada (2-3 frases que mostram que entendemos o negócio)",
  "title": "TÍTULO DO PROJETO EM CAIXA ALTA",
  "objective": "Objetivo claro baseado no briefing (2-3 frases)",
  "context": "Contexto estratégico do negócio (2-3 frases)",
  "pillars": [
    {"name": "Pilar estratégico", "body": "Descrição"}
  ],
  "steps": [
    {"title": "Etapa", "desc": "Descrição"}
  ],
  "deliverables": [
    {"icon": "🎬", "name": "Entregável", "body": "Descrição"}
  ],
  "services": [
    {"name": "Nome do serviço", "desc": "Descrição detalhada", "value": 0}
  ],
  "timeline": [
    {"phase": "Fase 01", "name": "Nome", "items": "Item 1, Item 2"}
  ],
  "validity": 5,
  "status": "pending"
}

Para "value" nos services, use os valores da tabela de preços da JOTTA HUB baseado no serviço solicitado.`,
        }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic error:', err)
      return NextResponse.json({ error: 'Erro ao processar briefing' }, { status: 500 })
    }

    const aiData = await response.json()
    const text = aiData.content[0].text.trim()

    let proposal
    try {
      proposal = JSON.parse(text)
    } catch {
      try {
        const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
        proposal = JSON.parse(cleaned)
      } catch {
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) throw new Error('JSON não encontrado')
        proposal = JSON.parse(match[0])
      }
    }

    // Gera protocolo único
    const protocol = `JH-${Date.now().toString(36).toUpperCase().slice(-6)}`

    // Salva proposta no Supabase como rascunho
    const { data: savedProposal, error: saveError } = await supabase
      .from('proposals')
      .insert({
        ...proposal,
        status: 'pending',
        source: 'briefing_externo',
        briefing_raw: fullBriefing,
        protocol,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Supabase error:', saveError)
      return NextResponse.json({ error: 'Erro ao salvar proposta' }, { status: 500 })
    }

    // Cria também um LEAD no CRM (best-effort: não bloqueia o fluxo da proposta).
    // O CRM tem um endpoint público próprio que insere na tabela leads.
    try {
      await fetch('https://crm.jottahub.com.br/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contact.name,
          company: contact.company || '',
          phone: contact.phone || '',
          email: contact.email,
          service: serviceLabel,
          briefing: `${briefingText}\n\n[Origem: briefing das Propostas · protocolo ${protocol}]`,
          budget: answers?.investimento || answers?.orcamento || '',
          deadline: answers?.prazo || '',
        }),
      })
    } catch (e) {
      console.error('[process-briefing] falha ao criar lead no CRM:', e)
    }

    // Notifica Rennan por e-mail
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'JOTTA HUB <propostas@jottahub.com.br>',
        to: 'rennan@jottahub.com.br',
        subject: `🎯 Novo briefing recebido — ${contact.name} (${serviceLabel})`,
        html: `
          <div style="background:#080808;color:#F5F3EF;font-family:'Helvetica Neue',sans-serif;padding:40px 24px;max-width:520px;margin:0 auto;">
            <div style="font-weight:900;font-size:1.3rem;text-transform:uppercase;margin-bottom:32px;">JOTTA HUB</div>
            <div style="background:#111;border:1px solid #1C1C1C;border-radius:4px;overflow:hidden;">
              <div style="background:#E8321A;height:3px;"></div>
              <div style="padding:28px;">
                <div style="font-size:0.62rem;letter-spacing:0.2em;text-transform:uppercase;color:#888;margin-bottom:8px;">Novo Briefing</div>
                <h2 style="font-size:1.4rem;font-weight:900;text-transform:uppercase;margin-bottom:4px;">${contact.name}</h2>
                <div style="font-size:0.82rem;color:#888;margin-bottom:24px;">${serviceLabel}</div>
                <div style="background:#080808;border:1px solid #2E2E2E;border-radius:3px;padding:16px;margin-bottom:20px;">
                  <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#888;margin-bottom:10px;">Dados do Cliente</div>
                  <div style="font-size:0.82rem;margin-bottom:6px;"><strong>Nome:</strong> ${contact.name}</div>
                  <div style="font-size:0.82rem;margin-bottom:6px;"><strong>E-mail:</strong> ${contact.email}</div>
                  ${contact.phone ? `<div style="font-size:0.82rem;"><strong>WhatsApp:</strong> ${contact.phone}</div>` : ''}
                </div>
                <div style="background:#080808;border:1px solid #2E2E2E;border-radius:3px;padding:16px;margin-bottom:20px;">
                  <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#888;margin-bottom:10px;">Briefing</div>
                  <pre style="font-size:0.78rem;color:#aaa;white-space:pre-wrap;font-family:inherit;line-height:1.6;">${briefingText}</pre>
                </div>
                <div style="background:#080808;border:1px solid #2E2E2E;border-radius:3px;padding:16px;margin-bottom:24px;">
                  <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#888;margin-bottom:6px;">Proposta Gerada</div>
                  <div style="font-size:0.82rem;color:#22c55e;">✅ Proposta rascunho criada automaticamente</div>
                  <div style="font-size:0.72rem;color:#666;margin-top:4px;">Protocolo: ${protocol}</div>
                </div>
                <a href="https://propostas.jottahub.com.br/admin" style="display:block;background:#E8321A;color:#F5F3EF;text-align:center;padding:13px;border-radius:2px;font-weight:800;font-size:0.82rem;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;">
                  Ver no Admin →
                </a>
              </div>
            </div>
          </div>
        `,
      }),
    })

    // Confirma para o cliente
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'JOTTA HUB <propostas@jottahub.com.br>',
        to: contact.email,
        subject: `Briefing recebido — ${serviceLabel}`,
        html: `
          <div style="background:#080808;color:#F5F3EF;font-family:'Helvetica Neue',sans-serif;padding:40px 24px;max-width:480px;margin:0 auto;">
            <div style="font-weight:900;font-size:1.3rem;text-transform:uppercase;margin-bottom:32px;">JOTTA HUB</div>
            <div style="background:#111;border:1px solid #1C1C1C;border-radius:4px;overflow:hidden;">
              <div style="background:#22c55e;height:3px;"></div>
              <div style="padding:28px;text-align:center;">
                <div style="font-size:2rem;margin-bottom:16px;">✅</div>
                <h2 style="font-size:1.3rem;font-weight:900;text-transform:uppercase;margin-bottom:8px;">Briefing Recebido!</h2>
                <p style="font-size:0.88rem;color:#888;line-height:1.7;margin-bottom:24px;">
                  Olá, ${contact.name}! Recebemos seu briefing sobre <strong style="color:#F5F3EF;">${serviceLabel}</strong>. 
                  Nossa equipe está analisando suas informações e em breve entraremos em contato com uma proposta personalizada.
                </p>
                <div style="background:#080808;border:1px solid #2E2E2E;border-radius:3px;padding:14px;margin-bottom:20px;display:inline-block;">
                  <div style="font-size:0.62rem;letter-spacing:0.15em;text-transform:uppercase;color:#888;margin-bottom:4px;">Seu Protocolo</div>
                  <div style="font-weight:700;font-family:monospace;font-size:1.1rem;letter-spacing:0.15em;">${protocol}</div>
                </div>
                <p style="font-size:0.82rem;color:#aaa;line-height:1.7;margin-bottom:20px;">
                  Use seu protocolo para acompanhar o status da proposta em tempo real.
                </p>
                <a href="https://propostas.jottahub.com.br/status" style="display:block;background:#E8321A;color:#F5F3EF;text-align:center;padding:13px 20px;border-radius:2px;font-weight:800;font-size:0.82rem;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;margin-bottom:20px;">
                  Acompanhar minha proposta →
                </a>
                <p style="font-size:0.75rem;color:#444;line-height:1.6;">
                  Ou acesse: <a href="https://propostas.jottahub.com.br/status" style="color:#E8321A;">propostas.jottahub.com.br/status</a><br/>
                  Dúvidas? WhatsApp: <a href="https://wa.me/5551993009391" style="color:#E8321A;">51 99300-9391</a>
                </p>
              </div>
            </div>
            <p style="font-size:0.65rem;color:#333;text-align:center;margin-top:20px;">JOTTA HUB — Porto Alegre, RS 🇧🇷</p>
          </div>
        `,
      }),
    })

    return NextResponse.json({ success: true, protocol, proposalId: savedProposal.id })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
