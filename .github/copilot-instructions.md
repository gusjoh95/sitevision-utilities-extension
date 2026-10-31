# Copilot Instructions

## Project conventions

- This is a Manifest V3 browser extension for Chromium-based browsers and Firefox. It uses native JavaScript ES modules; do not add a bundling or transpilation step.
- Keep changes focused, follow the existing structure and style, and avoid unnecessary dependencies or unrelated refactors.
- Use the standard `browser.*` namespace at runtime. Chromium support relies on the minimum version declared in the manifest templates.
- Import shared API implementations through `src/api/index.js`, not directly from individual implementation modules.
- Use `dom.getRequiredElement(selector)` from `src/api/index.js` for required DOM elements. For optional elements, use a nullable lookup and handle the missing case explicitly. The helper checks presence, not the element's subtype, so keep the appropriate JSDoc type or runtime `instanceof` check when needed.
- Include the `.js` extension in relative JavaScript imports.
- Treat `src/manifest.chrome.json` and `src/manifest.firefox.json` as the source manifests. `src/manifest.json` is generated locally; select the target with `npm run dev:ch` or `npm run dev:ff` instead of editing the generated file.
- Preserve compatibility across both browser targets unless a change is intentionally browser-specific.

## Documentation

- The user-facing feature guide is `src/resources/docs/user-guide.md`. Keep it concise and verify behavioral claims against the implementation.
- Release notes are versioned in `src/resources/releases/<version>.md`; `src/resources/releases/versions.json` is their navigation catalogue. Do not recreate a root changelog or suggestions file.
- These Markdown files are rendered by `src/api/modules/markdownRenderer.js`, which supports a limited syntax: headings, paragraphs, nested bullet lists, bold, strikethrough, code, and links. Use two spaces for each nested list level; do not rely on unsupported Markdown or embedded HTML.

## Edit mode and reindexing

- Edit mode is detected from the tab URL path with `pathname.startsWith('/edit')`; do not infer it from whether a node ID was resolved.
- When resolving Current node, prefer the deepest node ID in the edit URL. A bare `/edit` resolves `window.editor.appContext.lastNode.page`; other view contexts without a URL node ID use the matching `lastNode` entry. If that entry is unavailable, return no node rather than falling back to the base page ID.
- Keep traversable and indexable reindex node types distinct. Containers and repositories may be traversed to reach children without being reindexed. `robotsIndex=false` skips an otherwise eligible node, not its children; the override must not mutate the node property.
- A completed reindex preview is reusable only for the same tab, origin, and root. If preview options change, keep its displayed summary consistent with the option that will be used by Start Reindex.

## Tooltips and accessible controls

- Use the shared `data-tooltip` attribute for in-app hover and focus tooltips; do not use `title` for tooltips. Its styling and behavior are defined in `src/resources/style/base.css`.
- For icon-only controls, use an empty `data-tooltip` together with a descriptive `aria-label`; the shared CSS uses the accessible label as the tooltip text.
- For explanatory tooltips, put the tooltip text in `data-tooltip` and provide matching `.sr-only` text inside the element, or provide an appropriate `aria-label` when there is no matching hidden description.
- Keep controls accessible by keyboard and make sure icon-only controls have an accessible name. The HTML lint rules enforce the tooltip/accessibility text conventions.

## Validation and releases

- Run `npm run lint` after code or markup changes.
- `npm run format` formats the whole repository. For a focused formatting change, format only the affected files rather than rewriting unrelated files.
- Versions use four numeric components: major, minor, patch, and platform hotfix. Keep browser manifest versions aligned unless a platform-specific hotfix is intended.
- When changing a release version, update the matching release notes and `src/resources/releases/versions.json`; use `npm run create-release` to validate and package releases.
