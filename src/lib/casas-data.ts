// ─── CASAS (Divisões Terapêuticas da Allos) ───

export interface Casa {
  id: "prisma" | "macondo" | "marmoris";
  nome: string;
  cor: string;        // hex principal
  corBg: string;      // fundo suave
  sensibilidade: string;
  lema: string;
  lider: string;
  descricao: string;
  valores: string[];
  terapeutas: number;
  pacientes: number;
}

export interface QuizQuestion {
  id: number;
  pergunta: string;
  opcoes: { texto: string; pontos: { prisma: number; macondo: number; marmoris: number } }[];
}

export interface ArenaMetric {
  id: string;
  label: string;
  unidade: string;
  valores: { prisma: number; macondo: number; marmoris: number };
}

export interface Recomendacao {
  id: string;
  casa: Casa["id"];
  tipo: "musica" | "filme" | "livro" | "citacao" | "serie" | "podcast";
  titulo: string;
  autor: string;
  curtidas: number;
}

// ─── AS TRÊS CASAS ───

export const CASAS: Casa[] = [
  {
    id: "prisma",
    nome: "Prisma",
    cor: "#2B7A9E",
    corBg: "rgba(43,122,158,0.08)",
    sensibilidade: "Psicologia Comportamental",
    lema: "Pensamento e comportamento sao inseparaveis",
    lider: "Diogo",
    descricao: "Analise sistematica e rigor conceitual. O Prisma decompoem a luz da experiencia humana em seus componentes fundamentais, buscando compreender padroes, contingencias e a funcao do comportamento no contexto de vida de cada pessoa.",
    valores: ["Rigor analitico", "Evidencia empirica", "Funcionalidade", "Precisao conceitual"],
    terapeutas: 0,
    pacientes: 0,
  },
  {
    id: "macondo",
    nome: "Macondo",
    cor: "#6C4F9E",
    corBg: "rgba(108,79,158,0.08)",
    sensibilidade: "Realismo Magico & Narrativas",
    lema: "A magia que habita no real",
    lider: "Flavia",
    descricao: "Interpretacao narrativa e transformacao. Macondo enxerga no cotidiano as camadas de sentido que escapam ao olhar apressado — cada historia de vida carrega consigo o extraordinario do ordinario, e e na narrativa que a cura se tece.",
    valores: ["Narrativa", "Simbolismo", "Transformacao", "Profundidade"],
    terapeutas: 0,
    pacientes: 0,
  },
  {
    id: "marmoris",
    nome: "Marmoris",
    cor: "#D4A574",
    corBg: "rgba(212,165,116,0.08)",
    sensibilidade: "Beleza & Sensibilidade",
    lema: "A poesia que habita na simplicidade",
    lider: "Alice Guedon",
    descricao: "Presenca atenta e conexao humana. Marmoris encontra no detalhe sutil — um gesto, um silencio, uma palavra escolhida — o caminho para o encontro genuino. A beleza nao e ornamento: e forma de conhecimento.",
    valores: ["Presenca", "Estetica", "Acolhimento", "Sensibilidade"],
    terapeutas: 0,
    pacientes: 0,
  },
];

// ─── QUIZ ───

export const QUIZ: QuizQuestion[] = [
  {
    id: 1,
    pergunta: "O que mais te atraiu na Psicologia?",
    opcoes: [
      { texto: "Entender por que as pessoas fazem o que fazem — e como mudar isso de forma sistematica", pontos: { prisma: 3, macondo: 0, marmoris: 1 } },
      { texto: "As historias humanas e como a narrativa pode transformar o sofrimento", pontos: { prisma: 0, macondo: 3, marmoris: 1 } },
      { texto: "A possibilidade de estar presente de verdade com o outro, acolher e conectar", pontos: { prisma: 0, macondo: 1, marmoris: 3 } },
    ],
  },
  {
    id: 2,
    pergunta: "Diante de um caso complexo, sua primeira reacao e:",
    opcoes: [
      { texto: "Mapear as variaveis, buscar padroes e montar uma formulacao funcional", pontos: { prisma: 3, macondo: 1, marmoris: 0 } },
      { texto: "Escutar a historia com atencao e buscar os sentidos que se escondem nas entrelinhas", pontos: { prisma: 0, macondo: 3, marmoris: 1 } },
      { texto: "Criar um espaco seguro e confiar que algo emerge do encontro autentico", pontos: { prisma: 0, macondo: 1, marmoris: 3 } },
    ],
  },
  {
    id: 3,
    pergunta: "Qual frase mais ressoa com voce?",
    opcoes: [
      { texto: "Aquilo que nao se mede nao se transforma", pontos: { prisma: 3, macondo: 0, marmoris: 0 } },
      { texto: "Somos as historias que contamos sobre nos mesmos", pontos: { prisma: 0, macondo: 3, marmoris: 1 } },
      { texto: "A cura acontece no espaco entre duas pessoas", pontos: { prisma: 1, macondo: 0, marmoris: 3 } },
    ],
  },
  {
    id: 4,
    pergunta: "Em equipe, voce tende a valorizar mais:",
    opcoes: [
      { texto: "Clareza de metas, divisao de tarefas e resultados mensuaveis", pontos: { prisma: 3, macondo: 0, marmoris: 1 } },
      { texto: "Troca de perspectivas, debates ricos e co-criacao de sentido", pontos: { prisma: 0, macondo: 3, marmoris: 1 } },
      { texto: "Conexao genuina, cuidado mutuo e construcao de confianca", pontos: { prisma: 0, macondo: 1, marmoris: 3 } },
    ],
  },
  {
    id: 5,
    pergunta: "Quando um paciente evolui, o sinal que mais te emociona e:",
    opcoes: [
      { texto: "Ver dados concretos mudando — frequencia, intensidade, funcionalidade", pontos: { prisma: 3, macondo: 0, marmoris: 1 } },
      { texto: "Ouvir a pessoa recontar sua historia de um jeito novo", pontos: { prisma: 0, macondo: 3, marmoris: 1 } },
      { texto: "Perceber uma leveza no olhar, um sorriso espontaneo, um silencio diferente", pontos: { prisma: 0, macondo: 1, marmoris: 3 } },
    ],
  },
];

