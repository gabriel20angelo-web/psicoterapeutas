// ═══════════════════════════════════════════════════
// Caso Geral — entries em cards (ordenados por data)
// ═══════════════════════════════════════════════════

import { syncSave, syncLoad, initSync } from "./sync";

export interface CasoEntry {
  id: string;
  paciente_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const KEY = "allos-caso-entries";

type Store = Record<string, CasoEntry[]>;

function uid(): string {
  return `ce-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadStore(): Store {
  return syncLoad<Store>(KEY, {});
}
function saveStore(s: Store) {
  syncSave(KEY, s);
}

export function initCasoEntriesSync(): Promise<void> {
  return initSync([KEY]);
}

export function getCasoEntries(pacienteId: string): CasoEntry[] {
  const s = loadStore();
  const list = s[pacienteId] || [];
  return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function createCasoEntry(pacienteId: string, content: string): CasoEntry {
  const now = new Date().toISOString();
  const entry: CasoEntry = {
    id: uid(),
    paciente_id: pacienteId,
    content: content.trim(),
    created_at: now,
    updated_at: now,
  };
  const s = loadStore();
  const list = s[pacienteId] || [];
  s[pacienteId] = [...list, entry];
  saveStore(s);
  return entry;
}

export function updateCasoEntry(pacienteId: string, id: string, content: string): void {
  const s = loadStore();
  const list = s[pacienteId] || [];
  s[pacienteId] = list.map((e) =>
    e.id === id ? { ...e, content: content.trim(), updated_at: new Date().toISOString() } : e
  );
  saveStore(s);
}

export function deleteCasoEntry(pacienteId: string, id: string): void {
  const s = loadStore();
  const list = s[pacienteId] || [];
  s[pacienteId] = list.filter((e) => e.id !== id);
  saveStore(s);
}

/** Apaga todos os cards de um paciente (usado em deletePaciente). */
export function deleteAllCasoEntries(pacienteId: string): void {
  const s = loadStore();
  if (s[pacienteId]) {
    delete s[pacienteId];
    saveStore(s);
  }
}
