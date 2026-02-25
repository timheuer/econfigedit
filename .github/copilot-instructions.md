# Copilot Instructions for `econfigedit`

## Build, test, and lint commands

- Install deps: `npm install`
- Compile extension + copy webview CSS to `dist/`: `npm run compile`
- Lint TypeScript source: `npm run lint`
- Run extension tests (includes `pretest` compile + lint): `npm run test`
- Run a single test by name (Mocha grep passed through `vscode-test`): `npm run test -- --grep "Sample test"`
- Package VSIX locally: `npm run package`

## High-level architecture

- This is a VS Code **custom text editor extension** for `*.editorconfig` files (`package.json` contributes `econfigedit.editor`).
- `src/extension.ts` registers `EditorConfigEditorProvider`, which is the runtime bridge between VS Code text documents and the webview UI.
- `src/editorConfigEditorProvider.ts`:
  - sets `webview.options` (`enableScripts`, `localResourceRoots` for `dist` and Codicons),
  - injects HTML from `getWebviewContent(...)`,
  - listens for text document changes and posts full content updates to the webview,
  - applies full-document replacements on `update` messages from the webview.
- `src/webview.ts` contains the UI and client logic as inline HTML/CSS/JS:
  - renders section/property controls,
  - manages add/delete/filter/collapse interactions,
  - debounces writes (`updateDocument`) and sends complete `.editorconfig` content back to the extension host.
- `src/parser.ts` provides parsing/stringifying utilities for EditorConfig sections, used by the provider for structured updates.
- Styling source is `src/vscode-elements.css`, copied into `dist/` during compile (`copy-css`) and loaded by the webview.

## Key repository-specific conventions

- The extension writes `.editorconfig` content in a canonical shape starting with `root = true` and a blank line before sections.
- Section parsing is line-based and intentionally permissive: comments/blank lines are skipped; only bracket headers and `key = value` pairs inside a current section are materialized.
- Webview is the UI source of truth: edits are reflected by regenerating and posting the full document text (not minimal text diffs).
- Standard EditorConfig keys are constrained by `propertyOptions` in `src/webview.ts`; unknown keys are treated as custom free-text properties.
- CSP/asset loading pattern is strict: generate nonce via `getNonce()`, set CSP in HTML, and only load extension resources through `webview.asWebviewUri(...)`.
- Test runner is configured by `.vscode-test.mjs` to discover compiled tests at `out/test/**/*.test.js`; align new tests and build output with that expectation.
