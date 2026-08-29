# Sitevision Utilities Extension

A lightweight browser extension for [Sitevision](https://sitevision.net/) developers providing debugging and development utilities.  
Supports Chromium (Chrome, Edge, Brave) and Firefox using Manifest V3 with no build step required.

## Contributing

For contribution guidelines and project direction, see [CONTRIBUTING.md](CONTRIBUTING.md).

## What the extension does

The extension is centered around the views in `src/views` and a small shared API layer in `src/api`.

- **Node properties:** From the popup, the user can inspect the current page, the current user (when available), or a manually supplied node id. The extension opens a dedicated properties view, fetches node properties from the Sitevision REST API, and lets the user navigate between referenced node ids directly in the result. For more information about the Sitevision API used here, see the [REST API documentation](https://developer.sitevision.se/docs/rest-api/model-rest-api).
- **Session parameters:** The popup can toggle Sitevision session flags such as `profiling`, `jsdebug`, and `slimRender`. Changing either flag triggers a background request, and the active page is reloaded afterward when that behavior is enabled in settings.
- **Consent cookie inspection:** The extension can read the Sitevision consent cookie, decode the accepted and denied cookie categories, and display them in a readable format. This function requires additional permissions.

The extension is split into a few focused views:

- **`src/views/popup`**: the main control panel for fetching node properties, updating session parameters, and reading the consent cookie.
- **`src/views/properties`**: the dedicated viewer for JSON property payloads, with clickable node ids and optional syntax highlighting.
- **`src/views/options`**: configuration page for extension settings.

### Available options

The settings page currently contains the following user-configurable options:

- **Highlight JSON**: enables syntax highlighting in the properties view and node-id traversal within the rendered JSON.
- **JSON theme**: selects the visual theme used for highlighted JSON output.
- **Reload page when changing parameter**: automatically reloads the current page after a session parameter change, unless the current URL contains `/edit`.

## Architecture & File Structure

This project uses native ES modules directly in the browser with no build step, transpilation, or bundling required. The codebase is organized by responsibility: API layer, UI views, and shared resources.

```
src/
├── manifest.json                 <-- MV3 manifest
├── api/
│   ├── index.js                  <-- Public API facade
│   └── modules/                  <-- Internal implementation modules
├── resources/
│   ├── icons/
│   └── style/                    <-- Shared CSS & theme files
└── views/
    ├── popup/
    ├── options/
    └── properties/
```

**Key Design Principles:**

- **Public API Layer:** `src/api/index.js` is the only public entry point for extension features.
- **Buildless:** ES modules are loaded natively by the browser at runtime. No transpilation or bundling is required.
## Cross-Browser Compatibility

* **Unified API Namespace:** Uses a runtime check to normalize the API entry point across environments without external polyfill libraries:

  export const ext = globalThis.browser || globalThis.chrome;

* **Single Manifest (`manifest.json`):** Contains Firefox settings (`browser_specific_settings`) alongside standard Manifest V3 properties. Chromium ignores Firefox-specific fields without throwing errors.

## Versioning Scheme

The project uses a standard 4-digit versioning strategy (`MAJOR.MINOR.PATCH.HOTFIX`) in `manifest.json` to handle browser-specific store updates cleanly:
````
X . X . X . X
│   │   │   └── Platform Hotfix (Chrome or Firefox specific fix)
│   │   └────── Patch (Cross-platform bug fixes)
│   └────────── Minor (New features)
└────────────── Major (Breaking changes / complete overhaul)
````
