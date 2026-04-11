/**
 * Notes abstraction layer — Obsidian-first with localStorage fallback.
 *
 * When running in Electron, notes are read/written directly to the
 * Obsidian vault as .md files. The Obsidian app sees the same files.
 * When Electron is not available (dev web), falls back to localStorage.
 */
import { getPaciente } from './data';

// ─── Types ───
export interface SessionNote {
  sessionId: string;
  date: string;
  content: string;
}

// ─── Helpers ───

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

function sanitizeName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

async function getPatientFolder(pacienteId: string): Promise<string | null> {
  if (!isElectron()) return null;
  const paciente = getPaciente(pacienteId);
  if (!paciente) return null;
  const vaultPath = await window.electronAPI!.vault.getPath();
  return `${vaultPath}/${sanitizeName(paciente.nome)}`;
}

function dateFromISO(isoOrDate: string): string {
  return isoOrDate.slice(0, 10);
}

// ─── Obsidian file operations ───

async function readNotesFromFolder(folder: string): Promise<SessionNote[]> {
  const api = window.electronAPI!;
  const exists = await api.fs.exists(folder);
  if (!exists) return [];

  const entries = await api.fs.listDir(folder);
  const notes: SessionNote[] = [];

  for (const entry of entries) {
    if (entry.isDirectory || !entry.name.endsWith('.md')) continue;
    const content = await api.fs.readFile(`${folder}/${entry.name}`);
    if (!content) continue;

    // Parse frontmatter to get sessionId and date
    const { frontmatter, body } = parseFrontmatter(content);
    notes.push({
      sessionId: frontmatter.sessionId || entry.name.replace('.md', ''),
      date: frontmatter.date || entry.name.replace('.md', ''),
      content: body.trim(),
    });
  }

  return notes;
}

async function writeNoteToFile(folder: string, note: SessionNote): Promise<void> {
  const api = window.electronAPI!;
  await api.fs.ensureDir(folder);
  const filename = `${dateFromISO(note.date)}.md`;
  const content = [
    '---',
    `sessionId: "${note.sessionId}"`,
    `date: ${dateFromISO(note.date)}`,
    '---',
    '',
    note.content,
    '',
  ].join('\n');
  await api.fs.writeFile(`${folder}/${filename}`, content);
}

function parseFrontmatter(raw: string): { frontmatter: Record<string, string>; body: string } {
  const fm: Record<string, string> = {};
  if (!raw.startsWith('---')) return { frontmatter: fm, body: raw };

  const endIdx = raw.indexOf('---', 3);
  if (endIdx === -1) return { frontmatter: fm, body: raw };

  const fmBlock = raw.slice(3, endIdx).trim();
  for (const line of fmBlock.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
    fm[key] = val;
  }

  return { frontmatter: fm, body: raw.slice(endIdx + 3).trim() };
}

// ─── localStorage fallback keys ───
function notesKey(pacienteId: string) { return `allos-notes-${pacienteId}`; }
function preNotesKey(pacienteId: string) { return `allos-prenotes-${pacienteId}`; }
function generalKey(pacienteId: string) { return `allos-general-note-${pacienteId}`; }

