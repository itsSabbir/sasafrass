import { describe, expect, it, vi } from "vitest";
import { resolveShortcut } from "./useKeyboardShortcuts";
import type { KeyboardShortcutActions, KeyEvent } from "./useKeyboardShortcuts";

function createActions(): KeyboardShortcutActions {
  return {
    openCommandPalette: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    saveProject: vi.fn(),
    deleteSelectedNode: vi.fn(),
    clearConnecting: vi.fn(),
    closeCommandPalette: vi.fn()
  };
}

function keyEvent(key: string, options: Partial<KeyEvent> = {}): KeyEvent {
  return { key, ctrlKey: false, metaKey: false, editing: false, preventDefault: vi.fn(), ...options };
}

describe("resolveShortcut", () => {
  it("Ctrl+K opens command palette", () => {
    const actions = createActions();
    const handled = resolveShortcut(keyEvent("k", { ctrlKey: true }), actions);
    expect(handled).toBe(true);
    expect(actions.openCommandPalette).toHaveBeenCalledOnce();
  });

  it("Meta+K opens command palette (macOS)", () => {
    const actions = createActions();
    const handled = resolveShortcut(keyEvent("k", { metaKey: true }), actions);
    expect(handled).toBe(true);
    expect(actions.openCommandPalette).toHaveBeenCalledOnce();
  });

  it("Ctrl+Z triggers undo", () => {
    const actions = createActions();
    resolveShortcut(keyEvent("z", { ctrlKey: true }), actions);
    expect(actions.undo).toHaveBeenCalledOnce();
  });

  it("Ctrl+Y triggers redo", () => {
    const actions = createActions();
    resolveShortcut(keyEvent("y", { ctrlKey: true }), actions);
    expect(actions.redo).toHaveBeenCalledOnce();
  });

  it("Ctrl+S triggers save", () => {
    const actions = createActions();
    resolveShortcut(keyEvent("s", { ctrlKey: true }), actions);
    expect(actions.saveProject).toHaveBeenCalledOnce();
  });

  it("Delete triggers deleteSelectedNode when not editing", () => {
    const actions = createActions();
    resolveShortcut(keyEvent("Delete"), actions);
    expect(actions.deleteSelectedNode).toHaveBeenCalledOnce();
  });

  it("Delete does NOT trigger when editing", () => {
    const actions = createActions();
    resolveShortcut(keyEvent("Delete", { editing: true }), actions);
    expect(actions.deleteSelectedNode).not.toHaveBeenCalled();
  });

  it("Escape clears connecting and closes palette", () => {
    const actions = createActions();
    resolveShortcut(keyEvent("Escape"), actions);
    expect(actions.clearConnecting).toHaveBeenCalledOnce();
    expect(actions.closeCommandPalette).toHaveBeenCalledOnce();
  });

  it("bare K without modifier does not open palette", () => {
    const actions = createActions();
    const handled = resolveShortcut(keyEvent("k"), actions);
    expect(handled).toBe(false);
    expect(actions.openCommandPalette).not.toHaveBeenCalled();
  });

  it("calls preventDefault on matched shortcuts", () => {
    const actions = createActions();
    const event = keyEvent("s", { ctrlKey: true });
    resolveShortcut(event, actions);
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });
});
