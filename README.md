# Sitevision Utilities Extension

A lightweight browser extension for [Sitevision](https://sitevision.net/) developers. It provides debugging and development utilities for Chromium browsers and Firefox using Manifest V3.

[![Get the extension on Chrome Web Store](./assets/docs/chrome_web_store.png)](https://chromewebstore.google.com/detail/sitevision-utilities/mddhjfmdpmfplpmiamdpmebndmhakaia) [![Get the extension on Mozilla Addons](./assets/docs/get-the-addon-ff.png)](https://addons.mozilla.org/en-US/firefox/addon/sitevision-utilities/)

## For users

### Features

The extension is arranged in this order:

1. **Find login page**: checks pre-configured paths (such as `/edit`) and configured custom paths for Basic-auth prompts and Sitevision login forms.
2. **Open options**: opens the extension settings page. See [Options](#options).
3. **Node properties**: inspect the current page, current user, or a manually supplied node id through the Sitevision REST API. Referenced node ids can be opened directly from the JSON result. See the [Sitevision REST API documentation](https://developer.sitevision.se/docs/rest-api/model-rest-api).
4. **Session parameters**: toggle `profiling`, `jsdebug`, and `slimRender`. The active page can be reloaded after a change when enabled in settings.
5. **Consent cookie**: inspect accepted and denied consent-cookie categories. This feature requires additional browser permissions.

### Options

The options page provides:

- **Target paths**: adds candidate paths to login discovery. Enter paths one per line or separated by commas; paths without a leading `/` are normalized automatically.
- **Rich JSON view**: enables syntax highlighting and clickable node-id traversal in the properties view.
- **JSON theme**: selects the visual theme for Rich JSON view.
- **Reload on parameter update**: reloads the current page after a session-parameter change.

### Browser permissions

The extension requests additional permissions only for features that need them, such as consent-cookie inspection and login discovery. In Firefox, login discovery may ask for access to the current site when it is first launched. The popup closes so Firefox can display its permission prompt; after granting access, launch the feature again.

## For contributors

### Development setup

The extension uses native ES modules and does not need transpilation or bundling. It does require a manifest-selection step because Chrome-based browsers and Firefox use different background configurations.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Select the browser you are developing for:

   ```bash
   npm run dev:ch   # Chrome, Edge, or Brave
   # or
   npm run dev:ff   # Firefox
   ```

   This copies `src/manifest.chrome.json` or `src/manifest.firefox.json` to the generated `src/manifest.json`. The generated file is ignored by Git.

3. Load the `src` directory as an unpacked extension in the browser. Run the matching manifest command again whenever you switch browsers.

### Note about the `browser` namespace and types

Starting with Chrome 148 the browser exposes the standard `browser` namespace in addition to `chrome`. This project adopts `browser.*` at runtime and sets `minimum_chrome_version` in the Chromium manifest template to ensure `browser` is available. For editor type-checking we use the `chrome-types` package together with a local declaration file in `types/browser.d.ts` that maps `browser` to `typeof chrome` so the JS/TS language server understands the `browser` API without adding `.d.ts` files to `src/`.

### Available scripts

| Command                        | Purpose                                                                                                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev:ch`               | Select the Chromium manifest for local development.                                                                                                                                             |
| `npm run dev:ff`               | Select the Firefox manifest for local development.                                                                                                                                              |
| `npm run lint`                 | Run ESLint against the `src` directory.                                                                                                                                                         |
| `npm run format`               | Format the repository with Prettier.                                                                                                                                                            |
| `npm run create-release`       | Build release archives for the active browser targets.                                                                                                                                          |
| `npm run check:theme-contrast` | Scan and validate JSON theme colors under [src/resources/style/json-themes](src/resources/style/json-themes); composites translucent `-bg` over `--json-bg` and prints WCAG >= 4.5 suggestions. |

#### Release packaging

`npm run create-release` reads both browser manifest templates and creates archives under `dist/chrome` and `dist/firefox`. Each archive contains the shared source files plus the correct manifest renamed to `manifest.json`; the browser-specific template files are excluded.

Before building, the script:

- warns about differences in shared manifest keys and asks for confirmation;
- compares Chrome and Firefox versions and asks whether to build only the higher-version target when they differ;
- skips an existing archive unless overwrite is explicitly requested.

Useful flags:

```bash
npm run create-release -- --force   # overwrite existing archives
npm run create-release -- --yes     # skip prompts; on version mismatch, build the higher version target
```

Use `--force --yes` for a non-interactive overwrite build.

### Architecture

The project is organized by responsibility:

```
src/
├── manifest.chrome.json          <-- Chromium MV3 manifest template
├── manifest.firefox.json         <-- Firefox MV3 manifest template
├── manifest.json                 <-- Generated local manifest (gitignored)
├── background/                   <-- Background runtime services
│   ├── index.js                  <-- Registers background listeners (tab watchers, changelog-on-update)
│   └── modules/
├── api/                          <-- Shared extension API modules
├── resources/                    <-- Icons, shared CSS, and JSON themes
│   └── releases/                 <-- Per-version release notes shown by the changelog view
│       └── 1.0.0.0.md
└── views/
    ├── popup/                    <-- Main extension control panel
    ├── find-login/               <-- Login discovery window
    ├── options/                  <-- Extension settings
    ├── properties/               <-- JSON node-property viewer
    └── changelog/                <-- "What's new" view shown after an update
```

`src/api/index.js` is the public API facade. Views use native browser modules directly, while background services handle work that doesnt necessitate running in a "scripting context" (to keep required permissions to a minimum).

### Changelog view ("what's new" on update)

When the extension is updated (not on first install), `background/modules/openChangelogOnUpdate.js` opens `views/changelog/changelog.html` in a new tab. That page fetches `resources/releases/<version>.md` — where `<version>` is the new `chrome.runtime.getManifest().version` — and renders it with a small built-in Markdown renderer (`views/changelog/modules/renderMarkdown.js`). No external Markdown library is bundled; only a safe subset of Markdown is supported (headings, bullet lists, paragraphs, and inline `**bold**`, `` `code` ``, and `[text](url)`), rendered directly to DOM nodes so release notes can never inject arbitrary markup.

`resources/releases/versions.json` is an ordered (oldest-first) catalogue of every version that has release notes:

```json
{
  "_comment": "Optional 'hotfixTarget' hides a platform-specific hotfix release from the other browser's changelog nav.",
  "releases": [{ "version": "1.0.0.0" }, { "version": "1.0.0.1", "hotfixTarget": "firefox" }]
}
```

The changelog view uses this catalogue to enable **Older**/**Newer** navigation buttons, letting users browse past release notes without changing the page's `?version=` query param (which always reflects the version that triggered the page to open). A release entry's optional `hotfixTarget` (`"chrome"` or `"firefox"`) hides it from the navigation on the other browser — useful for a platform-specific hotfix (see the [4-digit versioning strategy](#versioning)) that has nothing relevant to say to the other browser's users. Omit `hotfixTarget` for releases that apply to both.

**To publish release notes for a new version:**

1. Bump the version in `src/manifest.chrome.json` and `src/manifest.firefox.json`.
2. Add a new Markdown file at `src/resources/releases/<version>.md` (the filename must exactly match the new manifest `version` string, e.g. `1.1.0.0.md`).
3. Add a `{ "version": "<version>" }` entry to the `releases` array in `src/resources/releases/versions.json`, setting `hotfixTarget` if the release is specific to one browser.
4. Write the release notes using the supported subset of Markdown, for example:

   ```markdown
   # What's new in v1.1.0.0

   ## [DATE]

   Summary

   ### Added

   - **Some feature:** A short, user-facing description.

   ### Fixed

   - A short description of a user-visible bug fix.
   ```

If no matching file exists for the installed version, the changelog view falls back to a generic "has been updated" message instead of failing.

`npm run create-release` enforces this catalogue: before building, it checks that every version being built (per active target) has both a matching `<version>.md` file and a `versions.json` entry, and that the entry's `hotfixTarget` (if any) matches the browser being built for. The build aborts with an error if any of these checks fail.

### Cross-browser manifests

`src/manifest.chrome.json` and `src/manifest.firefox.json` share the extension metadata but provide browser-specific background settings and Firefox metadata. `src/manifest.json` is a generated local artifact, not a source file to edit manually.

If you update the Chromium manifest to require Chrome >=148, the `browser` namespace will be available at runtime and code using `browser.*` will work without any runtime shim.

### Validation and contributions

Run validation before opening a pull request:

```bash
npm run lint
npm run format
```

For contribution guidelines and project direction, see [CONTRIBUTING.md](CONTRIBUTING.md).

### Versioning

The project uses a four-part versioning strategy (`MAJOR.MINOR.PATCH.HOTFIX`) in the browser manifests:

```
X . X . X . X
│   │   │   └── Platform hotfix (Chrome- or Firefox-specific fix)
│   │   └────── Patch (cross-platform bug fix)
│   └────────── Minor (new feature)
└────────────── Major (breaking change or complete overhaul)
```
