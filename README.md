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

**Note about the `browser` namespace and types**

Starting with Chrome 148 the browser exposes the standard `browser` namespace in addition to `chrome`. This project adopts `browser.*` at runtime and sets `minimum_chrome_version` in the Chromium manifest template to ensure `browser` is available. For editor type-checking we use the `chrome-types` package together with a local declaration file in `types/browser.d.ts` that maps `browser` to `typeof chrome` so the JS/TS language server understands the `browser` API without adding `.d.ts` files to `src/`.

Why JSDoc still references `chrome.*`:

The shipped `chrome-types` package provides the publicly-consumable API shapes used by the editor and TypeScript tooling. Referencing `chrome.*` in JSDoc ensures the language server resolves types from that package. At runtime we use `browser.*` (available when `minimum_chrome_version` >= 148). The `types/browser.d.ts` file maps the runtime `browser` global to `typeof chrome` so both runtime code and editor types work together without duplicating or emitting type files into `src/`.

3. Load the `src` directory as an unpacked extension in the browser. Run the matching manifest command again whenever you switch browsers.

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
├── api/                          <-- Shared extension API modules
├── resources/                    <-- Icons, shared CSS, and JSON themes
└── views/
    ├── popup/                    <-- Main extension control panel
    ├── find-login/               <-- Login discovery window
    ├── options/                  <-- Extension settings
    └── properties/               <-- JSON node-property viewer
```

`src/api/index.js` is the public API facade. Views use native browser modules directly, while background services handle work that doesnt necessitate running in a "scripting context" (to keep required permissions to a minimum).

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
