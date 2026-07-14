import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { Compartment, EditorState } from "@codemirror/state";
import { loadLanguageForFilename } from "./languages";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  filePath?: string | null;
}

export function CodeEditor({ value, onChange, filePath = null }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const languageCompartmentRef = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        languageCompartmentRef.current.of([]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only recreate the editor when mounted; external `value` updates while
    // editing are ignored to avoid clobbering cursor position/undo history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadLanguageForFilename(filePath).then((support) => {
      const view = viewRef.current;
      if (cancelled || !view) return;
      view.dispatch({
        effects: languageCompartmentRef.current.reconfigure(support ? [support] : []),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
    // Only sync when `value` is replaced out-of-band (e.g. opening a new file).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <div ref={containerRef} style={{ height: "100%", overflow: "auto" }} />;
}
