"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Send } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import BlogTagSelect from "@/components/blog/BlogTagSelect";
import { getBlogPostById, updateBlogPost, submitForReview } from "@/lib/blog-data";
import type { BlogTag } from "@/types/blog";
import { staggerChild } from "@/lib/animations";
import { useToast } from "@/contexts/ToastContext";

const BlogEditor = dynamic(() => import("@/components/blog/BlogEditor"), { ssr: false });

export default function EditBlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const id = params.id as string;
  const post = getBlogPostById(id);

  const [titulo, setTitulo] = useState(post?.titulo || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [coverUrl, setCoverUrl] = useState(post?.cover_image_url || "");
  const [tags, setTags] = useState<BlogTag[]>(post?.tags || []);
  const [conteudo, setConteudo] = useState(post?.conteudo || "");

  if (!post) {
    return (
      <Shell>
        <div className="text-center py-20">
          <p className="font-dm text-[var(--text-tertiary)]">Artigo não encontrado.</p>
          <Link href="/blog" className="font-dm text-sm text-[var(--orange-500)] hover:underline mt-2 inline-block">Voltar ao blog</Link>
        </div>
      </Shell>
    );
  }

  const canSave = titulo.trim() && excerpt.trim();

  const handleSave = () => {
    if (!canSave) return;
    updateBlogPost(id, { titulo, excerpt, conteudo, cover_image_url: coverUrl || undefined, tags });
    toast("Artigo atualizado!", { type: "success" });
    router.push(`/blog/${id}`);
  };

  const handleSubmitForReview = () => {
    if (!canSave) return;
    updateBlogPost(id, { titulo, excerpt, conteudo, cover_image_url: coverUrl || undefined, tags });
    submitForReview(id);
    toast("Artigo enviado para revisão!", { type: "success" });
    router.push(`/blog/${id}`);
  };

  return (
    <Shell>
      <motion.div {...staggerChild(0)} className="mb-6">
        <Link href={`/blog/${id}`} className="inline-flex items-center gap-2 font-dm text-sm text-[var(--text-tertiary)] hover:text-[var(--orange-500)] transition-colors">
          <ArrowLeft size={16} /> Voltar ao artigo
        </Link>
      </motion.div>

      <motion.div {...staggerChild(1)}>
        <Card className="mb-6">
          <h1 className="font-fraunces font-bold text-xl text-[var(--text-primary)] mb-6">Editar Artigo</h1>

          <div className="space-y-5">
            <div>
              <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5 label-elegant">
                Título <span className="text-[var(--red-text)]">*</span>
              </label>
              <input value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full input-hamilton font-dm text-sm" />
            </div>

            <div>
              <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5 label-elegant">
                Resumo <span className="text-[var(--red-text)]">*</span>
              </label>
              <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2} className="w-full input-hamilton font-dm text-sm resize-y" />
            </div>

            <div>
              <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5 label-elegant">
                Imagem de capa (URL)
              </label>
              <input value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://exemplo.com/imagem.jpg" className="w-full input-hamilton font-dm text-sm" />
              {coverUrl && (
                <div className="mt-3 rounded-xl overflow-hidden border border-[var(--border-default)]" style={{ maxHeight: 200 }}>
                  <img src={coverUrl} alt="Preview" className="w-full h-full object-cover" style={{ maxHeight: 200 }} onError={e => (e.currentTarget.style.display = 'none')} />
                </div>
              )}
            </div>

            <div>
              <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-2 label-elegant">Tags</label>
              <BlogTagSelect selected={tags} onChange={setTags} />
            </div>

            <div>
              <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-2 label-elegant">Conteúdo</label>
              <BlogEditor content={conteudo} onChange={setConteudo} />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[var(--border-subtle)]">
              <Button variant="secondary" onClick={handleSave} disabled={!canSave} icon={<Save size={16} />}>
                {post.status === "publicado" ? "Atualizar" : "Salvar Rascunho"}
              </Button>
              {post.status === "rascunho" && (
                <Button onClick={handleSubmitForReview} disabled={!canSave} icon={<Send size={16} />}>
                  Enviar para Revisão
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    </Shell>
  );
}
