// ─── Produção de Conteúdo para Redes Sociais ───

// ─── TYPES ───

export type Plataforma = "instagram" | "tiktok" | "youtube" | "linkedin" | "twitter";
export type Formato = "reels" | "carrossel" | "stories" | "post" | "video_longo" | "thread";

export type StatusProjeto = "ideia" | "elaboracao" | "roteiro" | "revisao" | "agendado" | "publicado" | "arquivado";
export type TipoReferencia = "perfil" | "video" | "imagem" | "roteiro" | "estilo" | "outro";
export type TipoStories = "interacao" | "bastidores" | "reflexao" | "autoridade" | "presenca" | "engajamento";
export type CategoriaTemplate =
  | "educativo_gancho"
  | "contraste"
  | "cta"
  | "venda"
  | "reflexivo"
  | "engajamento"
  | "posicionamento"
  | "stories_interativo"
  | "stories_autoridade"
  | "carrossel_educativo";

// ─── INTERFACES ───

export interface Projeto {
  id: string;
  titulo: string;
  descricao: string;
  plataforma: Plataforma;
  formato: Formato;
  status: StatusProjeto;
  tags: string[];
  data_publicacao?: string;
  data_criacao: string;
  referencia_ids: string[];
  template_id?: string;
  favorito: boolean;
  notas_edicao?: string;
}

export interface Roteiro {
  id: string;
  projeto_id: string;
  gancho: string;
  desenvolvimento: string;
  cta: string;
  falas: string;
  cortes: string;
  observacoes_edicao: string;
  duracao_estimada: string;
  versao: number;
}

export interface Referencia {
  id: string;
  titulo: string;
  descricao: string;
  tipo: TipoReferencia;
  url?: string;
  plataforma?: Plataforma;
  tags: string[];
  data_criacao: string;
  projeto_ids: string[];
}

export interface StoryItem {
  ordem: number;
  tipo: "texto" | "enquete" | "pergunta" | "quiz" | "video" | "foto" | "reflexao";
  conteudo: string;
  notas: string;
}

export interface StoriesSequencia {
  id: string;
  titulo: string;
  descricao: string;
  tipo: TipoStories;
  stories: StoryItem[];
  data_criacao: string;
}

export interface TemplateConteudo {
  id: string;
  nome: string;
  descricao: string;
  categoria: CategoriaTemplate;
  plataforma: Plataforma;
  formato: Formato;
  estrutura: string;
  exemplo: string;
  favorito: boolean;
}

