import { MarkdownEditor } from "./MarkdownEditor";

interface MarkdownViewerProps {
  content: string;
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  return <MarkdownEditor defaultValue={content} onChange={() => {}} readonly />;
}
