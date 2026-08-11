import { useEffect } from "react";

export interface KeyboardShortcutActions {
  openCommandPalette: () => void;
  undo: () => void;
  redo: () => void;
  saveProject: () => void;
  deleteSelectedNode: () => void;
  clearConnecting: () => void;
  closeCommandPalette: () => void;
}

export interface KeyEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  editing: boolean;
  preventDefault: () => void;
}

export function resolveShortcut(event: KeyEvent, actions: KeyboardShortcutActions): boolean {
  const mod = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();

  if (mod && key === "k") { event.preventDefault(); actions.openCommandPalette(); return true; }
  if (mod && key === "z") { event.preventDefault(); actions.undo(); return true; }
  if (mod && key === "y") { event.preventDefault(); actions.redo(); return true; }
  if (mod && key === "s") { event.preventDefault(); actions.saveProject(); return true; }
  if (!event.editing && event.key === "Delete") { event.preventDefault(); actions.deleteSelectedNode(); return true; }
  if (event.key === "Escape") { actions.clearConnecting(); actions.closeCommandPalette(); return true; }
  return false;
}

export function useKeyboardShortcuts(actions: KeyboardShortcutActions): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";
      resolveShortcut({ key: event.key, ctrlKey: event.ctrlKey, metaKey: event.metaKey, editing, preventDefault: () => event.preventDefault() }, actions);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
}
