import type { BlogPost, BlogPostStatus, BlogTag } from '@/types/blog';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

let posts: BlogPost[] = [];

export function getBlogPosts(filters?: {
  status?: BlogPostStatus;
  tag?: BlogTag;
  search?: string;
  autor_id?: string;
}): BlogPost[] {
  let result = [...posts];
  if (filters?.status) result = result.filter(p => p.status === filters.status);
  if (filters?.tag) result = result.filter(p => p.tags.includes(filters.tag!));
  if (filters?.autor_id) result = result.filter(p => p.autor_id === filters.autor_id);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(p =>
      p.titulo.toLowerCase().includes(q) ||
      p.excerpt.toLowerCase().includes(q) ||
      p.autor_nome.toLowerCase().includes(q) ||
      p.tags.some(t => t.includes(q))
    );
  }
  return result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export function getBlogPostById(id: string): BlogPost | undefined {
  return posts.find(p => p.id === id);
}

export function createBlogPost(data: {
  titulo: string;
  excerpt: string;
  conteudo: string;
  cover_image_url?: string;
  tags: BlogTag[];
  autor_id: string;
  autor_nome: string;
}): BlogPost {
  const post: BlogPost = {
    id: `bp-${Date.now()}`,
    autor_id: data.autor_id,
    autor_nome: data.autor_nome,
    titulo: data.titulo,
    slug: slugify(data.titulo),
    excerpt: data.excerpt,
    conteudo: data.conteudo,
    cover_image_url: data.cover_image_url,
    tags: data.tags,
    status: 'rascunho',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  posts = [post, ...posts];
  return post;
}

export function updateBlogPost(id: string, data: Partial<Pick<BlogPost, 'titulo' | 'excerpt' | 'conteudo' | 'cover_image_url' | 'tags'>>): BlogPost | undefined {
  const idx = posts.findIndex(p => p.id === id);
  if (idx === -1) return undefined;
  posts[idx] = {
    ...posts[idx],
    ...data,
    slug: data.titulo ? slugify(data.titulo) : posts[idx].slug,
    updated_at: new Date().toISOString(),
  };
  return posts[idx];
}

export function deleteBlogPost(id: string): boolean {
  const len = posts.length;
  posts = posts.filter(p => p.id !== id);
  return posts.length < len;
}

export function submitForReview(id: string): BlogPost | undefined {
  const idx = posts.findIndex(p => p.id === id);
  if (idx === -1 || posts[idx].status !== 'rascunho') return undefined;
  posts[idx] = { ...posts[idx], status: 'pendente', updated_at: new Date().toISOString() };
  return posts[idx];
}

export function approveBlogPost(id: string): BlogPost | undefined {
  const idx = posts.findIndex(p => p.id === id);
  if (idx === -1 || posts[idx].status !== 'pendente') return undefined;
  posts[idx] = {
    ...posts[idx],
    status: 'publicado',
    aprovado_por: 'Coord. Allos',
    aprovado_em: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return posts[idx];
}

export function cancelSubmission(id: string): BlogPost | undefined {
  const idx = posts.findIndex(p => p.id === id);
  if (idx === -1 || posts[idx].status !== 'pendente') return undefined;
  posts[idx] = { ...posts[idx], status: 'rascunho', updated_at: new Date().toISOString() };
  return posts[idx];
}

export function rejectBlogPost(id: string): BlogPost | undefined {
  const idx = posts.findIndex(p => p.id === id);
  if (idx === -1 || posts[idx].status !== 'pendente') return undefined;
  posts[idx] = { ...posts[idx], status: 'rascunho', updated_at: new Date().toISOString() };
  return posts[idx];
}

export function getRelatedPosts(postId: string, limit = 3): BlogPost[] {
  const post = getBlogPostById(postId);
  if (!post) return [];
  return posts
    .filter(p => p.id !== postId && p.status === 'publicado' && p.tags.some(t => post.tags.includes(t)))
    .slice(0, limit);
}
