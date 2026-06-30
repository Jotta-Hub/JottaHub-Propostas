import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { del } from '@vercel/blob'
import { NextResponse } from 'next/server'

// Upload de mídia do portfólio direto pro Vercel Blob (client upload).
// Aguenta arquivos grandes (vídeos) sem passar pelo limite das funções.

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/*', 'video/*'],
        addRandomSuffix: true,
        maximumSizeInBytes: 1024 * 1024 * 1024, // 1 GB
      }),
      onUploadCompleted: async () => { /* nada a fazer no servidor */ },
    })
    return NextResponse.json(json)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha no upload.' }, { status: 400 })
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const { url } = await request.json()
    if (url) await del(url)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao remover.' }, { status: 400 })
  }
}
