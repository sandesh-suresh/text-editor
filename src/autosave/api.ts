import { invoke } from "@tauri-apps/api/core";
import { EditorMode } from "../editor/modeDetection";

export interface ManifestEntry {
  tabId: string;
  originalPath: string | null;
  title: string;
  mode: string;
  autosavedAt: number;
}

export interface SessionStartResult {
  sessionId: string;
  manifest: ManifestEntry[];
  crashed: boolean;
}

export async function sessionStart(): Promise<SessionStartResult> {
  return invoke<SessionStartResult>("session_start");
}

export async function sessionEnd(sessionId: string): Promise<void> {
  await invoke("session_end", { sessionId });
}

export async function autosaveWrite(
  sessionId: string,
  tabId: string,
  content: string,
  originalPath: string | null,
  title: string,
  mode: EditorMode,
): Promise<void> {
  await invoke("autosave_write", {
    sessionId,
    tabId,
    content,
    originalPath,
    title,
    mode,
  });
}

export async function autosaveReadSnapshot(
  sessionId: string,
  tabId: string,
): Promise<string | null> {
  return invoke<string | null>("autosave_read_snapshot", { sessionId, tabId });
}

export async function autosaveMarkSaved(
  sessionId: string,
  tabId: string,
  originalPath: string,
  title: string,
): Promise<void> {
  await invoke("autosave_mark_saved", { sessionId, tabId, originalPath, title });
}

export async function autosaveCloseTab(sessionId: string, tabId: string): Promise<void> {
  await invoke("autosave_close_tab", { sessionId, tabId });
}
