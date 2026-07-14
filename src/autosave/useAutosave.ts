import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTabDirty, Tab, useTabsStore } from "../tabs/tabsStore";
import { autosaveCloseTab, autosaveWrite, sessionEnd } from "./api";

const IDLE_DEBOUNCE_MS = 1800;
const HARD_FLUSH_MS = 10000;

export function useAutosave(sessionId: string | null) {
  useEffect(() => {
    if (!sessionId) return;

    const flushTab = async (tab: Tab) => {
      if (!isTabDirty(tab)) return;
      await autosaveWrite(sessionId, tab.id, tab.content, tab.filePath, tab.title, tab.mode);
    };

    const flushAllDirty = async () => {
      await Promise.all(useTabsStore.getState().tabs.map(flushTab));
    };

    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleIdleFlush = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        void flushAllDirty();
      }, IDLE_DEBOUNCE_MS);
    };

    const hardFlushInterval = setInterval(() => {
      void flushAllDirty();
    }, HARD_FLUSH_MS);

    let previousIds = new Set(useTabsStore.getState().tabs.map((t) => t.id));

    const unsubscribe = useTabsStore.subscribe((state, prevState) => {
      if (state.tabs !== prevState.tabs) {
        scheduleIdleFlush();

        const currentIds = new Set(state.tabs.map((t) => t.id));
        for (const id of previousIds) {
          if (!currentIds.has(id)) {
            void autosaveCloseTab(sessionId, id);
          }
        }
        previousIds = currentIds;
      }

      if (state.activeTabId !== prevState.activeTabId) {
        const outgoing = prevState.tabs.find((t) => t.id === prevState.activeTabId);
        if (outgoing) void flushTab(outgoing);
      }
    });

    const handleBlur = () => {
      void flushAllDirty();
    };
    window.addEventListener("blur", handleBlur);

    const appWindow = getCurrentWindow();
    let unlistenClose: (() => void) | undefined;
    appWindow
      .onCloseRequested(async (event) => {
        event.preventDefault();
        await flushAllDirty();
        await sessionEnd(sessionId);
        await appWindow.destroy();
      })
      .then((unlisten) => {
        unlistenClose = unlisten;
      });

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      clearInterval(hardFlushInterval);
      unsubscribe();
      window.removeEventListener("blur", handleBlur);
      unlistenClose?.();
    };
  }, [sessionId]);
}
