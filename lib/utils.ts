export function fmtBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export function fmtDate(d?: string | null): string {
  if (!d) return '—'
  const dt = new Date(d + (d.includes('T') ? '' : 'T00:00:00'))
  return dt.toLocaleDateString('pt-BR')
}

export function addWorkdays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    const w = d.getDay()
    if (w !== 0 && w !== 6) added++
  }
  return d.toISOString().slice(0, 10)
}

export function calcTotal(services?: { value: number }[]): number {
  return (services || []).reduce((s, x) => s + (x.value || 0), 0)
}

export function statusLabel(s?: string): string {
  return ({ pending: 'Rascunho', sent: 'Enviada', approved: 'Aprovada', expired: 'Expirada' } as Record<string, string>)[s || ''] || s || ''
}

export const DEFAULT_STEPS = [
  { title: 'Reunião Estratégica', desc: 'Alinhamento de objetivos, narrativa e direcionamento criativo.' },
  { title: 'Roteiro & Planejamento', desc: 'Construção de narrativa e roteiros direcionados ao público.' },
  { title: 'Execução', desc: 'Realização do projeto conforme planejamento acordado.' },
  { title: 'Revisão & Ajustes', desc: 'Apresentação dos materiais e rodadas de ajuste inclusas.' },
  { title: 'Entrega Final', desc: 'Entrega de todos os arquivos nos formatos acordados.' },
]

export const EMOJIS = ['🎬','📷','📱','🖥️','🎙️','🎞️','📽️','🎥','✏️','📋','📊','🗂️','📁','💡','⭐','🏆','🎯','🔑','💎','🔥','⚡','🚀','🌟','💼','📢','📣','🎨','🖌️','✅','🔗','📸','🎤','🎵','🎶','🏥','🩺','🔬','💊','🧬','🌐','🤝','📈','💬','🗣️','🎓']
