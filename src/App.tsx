import { lazy, Suspense, useEffect, useState } from "react";
import { CodeEditor } from "./editor/CodeEditor";
import { EditorMode } from "./editor/modeDetection";
import { openFile, readFile, saveFile, saveFileAs } from "./fileio/commands";
import { autosaveMarkSaved, autosaveReadSnapshot, sessionStart } from "./autosave/api";
import { useAutosave } from "./autosave/useAutosave";
import { TabBar } from "./tabs/TabBar";
import { getTab, useTabsStore } from "./tabs/tabsStore";
import "./App.css";

const MarkdownEditor = lazy(() => import("./editor/MarkdownEditor").then((m) => ({ default: m.MarkdownEditor })));
const MarkdownViewer = lazy(() => import("./editor/MarkdownViewer").then((m) => ({ default: m.MarkdownViewer })));

function App() {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const createTab = useTabsStore((s) => s.createTab);
  const restoreTab = useTabsStore((s) => s.restoreTab);
  const updateContent = useTabsStore((s) => s.updateContent);
  const markSaved = useTabsStore((s) => s.markSaved);
  const setMode = useTabsStore((s) => s.setMode);

  const [sessionId, setSessionId] = useState<string | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  useAutosave(sessionId);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await sessionStart();
      if (cancelled) return;

      for (const entry of result.manifest) {
        const snapshot = await autosaveReadSnapshot(result.sessionId, entry.tabId);
        let onDiskContent: string | null = null;
        if (entry.originalPath) {
          try {
            onDiskContent = await readFile(entry.originalPath);
          } catch {
            onDiskContent = null;
          }
        }

        const lastSavedContent = onDiskContent ?? "";
        const content = snapshot ?? lastSavedContent;

        restoreTab({
          id: entry.tabId,
          filePath: entry.originalPath,
          title: entry.title,
          content,
          lastSavedContent,
          mode: entry.mode as EditorMode,
        });
      }

      if (result.manifest.length === 0) createTab();
      setSessionId(result.sessionId);
    })();

    return () => {
      cancelled = true;
    };
    // Only runs once on mount to restore the previous session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleOpen() {
    const opened = await openFile();
    if (!opened) return;
    createTab({ filePath: opened.path, content: opened.content });
  }

  async function handleSave() {
    if (!activeTab) return;
    if (activeTab.filePath) {
      await saveFile(activeTab.filePath, activeTab.content);
      markSaved(activeTab.id, activeTab.filePath);
      if (sessionId) {
        const updated = getTab(activeTab.id);
        await autosaveMarkSaved(sessionId, activeTab.id, activeTab.filePath, updated?.title ?? activeTab.title);
      }
    } else {
      const savedPath = await saveFileAs(activeTab.content);
      if (savedPath) {
        markSaved(activeTab.id, savedPath);
        if (sessionId) {
          const updated = getTab(activeTab.id);
          await autosaveMarkSaved(sessionId, activeTab.id, savedPath, updated?.title ?? activeTab.title);
        }
      }
    }
  }

  return (
    <main className="app">
      <div className="toolbar">
        <button onClick={() => createTab()}>New</button>
        <button onClick={handleOpen}>Open</button>
        <button onClick={handleSave} disabled={!activeTab}>
          Save
        </button>
        {activeTab && activeTab.mode === "markdown-wysiwyg" && (
          <>
            <button onClick={() => setMode(activeTab.id, "markdown-source")}>View Source</button>
            <button onClick={() => setMode(activeTab.id, "markdown-viewer")}>View Only</button>
          </>
        )}
        {activeTab && activeTab.mode === "markdown-source" && (
          <button onClick={() => setMode(activeTab.id, "markdown-wysiwyg")}>Preview</button>
        )}
        {activeTab && activeTab.mode === "markdown-viewer" && (
          <button onClick={() => setMode(activeTab.id, "markdown-wysiwyg")}>Edit</button>
        )}
      </div>
      <TabBar />
      <div className="editor-container">
        {activeTab &&
          (activeTab.mode === "markdown-wysiwyg" ? (
            <Suspense fallback={null}>
              <MarkdownEditor
                key={activeTab.id}
                defaultValue={activeTab.content}
                onChange={(next) => updateContent(activeTab.id, next)}
              />
            </Suspense>
          ) : activeTab.mode === "markdown-viewer" ? (
            <Suspense fallback={null}>
              <MarkdownViewer key={activeTab.id} content={activeTab.content} />
            </Suspense>
          ) : (
            <CodeEditor
              key={activeTab.id}
              value={activeTab.content}
              onChange={(next) => updateContent(activeTab.id, next)}
              filePath={activeTab.filePath}
            />
          ))}
      </div>
    </main>
  );
}

export default App;
