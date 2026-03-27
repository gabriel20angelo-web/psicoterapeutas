export type BlogPostStatus = 'rascunho' | 'pendente' | 'publicado';

export type BlogTag = string;

const BASE_TAGS: Record<string, string> = {
  saude_mental: 'Saúde Mental',
  tcc: 'TCC',
  psicanalise: 'Psicanálise',
  infantil: 'Infantil',
  casal: 'Casal e Família',
  supervisao: 'Supervisão',
  formacao: 'Formação',
  dicas: 'Dicas Práticas',
  caso_clinico: 'Caso Clínico',
  geral: 'Geral',
};

const CUSTOM_TAGS_KEY = 'allos-custom-blog-tags';

export function loadCustomBlogTags(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(CUSTOM_TAGS_KEY) || '{}'); } catch { return {}; }
}

export function saveCustomBlogTag(value: string, label: string) {
  // Sanitize value to prevent JSON issues
  const safeValue = value.replace(/[^\w-]/g, '_');
  const safeLabel = label.replace(/[\\"/]/g, '');
  const existing = loadCustomBlogTags();
  existing[safeValue] = safeLabel;
  localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(existing));
}

export function deleteCustomBlogTag(value: string) {
  const existing = loadCustomBlogTags();
  delete existing[value];
  localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(existing));
}

export function deleteBlogTag(value: string) {
  // Can delete base tags too (stored as "deleted" in custom storage)
  if (BASE_TAGS[value]) {
    const existing = loadCustomBlogTags();
    existing[`_deleted_${value}`] = 'true';
    localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(existing));
  } else {
    deleteCustomBlogTag(value);
  }
}

export function getAllBlogTags(): Record<string, string> {
  const custom = loadCustomBlogTags();
  const result: Record<string, string> = {};
  // Add base tags (unless deleted)
  for (const [k, v] of Object.entries(BASE_TAGS)) {
    if (!custom[`_deleted_${k}`]) result[k] = v;
  }
  // Add custom tags (skip _deleted_ entries)
  for (const [k, v] of Object.entries(custom)) {
    if (!k.startsWith('_deleted_')) result[k] = v;
  }
  return result;
}

// Backward compat
export const BLOG_TAG_LABELS: Record<string, string> = { ...BASE_TAGS };

export const BLOG_STATUS_LABELS: Record<BlogPostStatus, string> = {
  rascunho: 'Rascunho',
  pendente: 'Em Revisão',
  publicado: 'Publicado',
};

export interface BlogPost {
  id: string;
  autor_id: string;
  autor_nome: string;
  titulo: string;
  slug: string;
  excerpt: string;
  conteudo: string;
  cover_image_url?: string;
  tags: BlogTag[];
  status: BlogPostStatus;
  aprovado_por?: string;
  aprovado_em?: string;
  created_at: string;
  updated_at: string;
}
