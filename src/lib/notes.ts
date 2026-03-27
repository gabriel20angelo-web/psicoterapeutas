/**
 * Notes abstraction layer (#30)
 *
 * Currently uses localStorage. When Supabase is connected, swap the
 * implementation here — all consumers use this module, so no other
 * files need to change.
 *
 * To migrate to Supabase:
 * 1. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * 2. Run supabase/migrations/002_anotacoes.sql
 * 3. Replace the localStorage calls below with supabase client calls
 */

// ─── Types ───
export interface SessionNote {
  sessionId: string;
  date: string;
  content: string;
}

// ─── Storage keys ───
function notesKey(pacienteId: string) { return `allos-notes-${pacienteId}`; }
function preNotesKey(pacienteId: string) { return `allos-prenotes-${pacienteId}`; }
function generalKey(pacienteId: string) { return `allos-general-note-${pacienteId}`; }

// ─── Session Notes ───
export function loadSessionNotes(pacienteId: string): SessionNote[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(notesKey(pacienteId)) || '[]');
  } catch {
    return [];
  }
}

export function saveSessionNotes(pacienteId: string, notes: SessionNote[]): void {
  localStorage.setItem(notesKey(pacienteId), JSON.stringify(notes));
}

export function saveSessionNote(pacienteId: string, sessionId: string, date: string, content: string): SessionNote[] {
  const existing = loadSessionNotes(pacienteId);
  const updated = existing.filter(n => n.sessionId !== sessionId);
  if (content.trim()) {
    updated.push({ sessionId, date, content: content.trim() });
  }
  saveSessionNotes(pacienteId, updated);
  return updated;
}

export function getSessionNoteContent(pacienteId: string, sessionId: string): string {
  const notes = loadSessionNotes(pacienteId);
  return notes.find(n => n.sessionId === sessionId)?.content || '';
}

// ─── Pre-Session Notes ───
export function loadPreSessionNotes(pacienteId: string): SessionNote[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(preNotesKey(pacienteId)) || '[]');
  } catch { return []; }
}

export function savePreSessionNote(pacienteId: string, sessionId: string, date: string, content: string): SessionNote[] {
  const existing = loadPreSessionNotes(pacienteId);
  const updated = existing.filter(n => n.sessionId !== sessionId);
  if (content.trim()) {
    updated.push({ sessionId, date, content: content.trim() });
  }
  localStorage.setItem(preNotesKey(pacienteId), JSON.stringify(updated));
  return updated;
}

export function getPreSessionNoteContent(pacienteId: string, sessionId: string): string {
  const notes = loadPreSessionNotes(pacienteId);
  return notes.find(n => n.sessionId === sessionId)?.content || '';
}

// ─── General Case Notes ───
export function loadGeneralNote(pacienteId: string): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(generalKey(pacienteId)) || '';
}

export function saveGeneralNote(pacienteId: string, content: string): void {
  localStorage.setItem(generalKey(pacienteId), content);
}

// ─── Search across all notes ───
export function searchNotes(query: string): { pacienteId: string; type: 'session' | 'general'; snippet: string; sessionId?: string }[] {
  if (typeof window === 'undefined') return [];
  const q = query.toLowerCase();
  const results: { pacienteId: string; type: 'session' | 'general'; snippet: string; sessionId?: string }[] = [];

  // Scan all localStorage keys for notes
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    if (key.startsWith('allos-notes-')) {
      const pacienteId = key.replace('allos-notes-', '');
      try {
        const notes: SessionNote[] = JSON.parse(localStorage.getItem(key) || '[]');
        for (const note of notes) {
          if (note.content.toLowerCase().includes(q)) {
            const idx = note.content.toLowerCase().indexOf(q);
            const start = Math.max(0, idx - 30);
            const end = Math.min(note.content.length, idx + q.length + 30);
            results.push({
              pacienteId,
              type: 'session',
              snippet: (start > 0 ? '...' : '') + note.content.slice(start, end) + (end < note.content.length ? '...' : ''),
              sessionId: note.sessionId,
            });
          }
        }
      } catch { /* skip malformed */ }
    }

    if (key.startsWith('allos-general-note-')) {
      const pacienteId = key.replace('allos-general-note-', '');
      const content = localStorage.getItem(key) || '';
      if (content.toLowerCase().includes(q)) {
        const idx = content.toLowerCase().indexOf(q);
        const start = Math.max(0, idx - 30);
        const end = Math.min(content.length, idx + q.length + 30);
        results.push({
          pacienteId,
          type: 'general',
          snippet: (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : ''),
        });
      }
    }
  }

  return results;
}
