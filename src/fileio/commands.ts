import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

export interface OpenedFile {
  path: string;
  content: string;
}

export async function openFile(): Promise<OpenedFile | null> {
  const path = await open({ multiple: false, directory: false });
  if (!path || Array.isArray(path)) return null;

  const content = await invoke<string>("read_file", { path });
  return { path, content };
}

export async function saveFile(path: string, content: string): Promise<void> {
  await invoke("write_file_atomic", { path, content });
}

export async function readFile(path: string): Promise<string> {
  return invoke<string>("read_file", { path });
}

export async function saveFileAs(content: string): Promise<string | null> {
  const path = await save();
  if (!path) return null;

  await saveFile(path, content);
  return path;
}
