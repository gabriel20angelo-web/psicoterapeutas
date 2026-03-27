"use client";
import { getAllBlogTags, type BlogTag } from "@/types/blog";

interface Props {
  selected: BlogTag[];
  onChange: (tags: BlogTag[]) => void;
}

export default function BlogTagSelect({ selected, onChange }: Props) {
  const allTags = getAllBlogTags();

  const toggle = (tag: BlogTag) => {
    if (selected.includes(tag)) {
      onChange(selected.filter(t => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(allTags).map(([tag, label]) => {
        const active = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={`px-3 py-1.5 rounded-full font-dm text-xs font-medium transition-all duration-200 border ${
              active
                ? "bg-[rgba(200,75,49,.12)] text-[var(--orange-500)] border-[var(--border-orange)]"
                : "text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
