// Templates de proposta — modelos prontos que preenchem os campos da nova
// proposta. O usuário escolhe um, ajusta e salva.

export type ProposalTemplate = {
  id: string
  label: string
  icon: string
  data: {
    title?: string
    objective?: string
    context?: string
    intro?: string
    pillars?: { name: string; body: string }[]
    steps?: { title: string; desc: string }[]
    deliverables?: { icon: string; name: string; body: string }[]
    services?: { name: string; desc: string; value: number }[]
    timeline?: { phase: string; name: string; items: string }[]
  }
}

export const PROPOSAL_TEMPLATES: ProposalTemplate[] = [
  {
    id: 'casamento', label: 'Vídeo de Casamento', icon: '💍',
    data: {
      title: 'FILME DE CASAMENTO',
      objective: 'Registrar o dia de forma cinematográfica e emocionante, entregando um filme que faz vocês reviverem cada momento pra sempre.',
      context: 'Casamento é história, não só evento. A gente filma pra emocionar — com olhar de cinema, sem interferir no seu dia.',
      pillars: [
        { name: 'Emoção Real', body: 'Captamos os momentos verdadeiros, sem cena forçada.' },
        { name: 'Olhar de Cinema', body: 'Direção, luz e trilha pra um filme de verdade.' },
        { name: 'Entrega Cuidada', body: 'Edição caprichada e prazos combinados e cumpridos.' },
      ],
      deliverables: [
        { icon: '🎬', name: 'Filme do Casamento', body: 'Filme de 5 a 8 min, editado com trilha e cor.' },
        { icon: '🎞️', name: 'Teaser', body: 'Trailer curto de 1 min pra redes sociais.' },
        { icon: '📱', name: 'Reels', body: '2 cortes verticais pra Instagram.' },
      ],
      services: [
        { name: 'Cobertura de filmagem', desc: 'Cerimônia e festa (até 8h).', value: 4500 },
        { name: 'Edição cinematográfica', desc: 'Filme + teaser + reels, com trilha licenciada.', value: 0 },
      ],
      steps: [
        { title: 'Alinhamento', desc: 'Conversa pra entender o casal e o roteiro do dia.' },
        { title: 'Captação', desc: 'Filmagem no dia do casamento.' },
        { title: 'Edição', desc: 'Montagem, cor e trilha.' },
        { title: 'Entrega', desc: 'Filme + teaser + reels prontos.' },
      ],
      timeline: [
        { phase: 'Fase 01', name: 'Pré', items: 'Alinhamento, roteiro, cronograma do dia' },
        { phase: 'Fase 02', name: 'Captação', items: 'Filmagem da cerimônia e festa' },
        { phase: 'Fase 03', name: 'Pós', items: 'Edição, cor, trilha, entrega em até 30 dias' },
      ],
    },
  },
  {
    id: 'institucional', label: 'Vídeo Institucional', icon: '🏢',
    data: {
      title: 'VÍDEO INSTITUCIONAL',
      objective: 'Apresentar a empresa com clareza e autoridade, conectando a marca ao público certo através de um vídeo estratégico.',
      context: 'Um bom institucional não mostra só o que a empresa faz — mostra por que ela importa.',
      pillars: [
        { name: 'Posicionamento', body: 'A mensagem certa pro público certo.' },
        { name: 'Roteiro Estratégico', body: 'Narrativa que prende e comunica valor.' },
        { name: 'Produção Profissional', body: 'Imagem, som e edição de alto padrão.' },
      ],
      deliverables: [
        { icon: '🎬', name: 'Vídeo Institucional', body: 'Vídeo principal de 1 a 2 min.' },
        { icon: '📱', name: 'Cortes para Redes', body: '3 cortes verticais pra redes sociais.' },
      ],
      services: [
        { name: 'Roteiro e direção', desc: 'Roteiro estratégico e direção de conteúdo.', value: 1500 },
        { name: 'Captação', desc: 'Diária de gravação com equipe e equipamento.', value: 2000 },
        { name: 'Edição', desc: 'Montagem, cor, trilha e cortes pra redes.', value: 0 },
      ],
      steps: [
        { title: 'Briefing', desc: 'Entendimento do negócio e objetivos.' },
        { title: 'Roteiro', desc: 'Estrutura da narrativa aprovada.' },
        { title: 'Captação', desc: 'Gravação das cenas.' },
        { title: 'Edição e entrega', desc: 'Finalização e entrega dos vídeos.' },
      ],
      timeline: [
        { phase: 'Fase 01', name: 'Estratégia', items: 'Briefing, roteiro, aprovação' },
        { phase: 'Fase 02', name: 'Produção', items: 'Captação em campo' },
        { phase: 'Fase 03', name: 'Pós', items: 'Edição, cor, trilha, entrega' },
      ],
    },
  },
  {
    id: 'evento', label: 'Cobertura de Evento', icon: '🎤',
    data: {
      title: 'COBERTURA DE EVENTO',
      objective: 'Registrar o evento com foto e vídeo, entregando material pronto pra divulgação e memória da marca.',
      context: 'Evento acontece uma vez. A cobertura garante que ele continue rendendo depois — em conteúdo e autoridade.',
      pillars: [
        { name: 'Cobertura Completa', body: 'Foto e vídeo dos melhores momentos.' },
        { name: 'Entrega Rápida', body: 'Teaser no dia seguinte pra aproveitar o calor do evento.' },
        { name: 'Conteúdo Estratégico', body: 'Material pensado pra redes e divulgação.' },
      ],
      deliverables: [
        { icon: '🎬', name: 'Aftermovie', body: 'Vídeo síntese de 1 a 2 min.' },
        { icon: '📷', name: 'Fotos Selecionadas', body: 'Galeria tratada dos melhores momentos.' },
        { icon: '📱', name: 'Stories/Reels', body: 'Cortes verticais pra redes.' },
      ],
      services: [
        { name: 'Cobertura audiovisual', desc: 'Foto + vídeo do evento (até 6h).', value: 1800 },
        { name: 'Edição', desc: 'Aftermovie + tratamento de fotos + reels.', value: 0 },
      ],
      steps: [
        { title: 'Alinhamento', desc: 'Roteiro do evento e momentos-chave.' },
        { title: 'Cobertura', desc: 'Captação no dia.' },
        { title: 'Entrega', desc: 'Aftermovie, fotos e cortes.' },
      ],
      timeline: [
        { phase: 'Fase 01', name: 'Pré', items: 'Alinhamento e cronograma' },
        { phase: 'Fase 02', name: 'Evento', items: 'Cobertura de foto e vídeo' },
        { phase: 'Fase 03', name: 'Entrega', items: 'Teaser 24h + material completo' },
      ],
    },
  },
  {
    id: 'redes', label: 'Gestão de Redes', icon: '📱',
    data: {
      title: 'GESTÃO DE REDES SOCIAIS',
      objective: 'Construir presença consistente e estratégica nas redes, com conteúdo que gera autoridade e atrai clientes.',
      context: 'Rede social sem estratégia é barulho. A gente transforma presença em posicionamento e resultado.',
      pillars: [
        { name: 'Estratégia', body: 'Planejamento de conteúdo com objetivo claro.' },
        { name: 'Consistência', body: 'Presença constante e coerente.' },
        { name: 'Autoridade', body: 'Conteúdo que posiciona como referência.' },
      ],
      deliverables: [
        { icon: '📋', name: 'Planejamento Mensal', body: 'Calendário de conteúdo estratégico.' },
        { icon: '🎨', name: 'Conteúdo', body: 'Posts, stories e reels produzidos.' },
        { icon: '📊', name: 'Relatório', body: 'Métricas e ajustes mensais.' },
      ],
      services: [
        { name: 'Gestão mensal', desc: 'Estratégia, conteúdo e acompanhamento (mês).', value: 1800 },
      ],
      steps: [
        { title: 'Diagnóstico', desc: 'Análise da marca e do público.' },
        { title: 'Estratégia', desc: 'Planejamento de conteúdo e linha editorial.' },
        { title: 'Produção', desc: 'Criação e publicação.' },
        { title: 'Análise', desc: 'Métricas e otimização.' },
      ],
      timeline: [
        { phase: 'Fase 01', name: 'Estratégia', items: 'Diagnóstico e planejamento' },
        { phase: 'Fase 02', name: 'Execução', items: 'Produção e publicação' },
        { phase: 'Fase 03', name: 'Otimização', items: 'Relatório e ajustes' },
      ],
    },
  },
  {
    id: 'identidade', label: 'Identidade Visual', icon: '🎨',
    data: {
      title: 'IDENTIDADE VISUAL',
      objective: 'Criar uma identidade visual sólida e memorável, que traduz a essência da marca em todos os pontos de contato.',
      context: 'Marca forte começa por uma identidade que comunica quem você é antes mesmo de falar.',
      pillars: [
        { name: 'Estratégia de Marca', body: 'Posicionamento antes do visual.' },
        { name: 'Direção Visual', body: 'Logo, paleta e tipografia com propósito.' },
        { name: 'Aplicação', body: 'Sistema pronto pra usar em qualquer lugar.' },
      ],
      deliverables: [
        { icon: '🎨', name: 'Logo e Variações', body: 'Logo principal + versões de uso.' },
        { icon: '📖', name: 'Manual da Marca', body: 'Guia de cores, tipografia e aplicação.' },
        { icon: '📱', name: 'Kit de Redes', body: 'Templates pra redes sociais.' },
      ],
      services: [
        { name: 'Identidade visual completa', desc: 'Logo, paleta, tipografia e manual.', value: 900 },
      ],
      steps: [
        { title: 'Imersão', desc: 'Entendimento da marca e do público.' },
        { title: 'Conceito', desc: 'Direção visual e conceito criativo.' },
        { title: 'Design', desc: 'Criação da identidade.' },
        { title: 'Entrega', desc: 'Manual e arquivos finais.' },
      ],
      timeline: [
        { phase: 'Fase 01', name: 'Estratégia', items: 'Imersão e conceito' },
        { phase: 'Fase 02', name: 'Criação', items: 'Design da identidade' },
        { phase: 'Fase 03', name: 'Entrega', items: 'Manual e aplicações' },
      ],
    },
  },
]
