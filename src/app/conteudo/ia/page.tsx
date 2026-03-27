"use client";
import { useState, useEffect, useRef } from "react";
import { Sparkles, Send, Copy, Trash2, HelpCircle } from "lucide-react";
import Shell from "@/components/Shell";
import UsinaNav from "@/components/usina/UsinaNav";
import { useToast } from "@/contexts/ToastContext";

// ─── Types ───

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// ─── HelpTip ───

function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex">
      <button onClick={() => setOpen(!open)} className="w-5 h-5 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors" title="Ajuda">
        <HelpCircle size={14} />
      </button>
      {open && (
        <div className="absolute left-full ml-2 top-0 z-50 w-64 p-3 rounded-xl card-base shadow-float text-left">
          <p className="font-dm text-xs text-[var(--text-secondary)] leading-relaxed">{text}</p>
          <button onClick={() => setOpen(false)} className="font-dm text-[10px] text-[var(--orange-500)] mt-2 hover:underline">Entendi</button>
        </div>
      )}
    </div>
  );
}

// ─── Bot responses ───

function generateResponse(input: string): string {
  const lower = input.toLowerCase().trim();

  if (/roteiro|reels|tiktok/.test(lower)) {
    return `**Roteiro para Reels/TikTok**

**HOOK (0-3s):**
"Voce sabia que [fato surpreendente sobre o tema]?"

**DESENVOLVIMENTO (3-25s):**
1. Contextualize o problema que seu publico enfrenta
2. Apresente a solucao/insight principal
3. De um exemplo pratico ou demonstracao

**CTA (25-30s):**
"Salva esse video pra lembrar! E me conta nos comentarios: voce ja passou por isso?"

---
*Dica: Use legendas na tela e mantenha o ritmo dinamico. Troque de angulo a cada 5s.*`;
  }

  if (/carrossel|carousel/.test(lower)) {
    return `**Estrutura de Carrossel Educativo**

**Slide 1 - Capa:**
Titulo chamativo + emoji relevante
Ex: "5 sinais de que voce precisa de [tema]"

**Slide 2 - Contexto:**
Apresente o problema de forma empatica

**Slides 3-7 - Conteudo:**
Um ponto por slide, com icone/numero + texto curto (max 3 linhas)

**Slide 8 - Resumo:**
Lista rapida dos pontos abordados

**Slide 9 - CTA:**
"Gostou? Compartilha com alguem que precisa ver isso!"
+ Lembrete de salvar/seguir

---
*Dica: Use cores consistentes da sua paleta. Fonte legivel, minimo 24pt.*`;
  }

  if (/legenda|caption/.test(lower)) {
    return `**Legenda Engajante**

Voce ja parou pra pensar em como [tema] impacta o seu dia a dia? 🤔

A verdade e que muitas pessoas passam por [situacao] sem perceber que existe um caminho diferente.

Aqui vao 3 reflexoes pra voce levar pro seu dia:

1️⃣ [Primeiro ponto com insight pratico]
2️⃣ [Segundo ponto com exemplo do cotidiano]
3️⃣ [Terceiro ponto com convite a acao]

Se isso fez sentido pra voce, salva esse post e compartilha com alguem que precisa ler isso hoje. 💛

---

#saudemental #bemestar #psicologia #terapia #autoconhecimento #desenvolvimento #saude #cuidado #qualidadedevida #dicasdepsicologo`;
  }

  if (/serie|série/.test(lower)) {
    return `**Plano de Serie Semanal**

**Segunda - Motivacional:**
Post com frase inspiradora + reflexao pessoal breve

**Terca - Educativo:**
Carrossel ou video curto ensinando algo do seu nicho

**Quarta - Bastidores:**
Story/Reels mostrando sua rotina profissional

**Quinta - Interativo:**
Enquete, caixinha de perguntas ou "mito vs verdade"

**Sexta - Aprofundamento:**
Conteudo mais denso (video longo, post detalhado)

**Sabado - Social Proof:**
Depoimento de paciente/cliente (com autorizacao) ou resultados

**Domingo - Leve:**
Conteudo pessoal, hobby, ou recomendacao (livro, filme, podcast)

---
*Dica: Prepare o conteudo da semana no domingo. Assim voce so publica durante a semana.*`;
  }

  if (/ideia|ideias/.test(lower)) {
    return `**5 Ideias de Conteudo para esta semana:**

1. **"3 coisas que eu gostaria que todo mundo soubesse sobre [sua especialidade]"**
   Formato: Carrossel ou Reels | Alta chance de compartilhamento

2. **"Um dia na minha rotina como [profissao]"**
   Formato: Story sequencial ou Reels | Humaniza sua marca

3. **"Mito vs Verdade: [tema polemico do seu nicho]"**
   Formato: Carrossel interativo | Gera comentarios

4. **"O conselho que eu daria para mim mesmo(a) no inicio da carreira"**
   Formato: Post com foto pessoal | Gera identificacao

5. **"Guia rapido: como saber se voce precisa de [servico que voce oferece]"**
   Formato: Carrossel educativo | Atrai novos seguidores

---
*Dica: Escolha 2-3 dessas ideias e adapte ao seu estilo. Autenticidade engaja mais que perfeicao!*`;
  }

  return `Ola! Sou o assistente de conteudo da Usina. Posso te ajudar com:

• **Roteiro para Reels/TikTok** - Estrutura de video curto com hook, desenvolvimento e CTA
• **Carrossel educativo** - Estrutura slide a slide para posts carrossel
• **Legenda engajante** - Texto com hashtags otimizadas
• **Serie semanal** - Planejamento de conteudo para a semana
• **Ideias de conteudo** - Sugestoes criativas para seu nicho

Me diga o que voce precisa e vamos criar juntos!`;
}

