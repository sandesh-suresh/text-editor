import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { detectMode, EditorMode } from "../editor/modeDetection";

export type { EditorMode };

export interface Tab {
  id: string;
  filePath: string | null;
  title: string;
  content: string;
  lastSavedContent: string;
  mode: EditorMode;
}

interface NewTabOptions {
  filePath?: string | null;
  title?: string;
  content?: string;
  mode?: EditorMode;
}

interface RestoreTabOptions {
  id: string;
  filePath: string | null;
  title: string;
  content: string;
  lastSavedContent: string;
  mode: EditorMode;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  createTab: (opts?: NewTabOptions) => string;
  restoreTab: (opts: RestoreTabOptions) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  markSaved: (id: string, filePath: string) => void;
  setMode: (id: string, mode: EditorMode) => void;
}

function titleFromPath(filePath: string | null | undefined): string {
  if (!filePath) return "Untitled";
  return filePath.split(/[\\/]/).pop() || filePath;
}

export const useTabsStore = create<TabsState>((set) => ({
  tabs: [],
  activeTabId: null,

  createTab: (opts = {}) => {
    const id = uuidv4();
    const content = opts.content ?? "";
    const tab: Tab = {
      id,
      filePath: opts.filePath ?? null,
      title: opts.title ?? titleFromPath(opts.filePath ?? null),
      content,
      lastSavedContent: content,
      mode: opts.mode ?? detectMode(opts.filePath ?? null, content),
    };
    set((state) => ({ tabs: [...state.tabs, tab], activeTabId: id }));
    return id;
  },

  restoreTab: (opts) => {
    const tab: Tab = {
      id: opts.id,
      filePath: opts.filePath,
      title: opts.title,
      content: opts.content,
      lastSavedContent: opts.lastSavedContent,
      mode: opts.mode,
    };
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: state.activeTabId ?? tab.id,
    }));
  },

  closeTab: (id) => {
    set((state) => {
      const index = state.tabs.findIndex((t) => t.id === id);
      if (index === -1) return state;

      const tabs = state.tabs.filter((t) => t.id !== id);
      let activeTabId = state.activeTabId;
      if (activeTabId === id) {
        const fallback = tabs[index] ?? tabs[index - 1] ?? null;
        activeTabId = fallback ? fallback.id : null;
      }
      return { tabs, activeTabId };
    });
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  updateContent: (id, content) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, content } : t)),
    }));
  },

  markSaved: (id, filePath) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id
          ? {
              ...t,
              filePath,
              title: titleFromPath(filePath),
              lastSavedContent: t.content,
              mode: detectMode(filePath, t.content),
            }
          : t,
      ),
    }));
  },

  setMode: (id, mode) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, mode } : t)),
    }));
  },
}));

export function isTabDirty(tab: Tab): boolean {
  return tab.content !== tab.lastSavedContent;
}

export function getTab(id: string | null): Tab | undefined {
  if (!id) return undefined;
  return useTabsStore.getState().tabs.find((t) => t.id === id);
}
