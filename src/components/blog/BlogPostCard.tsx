"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, User, Pencil, Trash2, Send } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getAllBlogTags, BLOG_STATUS_LABELS } from "@/types/blog";
import type { BlogPost } from "@/types/blog";
import { deleteBlogPost, submitForReview } from "@/lib/blog-data";
import { staggerChild } from "@/lib/animations";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  rascunho: { bg: "bg-[var(--bg-input)] border-[var(--border-default)]", text: "text-[var(--text-tertiary)]" },
  pendente: { bg: "bg-[var(--amber-bg)] border-[var(--amber-border)]", text: "text-[var(--amber-text)]" },
  publicado: { bg: "bg-[var(--green-bg)] border-[var(--green-border)]", text: "text-[var(--green-text)]" },
};

interface Props {
  post: BlogPost;
  index: number;
  onDeleted?: () => void;
}

export default function BlogPostCard({ post, index, onDeleted }: Props) {
  const initials = post.autor_nome.split(" ").map(n => n[0]).slice(0, 2).join("");
  const { profile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isOwner = post.autor_id === profile?.id;
  const isDraft = post.status === "rascunho";
  const tags = getAllBlogTags();

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteBlogPost(post.id);
    toast("Rascunho excluído", { type: "warning" });
    setShowDeleteConfirm(false);
    onDeleted?.();
  };

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Deseja enviar este artigo para revisão?")) {
      submitForReview(post.id);
      toast("Artigo enviado para revisão!", { type: "success" });
      onDeleted?.(); // refresh list
    }
  };

  return (
    <motion.div {...staggerChild(index)}>
      <Link href={`/blog/${post.id}`} className="block group">
        <div className="card-base overflow-hidden hover:cursor-pointer lift">
          {/* Cover image */}
          {post.cover_image_url ? (
            <div className="relative h-[180px] overflow-hidden">
              <img src={post.cover_image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              {post.status !== "publicado" && (
                <div className="absolute top-3 right-3">
                  <Badge {...STATUS_BADGE[post.status]} label={BLOG_STATUS_LABELS[post.status]} />
                </div>
              )}
            </div>
          ) : (
            <div className="relative h-[180px] bg-gradient-to-br from-[var(--orange-600)] to-[var(--orange-400)] flex items-center justify-center">
              <span className="font-fraunces text-4xl font-bold text-white/20">{post.titulo[0]}</span>
              {post.status !== "publicado" && (
                <div className="absolute top-3 right-3">
                  <Badge {...STATUS_BADGE[post.status]} label={BLOG_STATUS_LABELS[post.status]} />
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-5">
            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {post.tags.slice(0, 3).map(tag => (
                <span key={tag} className="font-dm text-[10px] font-semibold uppercase tracking-wider text-[var(--orange-500)] bg-[rgba(200,75,49,.08)] px-2 py-0.5 rounded-full">
                  {tags[tag] || tag}
                </span>
              ))}
            </div>

            {/* Title */}
            <h3 className="font-fraunces font-bold text-[var(--text-primary)] text-base leading-snug mb-2 line-clamp-2 group-hover:text-[var(--orange-500)] transition-colors">
              {post.titulo}
            </h3>

            {/* Excerpt */}
            <p className="font-dm text-sm text-[var(--text-secondary)] line-clamp-3 mb-4 leading-relaxed">
              {post.excerpt}
            </p>

            {/* Author + date */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--orange-500)] to-[var(--orange-400)] flex items-center justify-center">
                <span className="font-dm text-[10px] font-bold text-white">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-dm text-xs font-medium text-[var(--text-primary)] truncate">{post.autor_nome}</p>
                <p className="font-dm text-[10px] text-[var(--text-tertiary)]">
                  {format(new Date(post.updated_at), "dd MMM yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>

            {/* Draft/Owner actions */}
            {isOwner && (isDraft || post.status === "pendente") && (
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex gap-2" onClick={e => e.preventDefault()}>
                <Link href={`/blog/editar/${post.id}`} onClick={e => e.stopPropagation()}>
                  <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors">
                    <Pencil size={12} /> Editar
                  </button>
                </Link>
                {isDraft && (
                  <button onClick={handleSubmit} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                    <Send size={12} /> Enviar
                  </button>
                )}
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <button onClick={confirmDelete} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition-colors">
                      Confirmar
                    </button>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDeleteConfirm(false); }} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button onClick={handleDelete} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 size={12} /> Excluir
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
