"use client";
import { useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code2,
  Image as ImageIcon, Video, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight, Undo2, Redo2,
} from "lucide-react";

interface Props {
  editor: Editor | null;
}

function ToolbarButton({
  onClick, active, title, children,
}: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-sm ${
        active
          ? "bg-[rgba(200,75,49,.12)] text-[var(--orange-500)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      }`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="w-px h-5 bg-[var(--border-default)] mx-1" />;
}

function UrlPopover({
  label, placeholder, onSubmit, onClose,
}: {
  label: string; placeholder: string; onSubmit: (url: string) => void; onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  return (
    <div className="absolute top-full left-0 mt-2 z-50 card-base p-3 w-[320px]">
      <p className="font-dm text-xs font-semibold text-[var(--text-secondary)] mb-2">{label}</p>
      <input
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder={placeholder}
        className="w-full input-hamilton font-dm text-sm mb-2"
        autoFocus
        onKeyDown={e => { if (e.key === "Enter") { onSubmit(url); onClose(); } if (e.key === "Escape") onClose(); }}
      />
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="font-dm text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">Cancelar</button>
        <button
          onClick={() => { if (url.trim()) { onSubmit(url); onClose(); } }}
          className="font-dm text-xs font-semibold text-[var(--orange-500)] hover:underline"
        >
          Inserir
        </button>
      </div>
    </div>
  );
}

export default function BlogEditorToolbar({ editor }: Props) {
  const [showImagePopover, setShowImagePopover] = useState(false);
  const [showVideoPopover, setShowVideoPopover] = useState(false);
  const [showLinkPopover, setShowLinkPopover] = useState(false);

  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-[var(--border-default)] bg-[var(--bg-input)] rounded-t-2xl sticky top-0 z-10">
      {/* History */}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Desfazer">
        <Undo2 size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Refazer">
        <Redo2 size={16} />
      </ToolbarButton>

      <Separator />

      {/* Text formatting */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrito">
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Itálico">
        <Italic size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Sublinhado">
        <Underline size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Tachado">
        <Strikethrough size={16} />
      </ToolbarButton>

      <Separator />

      {/* Headings */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Título 1">
        <Heading1 size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Título 2">
        <Heading2 size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Título 3">
        <Heading3 size={16} />
      </ToolbarButton>

      <Separator />

      {/* Lists */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista">
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista numerada">
        <ListOrdered size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citação">
        <Quote size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Bloco de código">
        <Code2 size={16} />
      </ToolbarButton>

      <Separator />

      {/* Media */}
      <div className="relative">
        <ToolbarButton onClick={() => { setShowImagePopover(!showImagePopover); setShowVideoPopover(false); setShowLinkPopover(false); }} title="Imagem">
          <ImageIcon size={16} />
        </ToolbarButton>
        {showImagePopover && (
          <UrlPopover
            label="Inserir imagem"
            placeholder="https://exemplo.com/imagem.jpg"
            onSubmit={url => editor.chain().focus().setImage({ src: url }).run()}
            onClose={() => setShowImagePopover(false)}
          />
        )}
      </div>
      <div className="relative">
        <ToolbarButton onClick={() => { setShowVideoPopover(!showVideoPopover); setShowImagePopover(false); setShowLinkPopover(false); }} title="Vídeo (YouTube/Vimeo)">
          <Video size={16} />
        </ToolbarButton>
        {showVideoPopover && (
          <UrlPopover
            label="Embed de vídeo"
            placeholder="https://youtube.com/watch?v=..."
            onSubmit={url => editor.chain().focus().setYoutubeVideo({ src: url }).run()}
            onClose={() => setShowVideoPopover(false)}
          />
        )}
      </div>
      <div className="relative">
        <ToolbarButton onClick={() => { setShowLinkPopover(!showLinkPopover); setShowImagePopover(false); setShowVideoPopover(false); }} active={editor.isActive("link")} title="Link">
          <LinkIcon size={16} />
        </ToolbarButton>
        {showLinkPopover && (
          <UrlPopover
            label="Inserir link"
            placeholder="https://exemplo.com"
            onSubmit={url => editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()}
            onClose={() => setShowLinkPopover(false)}
          />
        )}
      </div>

      <Separator />

      {/* Alignment */}
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Alinhar à esquerda">
        <AlignLeft size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centralizar">
        <AlignCenter size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Alinhar à direita">
        <AlignRight size={16} />
      </ToolbarButton>
    </div>
  );
}
