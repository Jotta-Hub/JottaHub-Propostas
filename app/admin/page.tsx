'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { supabase, type Proposal } from '@/lib/supabase'
import { fmtBRL, fmtDate, addWorkdays, calcTotal, statusLabel, DEFAULT_STEPS, EMOJIS } from '@/lib/utils'
import BriefingGenerator from '@/components/BriefingGenerator'
import UsersPanel from '@/components/UsersPanel'
import PortfolioPanel from '@/components/PortfolioPanel'
import NinaAssistant from '@/components/NinaAssistant'
import HeroConfig from '@/components/HeroConfig'
import { PROPOSAL_TEMPLATES, type ProposalTemplate } from '@/lib/templates'

type Signature = {
  id: string
  proposal_id: string
  signer_name: string
  signer_email: string
  confirmed_at: string
  signer_role: string
}

type Payment = {
  id?: string
  proposal_id?: string
  project_label?: string
  description: string
  amount: number
  due_date?: string
  paid_at?: string
  status: 'pending' | 'paid' | 'overdue'
  installment: string
  payment_method?: string
  nf_emitted?: boolean
  is_retroactive?: boolean
}

type View = 'dashboard' | 'briefings' | 'financeiro' | 'proposals' | 'usuarios' | 'portfolio'

const DEFAULT_PAYMENT = [
  { label: 'Na Aprovação', percent: 50, desc: 'Na aprovação e assinatura do contrato para início do projeto.' },
  { label: 'Na Entrega', percent: 50, desc: 'Na entrega final de todos os materiais após aprovação.' },
]

function fmt(d?: string) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}

const PAYMENT_METHODS = ['PIX', 'Transferência', 'Cartão de crédito', 'Cartão de débito', 'Boleto', 'Outro']

const statusColor: Record<string, string> = {
  pending: '#f59e0b', paid: '#22c55e', overdue: '#ef4444',
}
const statusLabel2: Record<string, string> = {
  pending: 'A receber', paid: 'Pago', overdue: 'Vencido',
}

