import { languages } from "@codemirror/language-data";
import { LanguageDescription, LanguageSupport } from "@codemirror/language";

const supportCache = new Map<string, Promise<LanguageSupport | null>>();

export function findLanguageForFilename(filePath: string | null): LanguageDescription | null {
  if (!filePath) return null;
  const filename = filePath.split(/[\\/]/).pop() ?? filePath;
  return LanguageDescription.matchFilename(languages, filename);
}

export function loadLanguageForFilename(filePath: string | null): Promise<LanguageSupport | null> {
  const desc = findLanguageForFilename(filePath);
  if (!desc) return Promise.resolve(null);

  let pending = supportCache.get(desc.name);
  if (!pending) {
    pending = desc.load().catch(() => null);
    supportCache.set(desc.name, pending);
  }
  return pending;
}
