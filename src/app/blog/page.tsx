"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Filter } from "lucide-react";
import Link from "next/link";
import Shell from "@/components/Shell";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import BlogPostCard from "@/components/blog/BlogPostCard";
import { getBlogPosts } from "@/lib/blog-data";
import { BLOG_TAG_LABELS, BLOG_STATUS_LABELS, getAllBlogTags, saveCustomBlogTag, deleteBlogTag, type BlogTag, type BlogPostStatus } from "@/types/blog";
import { useAuth } from "@/contexts/AuthContext";
import { staggerChild } from "@/lib/animations";

export default function BlogPage() {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<BlogTag | "">("");
  const [statusFilter, setStatusFilter] = useState<BlogPostStatus | "">("");
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [tags, setTags] = useState(() => getAllBlogTags());
  const [refreshKey, setRefreshKey] = useState(0);
  const { isAdmin } = useAuth();

  const posts = getBlogPosts({
    search: search || undefined,
    tag: tagFilter || undefined,
    status: statusFilter || undefined,
  });

  return (
    <Shell>
      {/* Header */}
      <motion.div {...staggerChild(0)} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-fraunces font-bold text-2xl text-[var(--text-primary)]">Blog da Comunidade</h1>
          <p className="font-dm text-sm text-[var(--text-secondary)] mt-1">Compartilhe conhecimento com a equipe</p>
        </div>
        <Link href="/blog/novo">
          <Button icon={<Plus size={16} />}>Novo Artigo</Button>
        </Link>
      </motion.div>

      {/* Filters */}
      <motion.div {...staggerChild(1)} className="card-base p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar artigos..."
              className="w-full input-hamilton font-dm text-sm !pl-10"
            />
          </div>

          {/* Tag filter */}
          <select
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value as BlogTag | "")}
            className="input-hamilton font-dm text-sm min-w-[160px]"
          >
            <option value="">Todas as tags</option>
            {Object.entries(tags).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          {isAdmin && (
            <button onClick={() => setShowTagManager(!showTagManager)} className="px-3 py-2 rounded-xl font-dm text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-colors">
              Gerenciar tags
            </button>
          )}

          {/* Status filter (admin) */}
          {isAdmin && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as BlogPostStatus | "")}
              className="input-hamilton font-dm text-sm min-w-[140px]"
            >
              <option value="">Todos os status</option>
              {(Object.entries(BLOG_STATUS_LABELS) as [BlogPostStatus, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          )}
        </div>
      </motion.div>

      {/* Tag Manager (admin) */}
      {showTagManager && isAdmin && (
        <div className="card-base p-4 mb-6 space-y-3">
          <h3 className="font-dm text-sm font-semibold text-[var(--text-primary)]">Gerenciar Tags</h3>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(tags).map(([key, label]) => (
              <span key={key} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] font-dm text-xs text-[var(--text-secondary)]">
                {label}
                <button onClick={() => { deleteBlogTag(key); setTags(getAllBlogTags()); if (tagFilter === key) setTagFilter(""); }} className="ml-0.5 text-[var(--text-tertiary)] hover:text-red-500">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              placeholder="Nova tag..."
              onKeyDown={e => {
                if (e.key === 'Enter' && newTagName.trim()) {
                  const val = newTagName.trim().toLowerCase().replace(/\s+/g, '_');
                  saveCustomBlogTag(val, newTagName.trim());
                  setTags(getAllBlogTags());
                  setNewTagName("");
                }
              }}
              className="flex-1 px-3 py-2 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] placeholder:text-[var(--text-tertiary)]"
            />
            <button onClick={() => {
              if (!newTagName.trim()) return;
              const val = newTagName.trim().toLowerCase().replace(/\s+/g, '_');
              saveCustomBlogTag(val, newTagName.trim());
              setTags(getAllBlogTags());
              setNewTagName("");
            }} className="px-4 py-2 rounded-xl bg-[var(--orange-500)] text-white font-dm text-sm font-medium hover:opacity-90">Criar</button>
          </div>
        </div>
      )}

      {/* Posts grid */}
      {posts.length === 0 ? (
        <motion.div {...staggerChild(2)}>
          <EmptyState message="Nenhum artigo encontrado" />
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((post, i) => (
            <BlogPostCard key={post.id} post={post} index={i + 2} onDeleted={() => setRefreshKey(k => k + 1)} />
          ))}
        </div>
      )}
    </Shell>
  );
}
