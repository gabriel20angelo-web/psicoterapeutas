"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Send } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import BlogTagSelect from "@/components/blog/BlogTagSelect";
import { createBlogPost, updateBlogPost, getBlogPostById, submitForReview } from "@/lib/blog-data";
import { createConteudo } from "@/lib/usina-data";
import type { BlogTag } from "@/types/blog";
import { staggerChild } from "@/lib/animations";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";

const BlogEditor = dynamic(() => import("@/components/blog/BlogEditor"), { ssr: false });

export default function NewBlogPostPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [titulo, setTitulo] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [conteudo, setConteudo] = useState("");

  const hasContent = conteudo && conteudo !== '<p></p>' && conteudo.replace(/<[^>]*>/g, '').trim().length > 0;
  const canSave = titulo.trim() && excerpt.trim();
  const canSubmit = canSave && hasContent;
  const [savedPostId, setSavedPostId] = useState<string | null>(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const addToUsina = (postTitle: string) => {
    createConteudo({
      titulo: postTitle,
      descricao: "Post do blog",
      status: "roteiro_pronto",
    });
    toast("Conteúdo adicionado ao pipeline da Usina", { type: "success" });
  };

  const getOrCreatePost = () => {
    if (savedPostId) {
      // Update existing draft
      updateBlogPost(savedPostId, { titulo, excerpt, conteudo, cover_image_url: coverUrl || undefined, tags });
      return getBlogPostById(savedPostId)!;
    }
    // Create new
    const post = createBlogPost({ titulo, excerpt, conteudo, cover_image_url: coverUrl || undefined, tags, autor_id: profile?.id || '', autor_nome: profile?.full_name || '' });
    setSavedPostId(post.id);
    return post;
  };

  const handleSaveDraft = () => {
    if (!canSave || submitting) return;
    setSubmitting(true);
    const post = getOrCreatePost();
    toast("Rascunho salvo!", {
      type: "success",
      action: { label: "Adicionar ao pipeline da Usina", onClick: () => addToUsina(post.titulo) },
    });
    router.push(`/blog/${post.id}`);
  };

  const handleSubmit = () => {
    if (!canSave) return;
    setShowConfirmSubmit(true);
  };

  const handleConfirmedSubmit = () => {
    if (submitting) return;
    setSubmitting(true);
    setShowConfirmSubmit(false);
    const post = getOrCreatePost();
    submitForReview(post.id);
    toast("Artigo enviado para revisão!", {
      type: "success",
      action: { label: "Adicionar ao pipeline da Usina", onClick: () => addToUsina(post.titulo) },
    });
    router.push(`/blog/${post.id}`);
  };

  return (
    <Shell>
      {/* Back */}
      <motion.div {...staggerChild(0)} className="mb-6">
        <Link href="/blog" className="inline-flex items-center gap-2 font-dm text-sm text-[var(--text-tertiary)] hover:text-[var(--orange-500)] transition-colors">
          <ArrowLeft size={16} /> Voltar ao blog
        </Link>
      </motion.div>

      <motion.div {...staggerChild(1)}>
        <Card className="mb-6">
          <h1 className="font-fraunces font-bold text-xl text-[var(--text-primary)] mb-6">Novo Artigo</h1>

          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5 label-elegant">
                Título <span className="text-[var(--red-text)]">*</span>
              </label>
              <input
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="O título do seu artigo"
                className="w-full input-hamilton font-dm text-sm"
              />
            </div>

            {/* Excerpt */}
            <div>
              <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5 label-elegant">
                Resumo <span className="text-[var(--red-text)]">*</span>
              </label>
              <textarea
                value={excerpt}
                onChange={e => setExcerpt(e.target.value)}
                placeholder="Uma breve descrição que aparecerá nos cards de listagem"
                rows={2}
                className="w-full input-hamilton font-dm text-sm resize-y"
              />
            </div>

            {/* Cover image */}
            <div>
              <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5 label-elegant">
                Imagem de capa (URL)
              </label>
              <input
                value={coverUrl}
                onChange={e => setCoverUrl(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
                className="w-full input-hamilton font-dm text-sm"
              />
              {coverUrl && (
                <div className="mt-3 rounded-xl overflow-hidden border border-[var(--border-default)]" style={{ maxHeight: 200 }}>
                  <img src={coverUrl} alt="Preview" className="w-full h-full object-cover" style={{ maxHeight: 200 }} onError={e => (e.currentTarget.style.display = 'none')} />
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-2 label-elegant">
                Tags
              </label>
              <BlogTagSelect selected={tags} onChange={setTags} />
            </div>

            {/* Editor */}
            <div>
              <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-2 label-elegant">
                Conteúdo
              </label>
              <BlogEditor content={conteudo} onChange={setConteudo} />
            </div>

            {/* Confirm submit dialog */}
            {showConfirmSubmit && (
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 space-y-3">
                <p className="font-dm text-sm font-medium text-[var(--text-primary)]">
                  Tem certeza que deseja enviar o artigo para revisão?
                </p>
                <p className="font-dm text-xs text-[var(--text-tertiary)]">
                  Após enviar, o artigo ficará pendente de aprovação por um administrador. Você poderá cancelar o envio depois.
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowConfirmSubmit(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleConfirmedSubmit} icon={<Send size={14} />}>Sim, enviar</Button>
                </div>
              </div>
            )}

            {/* Actions */}
            {!showConfirmSubmit && (
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[var(--border-subtle)]">
                <Button variant="secondary" onClick={handleSaveDraft} disabled={!canSave} icon={<Save size={16} />}>
                  Salvar Rascunho
                </Button>
                <Button onClick={handleSubmit} disabled={!canSubmit} icon={<Send size={16} />}>
                  Enviar para Revisão
                </Button>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </Shell>
  );
}
