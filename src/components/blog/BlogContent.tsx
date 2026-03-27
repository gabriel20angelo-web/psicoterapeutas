"use client";

interface Props {
  html: string;
}

export default function BlogContent({ html }: Props) {
  return (
    <>
      <div
        className="blog-content font-dm text-sm text-[var(--text-primary)] leading-[1.8]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <style jsx global>{`
        .blog-content h1 { font-family: var(--font-fraunces), serif; font-size: 28px; font-weight: 700; margin: 32px 0 12px; color: var(--text-primary); line-height: 1.3; }
        .blog-content h2 { font-family: var(--font-fraunces), serif; font-size: 22px; font-weight: 600; margin: 28px 0 10px; color: var(--text-primary); line-height: 1.3; }
        .blog-content h3 { font-family: var(--font-fraunces), serif; font-size: 18px; font-weight: 600; margin: 20px 0 8px; color: var(--text-primary); line-height: 1.3; }
        .blog-content p { margin: 10px 0; }
        .blog-content strong { font-weight: 700; color: var(--text-primary); }
        .blog-content em { font-style: italic; }
        .blog-content ul { list-style: disc; padding-left: 24px; margin: 14px 0; }
        .blog-content ol { list-style: decimal; padding-left: 24px; margin: 14px 0; }
        .blog-content li { margin: 6px 0; }
        .blog-content blockquote {
          border-left: 3px solid var(--orange-500);
          padding: 12px 20px;
          margin: 20px 0;
          background: var(--bg-surface-orange);
          border-radius: 0 16px 16px 0;
          color: var(--text-secondary);
          font-style: italic;
          font-size: 15px;
        }
        .blog-content pre {
          background: var(--bg-card-elevated);
          border: 1px solid var(--border-default);
          border-radius: 12px;
          padding: 16px 20px;
          margin: 20px 0;
          overflow-x: auto;
          font-family: var(--font-mono), monospace;
          font-size: 13px;
          line-height: 1.6;
        }
        .blog-content code {
          background: var(--bg-input);
          padding: 2px 6px;
          border-radius: 6px;
          font-family: var(--font-mono), monospace;
          font-size: 13px;
        }
        .blog-content pre code { background: none; padding: 0; }
        .blog-content a { color: var(--orange-500); text-decoration: underline; transition: color 200ms; }
        .blog-content a:hover { color: var(--orange-600); }
        .blog-content img { max-width: 100%; border-radius: 16px; margin: 20px auto; display: block; box-shadow: var(--shadow-card); }
        .blog-content hr { border: none; height: 1px; background: linear-gradient(90deg, transparent, var(--border-default), transparent); margin: 32px 0; }
        .blog-content [data-youtube-video] iframe { width: 100%; aspect-ratio: 16/9; border-radius: 16px; }
      `}</style>
    </>
  );
}
