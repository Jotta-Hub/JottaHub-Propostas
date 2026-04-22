import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { proposal_id, email, code, signer_name, signer_cpf } = await req.json()

    if (!proposal_id || !email || !code || !signer_name || !signer_cpf) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    // Verifica o código
    const { data: codeRecord } = await supabase
      .from('signature_codes')
      .select('*')
      .eq('proposal_id', proposal_id)
      .eq('email', email)
      .eq('code', code)
      .single()

    if (!codeRecord) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
    }

    // Verifica expiração
    if (new Date(codeRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Código expirado' }, { status: 400 })
    }

    // Busca a proposta pra gerar o hash
    const { data: proposal } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposal_id)
      .single()

    const proposalHash = createHash('sha256')
      .update(JSON.stringify(proposal))
      .digest('hex')

    // Pega o IP do cliente
    const ip = req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Salva a assinatura
    const { error: sigError } = await supabase.from('signatures').insert({
      proposal_id,
      signer_name,
      signer_email: email,
      signer_cpf,
      signer_ip: ip,
      signer_agent: userAgent,
      proposal_hash: proposalHash,
      confirmed_at: new Date().toISOString(),
      status: 'confirmed',
    })

    if (sigError) throw sigError

    // Atualiza status da proposta
    await supabase
      .from('proposals')
      .update({ status: 'approved' })
      .eq('id', proposal_id)

    // Remove o código usado
    await supabase
      .from('signature_codes')
      .delete()
      .eq('proposal_id', proposal_id)
      .eq('email', email)

    // Envia e-mail de confirmação pro signatário
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'JOTTA HUB <propostas@jottahub.com.br>',
        to: email,
        subject: 'Proposta assinada com sucesso — JOTTA HUB',
        html: `
          <!DOCTYPE html>
          <html>
          <body style="background:#080808;color:#F5F3EF;font-family:'Helvetica Neue',sans-serif;margin:0;padding:0;">
            <div style="max-width:480px;margin:40px auto;padding:0 20px;">
              <div style="margin-bottom:32px;">
                <span style="font-weight:900;font-size:1.3rem;letter-spacing:-0.01em;text-transform:uppercase;">JOTTA HUB</span>
              </div>
              <div style="background:#111;border:1px solid #1C1C1C;border-radius:4px;overflow:hidden;">
                <div style="background:#22c55e;padding:3px 0;"></div>
                <div style="padding:32px;">
                  <p style="font-size:2rem;text-align:center;margin-bottom:16px;">✅</p>
                  <h1 style="font-size:1.4rem;font-weight:900;text-transform:uppercase;text-align:center;margin-bottom:16px;">Proposta Assinada!</h1>
                  <p style="font-size:0.95rem;color:rgba(245,243,239,0.7);line-height:1.7;text-align:center;margin-bottom:32px;">Sua assinatura foi registrada com validade jurídica pela Lei 14.063/2020.</p>
                  <div style="background:#080808;border:1px solid #2E2E2E;border-radius:3px;padding:20px;">
                    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1C1C1C;font-size:0.78rem;">
                      <span style="color:#888;text-transform:uppercase;letter-spacing:0.1em;">Signatário</span>
                      <span>${signer_name}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1C1C1C;font-size:0.78rem;">
                      <span style="color:#888;text-transform:uppercase;letter-spacing:0.1em;">CPF</span>
                      <span>${signer_cpf}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1C1C1C;font-size:0.78rem;">
                      <span style="color:#888;text-transform:uppercase;letter-spacing:0.1em;">Data</span>
                      <span>${new Date().toLocaleString('pt-BR')}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:0.78rem;">
                      <span style="color:#888;text-transform:uppercase;letter-spacing:0.1em;">Hash</span>
                      <span style="font-size:0.65rem;color:#555;">${proposalHash.slice(0, 16)}...</span>
                    </div>
                  </div>
                </div>
              </div>
              <p style="font-size:0.68rem;color:#333;text-align:center;margin-top:24px;">JOTTA HUB — POA | RS 🇧🇷</p>
            </div>
          </body>
          </html>
        `,
      }),
    })

    // Notifica o Rennan
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'JOTTA HUB Sistema <propostas@jottahub.com.br>',
        to: 'rennan@jottahub.com.br',
        subject: `✅ Proposta assinada por ${signer_name}`,
        html: `<p style="font-family:sans-serif;">A proposta foi assinada por <strong>${signer_name}</strong> (${email}) às ${new Date().toLocaleString('pt-BR')}.</p><p>CPF: ${signer_cpf}</p>`,
      }),
    })

    return NextResponse.json({
      success: true,
      hash: proposalHash,
      signed_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