export interface RoteiroMensagem {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// ─── CONSTANTS ───

export const PLATAFORMA_INFO: Record<Plataforma, { label: string; icon: string; cor: string }> = {
  instagram: { label: "Instagram", icon: "instagram", cor: "#E1306C" },
  tiktok: { label: "TikTok", icon: "music", cor: "#00F2EA" },
  youtube: { label: "YouTube", icon: "youtube", cor: "#FF0000" },
  linkedin: { label: "LinkedIn", icon: "linkedin", cor: "#0A66C2" },
  twitter: { label: "X / Twitter", icon: "twitter", cor: "#1DA1F2" },
};

export const FORMATO_INFO: Record<Formato, { label: string; icon: string }> = {
  reels: { label: "Reels / Short", icon: "clapperboard" },
  carrossel: { label: "Carrossel", icon: "gallery-horizontal" },
  stories: { label: "Stories", icon: "smartphone" },
  post: { label: "Post", icon: "file-text" },
  video_longo: { label: "Vídeo longo", icon: "video" },
  thread: { label: "Thread", icon: "messages-square" },
};

export const STATUS_CONTEUDO: Record<StatusProjeto, { label: string; cor: string; bg: string; icon: string }> = {
  ideia: { label: "Ideia", cor: "var(--text-secondary)", bg: "var(--bg-hover)", icon: "lightbulb" },
  elaboracao: { label: "Elaboração", cor: "#8B5CF6", bg: "rgba(139,92,246,.1)", icon: "pencil" },
  roteiro: { label: "Roteiro", cor: "#D97706", bg: "rgba(217,119,6,.1)", icon: "scroll-text" },
  revisao: { label: "Revisão", cor: "#0EA5E9", bg: "rgba(14,165,233,.1)", icon: "eye" },
  agendado: { label: "Agendado", cor: "#6366F1", bg: "rgba(99,102,241,.1)", icon: "calendar-clock" },
  publicado: { label: "Publicado", cor: "var(--green-text)", bg: "var(--green-bg)", icon: "check-circle" },
  arquivado: { label: "Arquivado", cor: "#6B7280", bg: "rgba(107,114,128,.1)", icon: "archive" },
};

export const TIPO_REFERENCIA_INFO: Record<TipoReferencia, { label: string; icon: string; cor: string }> = {
  perfil: { label: "Perfil", icon: "user", cor: "#8B5CF6" },
  video: { label: "Vídeo", icon: "play-circle", cor: "#EF4444" },
  imagem: { label: "Imagem", icon: "image", cor: "#10B981" },
  roteiro: { label: "Roteiro", icon: "scroll-text", cor: "#F59E0B" },
  estilo: { label: "Estilo", icon: "palette", cor: "#EC4899" },
  outro: { label: "Outro", icon: "file", cor: "#6B7280" },
};

export const TIPO_STORIES_INFO: Record<TipoStories, { label: string; icon: string; cor: string }> = {
  interacao: { label: "Interação", icon: "message-circle", cor: "#3B82F6" },
  bastidores: { label: "Bastidores", icon: "camera", cor: "#F59E0B" },
  reflexao: { label: "Reflexão", icon: "brain", cor: "#8B5CF6" },
  autoridade: { label: "Autoridade", icon: "award", cor: "#10B981" },
  presenca: { label: "Presença", icon: "eye", cor: "#EC4899" },
  engajamento: { label: "Engajamento", icon: "heart", cor: "#EF4444" },
};

export const CATEGORIA_TEMPLATE_INFO: Record<CategoriaTemplate, { label: string; icon: string; cor: string }> = {
  educativo_gancho: { label: "Educativo (Gancho)", icon: "graduation-cap", cor: "#3B82F6" },
  contraste: { label: "Contraste", icon: "columns", cor: "#8B5CF6" },
  cta: { label: "CTA", icon: "megaphone", cor: "#F59E0B" },
  venda: { label: "Venda", icon: "shopping-bag", cor: "#10B981" },
  reflexivo: { label: "Reflexivo", icon: "brain", cor: "#6366F1" },
  engajamento: { label: "Engajamento", icon: "heart", cor: "#EF4444" },
  posicionamento: { label: "Posicionamento", icon: "target", cor: "#0EA5E9" },
  stories_interativo: { label: "Stories Interativo", icon: "message-circle", cor: "#EC4899" },
  stories_autoridade: { label: "Stories Autoridade", icon: "award", cor: "#14B8A6" },
  carrossel_educativo: { label: "Carrossel Educativo", icon: "gallery-horizontal", cor: "#D97706" },
};

// ─── STORAGE KEYS ───

const STORAGE_PROJETOS = "allos-conteudo-projetos";
const STORAGE_ROTEIROS = "allos-conteudo-roteiros";
const STORAGE_REFERENCIAS = "allos-conteudo-referencias";
const STORAGE_STORIES = "allos-conteudo-stories";
const CHAT_KEY = "allos-conteudo-chat";

// ─── MOCK DATA — PROJETOS ───

const MOCK_PROJETOS: Projeto[] = [];

// ─── MOCK DATA — ROTEIROS ───

const MOCK_ROTEIROS: Roteiro[] = [];

// ─── MOCK DATA — REFERÊNCIAS ───

const MOCK_REFERENCIAS: Referencia[] = [];

// ─── MOCK DATA — STORIES SEQUÊNCIAS ───

const MOCK_STORIES: StoriesSequencia[] = [];

// ─── MOCK DATA — TEMPLATES ───

export const TEMPLATES: TemplateConteudo[] = [
  {
    id: "t1",
    nome: "Reels Educativo — Gancho + Conteúdo + CTA",
    descricao: "Estrutura clássica para reels de psicoeducação com gancho forte nos primeiros 3 segundos.",
    categoria: "educativo_gancho",
    plataforma: "instagram",
    formato: "reels",
    estrutura: "1. GANCHO (0-3s): Frase impactante ou pergunta provocativa\n2. PROBLEMA (3-8s): Contextualizar a dor do público\n3. CONTEÚDO (8-25s): 3 pontos principais com linguagem simples\n4. VIRADA (25-28s): Insight transformador\n5. CTA (28-30s): Chamada para ação (salvar, seguir, comentar)",
    exemplo: "GANCHO: \"Você sabia que 70% das pessoas com ansiedade nem sabem que têm?\"\nPROBLEMA: \"A gente normaliza sintomas que na verdade são sinais importantes...\"\nCONTEÚDO:\n• Irritabilidade constante não é \"temperamento\"\n• Dificuldade de dormir não é \"estresse normal\"\n• Evitar situações sociais não é \"ser introvertido\"\nVIRADA: \"Reconhecer é o primeiro passo. E você já deu ele agora.\"\nCTA: \"Salva esse vídeo pra lembrar. E se conhece alguém que precisa ouvir isso, compartilha.\"",
    favorito: true,
  },
  {
    id: "t2",
    nome: "Carrossel — Mito vs Realidade",
    descricao: "Formato de carrossel que desmistifica crenças populares sobre saúde mental.",
    categoria: "carrossel_educativo",
    plataforma: "instagram",
    formato: "carrossel",
    estrutura: "Slide 1: Título chamativo + \"Mitos sobre [tema]\"\nSlides 2-6: MITO vs REALIDADE (um por slide)\nSlide 7: Resumo + reflexão\nSlide 8: CTA + logo Allos",
    exemplo: "Slide 1: \"5 MITOS sobre terapia que você precisa parar de acreditar\"\nSlide 2: MITO: \"Terapia é só pra quem tá mal\" -> REALIDADE: \"Terapia é ferramenta de autoconhecimento\"\nSlide 3: MITO: \"Terapeuta dá conselho\" -> REALIDADE: \"Terapeuta facilita suas próprias descobertas\"\n...",
    favorito: true,
  },
  {
    id: "t3",
    nome: "Post LinkedIn — Storytelling Profissional",
    descricao: "Post com narrativa pessoal para engajamento profissional no LinkedIn.",
    categoria: "posicionamento",
    plataforma: "linkedin",
    formato: "post",
    estrutura: "Linha 1: Frase de impacto (ganha o clique em \"ver mais\")\nParágrafo 1: História pessoal ou caso (anonimizado)\nParágrafo 2: Reflexão profissional\nParágrafo 3: Aprendizado compartilhável\nFechamento: Pergunta aberta para engajamento\nHashtags: 3-5 relevantes",
    exemplo: "Na semana passada um paciente me disse algo que me fez repensar toda a minha prática.\n\n\"Doutora, eu vim aqui achando que ia receber respostas. Mas você me ensinou a fazer as perguntas certas.\"\n\nIsso resume o que eu acredito sobre terapia...",
    favorito: false,
  },
  {
    id: "t4",
    nome: "Thread Twitter — Lista Educativa",
    descricao: "Thread com lista numerada para conteúdo educativo no Twitter/X.",
    categoria: "engajamento",
    plataforma: "twitter",
    formato: "thread",
    estrutura: "Tweet 1: Gancho + \"Abre a thread\"\nTweets 2-8: Um ponto por tweet, numerado\nTweet final: Resumo + CTA para RT",
    exemplo: "7 coisas que ninguém te conta sobre ansiedade (thread)\n\n1/ Ansiedade não é fraqueza. É o seu cérebro tentando te proteger — só que no momento errado.\n\n2/ \"Pensa positivo\" não funciona...",
    favorito: false,
  },
  {
    id: "t5",
    nome: "Reels Contraste — Antes vs Depois",
    descricao: "Formato de reels que usa contraste visual e narrativo para mostrar transformações ou comparações.",
    categoria: "contraste",
    plataforma: "instagram",
    formato: "reels",
    estrutura: "1. SETUP (0-3s): \"Todo mundo pensa que [crença comum]...\"\n2. ANTES (3-12s): Mostrar o cenário equivocado/antigo com tom dramático\n3. TRANSIÇÃO (12-14s): Corte seco ou efeito visual marcante\n4. DEPOIS (14-24s): Mostrar a realidade/novo cenário com tom positivo\n5. REFLEXÃO (24-28s): Frase que conecta os dois lados\n6. CTA (28-30s): Engajamento",
    exemplo: "SETUP: \"Como as pessoas acham que é terapia vs como realmente é\"\nANTES: Pessoa deitada no divã, terapeuta calado anotando (clichê de filme)\nTRANSIÇÃO: *corte seco*\nDEPOIS: Conversa acolhedora, risadas, momentos de reflexão, ferramentas práticas\nREFLEXÃO: \"Terapia não é sobre deitar e falar. É sobre se levantar com mais clareza.\"\nCTA: \"Marca alguém que precisa perder o medo de começar.\"",
    favorito: false,
  },
  {
    id: "t6",
    nome: "Reels Venda Suave — Problema + Solução + Convite",
    descricao: "Estrutura de reels para promover serviços terapêuticos de forma ética e empática, sem ser apelativo.",
    categoria: "venda",
    plataforma: "instagram",
    formato: "reels",
    estrutura: "1. DOR (0-5s): Descrever um problema real que o público sente\n2. VALIDAÇÃO (5-10s): Normalizar a experiência (\"e isso é mais comum do que você imagina\")\n3. CAMINHO (10-20s): Mostrar que existe um processo para lidar com isso\n4. SOLUÇÃO (20-25s): Apresentar a terapia como ferramenta (não como produto)\n5. CONVITE (25-30s): CTA suave e acolhedor",
    exemplo: "DOR: \"Você sente que tá sempre cansado, mas não consegue identificar o porquê?\"\nVALIDAÇÃO: \"Isso acontece com milhares de pessoas. E não, não é preguiça.\"\nCAMINHO: \"Muitas vezes, o cansaço crônico é emocional. É o peso de coisas que a gente não processou.\"\nSOLUÇÃO: \"Na terapia, a gente aprende a identificar essas cargas e, aos poucos, colocar elas no lugar.\"\nCONVITE: \"Se você se identificou, o link na bio é o primeiro passo. Sem pressa, no seu ritmo.\"",
    favorito: true,
  },
  {
    id: "t7",
    nome: "Stories Interativo — Enquete + Educação",
    descricao: "Sequência de stories que usa enquetes e caixas de perguntas para educar de forma interativa.",
    categoria: "stories_interativo",
    plataforma: "instagram",
    formato: "stories",
    estrutura: "Story 1: ENQUETE provocativa (2 opções simples)\nStory 2: RESULTADO + explicação educativa\nStory 3: APROFUNDAMENTO com dado ou curiosidade\nStory 4: ENQUETE de follow-up ou caixa de perguntas\nStory 5: FECHAMENTO com reflexão e CTA (\"manda DM\", \"salva\")",
    exemplo: "Story 1: Enquete — \"Você acha que chorar é sinal de fraqueza?\" (Sim / Não)\nStory 2: \"Se você votou SIM: vem comigo que vou te mostrar por que chorar é um superpoder.\"\nStory 3: \"Chorar libera ocitocina e endorfina — hormônios que reduzem dor e estresse. Seu corpo SABE o que faz.\"\nStory 4: Caixa de perguntas — \"Quando foi a última vez que você se permitiu chorar?\"\nStory 5: \"Permita-se sentir. Isso não te faz fraco — te faz humano. Se precisar de um espaço seguro pra isso, minha DM tá aberta.\"",
    favorito: false,
  },
  {
    id: "t8",
    nome: "Stories Autoridade — Caso + Insight Profissional",
    descricao: "Sequência de stories que posiciona o terapeuta como autoridade através de casos anonimizados e insights clínicos.",
    categoria: "stories_autoridade",
    plataforma: "instagram",
    formato: "stories",
    estrutura: "Story 1: CASO anonimizado (\"Hoje atendi alguém que...\")\nStory 2: O QUE PERCEBI como profissional\nStory 3: INSIGHT clínico (o que está por trás do comportamento)\nStory 4: APRENDIZADO universal (o que isso ensina pra todos)\nStory 5: CTA profissional (\"Se você é terapeuta, me conta se já viveu isso\")",
    exemplo: "Story 1: \"Hoje, durante uma sessão, percebi algo que me marcou.\"\nStory 2: \"O paciente disse que estava 'bem'. Mas o corpo dizia outra coisa — ombros tensos, mãos inquietas, olhar distante.\"\nStory 3: \"Na psicologia, chamamos isso de incongruência. Quando a fala não acompanha o corpo, tem algo importante ali.\"\nStory 4: \"Quantas vezes você diz que tá bem... mas não tá? Prestar atenção no seu corpo é um ato de autocuidado.\"\nStory 5: \"Profissionais: vocês também observam a linguagem corporal? Me conta como isso aparece no consultório de vocês.\"",
    favorito: false,
  },
];

// ─── MOCK DATA — CHAT ───

const MOCK_CHAT: RoteiroMensagem[] = [];

// ─── BOT RESPONSE ───

function generateBotResponse(input: string): string {
  const lower = input.toLowerCase();

  if (lower.includes("reels") || lower.includes("reel") || lower.includes("tiktok")) {
    return "Ótima escolha! Reels e TikTok são perfeitos para conteúdo de psicoeducação. Aqui vai uma sugestão de roteiro:\n\n**GANCHO (0-3s)**\n\"Você faz isso quando está ansioso e nem percebe...\"\n\n**DESENVOLVIMENTO (3-20s)**\nMostrar 3 comportamentos comuns:\n• Checagem excessiva do celular\n• Roer unhas ou mexer no cabelo\n• Evitar responder mensagens\n\n**VIRADA (20-25s)**\n\"Esses são sinais do seu corpo pedindo atenção. E tudo bem.\"\n\n**CTA (25-30s)**\n\"Salva e manda pra alguém que precisa ouvir isso.\"\n\n---\nQuer que eu adapte o tema ou formato?";
  }

  if (lower.includes("carrossel") || lower.includes("carousel")) {
    return "Vamos montar um carrossel! Sugiro o formato **Mito vs Realidade** que gera muito engajamento.\n\n**Slide 1 (Capa)**\n\"5 coisas que você acha que sabe sobre terapia — mas não sabe\"\n\n**Slide 2**\n❌ MITO: Terapia é só conversa\n✅ REALIDADE: Terapia usa técnicas baseadas em evidências científicas\n\n**Slide 3**\n❌ MITO: Só vai quem está \"mal\"\n✅ REALIDADE: Autoconhecimento é prevenção\n\n**Slide 4**\n❌ MITO: O terapeuta dá conselhos\n✅ REALIDADE: Ele facilita suas próprias descobertas\n\n**Slide 5**\n❌ MITO: Demora anos pra funcionar\n✅ REALIDADE: Mudanças começam nas primeiras sessões\n\n**Slide 6 (CTA)**\n\"Qual desses mitos você já acreditou? Comenta aqui 👇\"\n\nQuer que eu refine algum slide?";
  }

  if (lower.includes("legenda") || lower.includes("caption")) {
    return "Claro! Aqui vai uma legenda engajante:\n\n---\n\nVocê já parou pra pensar por que algumas semanas parecem mais pesadas que outras? 🤔\n\nNão é sobre ser forte ou fraco.\nÉ sobre reconhecer que o seu corpo fala — e aprender a ouvir.\n\nNa clínica, vejo muitas pessoas que normalizam sinais importantes:\n→ Insônia constante\n→ Irritabilidade sem motivo\n→ Aquele nó na garganta que não passa\n\nSe você se identificou com algum desses, saiba: buscar ajuda não é fraqueza. É inteligência emocional.\n\n💬 Salva esse post e manda pra alguém que precisa ler isso hoje.\n\n#saudemental #psicologia #terapia #ansiedade #autocuidado\n\n---\nQuer que eu ajuste o tom ou o tema?";
  }

  if (lower.includes("série") || lower.includes("serie") || lower.includes("sequência")) {
    return "Vamos planejar uma série de conteúdo! Aqui vai uma sugestão para 1 semana:\n\n📅 **Série: \"Saúde Mental no Dia a Dia\"**\n\n**Segunda** — Reels: \"3 hábitos matinais que reduzem ansiedade\"\n**Terça** — Stories: Enquete \"Você dorme bem?\" + dicas de higiene do sono\n**Quarta** — Carrossel: \"Emoções não são boas nem más — são informações\"\n**Quinta** — Post: Reflexão sobre autocuidado para profissionais\n**Sexta** — Reels: \"Quando é hora de buscar terapia?\"\n**Sábado** — Stories: Indicação de livro/filme sobre o tema da semana\n**Domingo** — Descanso 😌\n\nQuer que eu desenvolva o roteiro de algum dia específico?";
  }

  return "Posso te ajudar com:\n\n🎬 **Roteiro para Reels/TikTok** — me diz o tema\n📑 **Carrossel educativo** — mito vs realidade, listas, passo a passo\n📝 **Legenda engajante** — com CTA e hashtags\n🧵 **Thread para Twitter/X** — conteúdo em formato lista\n📅 **Série de conteúdo** — planejamento semanal\n💡 **Ideias de conteúdo** — baseadas em temas de psicologia\n\nÉ só me dizer o que você precisa! Pode ser algo como:\n• \"Cria um roteiro de reels sobre ansiedade\"\n• \"Faz um carrossel sobre mitos da terapia\"\n• \"Escreve uma legenda para um post sobre autocuidado\"";
}

// ─── CRUD — PROJETOS ───

export function getProjetos(filters?: { status?: StatusProjeto; plataforma?: Plataforma; favorito?: boolean }): Projeto[] {
  let projetos: Projeto[];
  if (typeof window === "undefined") {
    projetos = MOCK_PROJETOS;
  } else {
    try {
      const stored = localStorage.getItem(STORAGE_PROJETOS);
      projetos = stored ? JSON.parse(stored) : MOCK_PROJETOS;
    } catch {
      projetos = MOCK_PROJETOS;
    }
  }

  if (filters) {
    if (filters.status) projetos = projetos.filter((p) => p.status === filters.status);
    if (filters.plataforma) projetos = projetos.filter((p) => p.plataforma === filters.plataforma);
    if (filters.favorito !== undefined) projetos = projetos.filter((p) => p.favorito === filters.favorito);
  }

  return projetos;
}

function saveProjetos(projetos: Projeto[]) {
  localStorage.setItem(STORAGE_PROJETOS, JSON.stringify(projetos));
}

export function createProjeto(data: Omit<Projeto, "id" | "data_criacao">): Projeto {
  const projetos = getProjetos();
  const novo: Projeto = {
    ...data,
    id: `p-${Date.now()}`,
    data_criacao: new Date().toISOString(),
  };
  projetos.unshift(novo);
  saveProjetos(projetos);
  return novo;
}

export function updateProjeto(id: string, data: Partial<Projeto>) {
  const projetos = getProjetos();
  const idx = projetos.findIndex((p) => p.id === id);
  if (idx !== -1) {
    projetos[idx] = { ...projetos[idx], ...data };
    saveProjetos(projetos);
  }
}

export function deleteProjeto(id: string) {
  const projetos = getProjetos().filter((p) => p.id !== id);
  saveProjetos(projetos);
}

// ─── CRUD — ROTEIROS ───

function getAllRoteiros(): Roteiro[] {
  if (typeof window === "undefined") return MOCK_ROTEIROS;
  try {
    const stored = localStorage.getItem(STORAGE_ROTEIROS);
    return stored ? JSON.parse(stored) : MOCK_ROTEIROS;
  } catch {
    return MOCK_ROTEIROS;
  }
}

function saveAllRoteiros(roteiros: Roteiro[]) {
  localStorage.setItem(STORAGE_ROTEIROS, JSON.stringify(roteiros));
}

export function getRoteiro(projetoId: string): Roteiro | undefined {
  const roteiros = getAllRoteiros();
  return roteiros.find((r) => r.projeto_id === projetoId);
}

export function saveRoteiro(roteiro: Roteiro): Roteiro {
  const roteiros = getAllRoteiros();
  const idx = roteiros.findIndex((r) => r.id === roteiro.id);
  if (idx !== -1) {
    roteiros[idx] = roteiro;
  } else {
    roteiros.push({ ...roteiro, id: roteiro.id || `rot-${Date.now()}` });
  }
  saveAllRoteiros(roteiros);
  return roteiro;
}

// ─── CRUD — REFERÊNCIAS ───

export function getReferencias(filters?: { tipo?: TipoReferencia; plataforma?: Plataforma }): Referencia[] {
  let referencias: Referencia[];
  if (typeof window === "undefined") {
    referencias = MOCK_REFERENCIAS;
  } else {
    try {
      const stored = localStorage.getItem(STORAGE_REFERENCIAS);
      referencias = stored ? JSON.parse(stored) : MOCK_REFERENCIAS;
    } catch {
      referencias = MOCK_REFERENCIAS;
    }
  }

  if (filters) {
    if (filters.tipo) referencias = referencias.filter((r) => r.tipo === filters.tipo);
    if (filters.plataforma) referencias = referencias.filter((r) => r.plataforma === filters.plataforma);
  }

  return referencias;
}

function saveReferencias(referencias: Referencia[]) {
  localStorage.setItem(STORAGE_REFERENCIAS, JSON.stringify(referencias));
}

export function createReferencia(data: Omit<Referencia, "id" | "data_criacao">): Referencia {
  const referencias = getReferencias();
  const nova: Referencia = {
    ...data,
    id: `r-${Date.now()}`,
    data_criacao: new Date().toISOString(),
  };
  referencias.unshift(nova);
  saveReferencias(referencias);
  return nova;
}

export function deleteReferencia(id: string) {
  const referencias = getReferencias().filter((r) => r.id !== id);
  saveReferencias(referencias);
}

export function linkReferencia(referenciaId: string, projetoId: string) {
  const referencias = getReferencias();
  const ref = referencias.find((r) => r.id === referenciaId);
  if (ref && !ref.projeto_ids.includes(projetoId)) {
    ref.projeto_ids.push(projetoId);
    saveReferencias(referencias);
  }

  const projetos = getProjetos();
  const proj = projetos.find((p) => p.id === projetoId);
  if (proj && !proj.referencia_ids.includes(referenciaId)) {
    proj.referencia_ids.push(referenciaId);
    saveProjetos(projetos);
  }
}

// ─── CRUD — STORIES SEQUÊNCIAS ───

export function getStoriesSequencias(): StoriesSequencia[] {
  if (typeof window === "undefined") return MOCK_STORIES;
  try {
    const stored = localStorage.getItem(STORAGE_STORIES);
    return stored ? JSON.parse(stored) : MOCK_STORIES;
  } catch {
    return MOCK_STORIES;
  }
}

function saveStoriesSequencias(stories: StoriesSequencia[]) {
  localStorage.setItem(STORAGE_STORIES, JSON.stringify(stories));
}

export function createStoriesSequencia(data: Omit<StoriesSequencia, "id" | "data_criacao">): StoriesSequencia {
  const stories = getStoriesSequencias();
  const nova: StoriesSequencia = {
    ...data,
    id: `s-${Date.now()}`,
    data_criacao: new Date().toISOString(),
  };
  stories.unshift(nova);
  saveStoriesSequencias(stories);
  return nova;
}

export function deleteStoriesSequencia(id: string) {
  const stories = getStoriesSequencias().filter((s) => s.id !== id);
  saveStoriesSequencias(stories);
}

// ─── CRUD — TEMPLATES ───

export function getTemplates(): TemplateConteudo[] {
  return TEMPLATES;
}

// ─── CRUD — CHAT ───

export function getChatMessages(): RoteiroMensagem[] {
  if (typeof window === "undefined") return MOCK_CHAT;
  try {
    const stored = localStorage.getItem(CHAT_KEY);
    return stored ? JSON.parse(stored) : MOCK_CHAT;
  } catch {
    return MOCK_CHAT;
  }
}

export function sendChatMessage(content: string): RoteiroMensagem[] {
  const msgs = getChatMessages();
  const userMsg: RoteiroMensagem = {
    id: `msg-${Date.now()}`,
    role: "user",
    content,
    created_at: new Date().toISOString(),
  };
  msgs.push(userMsg);

  const response = generateBotResponse(content);
  const botMsg: RoteiroMensagem = {
    id: `msg-${Date.now() + 1}`,
    role: "assistant",
    content: response,
    created_at: new Date().toISOString(),
  };
  msgs.push(botMsg);

  localStorage.setItem(CHAT_KEY, JSON.stringify(msgs));
  return msgs;
}

// ─── BACKWARD COMPATIBILITY ───
// Aliases for old function names to avoid breaking existing imports

/** @deprecated Use getProjetos instead */
export const getIdeias = getProjetos;
/** @deprecated Use createProjeto instead */
export function createIdeia(data: Omit<Projeto, "id" | "data_criacao">): Projeto {
  return createProjeto(data);
}
/** @deprecated Use updateProjeto instead */
export function updateIdeia(id: string, data: Partial<Projeto>) {
  return updateProjeto(id, data);
}
/** @deprecated Use deleteProjeto instead */
export function deleteIdeia(id: string) {
  return deleteProjeto(id);
}

/** @deprecated Use Projeto instead */
export type ConteudoIdeia = Projeto;
