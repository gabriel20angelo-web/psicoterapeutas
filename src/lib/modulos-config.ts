// ═══════════════════════════════════════════════════
// Configuração de Módulos Visíveis
// ═══════════════════════════════════════════════════

const STORAGE_KEY = "allos-modulos-config";

export interface ModuloConfig {
  id: string;
  label: string;
  descricao: string;
  href: string;
  icone: string;
  ativo: boolean;
  fixo: boolean;
}

export const MODULOS_DISPONIVEIS: ModuloConfig[] = [
  { id: "painel",    label: "Painel",    descricao: "Visão geral do dia e alertas",                 href: "/",            icone: "layout-dashboard", ativo: true, fixo: true },
  { id: "agenda",    label: "Agenda",    descricao: "Calendário de sessões e compromissos",         href: "/agenda",      icone: "calendar-days",    ativo: true, fixo: true },
  { id: "pacientes", label: "Pacientes", descricao: "Cadastro e histórico clínico",                 href: "/pacientes",   icone: "users",            ativo: true, fixo: true },
  { id: "psidocs",   label: "PsiDocs",   descricao: "Gerador de documentos psicológicos",           href: "/psidocs",     icone: "file-text",        ativo: true, fixo: false },
  { id: "usina",     label: "Usina",     descricao: "Produção e planejamento de conteúdo para redes sociais", href: "/conteudo", icone: "sparkles", ativo: true, fixo: false },
  { id: "forja",     label: "Forja",     descricao: "Timer Pomodoro, tarefas e produtividade",      href: "/forja",       icone: "flame",            ativo: true, fixo: false },
  { id: "blog",      label: "Blog",      descricao: "Seus artigos e reflexões",                     href: "/blog",        icone: "book-open",        ativo: true, fixo: false },
  { id: "academico", label: "Acadêmico", descricao: "Organização acadêmica completa",               href: "/academico",   icone: "graduation-cap",   ativo: true, fixo: false },
];

// ─── LOAD / SAVE ───

export function getModulosConfig(): ModuloConfig[] {
  if (typeof window === "undefined") return MODULOS_DISPONIVEIS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return MODULOS_DISPONIVEIS;
    const savedStates: Record<string, boolean> = JSON.parse(stored);
    return MODULOS_DISPONIVEIS.map(m => ({
      ...m,
      ativo: m.fixo ? true : (savedStates[m.id] ?? m.ativo),
    }));
  } catch {
    return MODULOS_DISPONIVEIS;
  }
}

export function saveModulosConfig(config: ModuloConfig[]) {
  const states: Record<string, boolean> = {};
  config.forEach(m => { if (!m.fixo) states[m.id] = m.ativo; });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
}

export function toggleModulo(id: string): ModuloConfig[] {
  const config = getModulosConfig();
  const modulo = config.find(m => m.id === id);
  if (modulo && !modulo.fixo) {
    modulo.ativo = !modulo.ativo;
    saveModulosConfig(config);
  }
  return config;
}

export function setModuloAtivo(id: string, ativo: boolean): ModuloConfig[] {
  const config = getModulosConfig();
  const modulo = config.find(m => m.id === id);
  if (modulo && !modulo.fixo) {
    modulo.ativo = ativo;
    saveModulosConfig(config);
  }
  return config;
}

export function getModulosAtivos(): ModuloConfig[] {
  return getModulosConfig().filter(m => m.ativo);
}

export function getModulosOpcionais(): ModuloConfig[] {
  return getModulosConfig().filter(m => !m.fixo);
}
