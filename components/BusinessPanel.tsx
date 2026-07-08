'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadToCloudinary } from '@/lib/cloudinary'
import HeroConfig from './HeroConfig'

type Business = {
  legal_name: string; doc: string; city: string; uf: string; foro: string
  signer_name: string; signer_cpf: string; signer_email: string
  whatsapp: string; email: string; site: string; instagram: string; logo_url: string
  pix_key: string; bank: string; agency: string; account: string
  hero_mode: string; hero_media: string; hero_format: string
}

const EMPTY: Business = {
  legal_name: '', doc: '', city: '', uf: '', foro: '',
  signer_name: '', signer_cpf: '', signer_email: '',
  whatsapp: '', email: '', site: '', instagram: '', logo_url: '',
  pix_key: '', bank: '', agency: '', account: '',
  hero_mode: 'clean', hero_media: '', hero_format: 'medium',
}

export default function BusinessPanel() {
  const [b, setB] = useState<Business>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')

  const set = (k: keyof Business, v: string) => setB(x => ({ ...x, [k]: v }))

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('business').select('*').eq('id', 1).maybeSingle()
      if (data) setB({ ...EMPTY, ...data })
      setLoading(false)
    })()
  }, [])

  async function save() {
    setSaving(true); setMsg('')
    const { error } = await supabase.from('business').upsert({ id: 1, ...b, updated_at: new Date().toISOString() })
    setMsg(error ? `Erro: ${error.message}` : 'Negócio salvo! Já vale no contrato e na proposta.')
    setSaving(false)
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setUploading(true); setMsg('')
    try {
      const url = await uploadToCloudinary(file)
      set('logo_url', url)
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Falha no upload.') }
    setUploading(false)
  }

  const label: React.CSSProperties = { fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: 6, display: 'block' }
  const input: React.CSSProperties = { background: 'var(--black)', border: '1px solid var(--gray3)', color: 'var(--white)', fontFamily: 'var(--fb)', fontSize: '0.9rem', padding: '10px 12px', borderRadius: 2, outline: 'none', width: '100%' }
  const secTitle: React.CSSProperties = { fontFamily: 'var(--fd)', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--purple-bright)', margin: '22px 0 14px', display: 'flex', alignItems: 'center', gap: 10 }
  const F = (k: keyof Business, lb: string, ph = '', full = false, style: React.CSSProperties = {}) => (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <label style={label}>{lb}</label>
      <input style={{ ...input, ...style }} placeholder={ph} value={b[k]} onChange={e => set(k, e.target.value)} />
    </div>
  )

  if (loading) return <div className="proposals-section"><div style={{ color: 'var(--mid)', padding: 20 }}>Carregando…</div></div>

  return (
    <div className="proposals-section">
      <div className="section-head">
        <div className="section-title-row"><span className="section-title">Meu Negócio</span></div>
      </div>
      <div style={{ maxWidth: 760, background: 'var(--gray)', border: '1px solid var(--gray2)', borderRadius: 4, padding: 24 }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--mid)', marginBottom: 4 }}>Esses dados entram automaticamente no contrato e na proposta.</div>

        <div style={secTitle}><span className="bolt" />Dados jurídicos</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {F('legal_name', 'Razão social / Nome', 'JOTTA HUB — Jorge Rennan do Amaral Viegas', true)}
          {F('doc', 'CNPJ ou CPF', '000.000.000-00')}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            {F('city', 'Cidade', 'Porto Alegre')}
            {F('uf', 'UF', 'RS')}
          </div>
          {F('foro', 'Foro (comarca)', 'Porto Alegre, RS', true)}
        </div>

        <div style={secTitle}><span className="bolt" />Responsável / Assinante</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {F('signer_name', 'Nome de quem assina', 'Jorge Rennan do Amaral Viegas', true)}
          {F('signer_cpf', 'CPF do assinante', '000.000.000-00')}
          {F('signer_email', 'E-mail do assinante', 'voce@empresa.com')}
        </div>

        <div style={secTitle}><span className="bolt" />Contato & Marca</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {F('whatsapp', 'WhatsApp', '51 99999-9999')}
          {F('email', 'E-mail', 'contato@empresa.com')}
          {F('site', 'Site', 'empresa.com.br')}
          {F('instagram', 'Instagram', '@empresa')}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 54, height: 54, borderRadius: 3, background: 'var(--gray2)', border: '1px solid var(--gray3)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {b.logo_url ? <img src={b.logo_url} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ opacity: 0.3 }}>🏢</span>}
              </div>
              <label style={{ ...input, width: 'auto', cursor: uploading ? 'wait' : 'pointer', color: 'var(--mid)' }}>
                {uploading ? 'Enviando…' : 'Enviar logo'}
                <input type="file" accept="image/*" onChange={handleLogo} disabled={uploading} style={{ display: 'none' }} />
              </label>
              {b.logo_url && <button onClick={() => set('logo_url', '')} style={{ fontSize: '0.7rem', color: '#ff6b6b', background: 'transparent', border: '1px solid var(--gray3)', borderRadius: 2, padding: '6px 10px', cursor: 'pointer' }}>Remover</button>}
            </div>
          </div>
        </div>

        <div style={secTitle}><span className="bolt" />Dados de pagamento</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {F('pix_key', 'Chave PIX', 'CPF, e-mail, telefone ou aleatória', true)}
          {F('bank', 'Banco', 'Ex: Nubank')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {F('agency', 'Agência', '0001')}
            {F('account', 'Conta', '00000-0')}
          </div>
        </div>

        <div style={secTitle}><span className="bolt" />Capa padrão das propostas</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--mid)', marginBottom: 12 }}>Essa capa aparece em toda proposta que estiver no modo &quot;Capa padrão&quot;. Em cada proposta você pode trocar ou desligar.</div>
        <HeroConfig
          mode={(b.hero_mode as 'clean' | 'photo' | 'video') || 'clean'}
          setMode={m => set('hero_mode', m)}
          media={b.hero_media}
          setMedia={u => set('hero_media', u)}
          format={(b.hero_format as 'compact' | 'medium' | 'cinema' | 'full') || 'medium'}
          setFormat={f => set('hero_format', f)}
        />

        {msg && <div style={{ marginTop: 16, fontSize: '0.82rem', color: msg.startsWith('Erro') ? '#ff6b6b' : 'var(--gold)' }}>{msg}</div>}
        <button className="btn-red" onClick={save} disabled={saving} style={{ marginTop: 18, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Salvando…' : 'Salvar negócio'}
        </button>
      </div>
    </div>
  )
}