// ─── ARENA (KPIs) ───

export const ARENA_MENSAL: ArenaMetric[] = [
  { id: "adimplencia", label: "Adimplencia", unidade: "%", valores: { prisma: 0, macondo: 0, marmoris: 0 } },
  { id: "sessoes", label: "Sessoes / Paciente", unidade: "", valores: { prisma: 0, macondo: 0, marmoris: 0 } },
  { id: "qualidade", label: "Qualidade", unidade: "/10", valores: { prisma: 0, macondo: 0, marmoris: 0 } },
  { id: "comparecimento", label: "Comparecimento", unidade: "%", valores: { prisma: 0, macondo: 0, marmoris: 0 } },
  { id: "ors", label: "Evolucao ORS", unidade: "pts", valores: { prisma: 0, macondo: 0, marmoris: 0 } },
];

export const ARENA_ACUMULADO: ArenaMetric[] = [
  { id: "adimplencia", label: "Adimplencia", unidade: "%", valores: { prisma: 0, macondo: 0, marmoris: 0 } },
  { id: "sessoes", label: "Sessoes / Paciente", unidade: "", valores: { prisma: 0, macondo: 0, marmoris: 0 } },
  { id: "qualidade", label: "Qualidade", unidade: "/10", valores: { prisma: 0, macondo: 0, marmoris: 0 } },
  { id: "comparecimento", label: "Comparecimento", unidade: "%", valores: { prisma: 0, macondo: 0, marmoris: 0 } },
  { id: "ors", label: "Evolucao ORS", unidade: "pts", valores: { prisma: 0, macondo: 0, marmoris: 0 } },
];

// ─── UNIVERSO CULTURAL ───

export const RECOMENDACOES: Recomendacao[] = [];

export const TIPO_RECOMENDACAO_ICONS: Record<Recomendacao["tipo"], string> = {
  musica: "🎵",
  filme: "🎬",
  livro: "📚",
  citacao: "💬",
  serie: "📺",
  podcast: "🎙️",
};

// ─── HELPERS ───

export function getCasa(id: Casa["id"]): Casa {
  return CASAS.find(c => c.id === id)!;
}

export function calcularResultadoQuiz(respostas: Record<number, number>): { prisma: number; macondo: number; marmoris: number } {
  const totais = { prisma: 0, macondo: 0, marmoris: 0 };
  for (const [qId, optIdx] of Object.entries(respostas)) {
    const question = QUIZ.find(q => q.id === Number(qId));
    if (!question) continue;
    const opt = question.opcoes[optIdx];
    if (!opt) continue;
    totais.prisma += opt.pontos.prisma;
    totais.macondo += opt.pontos.macondo;
    totais.marmoris += opt.pontos.marmoris;
  }
  const soma = totais.prisma + totais.macondo + totais.marmoris || 1;
  return {
    prisma: Math.round((totais.prisma / soma) * 100),
    macondo: Math.round((totais.macondo / soma) * 100),
    marmoris: Math.round((totais.marmoris / soma) * 100),
  };
}

export function getRecomendacoes(filters?: { casa?: Casa["id"]; tipo?: Recomendacao["tipo"] }): Recomendacao[] {
  let result = [...RECOMENDACOES];
  if (filters?.casa) result = result.filter(r => r.casa === filters.casa);
  if (filters?.tipo) result = result.filter(r => r.tipo === filters.tipo);
  return result.sort((a, b) => b.curtidas - a.curtidas);
}
