'use client'

import { useState, useRef } from 'react'

// Barra de anexos pra geração por IA: gravar voz (Web Speech), anexar áudio
// (transcrição via Groq /api/transcribe) e anexar prints (Claude lê via visão).
// images/setImages ficam no pai (vão na chamada à IA). onText recebe transcrições.

export type ImgAttach = { data: string; mime: string; name: string }

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).replace(/^data:[^;]+;base64,/, ''))
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export default function AttachmentBar({ images, setImages, onText, disabled }: {
  images: ImgAttach[]
  setImages: React.Dispatch<React.SetStateAction<ImgAttach[]>>
  onText: (t: string) => void
  disabled?: boolean
}) {
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [err, setErr] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null)

  async function handleImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''; setErr('')
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue
      if (f.size > 5 * 1024 * 1024) { setErr('Cada print precisa ter no máximo 5MB.'); continue }
      const data = await fileToBase64(f)
      setImages(prev => [...prev, { data, mime: f.type, name: f.name }])
    }
  }
  const removeImage = (i: number) => setImages(prev => prev.filter((_, idx) => idx !== i))

  async function handleAudioFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    if (file.size > 25 * 1024 * 1024) { setErr('Áudio muito grande (máx. ~25MB).'); return }
    setTranscribing(true); setErr('')
    try {
      const audio = await fileToBase64(file)
      const res = await fetch('/api/transcribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio, mime: file.type, filename: file.name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao transcrever.')
      onText(data.text)
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Erro ao transcrever o áudio.') }
    setTranscribing(false)
  }

  function toggleRecord() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setErr('Seu navegador não suporta gravação por voz. Use o Chrome ou anexe um arquivo de áudio.'); return }
    if (recording) { recogRef.current?.stop(); return }
    const rec = new SR()
    rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (ev: any) => {
      let t = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) t += ev.results[i][0].transcript
      if (t.trim()) onText(t.trim())
    }
    rec.onerror = () => setRecording(false)
    rec.onend = () => setRecording(false)
    recogRef.current = rec; rec.start(); setRecording(true); setErr('')
  }

  const btn = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.72rem',
    fontFamily: 'var(--fd)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
    padding: '7px 12px', borderRadius: 2, cursor: disabled ? 'not-allowed' : 'pointer',
    border: `1px solid ${active ? 'var(--red)' : 'var(--gray3)'}`,
    background: active ? 'rgba(134,54,242,0.15)' : 'var(--gray2)',
    color: active ? 'var(--purple-bright)' : 'var(--mid)',
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={toggleRecord} disabled={disabled || transcribing} style={btn(recording)}>
          {recording ? '● Gravando — parar' : '🎤 Gravar voz'}
        </button>
        <label style={{ ...btn(false), cursor: transcribing ? 'wait' : 'pointer', color: transcribing ? 'var(--purple-bright)' : 'var(--mid)' }}>
          {transcribing ? '⏳ Transcrevendo…' : '🎧 Anexar áudio'}
          <input type="file" accept="audio/*" onChange={handleAudioFile} disabled={transcribing || disabled} style={{ display: 'none' }} />
        </label>
        <label style={btn(false)}>
          🖼️ Anexar prints
          <input type="file" accept="image/*" multiple onChange={handleImages} disabled={disabled} style={{ display: 'none' }} />
        </label>
      </div>
      {err && <div style={{ fontSize: '0.72rem', color: '#ff6b6b', marginTop: 6 }}>⚠ {err}</div>}
      {images.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {images.map((im, i) => (
            <div key={i} style={{ position: 'relative', width: 60, height: 60, borderRadius: 3, overflow: 'hidden', border: '1px solid var(--gray3)', flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:${im.mime};base64,${im.data}`} alt={im.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button type="button" onClick={() => removeImage(i)} title="Remover" style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.58rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
