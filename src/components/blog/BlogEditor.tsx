"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import LinkExt from "@tiptap/extension-link";
import YoutubeExt from "@tiptap/extension-youtube";
import TextAlign from "@tiptap/extension-text-align";
import UnderlineExt from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import BlogEditorToolbar from "./BlogEditorToolbar";

interface Props {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function BlogEditor({ content, onChange, placeholder = "Comece a escrever seu artigo..." }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      UnderlineExt,
      LinkExt.configure({ openOnClick: false, HTMLAttributes: { class: "text-[var(--orange-500)] underline" } }),
      ImageExt.configure({ inline: false, HTMLAttributes: { class: "rounded-xl max-w-full mx-auto my-4" } }),
      YoutubeExt.configure({ inline: false, HTMLAttributes: { class: "rounded-xl overflow-hidden my-4" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    immediatelyRender: false,
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose-editor outline-none min-h-[400px] px-5 py-4 font-dm text-sm text-[var(--text-primary)] leading-relaxed",
      },
    },
  });

  return (
    <div className="card-base overflow-hidden">
      <BlogEditorToolbar editor={editor} />
      <EditorContent editor={editor} />
      <style jsx global>{`
        .prose-editor h1 { font-family: var(--font-fraunces), serif; font-size: 28px; font-weight: 700; margin: 24px 0 12px; color: var(--text-primary); }
        .prose-editor h2 { font-family: var(--font-fraunces), serif; font-size: 22px; font-weight: 600; margin: 20px 0 10px; color: var(--text-primary); }
        .prose-editor h3 { font-family: var(--font-fraunces), serif; font-size: 18px; font-weight: 600; margin: 16px 0 8px; color: var(--text-primary); }
        .prose-editor p { margin: 8px 0; line-height: 1.75; }
        .prose-editor strong { font-weight: 700; color: var(--text-primary); }
        .prose-editor em { font-style: italic; }
        .prose-editor u { text-decoration: underline; }
        .prose-editor s { text-decoration: line-through; opacity: 0.6; }
        .prose-editor ul { list-style: disc; padding-left: 24px; margin: 12px 0; }
        .prose-editor ol { list-style: decimal; padding-left: 24px; margin: 12px 0; }
        .prose-editor li { margin: 4px 0; }
        .prose-editor blockquote { border-left: 3px solid var(--orange-500); padding: 8px 16px; margin: 16px 0; background: var(--bg-surface-orange); border-radius: 0 12px 12px 0; color: var(--text-secondary); font-style: italic; }
        .prose-editor pre { background: var(--bg-card-elevated); border: 1px solid var(--border-default); border-radius: 12px; padding: 16px; margin: 16px 0; overflow-x: auto; font-family: var(--font-mono), monospace; font-size: 13px; }
        .prose-editor code { background: var(--bg-input); padding: 2px 6px; border-radius: 6px; font-family: var(--font-mono), monospace; font-size: 13px; }
        .prose-editor pre code { background: none; padding: 0; border-radius: 0; }
        .prose-editor a { color: var(--orange-500); text-decoration: underline; }
        .prose-editor img { max-width: 100%; border-radius: 12px; margin: 16px auto; display: block; }
        .prose-editor hr { border: none; height: 1px; background: linear-gradient(90deg, transparent, var(--border-default), transparent); margin: 24px 0; }
        .prose-editor .ProseMirror-focused { outline: none; }
        .prose-editor p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--text-tertiary); font-style: italic; pointer-events: none; float: left; height: 0; }
        .prose-editor [data-youtube-video] iframe { width: 100%; aspect-ratio: 16/9; border-radius: 12px; }
      `}</style>
    </div>
  );
}
