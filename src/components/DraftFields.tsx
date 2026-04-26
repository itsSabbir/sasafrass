import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";

interface DraftTextProps {
  value: string;
  onCommit: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  placeholder?: string;
}

function commitOnEnter(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void {
  if (event.key === "Enter" && (event.currentTarget.tagName === "INPUT" || event.ctrlKey || event.metaKey)) {
    event.currentTarget.blur();
  }
}

export function DraftInput({ value, onCommit, ariaLabel, className, placeholder }: DraftTextProps) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraft(value);
    }
  }, [editing, value]);

  return (
    <input
      aria-label={ariaLabel}
      className={className}
      placeholder={placeholder}
      value={draft}
      onFocus={() => setEditing(true)}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={commitOnEnter}
      onBlur={() => {
        setEditing(false);
        if (draft !== value) {
          onCommit(draft);
        }
      }}
    />
  );
}

export function DraftTextArea({ value, onCommit, ariaLabel, className, placeholder }: DraftTextProps) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraft(value);
    }
  }, [editing, value]);

  return (
    <textarea
      aria-label={ariaLabel}
      className={className}
      placeholder={placeholder}
      value={draft}
      onFocus={() => setEditing(true)}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={commitOnEnter}
      onBlur={() => {
        setEditing(false);
        if (draft !== value) {
          onCommit(draft);
        }
      }}
    />
  );
}
