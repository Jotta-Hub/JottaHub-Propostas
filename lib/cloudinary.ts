// Upload direto do navegador pro Cloudinary (unsigned preset).
// Não passa pelo backend — aguenta arquivos grandes e o Cloudinary otimiza
// e serve por CDN. Precisa das env NEXT_PUBLIC_CLOUDINARY_* configuradas.

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

export async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUD || !PRESET) throw new Error('Cloudinary não configurado.')
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', PRESET)
  // 'auto' detecta imagem ou vídeo automaticamente
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/auto/upload`, { method: 'POST', body: form })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.secure_url) throw new Error(data?.error?.message || 'Falha no upload.')
  return data.secure_url as string
}
