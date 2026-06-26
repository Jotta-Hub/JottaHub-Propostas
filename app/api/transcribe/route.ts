import { NextRequest, NextResponse } from 'next/server'

// Transcrição de áudio via Groq Whisper (whisper-large-v3-turbo).
// Recebe o áudio em base64 no body JSON e devolve o texto. Chave no servidor.

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY não configurada.' }, { status: 500 })

  const body = await req.json().catch(() => null)
  const b64 = String(body?.audio || '').replace(/^data:[^;]+;base64,/, '')
  const mime = String(body?.mime || 'audio/webm')
  const filename = String(body?.filename || 'audio.webm')
  if (!b64) return NextResponse.json({ error: 'Áudio ausente.' }, { status: 400 })

  const buf = Buffer.from(b64, 'base64')
  if (buf.length > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'Áudio muito grande (máx. ~25MB).' }, { status: 413 })
  }

  try {
    const form = new FormData()
    form.append('file', new Blob([buf], { type: mime }), filename)
    form.append('model', 'whisper-large-v3-turbo')
    form.append('language', 'pt')
    form.append('response_format', 'json')

    const up = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })
    const data = await up.json().catch(() => null)
    if (!up.ok) {
      return NextResponse.json({ error: data?.error?.message || `Falha na transcrição (HTTP ${up.status}).` }, { status: 500 })
    }
    return NextResponse.json({ text: (data?.text || '').trim() })
  } catch (err) {
    return NextResponse.json({ error: `Erro ao transcrever: ${err instanceof Error ? err.message : 'falha desconhecida'}.` }, { status: 500 })
  }
}
