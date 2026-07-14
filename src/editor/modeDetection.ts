export type EditorMode = "code" | "markdown-source" | "markdown-wysiwyg" | "markdown-viewer";

const MARKDOWN_EXTENSIONS = new Set(["md", "markdown"]);

// Milkdown/ProseMirror renders the whole document into the DOM (no virtualization
// like CodeMirror), so very large markdown files are forced into plain source mode.
const LARGE_FILE_BYTES = 2 * 1024 * 1024;
const LARGE_FILE_LINES = 20000;

export function isLargeContent(content: string | null | undefined): boolean {
  if (!content) return false;
  if (content.length > LARGE_FILE_BYTES) return true;
  let lines = 1;
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 10) lines++;
    if (lines > LARGE_FILE_LINES) return true;
  }
  return false;
}

export function detectMode(filePath: string | null | undefined, content?: string | null): EditorMode {
  if (!filePath) return "code";
  const filename = filePath.split(/[\\/]/).pop() ?? filePath;
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return "code";
  const ext = filename.slice(dot + 1).toLowerCase();
  if (!MARKDOWN_EXTENSIONS.has(ext)) return "code";
  return isLargeContent(content) ? "markdown-source" : "markdown-wysiwyg";
}
