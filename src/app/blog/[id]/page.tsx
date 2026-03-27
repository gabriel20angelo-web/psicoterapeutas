"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Edit3, Trash2, CheckCircle2, XCircle, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import BlogContent from "@/components/blog/BlogContent";
import BlogPostCard from "@/components/blog/BlogPostCard";
import { getBlogPostById, approveBlogPost, rejectBlogPost, deleteBlogPost, getRelatedPosts, cancelSubmission } from "@/lib/blog-data";
import { BLOG_TAG_LABELS, BLOG_STATUS_LABELS } from "@/types/blog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { staggerChild } from "@/lib/animations";
import { useToast } from "@/contexts/ToastContext";

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  rascunho: { bg: "bg-[var(--bg-input)] border-[var(--border-default)]", text: "text-[var(--text-tertiary)]" },
  pendente: { bg: "bg-[var(--amber-bg)] border-[var(--amber-border)]", text: "text-[var(--amber-text)]" },
  publicado: { bg: "bg-[var(--green-bg)] border-[var(--green-border)]", text: "text-[var(--green-text)]" },
};

export default function BlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);

  const id = params.id as string;
  const post = getBlogPostById(id);
  const related = post ? getRelatedPosts(id) : [];

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

  const isOwner = post.autor_id === "t-001";
  const isAdmin = true;
  const initials = post.autor_nome.split(" ").map(n => n[0]).slice(0, 2).join("");

  const handleApprove = () => {
    approveBlogPost(id);
    refresh();
    toast("Artigo aprovado e publicado!", { type: "success" });
  };

  const handleReject = () => {
    rejectBlogPost(id);
    refresh();
    toast("Artigo devolvido para rascunho", { type: "warning" });
  };

  const handleDelete = () => {
    if (confirm("Excluir este artigo permanentemente?")) {
      deleteBlogPost(id);
      toast("Artigo excluído", { type: "info" });
      router.push("/blog");
    }
  };

  return (
    <Shell>
      {/* Back link */}
      <motion.div {...staggerChild(0)} className="mb-6">
        <Link href="/blog" className="inline-flex items-center gap-2 font-dm text-sm text-[var(--text-tertiary)] hover:text-[var(--orange-500)] transition-colors">
          <ArrowLeft size={16} /> Voltar ao blog
        </Link>
      </motion.div>

      {/* Cover image */}
      {post.cover_image_url && (
        <motion.div {...staggerChild(1)} className="mb-6 rounded-2xl overflow-hidden" style={{ maxHeight: 400 }}>
          <img src={post.cover_image_url} alt="" className="w-full h-full object-cover" style={{ maxHeight: 400 }} />
        </motion.div>
      )}

      {/* Main content */}
      <motion.div {...staggerChild(2)}>
        <Card className="mb-6">
          {/* Status */}
          {post.status !== "publicado" && (
            <div className="mb-4">
              <Badge {...STATUS_BADGE[post.status]} label={BLOG_STATUS_LABELS[post.status]} />
            </div>
          )}

          {/* Title */}
          <h1 className="font-fraunces font-bold text-2xl md:text-3xl text-[var(--text-primary)] mb-4 leading-tight">
            {post.titulo}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--orange-500)] to-[var(--orange-400)] flex items-center justify-center avatar-bounce">
                <span className="font-dm text-xs font-bold text-white">{initials}</span>
              </div>
              <div>
                <p className="font-dm text-sm font-medium text-[var(--text-primary)]">{post.autor_nome}</p>
                <p className="font-dm text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                  <Calendar size={12} />
                  {format(new Date(post.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map(tag => (
                <span key={tag} className="font-dm text-[10px] font-semibold uppercase tracking-wider text-[var(--orange-500)] bg-[rgba(200,75,49,.08)] px-2 py-0.5 rounded-full">
                  {BLOG_TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          </div>

          {/* Divider */}
          <hr className="mb-6" />

          {/* Content */}
          <BlogContent html={post.conteudo} />

          {/* Admin approval bar */}
          {isAdmin && post.status === "pendente" && (
            <div className="mt-8 p-4 rounded-xl bg-[var(--amber-bg)] border border-[var(--amber-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="font-dm text-sm font-semibold text-[var(--amber-text)]">Aguardando aprovação</p>
                <p className="font-dm text-xs text-[var(--text-secondary)]">Este artigo foi enviado para revisão.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleReject} icon={<XCircle size={14} />}>
                  Devolver
                </Button>
                <Button size="sm" onClick={handleApprove} icon={<CheckCircle2 size={14} />}>
                  Aprovar
                </Button>
              </div>
            </div>
          )}

          {/* Owner actions */}
          {isOwner && (
            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex flex-wrap gap-2">
              <Link href={`/blog/editar/${post.id}`}>
                <Button variant="secondary" size="sm" icon={<Edit3 size={14} />}>Editar</Button>
              </Link>
              {post.status === 'pendente' && (
                <Button variant="secondary" size="sm" onClick={() => { cancelSubmission(post.id); toast("Envio cancelado. Artigo voltou para rascunho.", { type: "warning" }); router.refresh(); }} icon={<XCircle size={14} />}>
                  Cancelar envio
                </Button>
              )}
              <Button variant="danger" size="sm" onClick={handleDelete} icon={<Trash2 size={14} />}>Excluir</Button>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Related posts */}
      {related.length > 0 && (
        <motion.div {...staggerChild(3)}>
          <h2 className="font-fraunces font-bold text-lg text-[var(--text-primary)] mb-4">Artigos relacionados</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {related.map((p, i) => (
              <BlogPostCard key={p.id} post={p} index={i + 4} />
            ))}
          </div>
        </motion.div>
      )}
    </Shell>
  );
}
