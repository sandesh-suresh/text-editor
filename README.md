# Text Editor

A lightweight, cross-platform (Linux/Windows/macOS) desktop text editor built with Tauri. Targets a small memory footprint (<100MB) by using the OS's native webview instead of bundling Chromium, while still getting mature web-based editor components for syntax highlighting and Markdown WYSIWYG editing.

## Features

- **Tabs** — multiple files open at once, tracked in a zustand store. Only the active tab has a mounted editor instance; background tabs are held as plain content strings, so switching tabs doesn't grow memory linearly with tab count.
- **Code editing** — [CodeMirror 6](https://codemirror.net/) with per-file syntax highlighting. The language grammar is resolved from the filename via `@codemirror/language-data` and lazy-loaded on demand (`src/editor/languages.ts`), so unused language packages never end up in the bundle at runtime.
- **Markdown** — three modes for `.md`/`.markdown` files, toggled from the toolbar:
  - `markdown-wysiwyg` — live WYSIWYG editing via [Milkdown](https://milkdown.dev/) (`@milkdown/crepe`), the default for markdown files.
  - `markdown-source` — plain CodeMirror markdown source editing.
  - `markdown-viewer` — read-only rendering (same Milkdown instance, `editable: () => false`).
  - Files larger than 2MB or 20,000 lines are forced into `markdown-source` on open, since Milkdown/ProseMirror renders the full document into the DOM without virtualization (`src/editor/modeDetection.ts`).
  - The Milkdown bundle is only `import()`-ed when a markdown file is actually opened (`App.tsx` lazy imports), keeping it out of the initial app load.
- **File I/O** — all disk reads/writes happen in the Rust backend (`src-tauri/src/commands/fs_commands.rs`). Saves are atomic: content is written to a `.tmp` sibling file, then renamed over the target, so a crash or power loss mid-write can't corrupt an existing file. Open/Save As use the native file dialogs via `@tauri-apps/plugin-dialog`.
- **Autosave + session restore** — every tab is autosaved to `~/.text-editor/autosave/<session-id>/<tab-id>.snapshot` on a debounce (1.8s idle after an edit, hard flush every 10s regardless, and immediate flush on tab switch or window blur). On quit, the app intercepts the close event, flushes all dirty tabs, and marks the session as cleanly shut down. On launch, the previous session's tab set is always restored from its manifest — this is a single mechanism for both normal "reopen where I left off" restore and crash recovery, not two separate code paths (`src/autosave/useAutosave.ts`, `src-tauri/src/autosave/`).

## Tech stack

| Layer | Choice |
|---|---|
| Shell | Tauri 2 (Rust backend + native OS webview) |
| Frontend framework | React 19 + TypeScript, built with Vite |
| State | zustand |
| Code editor | CodeMirror 6 |
| Markdown editor/viewer | Milkdown (`@milkdown/kit` + `@milkdown/crepe`) |
| Rust crates | `tauri`, `tauri-plugin-dialog`, `tauri-plugin-opener`, `serde`/`serde_json`, `uuid`, `dirs` |

## Project structure

```
text-editor/
  src/
    editor/          CodeEditor (CodeMirror), MarkdownEditor/Viewer (Milkdown), mode + language detection
    tabs/             zustand tab store, TabBar component
    fileio/           typed invoke() wrappers for the Rust file commands
    autosave/         debounced autosave hook + typed invoke() wrappers
    App.tsx           toolbar, session restore on launch, mode-switch wiring
  src-tauri/
    src/
      commands/       #[tauri::command] handlers: fs, autosave, session
      autosave/        manifest/paths/recovery helpers used by the autosave commands
      lib.rs           registers plugins + invoke_handler
    capabilities/      Tauri v2 permission scoping for the main window
    tauri.conf.json         base bundle/window config (all bundle targets)
    tauri.linux.conf.json   Linux-only overlay restricting local bundle targets to deb+rpm
  .github/workflows/
    ci.yml           build/type-check/cargo check on every push and PR
    release.yml      tag-triggered installer builds + draft GitHub Release
```

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS) and npm
- [Rust](https://www.rust-lang.org/tools/install) via `rustup` (stable toolchain)
- Platform-specific Tauri build dependencies — see the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/). On Debian/Ubuntu this is:
  ```bash
  sudo apt-get install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf build-essential
  ```

Install JS dependencies once:

```bash
npm install
```

## Building

Run the app in development mode (hot-reloads the frontend, opens a native window):

```bash
npm run tauri dev
```

Type-check and build the frontend only (no Rust build, no packaging):

```bash
npm run build
```

Build a full installable package for the current OS (produces platform-native installers under `src-tauri/target/release/bundle/`):

```bash
npm run tauri build
```

- **Linux**: `.deb` and `.rpm` locally (see `tauri.linux.conf.json` — AppImage generation is disabled by default here because it needs to download `linuxdeploy` binaries at build time, which can fail in sandboxed/offline environments). To force AppImage generation as well, override the targets explicitly:
  ```bash
  npm run tauri build -- --bundles all
  ```
- **Windows**: `.msi` and NSIS `.exe`.
- **macOS**: `.app` and `.dmg`.

No code signing or notarization is configured (personal/internal-use project) — installers will show an "unknown developer" warning on first run on Windows/macOS.

## Testing

**Rust backend** — unit tests live alongside the command modules (e.g. `src-tauri/src/commands/fs_commands.rs` covers atomic write/read and the missing-file error path):

```bash
cd src-tauri
cargo test
```

**Frontend** — there is no frontend test suite configured yet. `npm run build` runs `tsc` as part of the Vite build, which catches type errors across the React/TypeScript code on every build and in CI.

**CI** — `.github/workflows/ci.yml` runs on every push/PR to `main`: installs Linux system dependencies, sets up Rust and Node with caching, then runs `npm run build` (type-check + frontend build) and `cargo check` in `src-tauri`.

## Releasing

Pushing a tag matching `v*` (or manually triggering the workflow) runs `.github/workflows/release.yml`, which builds installers on Linux, Windows, and macOS (macOS as a universal binary) using [`tauri-apps/tauri-action`](https://github.com/tauri-apps/tauri-action) and attaches them to a **draft** GitHub Release named after the tag. The Linux leg passes `--bundles all` so CI (which has full internet access, unlike local/sandboxed builds) still produces an AppImage despite the `tauri.linux.conf.json` restriction. Review the draft release and publish it manually.

## Recommended IDE setup

[VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
