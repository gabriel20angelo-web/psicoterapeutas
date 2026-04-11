"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, CalendarDays, Globe, X, FileText, Clock, Trash2 } from "lucide-react";
import { searchGlobal, getPacientes, type SearchResult } from "@/lib/data";
import Link from "next/link";
import { useRouter } from "next/navigation";

const TYPE_ICONS: Record<string, any> = { paciente: Users, atividade: CalendarDays, anotacao: FileText };
const TYPE_LABELS: Record<string, string> = { paciente: 'Pacientes', atividade: 'Agenda', anotacao: 'Anotações' };

// ─── Notes search helpers ───
interface NoteSearchResult {
  type: 'anotacao';
  id: string;
  title: string;
  subtitle: string;
  link: string;
}

function searchNotes(query: string): NoteSearchResult[] {
  if (typeof window === 'undefined' || !query.trim()) return [];
  const q = query.toLowerCase().trim();
  const results: NoteSearchResult[] = [];
  const pacientes = getPacientes();
  const pacienteMap = new Map(pacientes.map(p => [p.id, p]));

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Session notes: allos-notes-{patientId}
      if (key.startsWith('allos-notes-')) {
        const pid = key.replace('allos-notes-', '');
        const paciente = pacienteMap.get(pid);
        if (!paciente) continue;
        try {
          const notes: Array<{ sessionId: string; date: string; content: string }> = JSON.parse(localStorage.getItem(key) || '[]');
          for (const note of notes) {
            if (note.content && note.content.toLowerCase().includes(q)) {
              const snippet = getSnippet(note.content, q);
              results.push({
                type: 'anotacao',
                id: `note-${pid}-${note.sessionId}`,
                title: `${paciente.nome} - Sessão`,
                subtitle: snippet,
                link: `/pacientes?id=${pid}&tab=anotacoes`,
              });
              if (results.length >= 3) return results;
            }
          }
        } catch { /* skip invalid */ }
      }

      // General notes: allos-general-note-{patientId}
      if (key.startsWith('allos-general-note-')) {
        const pid = key.replace('allos-general-note-', '');
        const paciente = pacienteMap.get(pid);
        if (!paciente) continue;
        const content = localStorage.getItem(key) || '';
        if (content.toLowerCase().includes(q)) {
          const snippet = getSnippet(content, q);
          results.push({
            type: 'anotacao',
            id: `general-${pid}`,
            title: `${paciente.nome} - Caso geral`,
            subtitle: snippet,
            link: `/pacientes?id=${pid}&tab=anotacoes`,
          });
          if (results.length >= 3) return results;
        }
      }
    }
  } catch { /* localStorage access error */ }

  return results;
}

function getSnippet(text: string, query: string, maxLen = 80): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, maxLen) + (text.length > maxLen ? '...' : '');
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + query.length + 50);
  let snippet = text.slice(start, end).replace(/\n/g, ' ');
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  return snippet;
}

// ─── Recent searches helpers ───
const RECENT_SEARCHES_KEY = 'recent-searches';
const MAX_RECENT = 5;

function loadRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (!query.trim()) return;
  const recents = loadRecentSearches().filter(r => r !== query.trim());
  recents.unshift(query.trim());
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recents.slice(0, MAX_RECENT)));
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<(SearchResult | NoteSearchResult)[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isMac, setIsMac] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.platform));
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(true); }
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setRecentSearches(loadRecentSearches());
    }
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => {
      const baseResults = searchGlobal(query);
      const noteResults = searchNotes(query);
      setResults([...baseResults, ...noteResults]);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  // Reset selectedIndex when query changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  // Build flat list of results for keyboard navigation
  const flatResults = results;

  const handleSelectResult = useCallback((link: string) => {
    if (query.trim()) saveRecentSearch(query);
    router.push(link);
    setOpen(false);
    setQuery("");
  }, [query, router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev >= flatResults.length - 1 ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev <= 0 ? flatResults.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < flatResults.length) {
      e.preventDefault();
      handleSelectResult(flatResults[selectedIndex].link);
    } else if (e.key === 'Enter' && query.trim()) {
      // Save search on Enter even if no result is selected
      saveRecentSearch(query);
    } else if (e.key === 'Tab') {
      // Focus trap: prevent Tab from leaving the modal
      e.preventDefault();
    }
  }, [flatResults, selectedIndex, query, handleSelectResult]);

  const grouped = results.reduce<Record<string, (SearchResult | NoteSearchResult)[]>>((acc, r) => {
    (acc[r.type] = acc[r.type] || []).push(r);
    return acc;
  }, {});

  // Track the running index across groups for matching selectedIndex
  let runningIndex = 0;

  const handleClickRecentSearch = (term: string) => {
    setQuery(term);
  };

  const handleClearRecents = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--orange-500)] transition-colors w-full max-w-[180px] sm:max-w-[280px]"
      >
        <Search size={14} />
        <span className="font-dm text-sm flex-1 text-left">Buscar...</span>
        <kbd className="font-dm text-[10px] bg-[var(--bg-input)] px-1.5 py-0.5 rounded text-[var(--text-secondary)] border border-[var(--border-subtle)]">{isMac ? '⌘K' : 'Ctrl+K'}</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <div
            className="fixed inset-0 z-command flex items-start justify-center pt-[15vh]"
            role="dialog"
            aria-modal="true"
            ref={modalRef}
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-[520px] mx-4 bg-[var(--bg-card-elevated)] rounded-2xl border border-[var(--border-default)] overflow-hidden"
              style={{ boxShadow: "0 8px 32px rgba(0,0,0,.25)" }}
              onKeyDown={handleKeyDown}
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-default)]">
                <Search size={18} className="text-[var(--text-secondary)] flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar pacientes, atividades, anotações..."
                  className="flex-1 font-dm text-sm bg-transparent outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                />
                <button onClick={() => setOpen(false)} aria-label="Fechar busca"><X size={16} className="text-[var(--text-secondary)]" /></button>
              </div>

              <div className="max-h-[400px] overflow-y-auto" role="listbox">
                {query && results.length === 0 && (
                  <p className="p-6 text-center font-dm text-sm text-[var(--text-tertiary)]">Nenhum resultado para &ldquo;{query}&rdquo;</p>
                )}
                {Object.entries(grouped).map(([type, items]) => {
                  const Icon = TYPE_ICONS[type as keyof typeof TYPE_ICONS];
                  return (
                    <div key={type}>
                      <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-hover)]">
                        <Icon size={14} className="text-[var(--text-secondary)]" />
                        <span className="font-dm text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                          {TYPE_LABELS[type as keyof typeof TYPE_LABELS]}
                        </span>
                      </div>
                      {items.map(r => {
                        const currentIndex = runningIndex++;
                        const isSelected = currentIndex === selectedIndex;
                        return (
                          <Link
                            key={r.id}
                            href={r.link}
                            onClick={() => { handleSelectResult(r.link); }}
                            role="option"
                            aria-selected={isSelected}
                            className={`flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors ${isSelected ? 'bg-[rgba(var(--accent-glow),0.1)]' : ''}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-dm text-sm font-medium text-[var(--text-primary)] truncate">{r.title}</p>
                              <p className="font-dm text-xs text-[var(--text-secondary)] truncate">{r.subtitle}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Recent searches - shown when query is empty */}
                {!query && recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-hover)]">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-[var(--text-secondary)]" />
                        <span className="font-dm text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                          Recentes
                        </span>
                      </div>
                      <button
                        onClick={handleClearRecents}
                        className="flex items-center gap-1 font-dm text-[11px] text-[var(--text-tertiary)] hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={11} />
                        Limpar recentes
                      </button>
                    </div>
                    {recentSearches.map((term, i) => (
                      <button
                        key={`recent-${i}`}
                        onClick={() => handleClickRecentSearch(term)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors w-full text-left"
                      >
                        <Search size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
                        <span className="font-dm text-sm text-[var(--text-primary)]">{term}</span>
                      </button>
                    ))}
                  </div>
                )}

                {!query && recentSearches.length === 0 && (
                  <p className="p-6 text-center font-dm text-sm text-[var(--text-tertiary)]">Digite para buscar em pacientes, agenda e anotações</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
