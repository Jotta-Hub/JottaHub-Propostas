import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: NextRequest) {
  try {
    const { email, proposal_id, signer_name } = await req.json()

    if (!email || !proposal_id) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const code = generateCode()
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min

    // Salva o código temporário no Supabase
    await supabase.from('signature_codes').upsert({
      proposal_id,
      email,
      code,
      expires_at,
    }, { onConflict: 'proposal_id,email' })

    // Envia o e-mail via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'JOTTA HUB <propostas@jottahub.com.br>',
        to: email,
        subject: 'Código de verificação — Proposta JOTTA HUB',
        html: `
          <!DOCTYPE html>
          <html>
          <body style="background:#080808;color:#F5F3EF;font-family:'Helvetica Neue',sans-serif;margin:0;padding:0;">
            <div style="max-width:480px;margin:40px auto;padding:0 20px;">
              <div style="margin-bottom:32px;">
                <span style="font-weight:900;font-size:1.3rem;letter-spacing:-0.01em;text-transform:uppercase;">JOTTA HUB</span>
                <span style="display:inline-block;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:11px solid #F5F3EF;margin:0 2px;position:relative;top:-2px;"></span>
                <span style="width:5px;height:5px;background:#E8321A;border-radius:50%;display:inline-block;position:relative;top:-1px;margin-left:2px;"></span>
              </div>
              <div style="background:#111;border:1px solid #1C1C1C;border-radius:4px;overflow:hidden;">
                <div style="background:#E8321A;padding:3px 0;"></div>
                <div style="padding:32px;">
                  <p style="font-size:0.85rem;color:#888;text-transform:uppercase;letter-spacing:0.2em;font-weight:700;margin-bottom:8px;">Verificação de Assinatura</p>
                  <h1 style="font-size:1.4rem;font-weight:900;text-transform:uppercase;margin-bottom:16px;">Olá, ${signer_name || 'Cliente'}!</h1>
                  <p style="font-size:0.95rem;color:rgba(245,243,239,0.7);line-height:1.7;margin-bottom:32px;">Use o código abaixo para confirmar sua assinatura na proposta da JOTTA HUB. O código é válido por <strong style="color:#F5F3EF;">10 minutos</strong>.</p>
                  <div style="background:#080808;border:1px solid #2E2E2E;border-radius:3px;padding:24px;text-align:center;margin-bottom:32px;">
                    <span style="font-size:3rem;font-weight:900;letter-spacing:0.3em;color:#F5F3EF;">${code}</span>
                  </div>
                  <p style="font-size:0.78rem;color:#555;line-height:1.6;">Se você não solicitou esta assinatura, ignore este e-mail. Nenhuma ação será tomada.</p>
                </div>
              </div>
              <p style="font-size:0.68rem;color:#333;text-align:center;margin-top:24px;">JOTTA HUB — POA | RS 🇧🇷 — propostas@jottahub.com.br</p>
            </div>
          </body>
          </html>
        `,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return NextResponse.json({ error: 'Erro ao enviar e-mail' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
