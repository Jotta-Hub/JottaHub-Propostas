'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { supabase, type Proposal } from '@/lib/supabase'
import { fmtBRL, fmtDate, addWorkdays, calcTotal, statusLabel, DEFAULT_STEPS, EMOJIS } from '@/lib/utils'
import BriefingGenerator from '@/components/BriefingGenerator'

export default function AdminPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: '', show: false })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoMode, setLogoMode] = useState<'original' | 'white'>('original')
  const [activeEmojiIdx, setActiveEmojiIdx] = useState<number | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const [form, setForm] = useState({
    client: '', contact: '', greeting: '', intro: '',
    title: '', objective: '', context: '',
    validity: 5, status: 'pending' as Proposal['status'],
  })
  const [pillars, setPillars] = useState<{ name: string; body: string }[]>([])
  const [steps, setSteps] = useState(DEFAULT_STEPS)
  const [deliverables, setDeliverables] = useState<{ icon: string; name: string; body: string }[]>([])
  const [services, setServices] = useState<{ name: string; desc: string; value: number }[]>([])
  const [timeline, setTimeline] = useState<{ phase: string; name: string; items: string }[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleLogout() {
    const supabaseBrowser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await supabaseBrowser.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  useEffect(() => { checkSession() }, [])

  async function checkSession() {
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { session } } = await supabaseClient.auth.getSession()
    if (!session) { router.push('/login'); return }
    fetchProposals()
  }

  async function fetchProposals() {
    setLoading(true)
    const { data } = await supabase.from('proposals').select('*').order('created_at', { ascending: false })
    setProposals(data || [])
    setLoading(false)
  }

  function showToast(msg: string) {
    setToast({ msg, show: true })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2600)
  }

  // Callback do BriefingGenerator — preenche todos os campos do formulário
  function handleBriefingGenerated(data: {
    client: string; contact: string; greeting: string; intro: string
    title: string; objective: string; context: string
    pillars: { name: string; body: string }[]
    steps: { title: string; desc: string }[]
    deliverables: { icon: string; name: string; body: string }[]
    services: { name: string; desc: string; value: number }[]
    timeline: { phase: string; name: string; items: string }[]
    validity: number; status: string
  }) {
    setForm({
      client: data.client || '',
      contact: data.contact || '',
      greeting: data.greeting || '',
      intro: data.intro || '',
      title: data.title || '',
      objective: data.objective || '',
      context: data.context || '',
      validity: data.validity || 5,
      status: (data.status as Proposal['status']) || 'pending',
    })
    setPillars(data.pillars || [])
    setSteps(data.steps?.length ? data.steps : DEFAULT_STEPS)
    setDeliverables(data.deliverables || [])
    setServices(data.services || [])
    setTimeline(data.timeline || [])
    showToast('Proposta preenchida com IA! Revise os campos.')
  }

  function openModal(p?: Proposal) {
    if (p) {
      setEditingId(p.id || null)
      setForm({ client: p.client, contact: p.contact || '', greeting: p.greeting || '', intro: p.intro || '', title: p.title || '', objective: p.objective || '', context: p.context || '', validity: p.validity || 5, status: p.status || 'pending' })
      setLogoPreview(p.logo_url || null)
      setLogoMode(p.logo_mode || 'original')
      setPillars(p.pillars || [])
      setSteps(p.steps?.length ? p.steps : DEFAULT_STEPS)
      setDeliverables(p.deliverables || [])
      setServices(p.services || [])
      setTimeline(p.timeline || [])
    } else {
      setEditingId(null)
      setForm({ client: '', contact: '', greeting: '', intro: '', title: '', objective: '', context: '', validity: 5, status: 'pending' })
      setLogoPreview(null)
      setLogoMode('original')
      setPillars([])
      setSteps(DEFAULT_STEPS)
      setDeliverables([])
      setServices([])
      setTimeline([])
    }
    setModalOpen(true)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()
    const path = `logos/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('proposal-assets').upload(path, file, { upsert: true })
    if (error) {
      const reader = new FileReader()
      reader.onload = ev => setLogoPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
      return
    }
    const { data } = supabase.storage.from('proposal-assets').getPublicUrl(path)
    setLogoPreview(data.publicUrl)
  }

  async function saveProposal() {
    if (!form.client.trim()) { alert('Informe o nome do cliente.'); return }
    setSaving(true)
    const payload: Proposal = {
      ...form,
      logo_url: logoPreview || undefined,
      logo_mode: logoMode,
      pillars, steps, deliverables, services, timeline,
    }
    if (editingId) {
      await supabase.from('proposals').update(payload).eq('id', editingId)
      showToast('Proposta atualizada!')
    } else {
      await supabase.from('proposals').insert(payload)
      showToast('Proposta criada!')
    }
    await fetchProposals()
    setModalOpen(false)
    setSaving(false)
  }

  async function deleteProposal(id: string) {
    if (!confirm('Excluir permanentemente esta proposta? Esta ação não pode ser desfeita.')) return
    await supabase.from('signature_codes').delete().eq('proposal_id', id)
    await supabase.from('signatures').delete().eq('proposal_id', id)
    const { error } = await supabase.from('proposals').delete().eq('id', id)
    if (error) {
      showToast('Erro ao excluir. Tente novamente.')
      console.error(error)
      return
    }
    showToast('Proposta excluída.')
    fetchProposals()
  }

  async function archiveProposal(id: string) {
    await supabase.from('proposals').update({ status: 'archived' }).eq('id', id)
    showToast('Proposta arquivada.')
    fetchProposals()
  }

  async function unarchiveProposal(id: string) {
    await supabase.from('proposals').update({ status: 'pending' }).eq('id', id)
    showToast('Proposta reativada como Rascunho.')
    fetchProposals()
  }

  async function copyLink(id: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/proposta/${id}`)
    showToast('Link copiado!')
  }

  async function updateStatus(id: string, status: Proposal['status']) {
    await supabase.from('proposals').update({ status }).eq('id', id)
    fetchProposals()
  }

  const activeProposals = proposals.filter(p => p.status !== 'archived')
  const archivedProposals = proposals.filter(p => p.status === 'archived')
  const total = activeProposals.length
  const sent = activeProposals.filter(p => p.status === 'sent').length
  const approved = activeProposals.filter(p => p.status === 'approved').length
  const volume = activeProposals.reduce((s, p) => s + calcTotal(p.services), 0)

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-dot" />
    </div>
  )

  return (
    <>
      <nav className="admin-nav">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="nav-logo">
            <span className="nl-t">Jott</span>
            <span className="nl-tri" />
            <span className="nl-t" style={{ marginLeft: 1 }}>Hub</span>
            <span className="nl-dot" style={{ marginLeft: 4 }} />
          </div>
          <span className="nav-badge">Propostas</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-sm ghost" onClick={handleLogout}>Sair</button>
          <button className="btn-sm red" onClick={() => openModal()}>+ Nova Proposta</button>
        </div>
      </nav>

      <div className="admin-wrap">
        <div className="admin-header">
          <div className="admin-header-inner">
            <div>
              <h1 className="admin-title">
                <span className="ghost">Propostas</span>
                <span className="red">Comerciais</span>
              </h1>
              <p className="admin-sub">Crie, gerencie e envie propostas personalizadas para cada cliente</p>
            </div>
            <button className="btn-sm red" style={{ fontSize: '.9rem', padding: '13px 26px' }} onClick={() => openModal()}>
              + Nova Proposta
            </button>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card"><div className="stat-n">{total}</div><div className="stat-l">Total</div></div>
          <div className="stat-card"><div className="stat-n"><span className="accent">{sent}</span></div><div className="stat-l">Enviadas</div></div>
          <div className="stat-card"><div className="stat-n">{approved}</div><div className="stat-l">Aprovadas</div></div>
          <div className="stat-card"><div className="stat-n">{total > 0 ? fmtBRL(volume) : 'R$ 0'}</div><div className="stat-l">Volume Total</div></div>
        </div>

        {/* PROPOSTAS ATIVAS */}
        <div className="proposals-section">
          <div className="section-head">
            <div className="section-title-row">
              <span className="section-title">Todas as Propostas</span>
              <span className="section-count">{total}</span>
            </div>
          </div>
          <div className="cards-grid">
            {total === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-title">Nenhuma proposta ainda</div>
                <div className="empty-sub">Clique em "Nova Proposta" para começar</div>
              </div>
            ) : activeProposals.map(p => {
              const tot = calcTotal(p.services)
              const validDate = p.created_at ? addWorkdays(p.created_at.slice(0, 10), p.validity || 5) : ''
              const initials = (p.client || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
              return (
                <div key={p.id} className="prop-card" onClick={() => window.open(`/proposta/${p.id}`, '_blank')}>
                  <div className="card-top">
                    <div className="card-logo">
                      {p.logo_url
                        ? <img src={p.logo_url} alt={p.client} />
                        : <span className="card-logo-initials">{initials}</span>
                      }
                    </div>
                    <div className="card-info">
                      <div className="card-client">{p.client}</div>
                      <div className="card-contact">{p.contact}</div>
                      <div className="card-project">{p.title || 'Sem título'}</div>
                    </div>
                    <span className={`badge ${p.status}`}>{statusLabel(p.status)}</span>
                  </div>
                  <div className="card-meta">
                    {tot > 0 && <><span className="card-value">{fmtBRL(tot)}</span><span className="card-sep" /></>}
                    <span className="card-validity">Válida até {fmtDate(validDate)}</span>
                  </div>
                  <div className="card-actions" onClick={e => e.stopPropagation()}>
                    <Link href={`/proposta/${p.id}`} target="_blank" className="action-btn view-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Ver</Link>
                    <button className="action-btn" onClick={() => copyLink(p.id!)}>Link</button>
                    <button className="action-btn" onClick={() => openModal(p)}>Editar</button>
                    {p.status === 'approved' && (
                      <button
                        className="action-btn"
                        style={{ color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }}
                        onClick={() => window.open(`/api/contract-pdf?id=${p.id}`, '_blank')}
                      >
                        Contrato
                      </button>
                    )}
                    <select
                      className="action-btn"
                      value={p.status}
                      onChange={e => updateStatus(p.id!, e.target.value as Proposal['status'])}
                      style={{ appearance: 'none', textAlign: 'center' }}
                    >
                      <option value="pending">Rascunho</option>
                      <option value="sent">Enviada</option>
                      <option value="approved">Aprovada</option>
                      <option value="expired">Expirada</option>
                    </select>
                    <button
                      className="action-btn"
                      style={{ color: '#888', borderColor: '#2E2E2E' }}
                      onClick={() => archiveProposal(p.id!)}
                    >
                      Arq.
                    </button>
                    <button className="action-btn del-btn" onClick={() => deleteProposal(p.id!)}>Del</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* PAINEL DE ARQUIVADAS */}
        {archivedProposals.length > 0 && (
          <div className="proposals-section" style={{ marginTop: 40 }}>
            <div
              className="section-head"
              onClick={() => setShowArchived(v => !v)}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              <div className="section-title-row">
                <span className="section-title" style={{ color: '#555' }}>
                  {showArchived ? '▾' : '▸'} Propostas Arquivadas
                </span>
                <span className="section-count" style={{ background: '#1C1C1C', color: '#555' }}>
                  {archivedProposals.length}
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#444', marginTop: 4 }}>
                Clique para {showArchived ? 'ocultar' : 'expandir'}
              </p>
            </div>
            {showArchived && (
              <div className="cards-grid" style={{ marginTop: 16 }}>
                {archivedProposals.map(p => {
                  const tot = calcTotal(p.services)
                  const initials = (p.client || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
                  return (
                    <div key={p.id} className="prop-card" style={{ opacity: 0.6 }} onClick={() => window.open(`/proposta/${p.id}`, '_blank')}>
                      <div className="card-top">
                        <div className="card-logo">
                          {p.logo_url
                            ? <img src={p.logo_url} alt={p.client} />
                            : <span className="card-logo-initials">{initials}</span>
                          }
                        </div>
                        <div className="card-info">
                          <div className="card-client">{p.client}</div>
                          <div className="card-contact">{p.contact}</div>
                          <div className="card-project">{p.title || 'Sem título'}</div>
                        </div>
                        <span className="badge" style={{ background: '#1C1C1C', color: '#555', borderColor: '#2E2E2E' }}>Arquivada</span>
                      </div>
                      <div className="card-meta">
                        {tot > 0 && <><span className="card-value">{fmtBRL(tot)}</span><span className="card-sep" /></>}
                        <span className="card-validity" style={{ color: '#444' }}>Arquivada</span>
                      </div>
                      <div className="card-actions" onClick={e => e.stopPropagation()}>
                        <Link href={`/proposta/${p.id}`} target="_blank" className="action-btn view-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Ver</Link>
                        <button
                          className="action-btn"
                          style={{ color: '#22c55e', borderColor: 'rgba(34,197,94,0.2)' }}
                          onClick={() => unarchiveProposal(p.id!)}
                        >
                          Reativar
                        </button>
                        <button className="action-btn del-btn" onClick={() => deleteProposal(p.id!)}>Del</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL */}
      <div className={`modal-overlay${modalOpen ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
        <div className="modal">
          <div className="modal-header">
            <div>
              <div className="modal-title">{editingId ? 'Editar Proposta' : 'Nova Proposta'}</div>
              <div className="modal-subtitle">Preencha para gerar a proposta personalizada</div>
            </div>
            <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
          </div>
          <div className="modal-body">
            <div className="form-grid">

              {/* BRIEFING GENERATOR — aparece só em nova proposta */}
              {!editingId && (
                <div className="form-group full" style={{ marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Gerar com IA</label>
                    <span style={{ fontSize: '0.68rem', color: 'var(--mid)' }}>Cole um briefing e a IA preenche os campos automaticamente</span>
                  </div>
                  <BriefingGenerator onGenerated={handleBriefingGenerated} />
                </div>
              )}

              <hr className="form-divider" />
              <div className="form-section-label">Cliente &amp; Logo</div>

              <div className="form-group full">
                <label className="form-label">Logo do Cliente</label>
                <div className="logo-upload-area" onClick={() => fileInputRef.current?.click()}>
                  <div className="logo-preview-box">
                    {logoPreview ? <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span className="logo-placeholder">🏢</span>}
                  </div>
                  <div className="logo-upload-text">
                    <strong>Clique para enviar a logo</strong>
                    PNG, JPG ou SVG — aparece no hero da proposta
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                <div className="logo-display-row">
                  <span className="logo-display-label">Exibir como:</span>
                  <div className="toggle-group">
                    <button className={`toggle-opt${logoMode === 'original' ? ' active' : ''}`} onClick={() => setLogoMode('original')}>Original</button>
                    <button className={`toggle-opt${logoMode === 'white' ? ' active' : ''}`} onClick={() => setLogoMode('white')}>Branca</button>
                  </div>
                  <span className="logo-display-label" style={{ fontSize: '0.68rem' }}>(use "Branca" se a logo for escura)</span>
                </div>
              </div>

              {[
                { id: 'client', label: 'Nome da Empresa *', placeholder: 'Cora Centro Pesquisa' },
                { id: 'contact', label: 'Nome do Contato', placeholder: 'Dra. Karen' },
              ].map(f => (
                <div key={f.id} className="form-group">
                  <label className="form-label">{f.label}</label>
                  <input className="form-input" placeholder={f.placeholder} value={(form as any)[f.id]} onChange={e => setForm(x => ({ ...x, [f.id]: e.target.value }))} />
                </div>
              ))}
              <div className="form-group full">
                <label className="form-label">Saudação personalizada</label>
                <input className="form-input" placeholder="Olá, Dra. Karen!" value={form.greeting} onChange={e => setForm(x => ({ ...x, greeting: e.target.value }))} />
              </div>
              <div className="form-group full">
                <label className="form-label">Introdução</label>
                <textarea className="form-textarea" placeholder="É um prazer apresentar esta proposta..." value={form.intro} onChange={e => setForm(x => ({ ...x, intro: e.target.value }))} />
              </div>

              <hr className="form-divider" />
              <div className="form-section-label">Projeto</div>
              <div className="form-group full">
                <label className="form-label">Título do Projeto</label>
                <input className="form-input" placeholder="Projeto Institucional Estratégico" value={form.title} onChange={e => setForm(x => ({ ...x, title: e.target.value }))} />
              </div>
              <div className="form-group full">
                <label className="form-label">Objetivo</label>
                <textarea className="form-textarea" placeholder="Desenvolver um projeto audiovisual..." value={form.objective} onChange={e => setForm(x => ({ ...x, objective: e.target.value }))} />
              </div>
              <div className="form-group full">
                <label className="form-label">Contexto Estratégico</label>
                <textarea className="form-textarea" placeholder="A comunicação precisa refletir..." value={form.context} onChange={e => setForm(x => ({ ...x, context: e.target.value }))} />
              </div>

              <hr className="form-divider" />
              <div className="form-section-label">Pilares do Projeto</div>
              <div className="form-group full">
                <div className="dyn-list">
                  {pillars.map((p, i) => (
                    <div key={i} className="dyn-item">
                      <input className="form-input" style={{ flex: 1 }} placeholder="Pilar — Autoridade" value={p.name} onChange={e => setPillars(x => x.map((it, j) => j === i ? { ...it, name: e.target.value } : it))} />
                      <input className="form-input" style={{ flex: 2 }} placeholder="Descrição..." value={p.body} onChange={e => setPillars(x => x.map((it, j) => j === i ? { ...it, body: e.target.value } : it))} />
                      <button className="remove-btn" onClick={() => setPillars(x => x.filter((_, j) => j !== i))}>−</button>
                    </div>
                  ))}
                </div>
                <button className="add-btn" onClick={() => setPillars(x => [...x, { name: '', body: '' }])}>+ Adicionar Pilar</button>
              </div>

              <hr className="form-divider" />
              <div className="form-section-label">Como Trabalhamos — Etapas</div>
              <div className="form-group full">
                <div style={{ fontSize: '0.74rem', color: 'var(--mid)', marginBottom: 8 }}>Customize as etapas para cada tipo de projeto</div>
                <div className="dyn-list">
                  {steps.map((s, i) => (
                    <div key={i} className="dyn-item">
                      <input className="form-input" style={{ flex: 1 }} placeholder="Nome da Etapa" value={s.title} onChange={e => setSteps(x => x.map((it, j) => j === i ? { ...it, title: e.target.value } : it))} />
                      <input className="form-input" style={{ flex: 2 }} placeholder="Descrição..." value={s.desc} onChange={e => setSteps(x => x.map((it, j) => j === i ? { ...it, desc: e.target.value } : it))} />
                      <button className="remove-btn" onClick={() => setSteps(x => x.filter((_, j) => j !== i))}>−</button>
                    </div>
                  ))}
                </div>
                <button className="add-btn" onClick={() => setSteps(x => [...x, { title: '', desc: '' }])}>+ Adicionar Etapa</button>
              </div>

              <hr className="form-divider" />
              <div className="form-section-label">Entregáveis</div>
              <div className="form-group full">
                <div className="dyn-list">
                  {deliverables.map((d, i) => (
                    <div key={i} className="dyn-item" style={{ position: 'relative' }}>
                      <div className="emoji-picker-wrap">
                        <button className="emoji-btn" onClick={() => setActiveEmojiIdx(activeEmojiIdx === i ? null : i)}>{d.icon}</button>
                        <div className={`emoji-dropdown${activeEmojiIdx === i ? '' : ' hidden'}`}>
                          {EMOJIS.map(em => <div key={em} className="emoji-opt" onClick={() => { setDeliverables(x => x.map((it, j) => j === i ? { ...it, icon: em } : it)); setActiveEmojiIdx(null) }}>{em}</div>)}
                        </div>
                      </div>
                      <input className="form-input" style={{ flex: 1.2 }} placeholder="Nome" value={d.name} onChange={e => setDeliverables(x => x.map((it, j) => j === i ? { ...it, name: e.target.value } : it))} />
                      <input className="form-input" style={{ flex: 2 }} placeholder="Descrição..." value={d.body} onChange={e => setDeliverables(x => x.map((it, j) => j === i ? { ...it, body: e.target.value } : it))} />
                      <button className="remove-btn" onClick={() => setDeliverables(x => x.filter((_, j) => j !== i))}>−</button>
                    </div>
                  ))}
                </div>
                <button className="add-btn" onClick={() => setDeliverables(x => [...x, { icon: '🎬', name: '', body: '' }])}>+ Adicionar Entregável</button>
              </div>

              <hr className="form-divider" />
              <div className="form-section-label">Investimento</div>
              <div className="form-group full">
                <div className="dyn-list">
                  {services.map((s, i) => (
                    <div key={i} className="dyn-item">
                      <input className="form-input" style={{ flex: 1.5 }} placeholder="Serviço" value={s.name} onChange={e => setServices(x => x.map((it, j) => j === i ? { ...it, name: e.target.value } : it))} />
                      <input className="form-input" style={{ flex: 2 }} placeholder="Descrição" value={s.desc} onChange={e => setServices(x => x.map((it, j) => j === i ? { ...it, desc: e.target.value } : it))} />
                      <input className="form-input" style={{ width: 105, flexShrink: 0 }} type="number" placeholder="Valor" value={s.value || ''} onChange={e => setServices(x => x.map((it, j) => j === i ? { ...it, value: parseFloat(e.target.value) || 0 } : it))} />
                      <button className="remove-btn" onClick={() => setServices(x => x.filter((_, j) => j !== i))}>−</button>
                    </div>
                  ))}
                </div>
                <button className="add-btn" onClick={() => setServices(x => [...x, { name: '', desc: '', value: 0 }])}>+ Adicionar Serviço</button>
              </div>

              <hr className="form-divider" />
              <div className="form-section-label">Cronograma</div>
              <div className="form-group full">
                <div className="dyn-list">
                  {timeline.map((t, i) => (
                    <div key={i} className="dyn-item">
                      <input className="form-input" style={{ width: 82, flexShrink: 0 }} placeholder="Fase 01" value={t.phase} onChange={e => setTimeline(x => x.map((it, j) => j === i ? { ...it, phase: e.target.value } : it))} />
                      <input className="form-input" style={{ flex: 1 }} placeholder="Nome da fase" value={t.name} onChange={e => setTimeline(x => x.map((it, j) => j === i ? { ...it, name: e.target.value } : it))} />
                      <input className="form-input" style={{ flex: 2 }} placeholder="Item 1, Item 2, ..." value={t.items} onChange={e => setTimeline(x => x.map((it, j) => j === i ? { ...it, items: e.target.value } : it))} />
                      <button className="remove-btn" onClick={() => setTimeline(x => x.filter((_, j) => j !== i))}>−</button>
                    </div>
                  ))}
                </div>
                <button className="add-btn" onClick={() => setTimeline(x => [...x, { phase: '', name: '', items: '' }])}>+ Adicionar Fase</button>
              </div>

              <hr className="form-divider" />
              <div className="form-section-label">Condições</div>
              <div className="form-group">
                <label className="form-label">Validade (dias úteis)</label>
                <input className="form-input" type="number" min={1} max={60} value={form.validity} onChange={e => setForm(x => ({ ...x, validity: parseInt(e.target.value) || 5 }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm(x => ({ ...x, status: e.target.value as Proposal['status'] }))}>
                  <option value="pending">Rascunho</option>
                  <option value="sent">Enviada</option>
                  <option value="approved">Aprovada</option>
                  <option value="expired">Expirada</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-sm ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn-main" onClick={saveProposal} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Proposta →'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`toast${toast.show ? ' show' : ''}`}>
        <div className="toast-dot" />
        <span>{toast.msg}</span>
      </div>
    </>
  )
}
