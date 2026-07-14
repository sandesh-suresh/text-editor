import { useEffect, useRef } from "react";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/classic.css";

interface MarkdownEditorProps {
  defaultValue: string;
  onChange: (markdown: string) => void;
  readonly?: boolean;
}

export function MarkdownEditor({ defaultValue, onChange, readonly = false }: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const crepe = new Crepe({
      root: containerRef.current,
      defaultValue,
    });
    crepe.setReadonly(readonly);
    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, markdown, prevMarkdown) => {
        if (markdown !== prevMarkdown) onChangeRef.current(markdown);
      });
    });

    crepe.create().catch((err) => {
      console.error("Failed to create markdown editor", err);
    });

    return () => {
      crepe.destroy();
    };
    // `defaultValue`/`readonly` only apply at mount time; callers remount via
    // `key` when switching tabs/files rather than pushing updates in-place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} style={{ height: "100%", overflow: "auto" }} />;
}
