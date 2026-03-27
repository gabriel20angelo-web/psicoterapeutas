"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import LinkExt from "@tiptap/extension-link";
import YoutubeExt from "@tiptap/extension-youtube";
import TextAlign from "@tiptap/extension-text-align";
import UnderlineExt from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import BlogEditorToolbar from "@/components/blog/BlogEditorToolbar";

interface Props {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function RichEditor({ content, onChange, placeholder = "Escreva aqui...", minHeight = "150px" }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      UnderlineExt,
      LinkExt.configure({ openOnClick: false, HTMLAttributes: { class: "text-[var(--orange-500)] underline" } }),
      ImageExt.configure({ inline: false, HTMLAttributes: { class: "rounded-xl max-w-full mx-auto my-4" } }),
      YoutubeExt.configure({ inline: false, HTMLAttributes: { class: "rounded-xl overflow-hidden my-4" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    immediatelyRender: false,
    content,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class: `prose-editor outline-none px-4 py-3 font-dm text-sm text-[var(--text-primary)] leading-relaxed`,
        style: `min-height: ${minHeight}`,
      },
    },
  });

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] overflow-hidden">
      <BlogEditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