function loadLocalNotes(key: string): SessionNote[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

// ─── Public API: Session Notes ───

export async function loadSessionNotes(pacienteId: string): Promise<SessionNote[]> {
  if (!isElectron()) {
    return loadLocalNotes(notesKey(pacienteId));
  }
  const folder = await getPatientFolder(pacienteId);
  if (!folder) return loadLocalNotes(notesKey(pacienteId));
  return readNotesFromFolder(`${folder}/Sessões`);
}

export async function saveSessionNote(pacienteId: string, sessionId: string, date: string, content: string): Promise<SessionNote[]> {
  if (!isElectron()) {
    const existing = loadLocalNotes(notesKey(pacienteId));
    const updated = existing.filter(n => n.sessionId !== sessionId);
    if (content.trim()) updated.push({ sessionId, date, content: content.trim() });
    localStorage.setItem(notesKey(pacienteId), JSON.stringify(updated));
    return updated;
  }

  const folder = await getPatientFolder(pacienteId);
  if (!folder) return [];
  if (content.trim()) {
    await writeNoteToFile(`${folder}/Sessões`, { sessionId, date, content: content.trim() });
  }
  return readNotesFromFolder(`${folder}/Sessões`);
}

export async function getSessionNoteContent(pacienteId: string, sessionId: string): Promise<string> {
  const notes = await loadSessionNotes(pacienteId);
  return notes.find(n => n.sessionId === sessionId)?.content || '';
}

// ─── Public API: Pre-Session Notes ───

export async function loadPreSessionNotes(pacienteId: string): Promise<SessionNote[]> {
  if (!isElectron()) {
    return loadLocalNotes(preNotesKey(pacienteId));
  }
  const folder = await getPatientFolder(pacienteId);
  if (!folder) return loadLocalNotes(preNotesKey(pacienteId));
  return readNotesFromFolder(`${folder}/Pré-sessões`);
}

export async function savePreSessionNote(pacienteId: string, sessionId: string, date: string, content: string): Promise<SessionNote[]> {
  if (!isElectron()) {
    const existing = loadLocalNotes(preNotesKey(pacienteId));
    const updated = existing.filter(n => n.sessionId !== sessionId);
    if (content.trim()) updated.push({ sessionId, date, content: content.trim() });
    localStorage.setItem(preNotesKey(pacienteId), JSON.stringify(updated));
    return updated;
  }

  const folder = await getPatientFolder(pacienteId);
  if (!folder) return [];
  if (content.trim()) {
    await writeNoteToFile(`${folder}/Pré-sessões`, { sessionId, date, content: content.trim() });
  }
  return readNotesFromFolder(`${folder}/Pré-sessões`);
}

export async function getPreSessionNoteContent(pacienteId: string, sessionId: string): Promise<string> {
  const notes = await loadPreSessionNotes(pacienteId);
  return notes.find(n => n.sessionId === sessionId)?.content || '';
}

// ─── Public API: General Case Notes ───

export async function loadGeneralNote(pacienteId: string): Promise<string> {
  if (!isElectron()) {
    return localStorage.getItem(generalKey(pacienteId)) || '';
  }
  const folder = await getPatientFolder(pacienteId);
  if (!folder) return localStorage.getItem(generalKey(pacienteId)) || '';

  const paciente = getPaciente(pacienteId);
  const filename = `${sanitizeName(paciente?.nome || 'Geral')}.md`;
  const content = await window.electronAPI!.fs.readFile(`${folder}/${filename}`);
  if (!content) return '';

  const { body } = parseFrontmatter(content);
  return body;
}

export async function saveGeneralNote(pacienteId: string, content: string): Promise<void> {
  if (!isElectron()) {
    localStorage.setItem(generalKey(pacienteId), content);
    return;
  }
  const folder = await getPatientFolder(pacienteId);
  if (!folder) { localStorage.setItem(generalKey(pacienteId), content); return; }

  const paciente = getPaciente(pacienteId);
  const nome = sanitizeName(paciente?.nome || 'Geral');
  const md = [
    '---',
    `tags: [caso, terapia]`,
    `updated: ${new Date().toISOString().slice(0, 10)}`,
    '---',
    '',
    content,
    '',
  ].join('\n');
  await window.electronAPI!.fs.writeFile(`${folder}/${nome}.md`, md);
}

// ─── Search ───

export async function searchNotes(query: string): Promise<{ pacienteId: string; type: 'session' | 'general'; snippet: string; sessionId?: string }[]> {
  // For now, search only works with localStorage (fast, synchronous scan)
  // Obsidian has its own search — use that for vault-based notes
  if (typeof window === 'undefined') return [];
  const q = query.toLowerCase();
  const results: { pacienteId: string; type: 'session' | 'general'; snippet: string; sessionId?: string }[] = [];

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
              pacienteId, type: 'session',
              snippet: (start > 0 ? '...' : '') + note.content.slice(start, end) + (end < note.content.length ? '...' : ''),
              sessionId: note.sessionId,
            });
          }
        }
      } catch {}
    }

    if (key.startsWith('allos-general-note-')) {
      const pacienteId = key.replace('allos-general-note-', '');
      const content = localStorage.getItem(key) || '';
      if (content.toLowerCase().includes(q)) {
        const idx = content.toLowerCase().indexOf(q);
        const start = Math.max(0, idx - 30);
        const end = Math.min(content.length, idx + q.length + 30);
        results.push({
          pacienteId, type: 'general',
          snippet: (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : ''),
        });
      }
    }
  }

  return results;
}

// ─── Vault folder creation (called when creating a patient) ───

export async function createPatientVaultFolder(patientName: string): Promise<void> {
  if (!isElectron()) return;
  const vaultPath = await window.electronAPI!.vault.getPath();
  const folder = `${vaultPath}/${sanitizeName(patientName)}`;
  await window.electronAPI!.fs.ensureDir(`${folder}/Sessões`);
  await window.electronAPI!.fs.ensureDir(`${folder}/Pré-sessões`);

  // Create initial general note
  const filename = `${sanitizeName(patientName)}.md`;
  const exists = await window.electronAPI!.fs.exists(`${folder}/${filename}`);
  if (!exists) {
    const md = [
      '---',
      `tags: [caso, terapia]`,
      `created: ${new Date().toISOString().slice(0, 10)}`,
      '---',
      '',
      '',
    ].join('\n');
    await window.electronAPI!.fs.writeFile(`${folder}/${filename}`, md);
  }
}
