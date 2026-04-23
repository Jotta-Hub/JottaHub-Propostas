import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

function calcTotal(services: { value: number }[]) {
  return (services || []).reduce((s, sv) => s + (sv.value || 0), 0)
}

function gerarObjetoContrato(proposal: {
  title?: string
  objective?: string
  services?: { name: string; desc: string; value: number }[]
}): string {
  const titulo = proposal.title || 'serviços especificados nesta proposta'
  const servicosNomes = (proposal.services || [])
    .filter(s => s.name?.trim())
    .map(s => s.name.trim())

  let texto = `O presente contrato tem por objeto a prestação de serviços denominados <strong style="color:#F5F3EF;">${titulo}</strong>`

  if (servicosNomes.length > 0) {
    const lista = servicosNomes.length === 1
      ? servicosNomes[0]
      : servicosNomes.slice(0, -1).join(', ') + ' e ' + servicosNomes[servicosNomes.length - 1]
    texto += `, compreendendo: ${lista}`
  }

  texto += ', conforme escopo detalhado na proposta comercial aceita pelas partes, que integra o presente instrumento independentemente de transcrição.'

  if (proposal.objective) {
    texto += `<br><br>O objetivo central do projeto é: ${proposal.objective}`
  }

  return texto
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const proposalId = searchParams.get('id')

    if (!proposalId) {
      return NextResponse.json({ error: 'ID da proposta não informado' }, { status: 400 })
    }

    const { data: proposal, error: propError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single()

    if (propError || !proposal) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 })
    }

    const { data: signatures } = await supabase
      .from('signatures')
      .select('*')
      .eq('proposal_id', proposalId)
      .eq('status', 'confirmed')
      .order('confirmed_at', { ascending: true })

    const clientSig = signatures?.find(s => s.signer_role === 'client' || s.signer_role !== 'contractor')
    const adminSig = signatures?.find(s => s.signer_role === 'contractor')
    const services = proposal.services || []
    const total = calcTotal(services)
    const objetoContrato = gerarObjetoContrato(proposal)

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Contrato Assinado — ${proposal.client}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    background: #080808;
    color: #F5F3EF;
    padding: 48px 40px;
    max-width: 760px;
    margin: 0 auto;
    font-size: 13px;
    line-height: 1.6;
  }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 1px solid #1C1C1C; }
  .logo { font-weight: 900; font-size: 1.4rem; letter-spacing: -0.02em; text-transform: uppercase; }
  .logo span { color: #E8321A; }
  .doc-badge { background: rgba(232,50,26,0.1); border: 1px solid rgba(232,50,26,0.3); color: #E8321A; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; padding: 6px 12px; border-radius: 2px; }
  .title-block { margin-bottom: 36px; }
  .doc-type { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #888; margin-bottom: 8px; }
  h1 { font-size: 1.8rem; font-weight: 900; text-transform: uppercase; line-height: 1.1; margin-bottom: 8px; }
  h1 span { color: #E8321A; }
  .subtitle { color: #888; font-size: 0.82rem; }
  .section { margin-bottom: 24px; padding: 20px; background: #111; border: 1px solid #1C1C1C; border-radius: 3px; }
  .section-label { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #888; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #1C1C1C; }
  .row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #1A1A1A; font-size: 0.78rem; }
  .row:last-child { border-bottom: none; }
  .row-key { color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.68rem; flex-shrink: 0; margin-right: 16px; }
  .row-val { text-align: right; }
  .services-table { width: 100%; border-collapse: collapse; }
  .services-table th { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #888; padding: 8px 0; border-bottom: 1px solid #1C1C1C; text-align: left; }
  .services-table th:last-child { text-align: right; }
  .services-table td { padding: 10px 0; border-bottom: 1px solid #1A1A1A; font-size: 0.78rem; }
  .services-table td:last-child { text-align: right; }
  .services-table tr:last-child td { border-bottom: none; }
  .total-row { margin-top: 12px; padding-top: 12px; border-top: 1px solid #2E2E2E; display: flex; justify-content: space-between; }
  .total-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #888; }
  .total-value { font-size: 1.1rem; font-weight: 900; color: #E8321A; }
  .clausulas-title { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #888; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid #1C1C1C; }
  .clausula { margin-bottom: 18px; }
  .clausula-num { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #E8321A; margin-bottom: 4px; }
  .clausula-titulo { font-weight: 700; font-size: 0.82rem; margin-bottom: 6px; }
  .clausula-texto { font-size: 0.78rem; color: rgba(245,243,239,0.75); line-height: 1.7; }
  .clausula-texto p { margin-bottom: 4px; }
  .sigs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .sig-box { background: #111; border: 1px solid #1C1C1C; border-radius: 3px; padding: 18px; }
  .sig-role { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #E8321A; margin-bottom: 12px; }
  .sig-name { font-weight: 700; font-size: 0.88rem; margin-bottom: 6px; }
  .sig-detail { font-size: 0.72rem; color: #888; margin-bottom: 3px; }
  .valid-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); color: #22c55e; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 10px; border-radius: 2px; margin-top: 10px; }
  .hash-block { background: #0A0A0A; border: 1px solid #1C1C1C; border-radius: 3px; padding: 14px 16px; margin-bottom: 24px; }
  .hash-label { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #888; margin-bottom: 6px; }
  .hash-value { font-size: 0.7rem; color: #555; word-break: break-all; font-family: monospace; }
  .law-note { text-align: center; font-size: 0.7rem; color: #555; margin-bottom: 24px; padding: 12px; border: 1px solid #1A1A1A; border-radius: 2px; }
  .law-note strong { color: #888; }
  .footer { padding-top: 20px; border-top: 1px solid #1C1C1C; display: flex; justify-content: space-between; align-items: center; font-size: 0.68rem; color: #444; }
</style>
</head>
<body>

<div class="header">
  <div class="logo">Jotta<span>▶</span>Hub</div>
  <div class="doc-badge">✅ Contrato Assinado</div>
</div>

<div class="title-block">
  <div class="doc-type">Contrato de Prestação de Serviços — Documento Final</div>
  <h1>${proposal.client}<br><span>${proposal.title || 'Projeto'}</span></h1>
  <div class="subtitle">Emitido em ${fmtDate(proposal.created_at)}</div>
</div>

<div class="section">
  <div class="section-label">Partes do Contrato</div>
  <div class="row">
    <span class="row-key">Contratada</span>
    <span class="row-val">JOTTA HUB — Jorge Rennan do Amaral Viegas<br><span style="color:#888;font-size:0.72rem;">CPF 016.332.740-80 — Porto Alegre, RS</span></span>
  </div>
  <div class="row">
    <span class="row-key">Contratante</span>
    <span class="row-val">${proposal.client}${proposal.contact ? `<br><span style="color:#888;font-size:0.72rem;">${proposal.contact}</span>` : ''}</span>
  </div>
  <div class="row">
    <span class="row-key">Projeto</span>
    <span class="row-val">${proposal.title || '—'}</span>
  </div>
  <div class="row">
    <span class="row-key">Data de Emissão</span>
    <span class="row-val">${fmtDate(proposal.created_at)}</span>
  </div>
  ${total > 0 ? `<div class="row"><span class="row-key">Valor Total</span><span class="row-val" style="color:#E8321A;font-weight:700;">${fmtBRL(total)}</span></div>` : ''}
</div>

${services.length > 0 ? `
<div class="section">
  <div class="section-label">Escopo de Serviços</div>
  <table class="services-table">
    <thead>
      <tr><th>Serviço</th><th>Descrição</th><th>Valor</th></tr>
    </thead>
    <tbody>
      ${services.map((s: { name: string; desc: string; value: number }) => `
        <tr>
          <td style="font-weight:600;">${s.name}</td>
          <td style="color:#888;">${s.desc || '—'}</td>
          <td>${s.value > 0 ? fmtBRL(s.value) : '—'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ${total > 0 ? `
  <div class="total-row">
    <span class="total-label">Investimento Total</span>
    <span class="total-value">${fmtBRL(total)}</span>
  </div>` : ''}
</div>
` : ''}

<div class="section">
  <div class="clausulas-title">Cláusulas e Condições</div>

  <div class="clausula">
    <div class="clausula-num">Cláusula 1</div>
    <div class="clausula-titulo">Do Objeto</div>
    <div class="clausula-texto">${objetoContrato}</div>
  </div>

  <div class="clausula">
    <div class="clausula-num">Cláusula 2</div>
    <div class="clausula-titulo">Do Prazo</div>
    <div class="clausula-texto">O prazo de execução dos serviços será aquele estabelecido no cronograma constante da proposta comercial aceita pelas partes. O prazo poderá ser ajustado mediante acordo mútuo por escrito, especialmente em casos de atraso na entrega de materiais, informações ou aprovações por parte da Contratante.</div>
  </div>

  <div class="clausula">
    <div class="clausula-num">Cláusula 3</div>
    <div class="clausula-titulo">Do Pagamento</div>
    <div class="clausula-texto">
      O valor total dos serviços será pago em duas parcelas iguais de 50% (cinquenta por cento) cada: a primeira na aprovação e assinatura do presente contrato, e a segunda na entrega final dos materiais após aprovação da Contratante.
      <p style="margin-top:6px;">O pagamento será realizado via PIX ou transferência bancária, com emissão de nota fiscal. O não pagamento de qualquer parcela no prazo acordado suspende automaticamente a execução dos serviços até a regularização.</p>
    </div>
  </div>

  <div class="clausula">
    <div class="clausula-num">Cláusula 4</div>
    <div class="clausula-titulo">Das Revisões</div>
    <div class="clausula-texto">Estão incluídas no escopo até 3 (três) rodadas de revisão por entregável, desde que solicitadas dentro do prazo de 5 (cinco) dias úteis após cada entrega parcial. Revisões adicionais ou alterações de escopo poderão ser realizadas mediante orçamento complementar a ser acordado entre as partes.</div>
  </div>

  <div class="clausula">
    <div class="clausula-num">Cláusula 5</div>
    <div class="clausula-titulo">Da Propriedade Intelectual</div>
    <div class="clausula-texto">
      Após a quitação integral do contrato, os direitos patrimoniais sobre os materiais produzidos são transferidos à Contratante. A Contratada reserva para si o direito de utilizar os materiais produzidos para fins de portfólio, divulgação institucional e demonstração de capacidade técnica, salvo quando houver acordo expresso de sigilo firmado entre as partes.
      <p style="margin-top:6px;">Materiais de natureza sigilosa, assim definidos por acordo entre as partes antes do início da execução, não poderão ser divulgados pela Contratada sem autorização prévia e por escrito da Contratante.</p>
    </div>
  </div>

  <div class="clausula">
    <div class="clausula-num">Cláusula 6</div>
    <div class="clausula-titulo">Da Rescisão</div>
    <div class="clausula-texto">
      Este contrato poderá ser rescindido por qualquer das partes mediante comunicação por escrito. Em caso de rescisão pela Contratante com antecedência mínima de 15 (quinze) dias corridos antes da data de início da execução dos serviços, os valores eventualmente pagos serão devolvidos integralmente.
      <p style="margin-top:6px;">Rescisão comunicada em prazo inferior a 15 (quinze) dias, ou após o início da execução, implicará na retenção dos valores pagos a título de reserva de data e cobertura dos custos já incorridos, sem prejuízo de cobrança proporcional pelos serviços já executados.</p>
      <p style="margin-top:6px;">Em caso de rescisão por inadimplemento da Contratante, todos os valores devidos se tornam imediatamente exigíveis.</p>
    </div>
  </div>

  <div class="clausula">
    <div class="clausula-num">Cláusula 7</div>
    <div class="clausula-titulo">Das Obrigações das Partes</div>
    <div class="clausula-texto">
      <p><strong style="color:#F5F3EF;">Contratada:</strong> executar os serviços com qualidade e dentro do prazo acordado; manter sigilo sobre informações confidenciais da Contratante; comunicar eventuais impedimentos com antecedência.</p>
      <p style="margin-top:6px;"><strong style="color:#F5F3EF;">Contratante:</strong> fornecer materiais, informações e aprovações necessárias nos prazos solicitados; efetuar os pagamentos nas datas acordadas; designar um responsável para aprovações e feedback.</p>
    </div>
  </div>

  <div class="clausula">
    <div class="clausula-num">Cláusula 8</div>
    <div class="clausula-titulo">Das Disposições Gerais</div>
    <div class="clausula-texto">Este instrumento representa o acordo integral entre as partes, substituindo quaisquer negociações ou entendimentos anteriores. Alterações somente terão validade se formalizadas por escrito e aceitas por ambas as partes. A tolerância de uma das partes quanto ao descumprimento de qualquer obrigação não implica novação ou renúncia ao direito de exigi-la futuramente.</div>
  </div>

  <div class="clausula">
    <div class="clausula-num">Cláusula 9</div>
    <div class="clausula-titulo">Do Foro</div>
    <div class="clausula-texto">As partes elegem o foro da Comarca de Porto Alegre, Estado do Rio Grande do Sul, para dirimir quaisquer dúvidas ou litígios decorrentes do presente contrato, renunciando a qualquer outro, por mais privilegiado que seja.</div>
  </div>
</div>

<div class="law-note">
  <strong>Validade Jurídica — Lei 14.063/2020</strong><br>
  Este documento possui validade jurídica como assinatura eletrônica simples, com identificação das partes, registro de IP, data e hora de cada assinatura.
</div>

<div class="sigs-grid">
  ${clientSig ? `
  <div class="sig-box">
    <div class="sig-role">Contratante</div>
    <div class="sig-name">${clientSig.signer_name}</div>
    <div class="sig-detail">CPF: ${clientSig.signer_cpf}</div>
    <div class="sig-detail">E-mail: ${clientSig.signer_email}</div>
    <div class="sig-detail">IP: ${clientSig.signer_ip}</div>
    <div class="sig-detail">Data: ${fmtDate(clientSig.confirmed_at)}</div>
    <div class="valid-badge">✓ Assinado</div>
  </div>` : '<div class="sig-box"><div class="sig-role">Contratante</div><div style="color:#555;font-size:0.78rem;">Aguardando assinatura</div></div>'}

  ${adminSig ? `
  <div class="sig-box">
    <div class="sig-role">Contratada — JOTTA HUB</div>
    <div class="sig-name">${adminSig.signer_name}</div>
    <div class="sig-detail">CPF: ${adminSig.signer_cpf}</div>
    <div class="sig-detail">E-mail: ${adminSig.signer_email}</div>
    <div class="sig-detail">Data: ${fmtDate(adminSig.confirmed_at)}</div>
    <div class="valid-badge">✓ Contra-assinado</div>
  </div>` : '<div class="sig-box"><div class="sig-role">Contratada — JOTTA HUB</div><div style="color:#555;font-size:0.78rem;">Aguardando assinatura</div></div>'}
</div>

${clientSig?.proposal_hash ? `
<div class="hash-block">
  <div class="hash-label">Hash de Integridade do Documento (SHA-256)</div>
  <div class="hash-value">${clientSig.proposal_hash}</div>
</div>` : ''}

<div class="footer">
  <span>JOTTA HUB — Porto Alegre, RS 🇧🇷</span>
  <span>propostas.jottahub.com.br</span>
  <span>© 2026</span>
</div>

</body>
</html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