const SOURCE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  briefing_externo: { label: '📥 Briefing', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  briefing_interno: { label: '✦ IA Interno', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  manual: { label: 'Manual', color: '#888', bg: 'transparent' },
}

export default function AdminPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [signatures, setSignatures] = useState<Signature[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('dashboard')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: '', show: false })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoMode, setLogoMode] = useState<'original' | 'white'>('original')
  const [heroMode, setHeroMode] = useState<'clean' | 'photo' | 'video'>('clean')
  const [heroMedia, setHeroMedia] = useState('')
  const [heroFormat, setHeroFormat] = useState<'compact' | 'medium' | 'cinema' | 'full'>('medium')
  const [paymentTerms, setPaymentTerms] = useState<{ label: string; percent: number; desc: string }[]>([])
  const [activeEmojiIdx, setActiveEmojiIdx] = useState<number | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all')
  const [selectedBriefing, setSelectedBriefing] = useState<Proposal | null>(null)

  const [finModalOpen, setFinModalOpen] = useState(false)
  const [finForm, setFinForm] = useState({ project_label: '', payment_method: 'PIX', total: '', installments: 1 })
  const [parcelModal, setParcelModal] = useState<{ open: boolean; proposal: Proposal | null }>({ open: false, proposal: null })
  const [parcelForm, setParcelForm] = useState({ count: 2, method: 'PIX', firstDate: new Date().toISOString().slice(0, 10), intervalDays: 30 })
  const [finParcelas, setFinParcelas] = useState<{ description: string; amount: string; due_date: string; paid: boolean }[]>([
    { description: '', amount: '', due_date: '', paid: false },
  ])
  const [savingFin, setSavingFin] = useState(false)
  const [nfModal, setNfModal] = useState<{ open: boolean; paymentId: string }>({ open: false, paymentId: '' })

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
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await sb.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  useEffect(() => { checkSession() }, [])

  async function checkSession() {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { session } } = await sb.auth.getSession()
    if (!session) { router.push('/login'); return }
    fetchAll()
  }

  async function fetchAll() {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const [{ data: props }, { data: sigs }, { data: pays }] = await Promise.all([
      supabase.from('proposals').select('*').order('created_at', { ascending: false }),
      supabase.from('signatures').select('*').order('confirmed_at', { ascending: false }).limit(20),
      supabase.from('payments').select('*').order('due_date', { ascending: true }),
    ])
    setProposals(props || [])
    setSignatures(sigs || [])
    const updated = (pays || []).map(p => ({
      ...p,
      status: p.status === 'paid' ? 'paid' : (p.due_date && p.due_date < today ? 'overdue' : p.status),
    }))
    setPayments(updated)
    setLoading(false)
  }

  function showToast(msg: string) {
    setToast({ msg, show: true })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2600)
  }

  function handleBriefingGenerated(data: any) {
    setForm({
      client: data.client || '', contact: data.contact || '', greeting: data.greeting || '',
      intro: data.intro || '', title: data.title || '', objective: data.objective || '',
      context: data.context || '', validity: data.validity || 5,
      status: (data.status as Proposal['status']) || 'pending',
    })
    setPillars(data.pillars || [])
    setSteps(data.steps?.length ? data.steps : DEFAULT_STEPS)
    setDeliverables(data.deliverables || [])
    setServices(data.services || [])
    setTimeline(data.timeline || [])
    showToast('Proposta preenchida com IA! Revise os campos.')
  }

  function applyTemplate(t: ProposalTemplate) {
    const d = t.data
    setForm(f => ({ ...f, title: d.title || f.title, objective: d.objective || f.objective, context: d.context || f.context, intro: d.intro || f.intro }))
    if (d.pillars) setPillars(d.pillars)
    if (d.steps) setSteps(d.steps)
    if (d.deliverables) setDeliverables(d.deliverables)
    if (d.services) setServices(d.services)
    if (d.timeline) setTimeline(d.timeline)
    showToast(`Template "${t.label}" aplicado! Ajuste o cliente e os valores.`)
  }

  function openModal(p?: Proposal) {
    if (p) {
      setEditingId(p.id || null)
      setForm({ client: p.client, contact: p.contact || '', greeting: p.greeting || '', intro: p.intro || '', title: p.title || '', objective: p.objective || '', context: p.context || '', validity: p.validity || 5, status: p.status || 'pending' })
      setLogoPreview(p.logo_url || null)
      setLogoMode(p.logo_mode || 'original')
      setHeroMode(p.hero_mode || 'clean')
      setHeroMedia(p.hero_media || '')
      setHeroFormat(p.hero_format || 'medium')
      setPaymentTerms(p.payment_terms?.length ? p.payment_terms : DEFAULT_PAYMENT)
      setPillars(p.pillars || [])
      setSteps(p.steps?.length ? p.steps : DEFAULT_STEPS)
      setDeliverables(p.deliverables || [])
      setServices(p.services || [])
      setTimeline(p.timeline || [])
    } else {
      setEditingId(null)
      setForm({ client: '', contact: '', greeting: '', intro: '', title: '', objective: '', context: '', validity: 5, status: 'pending' })
      setLogoPreview(null); setLogoMode('original')
      setHeroMode('clean'); setHeroMedia(''); setHeroFormat('medium')
      setPaymentTerms(DEFAULT_PAYMENT)
      setPillars([]); setSteps(DEFAULT_STEPS); setDeliverables([]); setServices([]); setTimeline([])
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
    const payload: Proposal = { ...form, logo_url: logoPreview || undefined, logo_mode: logoMode, hero_mode: heroMode, hero_media: heroMedia || undefined, hero_format: heroFormat, payment_terms: paymentTerms, pillars, steps, deliverables, services, timeline }
    if (editingId) {
      const original = proposals.find(p => p.id === editingId)
      if ((original as any)?.source === 'briefing_externo') {
        (payload as any).briefing_reviewed = true
      }
      await supabase.from('proposals').update(payload).eq('id', editingId)
      showToast('Proposta atualizada!')
    } else {
      await supabase.from('proposals').insert(payload)
      showToast('Proposta criada!')
    }
    await fetchAll()
    setModalOpen(false)
    setSaving(false)
  }

  async function deleteProposal(id: string) {
    if (!confirm('Excluir permanentemente esta proposta?')) return
    await supabase.from('signature_codes').delete().eq('proposal_id', id)
    await supabase.from('signatures').delete().eq('proposal_id', id)
    await supabase.from('payments').delete().eq('proposal_id', id)
    const { error } = await supabase.from('proposals').delete().eq('id', id)
    if (error) { showToast('Erro ao excluir.'); return }
    showToast('Proposta excluída.')
    fetchAll()
  }

  async function archiveProposal(id: string) {
    await supabase.from('proposals').update({ status: 'archived' }).eq('id', id)
    showToast('Proposta arquivada.')
    fetchAll()
  }

  async function unarchiveProposal(id: string) {
    await supabase.from('proposals').update({ status: 'pending' }).eq('id', id)
    showToast('Proposta reativada.')
    fetchAll()
  }

  async function copyLink(id: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/proposta/${id}`)
    showToast('Link copiado!')
  }

  async function updateStatus(id: string, status: Proposal['status']) {
    await supabase.from('proposals').update({ status }).eq('id', id)
    fetchAll()
  }

  function openParcelModal(proposal: Proposal) {
    if (!proposal.id) return
    const existing = payments.filter(p => p.proposal_id === proposal.id)
    if (existing.length > 0) { showToast('Parcelas já geradas para este projeto.'); return }
    if (calcTotal(proposal.services || []) === 0) { showToast('Proposta sem valor definido.'); return }
    setParcelForm({ count: 2, method: 'PIX', firstDate: new Date().toISOString().slice(0, 10), intervalDays: 30 })
    setParcelModal({ open: true, proposal })
  }

  async function confirmGenerateParcelas() {
    const proposal = parcelModal.proposal
    if (!proposal?.id) return
    const total = calcTotal(proposal.services || [])
    const n = Math.max(1, parseInt(String(parcelForm.count)) || 1)
    const method = parcelForm.method || 'PIX'
    const interval = Math.max(0, parseInt(String(parcelForm.intervalDays)) || 0)
    const base = parcelForm.firstDate ? new Date(parcelForm.firstDate + 'T00:00:00') : new Date()
    const per = Math.floor((total / n) * 100) / 100
    const rows = Array.from({ length: n }, (_, i) => {
      const d = new Date(base); d.setDate(d.getDate() + interval * i)
      const amount = i === n - 1 ? Math.round((total - per * (n - 1)) * 100) / 100 : per
      return {
        proposal_id: proposal.id,
        project_label: proposal.client,
        description: `${proposal.client} — Parcela ${i + 1}/${n}`,
        amount,
        due_date: d.toISOString().slice(0, 10),
        status: 'pending' as const,
        installment: `${i + 1}/${n}`,
        payment_method: method,
        is_retroactive: false,
      }
    })
    await supabase.from('payments').insert(rows)
    setParcelModal({ open: false, proposal: null })
    showToast(`${n} parcela(s) gerada(s)!`)
    fetchAll()
  }

  function adjustParcelas(n: number) {
    const total = parseFloat(finForm.total) || 0
    const perParcela = n > 0 && total > 0 ? (total / n).toFixed(2) : ''
    setFinParcelas(Array.from({ length: n }, (_, i) => ({
      description: `${finForm.project_label || 'Projeto'} — Parcela ${i + 1}/${n}`,
      amount: perParcela, due_date: '', paid: false,
    })))
    setFinForm(f => ({ ...f, installments: n }))
  }

  async function saveRetroactiveProject() {
    if (!finForm.project_label.trim()) { showToast('Informe o nome do projeto.'); return }
    if (finParcelas.some(p => !p.amount || parseFloat(p.amount) <= 0)) { showToast('Preencha o valor de todas as parcelas.'); return }
    setSavingFin(true)
    const rows = finParcelas.map((p, i) => ({
      project_label: finForm.project_label,
      description: p.description || `${finForm.project_label} — Parcela ${i + 1}/${finParcelas.length}`,
      amount: parseFloat(p.amount), due_date: p.due_date || null,
      status: p.paid ? 'paid' : 'pending',
      paid_at: p.paid ? (p.due_date || new Date().toISOString().slice(0, 10)) : null,
      installment: `${i + 1}/${finParcelas.length}`, payment_method: finForm.payment_method,
      is_retroactive: true, nf_emitted: false,
    }))
    await supabase.from('payments').insert(rows)
    showToast('Projeto registrado no financeiro!')
    setFinModalOpen(false)
    setFinForm({ project_label: '', payment_method: 'PIX', total: '', installments: 1 })
    setFinParcelas([{ description: '', amount: '', due_date: '', paid: false }])
    setSavingFin(false)
    fetchAll()
  }

  async function markPaid(id: string) {
    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('payments').update({ status: 'paid', paid_at: today }).eq('id', id)
    fetchAll()
    setNfModal({ open: true, paymentId: id })
  }

  async function markUnpaid(id: string) {
    await supabase.from('payments').update({ status: 'pending', paid_at: null }).eq('id', id)
    showToast('Pagamento revertido.')
    fetchAll()
  }

  async function markNfEmitted(id: string) {
    await supabase.from('payments').update({ nf_emitted: true }).eq('id', id)
    setNfModal({ open: false, paymentId: '' })
    showToast('NF marcada como emitida.')
    fetchAll()
  }

  async function updatePaymentField(id: string, field: string, value: any) {
    await supabase.from('payments').update({ [field]: value }).eq('id', id)
    fetchAll()
  }

  async function deletePayment(id: string) {
    if (!confirm('Excluir este lançamento?')) return
    await supabase.from('payments').delete().eq('id', id)
    showToast('Lançamento excluído.')
    fetchAll()
  }

  // Converte briefing externo em proposta enviável
  async function convertBriefingToProposal(p: Proposal) {
    await supabase.from('proposals').update({ status: 'pending', source: 'briefing_externo' }).eq('id', p.id!)
    showToast('Proposta pronta para edição e envio.')
    fetchAll()
    setSelectedBriefing(null)
    openModal({ ...p, status: 'pending' })
  }

  // Dados calculados
  const activeProposals = proposals.filter(p => p.status !== 'archived')
  const archivedProposals = proposals.filter(p => p.status === 'archived')
  const briefingProposals = proposals.filter(p => (p as any).source === 'briefing_externo' && !(p as any).briefing_reviewed)
  const newBriefings = briefingProposals.length

  const totalProposals = activeProposals.length
  const sent = activeProposals.filter(p => p.status === 'sent').length
  const approved = activeProposals.filter(p => p.status === 'approved').length
  const pending = activeProposals.filter(p => p.status === 'pending').length
  const expired = activeProposals.filter(p => p.status === 'expired').length
  const volumeApproved = activeProposals.filter(p => p.status === 'approved').reduce((s, p) => s + calcTotal(p.services), 0)
  const volumeTotal = activeProposals.reduce((s, p) => s + calcTotal(p.services), 0)
  const conversionRate = sent > 0 ? Math.round((approved / (sent + approved)) * 100) : 0

  const today2 = new Date()
  const alertProposals = activeProposals.filter(p => {
    if (p.status !== 'sent' || !p.created_at) return false
    const validDate = addWorkdays(p.created_at.slice(0, 10), p.validity || 5)
    const diff = (new Date(validDate).getTime() - today2.getTime()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 2
  })

  const recentSigs = signatures.filter(s => s.signer_role === 'client').slice(0, 5)
  const ongoingProjects = activeProposals.filter(p => p.status === 'approved')
  const totalReceber = payments.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amount, 0)
  const totalRecebido = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const totalVencido = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const recebidoMes = payments.filter(p => p.status === 'paid' && p.paid_at?.startsWith(thisMonth)).reduce((s, p) => s + p.amount, 0)
  const overduePayments = payments.filter(p => p.status === 'overdue')
  const filteredPayments = payments.filter(p => paymentFilter === 'all' ? true : p.status === paymentFilter)

  if (loading) return <div className="loading-screen"><div className="loading-dot" /></div>

  // Componente de card reutilizável
  function ProposalCard({ p, archived = false }: { p: Proposal; archived?: boolean }) {
    const tot = calcTotal(p.services)
    const validDate = p.created_at ? addWorkdays(p.created_at.slice(0, 10), p.validity || 5) : ''
    const initials = (p.client || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    const hasSig = signatures.some(s => s.proposal_id === p.id && s.signer_role === 'client')
    const source = (p as any).source || 'manual'
    const sourceInfo = SOURCE_LABELS[source]

    return (
      <div className="prop-card" style={archived ? { opacity: 0.6 } : {}} onClick={() => window.open(`/proposta/${p.id}`, '_blank')}>
        <div className="card-top">
          <div className="card-logo">{p.logo_url ? <img src={p.logo_url} alt={p.client} /> : <span className="card-logo-initials">{initials}</span>}</div>
          <div className="card-info">
            <div className="card-client">{p.client}</div>
            <div className="card-contact">{p.contact}</div>
            <div className="card-project">{p.title || 'Sem título'}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            {archived
              ? <span className="badge" style={{ background: '#1C1C1C', color: '#555', borderColor: '#2E2E2E' }}>Arquivada</span>
              : <span className={`badge ${p.status}`}>{statusLabel(p.status)}</span>
            }
            {source !== 'manual' && (
              <span style={{ fontSize: '0.55rem', fontWeight: 700, padding: '2px 6px', borderRadius: 2, background: sourceInfo.bg, color: sourceInfo.color, border: `1px solid ${sourceInfo.color}33`, whiteSpace: 'nowrap' }}>
                {sourceInfo.label}
              </span>
            )}
          </div>
        </div>
        <div className="card-meta">
          {tot > 0 && <><span className="card-value">{fmtBRL(tot)}</span><span className="card-sep" /></>}
          <span className="card-validity" style={archived ? { color: '#444' } : {}}>{archived ? 'Arquivada' : `Válida até ${fmtDate(validDate)}`}</span>
        </div>
        <div className="card-actions" onClick={e => e.stopPropagation()}>
          {archived ? (
            <>
              <Link href={`/proposta/${p.id}`} target="_blank" className="action-btn view-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Ver</Link>
              <button className="action-btn" style={{ color: '#22c55e', borderColor: 'rgba(34,197,94,0.2)' }} onClick={() => unarchiveProposal(p.id!)}>Reativar</button>
              <button className="action-btn del-btn" onClick={() => deleteProposal(p.id!)}>Del</button>
            </>
          ) : (
            <>
              <Link href={`/proposta/${p.id}`} target="_blank" className="action-btn view-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Ver</Link>
              <button className="action-btn" onClick={() => copyLink(p.id!)}>Link</button>
              <button className="action-btn" onClick={() => openModal(p)}>Editar</button>
              {p.status === 'approved' && hasSig && (
                <button className="action-btn" style={{ color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }} onClick={() => window.open(`/api/contract-pdf?id=${p.id}`, '_blank')}>Contrato</button>
              )}
              <select className="action-btn" value={p.status} onChange={e => updateStatus(p.id!, e.target.value as Proposal['status'])} style={{ appearance: 'none', textAlign: 'center' }}>
                <option value="pending">Rascunho</option>
                <option value="sent">Enviada</option>
                <option value="approved">✓ Aprovada</option>
                <option value="expired">Expirada</option>
              </select>
              <button className="action-btn" style={{ color: '#888', borderColor: '#2E2E2E' }} onClick={() => archiveProposal(p.id!)}>Arq.</button>
              <button className="action-btn del-btn" onClick={() => deleteProposal(p.id!)}>Del</button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* NAV */}
      <nav className="admin-nav">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="nav-logo jlogo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="jmark" src="/logo-jh.png" alt="JOTTA HUB" />
            <b>JOTTA<span>HUB</span></b>
            <span className="bolt gold sm" style={{ marginLeft: 2 }} />
          </div>
          <span className="nav-badge">Propostas</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 2, background: 'var(--gray2)', borderRadius: 3, padding: 3 }}>
            {([
              { key: 'dashboard', label: '⬛ Dashboard' },
              { key: 'briefings', label: '📥 Briefings', badge: newBriefings },
              { key: 'financeiro', label: '💰 Financeiro' },
              { key: 'proposals', label: '📋 Propostas' },
              { key: 'usuarios', label: '👤 Usuários' },
              { key: 'portfolio', label: '🎬 Portfólio' },
            ] as { key: View; label: string; badge?: number }[]).map(v => (
              <button key={v.key} onClick={() => setView(v.key)} style={{
                fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                padding: '6px 12px', borderRadius: 2, border: 'none', cursor: 'pointer', position: 'relative',
                background: view === v.key ? 'var(--red)' : 'transparent',
                color: view === v.key ? 'var(--white)' : 'var(--mid)', transition: 'all 0.2s',
              }}>
                {v.label}
                {v.badge && v.badge > 0 ? (
                  <span style={{ position: 'absolute', top: 2, right: 2, background: '#a78bfa', color: '#000', borderRadius: '50%', width: 14, height: 14, fontSize: '0.55rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{v.badge}</span>
                ) : null}
              </button>
            ))}
          </div>
          <button className="btn-sm ghost" onClick={handleLogout}>Sair</button>
          <button className="btn-sm red" onClick={() => openModal()}>+ Nova Proposta</button>
        </div>
      </nav>

      <div className="admin-wrap">

        {/* ═══════ DASHBOARD */}
        {view === 'dashboard' && (
          <>
            <div className="admin-header">
              <div className="admin-header-inner">
                <div>
                  <h1 className="admin-title"><span className="ghost">Visão</span><span className="red">Geral</span></h1>
                  <p className="admin-sub">Métricas, alertas e atividade recente</p>
                </div>
                <button className="btn-sm red" style={{ fontSize: '.9rem', padding: '13px 26px' }} onClick={() => openModal()}>+ Nova Proposta</button>
              </div>
            </div>

            {/* NINA — assistente */}
            <NinaAssistant proposals={proposals} />

            {/* ALERTAS */}
            {(alertProposals.length > 0 || overduePayments.length > 0 || newBriefings > 0) && (
              <div style={{ marginBottom: 28 }}>
                {/* Alerta de briefings novos */}
                {newBriefings > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 3, padding: '12px 18px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span>📥</span>
                      <div>
                        <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.8rem' }}>
                          {newBriefings} briefing{newBriefings > 1 ? 's' : ''} novo{newBriefings > 1 ? 's' : ''} aguardando revisão
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--mid)', marginTop: 2 }}>
                          Propostas geradas automaticamente pela IA a partir de briefings externos
                        </div>
                      </div>
                    </div>
                    <button className="action-btn" style={{ color: '#a78bfa', borderColor: 'rgba(167,139,250,0.3)', flex: 'unset' }} onClick={() => setView('briefings')}>
                      Ver briefings
                    </button>
                  </div>
                )}
                {alertProposals.map(p => {
                  const validDate = p.created_at ? addWorkdays(p.created_at.slice(0, 10), p.validity || 5) : ''
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(134,54,242,0.08)', border: '1px solid rgba(134,54,242,0.25)', borderRadius: 3, padding: '12px 18px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span>⚠️</span>
                        <div>
                          <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.8rem' }}>Proposta vencendo — {p.client}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--mid)', marginTop: 2 }}>Válida até {fmtDate(validDate)}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="action-btn" onClick={() => copyLink(p.id!)}>Copiar Link</button>
                        <button className="action-btn view-btn" onClick={() => window.open(`/proposta/${p.id}`, '_blank')}>Ver</button>
                      </div>
                    </div>
                  )
                })}
                {overduePayments.slice(0, 3).map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(134,54,242,0.08)', border: '1px solid rgba(134,54,242,0.25)', borderRadius: 3, padding: '12px 18px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span>🔴</span>
                      <div>
                        <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.8rem' }}>Pagamento vencido — {p.description}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--mid)', marginTop: 2 }}>Venceu em {fmt(p.due_date)} · {fmtBRL(p.amount)}</div>
                      </div>
                    </div>
                    <button className="action-btn" style={{ color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }} onClick={() => markPaid(p.id!)}>Marcar pago</button>
                  </div>
                ))}
              </div>
            )}

            {/* MÉTRICAS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
              {[
                { label: 'A Receber', value: fmtBRL(totalReceber), color: '#f59e0b' },
                { label: 'Recebido', value: fmtBRL(totalRecebido), color: '#22c55e' },
                { label: 'Recebido no Mês', value: fmtBRL(recebidoMes), color: 'var(--white)' },
                { label: 'Volume Aprovado', value: fmtBRL(volumeApproved), color: 'var(--red)' },
                { label: 'Conversão', value: `${conversionRate}%`, color: 'var(--white)' },
                { label: 'Aprovadas', value: approved, color: 'var(--white)' },
              ].map(m => (
                <div key={m.label} className="stat-card">
                  <div className="stat-n" style={{ color: m.color }}>{m.value}</div>
                  <div className="stat-l">{m.label}</div>
                </div>
              ))}
            </div>

            {/* FUNIL */}
            <div style={{ background: 'var(--gray)', border: '1px solid var(--gray2)', borderRadius: 3, padding: '20px 24px', marginBottom: 28 }}>
              <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: 16 }}>Funil de Vendas</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { label: 'Rascunho', count: pending, color: '#444' },
                  { label: 'Enviada', count: sent, color: '#f59e0b' },
                  { label: 'Aprovada', count: approved, color: '#22c55e' },
                  { label: 'Expirada', count: expired, color: 'var(--red)' },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ height: 6, background: 'var(--gray2)', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: totalProposals ? `${Math.round((s.count / totalProposals) * 100)}%` : '0%', background: s.color, borderRadius: 3 }} />
                    </div>
                    <div style={{ fontFamily: 'var(--fd)', fontWeight: 900, fontSize: '1.4rem', color: s.color }}>{s.count}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--mid)', fontFamily: 'var(--fd)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
              <div style={{ background: 'var(--gray)', border: '1px solid var(--gray2)', borderRadius: 3, padding: '20px 24px' }}>
                <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: 16 }}>
                  Projetos em Andamento <span style={{ marginLeft: 8, background: '#22c55e', color: '#000', fontSize: '0.6rem', fontWeight: 900, padding: '2px 6px', borderRadius: 2 }}>{ongoingProjects.length}</span>
                </div>
                {ongoingProjects.length === 0
                  ? <div style={{ fontSize: '0.78rem', color: '#444', textAlign: 'center', padding: '20px 0' }}>Nenhum projeto aprovado ainda</div>
                  : ongoingProjects.map(p => {
                    const tot = calcTotal(p.services)
                    const propPays = payments.filter(pay => pay.proposal_id === p.id)
                    const paidCount = propPays.filter(pay => pay.status === 'paid').length
                    return (
                      <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--gray2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.82rem' }}>{p.client}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--mid)', marginTop: 2 }}>{p.title || 'Sem título'}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            {tot > 0 && <div style={{ fontFamily: 'var(--fd)', fontWeight: 900, fontSize: '0.9rem', color: '#22c55e' }}>{fmtBRL(tot)}</div>}
                            {propPays.length > 0 && <div style={{ fontSize: '0.65rem', color: '#666', marginTop: 2 }}>{paidCount}/{propPays.length} parcelas pagas</div>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          {propPays.length === 0 && (
                            <button onClick={() => openParcelModal(p)} style={{ fontSize: '0.65rem', color: '#f59e0b', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 2, padding: '3px 8px', cursor: 'pointer' }}>
                              + Gerar parcelas
                            </button>
                          )}
                          <button onClick={() => window.open(`/api/contract-pdf?id=${p.id}`, '_blank')} style={{ fontSize: '0.65rem', color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 2, padding: '3px 8px', cursor: 'pointer' }}>
                            Ver contrato
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>

              <div style={{ background: 'var(--gray)', border: '1px solid var(--gray2)', borderRadius: 3, padding: '20px 24px' }}>
                <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: 16 }}>Atividade Recente</div>
                {recentSigs.length === 0
                  ? <div style={{ fontSize: '0.78rem', color: '#444', textAlign: 'center', padding: '20px 0' }}>Nenhuma assinatura ainda</div>
                  : recentSigs.map(sig => {
                    const proposal = proposals.find(p => p.id === sig.proposal_id)
                    return (
                      <div key={sig.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--gray2)' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', flexShrink: 0 }}>✅</div>
                        <div>
                          <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.78rem' }}>{sig.signer_name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--mid)', marginTop: 1 }}>assinou {proposal ? `— ${proposal.client}` : ''}</div>
                          <div style={{ fontSize: '0.65rem', color: '#555', marginTop: 1 }}>{new Date(sig.confirmed_at).toLocaleString('pt-BR')}</div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </>
        )}

        {/* ═══════ BRIEFINGS */}
        {view === 'briefings' && (
          <>
            <div className="admin-header">
              <div className="admin-header-inner">
                <div>
                  <h1 className="admin-title"><span className="ghost">Briefings</span><span className="red">Recebidos</span></h1>
                  <p className="admin-sub">Propostas geradas automaticamente a partir de briefings externos</p>
                </div>
                <a
                  href="/briefing"
                  target="_blank"
                  style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '9px 18px', borderRadius: 2, border: '1px solid var(--gray3)', background: 'transparent', color: 'var(--white)', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  ↗ Ver página de briefing
                </a>
              </div>
            </div>

            {briefingProposals.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.2 }}>📥</div>
                <div style={{ fontFamily: 'var(--fd)', fontWeight: 900, fontSize: '1.2rem', textTransform: 'uppercase', color: 'var(--gray3)', marginBottom: 8 }}>Nenhum briefing ainda</div>
                <div style={{ fontSize: '0.8rem', color: '#333', marginBottom: 24 }}>Compartilhe o link da página de briefing com seus clientes</div>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/briefing`); showToast('Link copiado!') }}
                  style={{ background: 'var(--red)', color: 'var(--white)', fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 20px', borderRadius: 2, border: 'none', cursor: 'pointer' }}
                >
                  Copiar link da página
                </button>
              </div>
            ) : (
              <div style={{ padding: '0 40px 40px' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--mid)' }}>
                    {briefingProposals.length} briefing{briefingProposals.length > 1 ? 's' : ''} aguardando revisão
                  </span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/briefing`); showToast('Link copiado!') }}
                    style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--mid)', background: 'transparent', border: '1px solid var(--gray3)', borderRadius: 2, padding: '5px 10px', cursor: 'pointer', fontFamily: 'var(--fd)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}
                  >
                    Copiar link da página
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {briefingProposals.map(p => {
                    const tot = calcTotal(p.services)
                    const briefingRaw = (p as any).briefing_raw || ''
                    return (
                      <div key={p.id} style={{ background: 'var(--gray)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: 2, background: 'linear-gradient(90deg, #A45FFF, #D9A441)' }} />
                        <div style={{ padding: '20px 24px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 200 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                <div style={{ fontFamily: 'var(--fd)', fontWeight: 900, fontSize: '1.05rem', textTransform: 'uppercase' }}>{p.client}</div>
                                <span style={{ fontSize: '0.55rem', fontWeight: 700, padding: '2px 6px', borderRadius: 2, background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}>📥 Briefing Externo</span>
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--mid)', marginBottom: 8 }}>{p.title || 'Sem título'}</div>
                              {tot > 0 && <div style={{ fontFamily: 'var(--fd)', fontWeight: 900, fontSize: '1.1rem', color: '#a78bfa' }}>{fmtBRL(tot)}</div>}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: '#555' }}>
                              {p.created_at ? new Date(p.created_at).toLocaleString('pt-BR') : ''}
                            </div>
                          </div>

                          {briefingRaw && (
                            <div style={{ background: 'var(--black)', border: '1px solid var(--gray2)', borderRadius: 2, padding: '12px 14px', marginTop: 14, marginBottom: 14 }}>
                              <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#555', marginBottom: 8 }}>Briefing Original</div>
                              <pre style={{ fontSize: '0.75rem', color: '#888', whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.6, maxHeight: 160, overflow: 'auto' }}>{briefingRaw}</pre>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              onClick={() => { openModal(p); setSelectedBriefing(p) }}
                              style={{ background: '#a78bfa', color: '#000', fontFamily: 'var(--fd)', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 2, border: 'none', cursor: 'pointer' }}
                            >
                              Revisar e Enviar →
                            </button>
                            <button
                              onClick={() => window.open(`/proposta/${p.id}`, '_blank')}
                              style={{ background: 'transparent', color: 'var(--mid)', fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 2, border: '1px solid var(--gray3)', cursor: 'pointer' }}
                            >
                              Ver Proposta
                            </button>
                            <button
                              onClick={() => copyLink(p.id!)}
                              style={{ background: 'transparent', color: 'var(--mid)', fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 2, border: '1px solid var(--gray3)', cursor: 'pointer' }}
                            >
                              Copiar Link
                            </button>
                            <button
                              onClick={() => deleteProposal(p.id!)}
                              style={{ background: 'transparent', color: '#555', fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 2, border: '1px solid #2E2E2E', cursor: 'pointer', marginLeft: 'auto' }}
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════ FINANCEIRO */}
        {view === 'financeiro' && (
          <>
            <div className="admin-header">
              <div className="admin-header-inner">
                <div>
                  <h1 className="admin-title"><span className="ghost">Controle</span><span className="red">Financeiro</span></h1>
                  <p className="admin-sub">Parcelas, recebimentos e fluxo de caixa</p>
                </div>
                <button className="btn-sm red" style={{ fontSize: '.9rem', padding: '13px 26px' }} onClick={() => setFinModalOpen(true)}>+ Projeto Retroativo</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
              {[
                { label: 'Total a Receber', value: fmtBRL(totalReceber), color: '#f59e0b' },
                { label: 'Total Recebido', value: fmtBRL(totalRecebido), color: '#22c55e' },
                { label: 'Vencido', value: fmtBRL(totalVencido), color: 'var(--red)' },
                { label: 'Recebido no Mês', value: fmtBRL(recebidoMes), color: 'var(--white)' },
              ].map(m => (
                <div key={m.label} className="stat-card">
                  <div className="stat-n" style={{ color: m.color }}>{m.value}</div>
                  <div className="stat-l">{m.label}</div>
                </div>
              ))}
            </div>

            {ongoingProjects.filter(p => !payments.some(pay => pay.proposal_id === p.id)).length > 0 && (
              <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 3, padding: '14px 18px', marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.72rem', color: '#f59e0b', marginBottom: 10 }}>⚠ Projetos aprovados sem parcelas geradas:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ongoingProjects.filter(p => !payments.some(pay => pay.proposal_id === p.id)).map(p => (
                    <button key={p.id} onClick={() => openParcelModal(p)} style={{ fontSize: '0.72rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 2, padding: '6px 12px', cursor: 'pointer' }}>
                      + Gerar parcelas — {p.client}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['all', 'pending', 'paid', 'overdue'] as const).map(f => (
                <button key={f} onClick={() => setPaymentFilter(f)} style={{
                  fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '6px 14px', borderRadius: 2, border: '1px solid', cursor: 'pointer',
                  background: paymentFilter === f ? 'var(--red)' : 'transparent',
                  color: paymentFilter === f ? 'var(--white)' : 'var(--mid)',
                  borderColor: paymentFilter === f ? 'var(--red)' : 'var(--gray3)',
                }}>
                  {f === 'all' ? 'Todos' : f === 'pending' ? 'A Receber' : f === 'paid' ? 'Pagos' : 'Vencidos'}
                </button>
              ))}
            </div>

            <div style={{ background: 'var(--gray)', border: '1px solid var(--gray2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 12, padding: '10px 20px', background: 'var(--gray2)', fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--mid)' }}>
                <span>Descrição</span><span>Forma</span><span>Vencimento</span><span>Parcela</span><span>Valor</span><span>Ação</span>
              </div>
              {filteredPayments.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#444', fontSize: '0.82rem' }}>
                  Nenhum lançamento encontrado.
                  <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#555' }}>Gere parcelas para projetos aprovados ou adicione um projeto retroativo.</div>
                </div>
              ) : filteredPayments.map(pay => (
                <div key={pay.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--gray2)', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.8rem' }}>{pay.description}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      {pay.is_retroactive && <span style={{ fontSize: '0.6rem', color: '#888', background: '#1C1C1C', padding: '1px 6px', borderRadius: 2 }}>Retroativo</span>}
                      {pay.nf_emitted && <span style={{ fontSize: '0.6rem', color: '#22c55e', background: 'rgba(34,197,94,0.08)', padding: '1px 6px', borderRadius: 2 }}>NF emitida</span>}
                      {pay.status === 'paid' && !pay.nf_emitted && (
                        <button onClick={() => setNfModal({ open: true, paymentId: pay.id! })} style={{ fontSize: '0.6rem', color: '#f59e0b', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', padding: '1px 6px', borderRadius: 2, cursor: 'pointer' }}>Emitir NF</button>
                      )}
                    </div>
                    {pay.status === 'paid' && pay.paid_at && <div style={{ fontSize: '0.68rem', color: '#22c55e', marginTop: 2 }}>Pago em {fmt(pay.paid_at)}</div>}
                  </div>
                  <select value={pay.payment_method || 'PIX'} onChange={e => updatePaymentField(pay.id!, 'payment_method', e.target.value)} disabled={pay.status === 'paid'} style={{ background: 'var(--black)', border: '1px solid var(--gray3)', color: 'var(--mid)', borderRadius: 2, padding: '4px 6px', fontSize: '0.72rem', width: '100%' }}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input type="date" value={pay.due_date || ''} onChange={e => updatePaymentField(pay.id!, 'due_date', e.target.value)} disabled={pay.status === 'paid'} style={{ background: 'var(--black)', border: '1px solid var(--gray3)', color: pay.status === 'overdue' ? 'var(--alert)' : 'var(--white)', borderRadius: 2, padding: '4px 6px', fontSize: '0.72rem', width: '100%' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--mid)', fontFamily: 'var(--fd)', fontWeight: 700 }}>{pay.installment}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--fd)', fontWeight: 900, fontSize: '0.9rem', color: statusColor[pay.status] }}>{fmtBRL(pay.amount)}</div>
                    <div style={{ fontSize: '0.62rem', color: statusColor[pay.status], marginTop: 2 }}>{statusLabel2[pay.status]}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {pay.status !== 'paid'
                      ? <button onClick={() => markPaid(pay.id!)} style={{ background: '#22c55e', color: '#000', fontFamily: 'var(--fd)', fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 2, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>✓ Pago</button>
                      : <button onClick={() => markUnpaid(pay.id!)} style={{ background: 'transparent', color: '#555', fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 2, border: '1px solid #333', cursor: 'pointer', whiteSpace: 'nowrap' }}>Reverter</button>
                    }
                    <button onClick={() => deletePayment(pay.id!)} style={{ background: 'transparent', color: '#555', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '4px' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══════ PROPOSTAS */}
        {view === 'proposals' && (
          <>
            <div className="admin-header">
              <div className="admin-header-inner">
                <div>
                  <h1 className="admin-title"><span className="ghost">Propostas</span><span className="red">Comerciais</span></h1>
                  <p className="admin-sub">Crie, gerencie e envie propostas personalizadas para cada cliente</p>
                </div>
                <button className="btn-sm red" style={{ fontSize: '.9rem', padding: '13px 26px' }} onClick={() => openModal()}>+ Nova Proposta</button>
              </div>
            </div>

            <div className="stats-row">
              <div className="stat-card"><div className="stat-n">{totalProposals}</div><div className="stat-l">Total</div></div>
              <div className="stat-card"><div className="stat-n"><span className="accent">{sent}</span></div><div className="stat-l">Enviadas</div></div>
              <div className="stat-card"><div className="stat-n">{approved}</div><div className="stat-l">Aprovadas</div></div>
              <div className="stat-card"><div className="stat-n">{fmtBRL(volumeTotal)}</div><div className="stat-l">Volume Total</div></div>
            </div>

            <div className="proposals-section">
              <div className="section-head">
                <div className="section-title-row">
                  <span className="section-title">Todas as Propostas</span>
                  <span className="section-count">{totalProposals}</span>
                </div>
              </div>
              <div className="cards-grid">
                {totalProposals === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <div className="empty-title">Nenhuma proposta ainda</div>
                    <div className="empty-sub">Clique em "Nova Proposta" para começar</div>
                  </div>
                ) : activeProposals.map(p => <ProposalCard key={p.id} p={p} />)}
              </div>
            </div>

            {archivedProposals.length > 0 && (
              <div className="proposals-section" style={{ marginTop: 40 }}>
                <div className="section-head" onClick={() => setShowArchived(v => !v)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div className="section-title-row">
                    <span className="section-title" style={{ color: '#555' }}>{showArchived ? '▾' : '▸'} Propostas Arquivadas</span>
                    <span className="section-count" style={{ background: '#1C1C1C', color: '#555' }}>{archivedProposals.length}</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#444', marginTop: 4 }}>Clique para {showArchived ? 'ocultar' : 'expandir'}</p>
                </div>
                {showArchived && (
                  <div className="cards-grid" style={{ marginTop: 16 }}>
                    {archivedProposals.map(p => <ProposalCard key={p.id} p={p} archived />)}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {view === 'usuarios' && <UsersPanel />}

        {view === 'portfolio' && <PortfolioPanel />}
      </div>

      {/* MODAL PROPOSTA */}
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
              {!editingId && (
                <div className="form-group full" style={{ marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Gerar com IA</label>
                    <span style={{ fontSize: '0.68rem', color: 'var(--mid)' }}>Cole um briefing e a IA preenche os campos automaticamente</span>
                  </div>
                  <BriefingGenerator onGenerated={handleBriefingGenerated} />
                </div>
              )}
              {!editingId && (
                <div className="form-group full" style={{ marginTop: 4 }}>
                  <label className="form-label" style={{ marginBottom: 8 }}>Ou comece de um template</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {PROPOSAL_TEMPLATES.map(t => (
                      <button key={t.id} type="button" onClick={() => applyTemplate(t)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.04em', textTransform: 'uppercase', padding: '9px 14px', borderRadius: 2, cursor: 'pointer', border: '1px solid var(--gray3)', background: 'var(--gray2)', color: 'var(--white)' }}>
                        <span style={{ fontSize: '1rem' }}>{t.icon}</span>{t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <hr className="form-divider" />
              <div className="form-section-label">Cliente &amp; Logo</div>
              <div className="form-group full">
                <label className="form-label">Logo do Cliente</label>
                <div className="logo-upload-area" onClick={() => fileInputRef.current?.click()}>
                  <div className="logo-preview-box">{logoPreview ? <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span className="logo-placeholder">🏢</span>}</div>
                  <div className="logo-upload-text"><strong>Clique para enviar a logo</strong>PNG, JPG ou SVG</div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                <div className="logo-display-row">
                  <span className="logo-display-label">Exibir como:</span>
                  <div className="toggle-group">
                    <button className={`toggle-opt${logoMode === 'original' ? ' active' : ''}`} onClick={() => setLogoMode('original')}>Original</button>
                    <button className={`toggle-opt${logoMode === 'white' ? ' active' : ''}`} onClick={() => setLogoMode('white')}>Branca</button>
                  </div>
                </div>
              </div>
              <HeroConfig mode={heroMode} setMode={setHeroMode} media={heroMedia} setMedia={setHeroMedia} format={heroFormat} setFormat={setHeroFormat} />
              {[{ id: 'client', label: 'Nome da Empresa *', placeholder: 'Cora Centro Pesquisa' }, { id: 'contact', label: 'Nome do Contato', placeholder: 'Dra. Karen' }].map(f => (
                <div key={f.id} className="form-group">
                  <label className="form-label">{f.label}</label>
                  <input className="form-input" placeholder={f.placeholder} value={(form as any)[f.id]} onChange={e => setForm(x => ({ ...x, [f.id]: e.target.value }))} />
                </div>
              ))}
              <div className="form-group full"><label className="form-label">Saudação personalizada</label><input className="form-input" placeholder="Olá, Dra. Karen!" value={form.greeting} onChange={e => setForm(x => ({ ...x, greeting: e.target.value }))} /></div>
              <div className="form-group full"><label className="form-label">Introdução</label><textarea className="form-textarea" placeholder="É um prazer apresentar esta proposta..." value={form.intro} onChange={e => setForm(x => ({ ...x, intro: e.target.value }))} /></div>
              <hr className="form-divider" />
              <div className="form-section-label">Projeto</div>
              <div className="form-group full"><label className="form-label">Título do Projeto</label><input className="form-input" placeholder="Projeto Institucional Estratégico" value={form.title} onChange={e => setForm(x => ({ ...x, title: e.target.value }))} /></div>
              <div className="form-group full"><label className="form-label">Objetivo</label><textarea className="form-textarea" placeholder="Desenvolver um projeto audiovisual..." value={form.objective} onChange={e => setForm(x => ({ ...x, objective: e.target.value }))} /></div>
              <div className="form-group full"><label className="form-label">Contexto Estratégico</label><textarea className="form-textarea" placeholder="A comunicação precisa refletir..." value={form.context} onChange={e => setForm(x => ({ ...x, context: e.target.value }))} /></div>
              <hr className="form-divider" />
              <div className="form-section-label">Pilares do Projeto</div>
              <div className="form-group full">
                <div className="dyn-list">{pillars.map((p, i) => (<div key={i} className="dyn-item"><input className="form-input" style={{ flex: 1 }} placeholder="Pilar — Autoridade" value={p.name} onChange={e => setPillars(x => x.map((it, j) => j === i ? { ...it, name: e.target.value } : it))} /><input className="form-input" style={{ flex: 2 }} placeholder="Descrição..." value={p.body} onChange={e => setPillars(x => x.map((it, j) => j === i ? { ...it, body: e.target.value } : it))} /><button className="remove-btn" onClick={() => setPillars(x => x.filter((_, j) => j !== i))}>−</button></div>))}</div>
                <button className="add-btn" onClick={() => setPillars(x => [...x, { name: '', body: '' }])}>+ Adicionar Pilar</button>
              </div>
              <hr className="form-divider" />
              <div className="form-section-label">Como Trabalhamos — Etapas</div>
              <div className="form-group full">
                <div className="dyn-list">{steps.map((s, i) => (<div key={i} className="dyn-item"><input className="form-input" style={{ flex: 1 }} placeholder="Nome da Etapa" value={s.title} onChange={e => setSteps(x => x.map((it, j) => j === i ? { ...it, title: e.target.value } : it))} /><input className="form-input" style={{ flex: 2 }} placeholder="Descrição..." value={s.desc} onChange={e => setSteps(x => x.map((it, j) => j === i ? { ...it, desc: e.target.value } : it))} /><button className="remove-btn" onClick={() => setSteps(x => x.filter((_, j) => j !== i))}>−</button></div>))}</div>
                <button className="add-btn" onClick={() => setSteps(x => [...x, { title: '', desc: '' }])}>+ Adicionar Etapa</button>
              </div>
              <hr className="form-divider" />
              <div className="form-section-label">Entregáveis</div>
              <div className="form-group full">
                <div className="dyn-list">{deliverables.map((d, i) => (<div key={i} className="dyn-item" style={{ position: 'relative' }}><div className="emoji-picker-wrap"><button className="emoji-btn" onClick={() => setActiveEmojiIdx(activeEmojiIdx === i ? null : i)}>{d.icon}</button><div className={`emoji-dropdown${activeEmojiIdx === i ? '' : ' hidden'}`}>{EMOJIS.map(em => <div key={em} className="emoji-opt" onClick={() => { setDeliverables(x => x.map((it, j) => j === i ? { ...it, icon: em } : it)); setActiveEmojiIdx(null) }}>{em}</div>)}</div></div><input className="form-input" style={{ flex: 1.2 }} placeholder="Nome" value={d.name} onChange={e => setDeliverables(x => x.map((it, j) => j === i ? { ...it, name: e.target.value } : it))} /><input className="form-input" style={{ flex: 2 }} placeholder="Descrição..." value={d.body} onChange={e => setDeliverables(x => x.map((it, j) => j === i ? { ...it, body: e.target.value } : it))} /><button className="remove-btn" onClick={() => setDeliverables(x => x.filter((_, j) => j !== i))}>−</button></div>))}</div>
                <button className="add-btn" onClick={() => setDeliverables(x => [...x, { icon: '🎬', name: '', body: '' }])}>+ Adicionar Entregável</button>
              </div>
              <hr className="form-divider" />
              <div className="form-section-label">Investimento</div>
              <div className="form-group full">
                <div className="dyn-list">{services.map((s, i) => (<div key={i} className="dyn-item"><input className="form-input" style={{ flex: 1.5 }} placeholder="Serviço" value={s.name} onChange={e => setServices(x => x.map((it, j) => j === i ? { ...it, name: e.target.value } : it))} /><input className="form-input" style={{ flex: 2 }} placeholder="Descrição" value={s.desc} onChange={e => setServices(x => x.map((it, j) => j === i ? { ...it, desc: e.target.value } : it))} /><input className="form-input" style={{ width: 105, flexShrink: 0 }} type="number" placeholder="Valor" value={s.value || ''} onChange={e => setServices(x => x.map((it, j) => j === i ? { ...it, value: parseFloat(e.target.value) || 0 } : it))} /><button className="remove-btn" onClick={() => setServices(x => x.filter((_, j) => j !== i))}>−</button></div>))}</div>
                <button className="add-btn" onClick={() => setServices(x => [...x, { name: '', desc: '', value: 0 }])}>+ Adicionar Serviço</button>
              </div>
              <hr className="form-divider" />
              <div className="form-section-label">Cronograma</div>
              <div className="form-group full">
                <div className="dyn-list">{timeline.map((t, i) => (<div key={i} className="dyn-item"><input className="form-input" style={{ width: 82, flexShrink: 0 }} placeholder="Fase 01" value={t.phase} onChange={e => setTimeline(x => x.map((it, j) => j === i ? { ...it, phase: e.target.value } : it))} /><input className="form-input" style={{ flex: 1 }} placeholder="Nome da fase" value={t.name} onChange={e => setTimeline(x => x.map((it, j) => j === i ? { ...it, name: e.target.value } : it))} /><input className="form-input" style={{ flex: 2 }} placeholder="Item 1, Item 2, ..." value={t.items} onChange={e => setTimeline(x => x.map((it, j) => j === i ? { ...it, items: e.target.value } : it))} /><button className="remove-btn" onClick={() => setTimeline(x => x.filter((_, j) => j !== i))}>−</button></div>))}</div>
                <button className="add-btn" onClick={() => setTimeline(x => [...x, { phase: '', name: '', items: '' }])}>+ Adicionar Fase</button>
              </div>
              <hr className="form-divider" />
              <div className="form-section-label">Forma de Pagamento</div>
              <div className="form-group full">
                <div className="dyn-list">{paymentTerms.map((pt, i) => (
                  <div key={i} className="dyn-item">
                    <input className="form-input" style={{ flex: 1.2 }} placeholder="Na Aprovação" value={pt.label} onChange={e => setPaymentTerms(x => x.map((it, j) => j === i ? { ...it, label: e.target.value } : it))} />
                    <input className="form-input" style={{ width: 68, flexShrink: 0 }} type="number" min={0} max={100} placeholder="%" value={pt.percent || ''} onChange={e => setPaymentTerms(x => x.map((it, j) => j === i ? { ...it, percent: parseInt(e.target.value) || 0 } : it))} />
                    <input className="form-input" style={{ flex: 2 }} placeholder="Descrição (ex: entrada na assinatura)" value={pt.desc} onChange={e => setPaymentTerms(x => x.map((it, j) => j === i ? { ...it, desc: e.target.value } : it))} />
                    <button className="remove-btn" onClick={() => setPaymentTerms(x => x.filter((_, j) => j !== i))}>−</button>
                  </div>
                ))}</div>
                <button className="add-btn" onClick={() => setPaymentTerms(x => [...x, { label: '', percent: 0, desc: '' }])}>+ Adicionar Parcela</button>
                {(() => { const soma = paymentTerms.reduce((s, p) => s + (p.percent || 0), 0); return (
                  <div style={{ fontSize: '0.72rem', color: soma === 100 ? 'var(--mid)' : '#FFB400', marginTop: 8 }}>
                    Soma das parcelas: {soma}% {soma === 100 ? '✓' : '— o ideal é fechar 100% do valor'}
                  </div>
                ) })()}
              </div>
              <hr className="form-divider" />
              <div className="form-section-label">Condições</div>
              <div className="form-group"><label className="form-label">Validade (dias úteis)</label><input className="form-input" type="number" min={1} max={60} value={form.validity} onChange={e => setForm(x => ({ ...x, validity: parseInt(e.target.value) || 5 }))} /></div>
              <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => setForm(x => ({ ...x, status: e.target.value as Proposal['status'] }))}><option value="pending">Rascunho</option><option value="sent">Enviada</option><option value="approved">Aprovada</option><option value="expired">Expirada</option></select></div>
            </div>
            <div className="form-actions">
              <button className="btn-sm ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn-main" onClick={saveProposal} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Proposta →'}</button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL PROJETO RETROATIVO */}
      {finModalOpen && (
        <div onClick={() => setFinModalOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(8,8,8,0.93)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--gray)', border: '1px solid var(--gray2)', borderRadius: 4, width: '100%', maxWidth: 580, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '22px 28px 18px', borderBottom: '1px solid var(--gray2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--gray)', zIndex: 10 }}>
              <div>
                <div style={{ fontFamily: 'var(--fd)', fontWeight: 900, fontSize: '1.2rem', textTransform: 'uppercase' }}>Projeto Retroativo</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--mid)', marginTop: 3 }}>Registre projetos anteriores à plataforma</div>
              </div>
              <button onClick={() => setFinModalOpen(false)} style={{ background: 'none', border: '1px solid var(--gray3)', color: 'var(--mid)', width: 28, height: 28, borderRadius: 2, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '22px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">Nome do Projeto / Cliente *</label>
                <input className="form-input" placeholder="Ex: Mais Afro — Cobertura de Evento" value={finForm.project_label} onChange={e => setFinForm(f => ({ ...f, project_label: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Valor Total</label>
                  <input className="form-input" type="number" placeholder="4500" value={finForm.total} onChange={e => { setFinForm(f => ({ ...f, total: e.target.value })); if (finForm.installments > 0) adjustParcelas(finForm.installments) }} />
                </div>
                <div>
                  <label className="form-label">Nº de Parcelas</label>
                  <input className="form-input" type="number" min={1} max={12} value={finForm.installments} onChange={e => adjustParcelas(parseInt(e.target.value) || 1)} />
                </div>
                <div>
                  <label className="form-label">Forma de Pagamento</label>
                  <select className="form-input" value={finForm.payment_method} onChange={e => setFinForm(f => ({ ...f, payment_method: e.target.value }))}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--mid)', marginBottom: 10 }}>Parcelas</div>
                {finParcelas.map((p, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input className="form-input" placeholder={`Descrição parcela ${i + 1}`} value={p.description} onChange={e => setFinParcelas(x => x.map((it, j) => j === i ? { ...it, description: e.target.value } : it))} />
                    <input className="form-input" type="number" placeholder="Valor" value={p.amount} onChange={e => setFinParcelas(x => x.map((it, j) => j === i ? { ...it, amount: e.target.value } : it))} />
                    <input className="form-input" type="date" value={p.due_date} onChange={e => setFinParcelas(x => x.map((it, j) => j === i ? { ...it, due_date: e.target.value } : it))} />
                    <div onClick={() => setFinParcelas(x => x.map((it, j) => j === i ? { ...it, paid: !it.paid } : it))} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '6px 10px', borderRadius: 2, border: `1px solid ${p.paid ? 'rgba(34,197,94,0.4)' : 'var(--gray3)'}`, background: p.paid ? 'rgba(34,197,94,0.08)' : 'transparent', whiteSpace: 'nowrap' }}>
                      <div style={{ width: 14, height: 14, borderRadius: 2, background: p.paid ? '#22c55e' : 'transparent', border: `2px solid ${p.paid ? '#22c55e' : '#444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {p.paid && <span style={{ color: '#000', fontSize: '0.6rem', fontWeight: 900 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: p.paid ? '#22c55e' : 'var(--mid)', fontFamily: 'var(--fd)', fontWeight: 700 }}>Pago</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => setFinModalOpen(false)} className="btn-sm ghost">Cancelar</button>
                <button onClick={saveRetroactiveProject} disabled={savingFin} className="btn-main">{savingFin ? 'Salvando...' : 'Registrar Projeto →'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NF */}
      {nfModal.open && (
        <div onClick={() => setNfModal({ open: false, paymentId: '' })} style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(8,8,8,0.93)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--gray)', border: '1px solid var(--gray2)', borderRadius: 4, width: '100%', maxWidth: 400, padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🧾</div>
            <div style={{ fontFamily: 'var(--fd)', fontWeight: 900, fontSize: '1.2rem', textTransform: 'uppercase', marginBottom: 8 }}>Emitir Nota Fiscal?</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--mid)', lineHeight: 1.7, marginBottom: 24 }}>
              Pagamento registrado com sucesso. Lembre de emitir a nota fiscal correspondente pelo emissor nacional do governo.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { window.open('https://www.nfse.gov.br/EmissorNacional/Login?ReturnUrl=%2fEmissorNacional', '_blank'); markNfEmitted(nfModal.paymentId) }} style={{ flex: 1, background: 'var(--red)', color: 'var(--white)', fontFamily: 'var(--fd)', fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: 13, borderRadius: 2, border: 'none', cursor: 'pointer' }}>
                Emitir NF →
              </button>
              <button onClick={() => setNfModal({ open: false, paymentId: '' })} style={{ flex: 1, background: 'transparent', color: 'var(--mid)', fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: 13, borderRadius: 2, border: '1px solid var(--gray3)', cursor: 'pointer' }}>
                Emitir depois
              </button>
            </div>
            <button onClick={() => markNfEmitted(nfModal.paymentId)} style={{ marginTop: 10, width: '100%', background: 'transparent', color: '#555', fontFamily: 'var(--fd)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px', borderRadius: 2, border: 'none', cursor: 'pointer' }}>
              Já emiti — marcar como emitida
            </button>
          </div>
        </div>
      )}

      {parcelModal.open && parcelModal.proposal && (() => {
        const total = calcTotal(parcelModal.proposal.services || [])
        const n = Math.max(1, parseInt(String(parcelForm.count)) || 1)
        const per = n > 0 ? total / n : 0
        const fld = { width: '100%', background: '#080808', border: '1px solid #2E2E2E', color: '#F5F3EF', borderRadius: 2, padding: '8px 10px', fontSize: '0.85rem' } as const
        const lbl = { display: 'block', fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', marginBottom: 5 } as const
        return (
          <div onClick={() => setParcelModal({ open: false, proposal: null })} style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(8,8,8,0.93)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#111', border: '1px solid #1C1C1C', borderRadius: 4, width: '100%', maxWidth: 440, overflow: 'hidden' }}>
              <div style={{ padding: '22px 28px 18px', borderBottom: '1px solid #1C1C1C' }}>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase' }}>Gerar Parcelas</div>
                <div style={{ fontSize: '0.78rem', color: '#888', marginTop: 4 }}>{parcelModal.proposal.client} · {fmtBRL(total)}</div>
              </div>
              <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Nº de parcelas</label>
                    <input type="number" min={1} max={36} value={parcelForm.count} onChange={e => setParcelForm(f => ({ ...f, count: parseInt(e.target.value) || 1 }))} style={fld} />
                  </div>
                  <div>
                    <label style={lbl}>Método</label>
                    <select value={parcelForm.method} onChange={e => setParcelForm(f => ({ ...f, method: e.target.value }))} style={fld}>
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>1ª parcela em</label>
                    <input type="date" value={parcelForm.firstDate} onChange={e => setParcelForm(f => ({ ...f, firstDate: e.target.value }))} style={fld} />
                  </div>
                  <div>
                    <label style={lbl}>Intervalo (dias)</label>
                    <input type="number" min={0} value={parcelForm.intervalDays} onChange={e => setParcelForm(f => ({ ...f, intervalDays: parseInt(e.target.value) || 0 }))} style={fld} />
                  </div>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#888' }}>
                  {n}x de <strong style={{ color: '#F5F3EF' }}>{fmtBRL(per)}</strong> no {parcelForm.method}
                </div>
              </div>
              <div style={{ padding: '14px 28px 22px', display: 'flex', gap: 10 }}>
                <button onClick={() => setParcelModal({ open: false, proposal: null })} style={{ flex: 1, background: 'transparent', color: '#888', border: '1px solid #2E2E2E', borderRadius: 2, padding: 13, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={confirmGenerateParcelas} style={{ flex: 1, background: '#E8321A', color: '#F5F3EF', border: 'none', borderRadius: 2, padding: 13, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Gerar {n} parcela(s)</button>
              </div>
            </div>
          </div>
        )
      })()}

      <div className={`toast${toast.show ? ' show' : ''}`}>
        <div className="toast-dot" />
        <span>{toast.msg}</span>
      </div>
    </>
  )
}