// ─── Storage ───

const STORAGE_KEY = "usina-ia-chat";

function loadMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(msgs: Message[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
}

// ─── Quick Actions ───

const QUICK_ACTIONS = [
  { label: "Gerar roteiro para Reels", prompt: "Gere um roteiro para Reels" },
  { label: "Criar carrossel educativo", prompt: "Crie um carrossel educativo" },
  { label: "Escrever legenda engajante", prompt: "Escreva uma legenda engajante" },
  { label: "Planejar série semanal", prompt: "Planeje uma série semanal de conteúdo" },
  { label: "Sugerir ideias de conteúdo", prompt: "Sugira ideias de conteúdo" },
];

// ─── Main Component ───

export default function IAPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages(loadMessages());
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: Date.now(),
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    saveMessages(updated);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = generateResponse(text);
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      };
      const final = [...updated, assistantMsg];
      setMessages(final);
      saveMessages(final);
      setIsTyping(false);
    }, 800 + Math.random() * 700);
  };

  const handleClear = () => {
    setMessages([]);
    saveMessages([]);
    toast("Conversa limpa", { type: "info" });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast("Copiado!", { type: "success" });
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--orange-glow)" }}>
              <Sparkles size={18} style={{ color: "var(--orange-500)" }} />
            </div>
            <h1 className="font-fraunces text-2xl font-bold text-[var(--text-primary)]">Assistente IA</h1>
            <HelpTip text="O assistente ajuda a criar roteiros, legendas, carrosséis e planejar conteúdo. Digite o que precisa ou use os botões rápidos para começar." />
          </div>
          {!isEmpty && (
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-dm text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--red-text)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <Trash2 size={14} />
              Limpar conversa
            </button>
          )}
        </div>

        <UsinaNav />

        {/* Chat area */}
        <div
          className="rounded-2xl border overflow-hidden flex flex-col"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border-subtle)",
            height: "calc(100vh - 320px)",
            minHeight: "400px",
          }}
        >
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {isEmpty && !isTyping && (
              <div className="flex flex-col items-center justify-center h-full gap-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "var(--orange-glow)" }}>
                  <Sparkles size={32} style={{ color: "var(--orange-500)" }} />
                </div>
                <div className="text-center">
                  <h2 className="font-fraunces text-lg font-bold text-[var(--text-primary)] mb-1">Como posso ajudar?</h2>
                  <p className="font-dm text-sm text-[var(--text-tertiary)]">Escolha uma opcao ou digite sua pergunta</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.prompt}
                      onClick={() => sendMessage(action.prompt)}
                      className="px-3 py-2 rounded-xl font-dm text-xs font-medium border transition-all duration-150 hover:border-[var(--orange-400)] hover:text-[var(--orange-500)]"
                      style={{
                        background: "var(--bg-card-elevated)",
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1" style={{ background: "var(--orange-glow)" }}>
                    <Sparkles size={14} style={{ color: "var(--orange-500)" }} />
                  </div>
                )}
                <div
                  className={`relative group max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "rounded-br-md" : "rounded-bl-md"}`}
                  style={{
                    background: msg.role === "user" ? "var(--orange-500)" : "var(--bg-card-elevated)",
                    color: msg.role === "user" ? "white" : "var(--text-primary)",
                  }}
                >
                  <div className="font-dm text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content.split(/(\*\*.*?\*\*)/).map((part, i) => {
                      if (part.startsWith("**") && part.endsWith("**")) {
                        return <strong key={i}>{part.slice(2, -2)}</strong>;
                      }
                      return <span key={i}>{part}</span>;
                    })}
                  </div>
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => handleCopy(msg.content.replace(/\*\*/g, ""))}
                      className="absolute -bottom-3 right-2 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                      title="Copiar"
                    >
                      <Copy size={12} style={{ color: "var(--text-tertiary)" }} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1" style={{ background: "var(--orange-glow)" }}>
                  <Sparkles size={14} style={{ color: "var(--orange-500)" }} />
                </div>
                <div className="rounded-2xl rounded-bl-md px-4 py-3" style={{ background: "var(--bg-card-elevated)" }}>
                  <div className="flex gap-1.5 items-center h-5">
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--text-tertiary)", animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--text-tertiary)", animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--text-tertiary)", animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem..."
                disabled={isTyping}
                className="flex-1 rounded-xl px-4 py-2.5 font-dm text-sm outline-none transition-colors disabled:opacity-50"
                style={{
                  background: "var(--bg-input)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-strong)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--orange-400)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 disabled:opacity-30"
                style={{ background: "var(--orange-500)", color: "white" }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
