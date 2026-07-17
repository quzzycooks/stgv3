import { useState } from "react";
import { Plus, X } from "lucide-react";

interface TagInputProps {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
}

export function TagInput({ label, placeholder, values, onChange }: TagInputProps) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-muted px-0.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="h-12 flex-1 min-w-0 rounded-2xl border border-subtle bg-card-elevated px-4 text-[15px] font-medium text-body placeholder:text-faint outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={add}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-tint-accent text-accent"
        >
          <Plus size={20} />
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1.5 rounded-full bg-card-elevated border border-subtle px-3 py-1.5 text-sm font-medium text-body"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(values.filter((v) => v !== tag))}
                aria-label={`Remove ${tag}`}
                className="text-faint"
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
