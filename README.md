# Sitevision Utilities Extension

A Manifest V3 browser extension for Sitevision developers. It uses native JavaScript modules and supports Chrome-based browsers and Firefox.

**Using the extension?** Start with the [User Guide](src/resources/docs/user-guide.md) for feature behavior, options, and permissions. Release history is maintained as one Markdown file per version in [`src/resources/releases`](src/resources/releases/) and shown in the extension's **What's new** view.

## System overview

- **Runtime:** Native ES modules; no bundling or transpilation.
- **Browser API:** Uses `browser.*`. Chromium support requires Chrome 148 or newer.
- **Manifests:** `src/manifest.chrome.json` and `src/manifest.firefox.json` are source templates. `src/manifest.json` is generated locally and should not be edited.
- **Permissions:** Uses temporary active-tab access for most features. Cookie inspection and some browser-specific site access require optional permissions; see the [User Guide](src/resources/docs/user-guide.md).

### Source layout

```text
src/
├── api/             Shared browser and Sitevision helpers
├── background/      Extension lifecycle and tab listeners
├── resources/       Styles, icons, user guide, and release notes
└── views/           Popup, options, properties, login, reindex, docs, and changelog pages
```

`src/api/index.js` is the shared API facade. Each view is a browser page with its own HTML entry point and JavaScript module.

## Development

Install dependencies and select the manifest for the browser you are developing against:

```bash
npm install
npm run dev:ch   # Chrome, Edge, or Brave
# or
npm run dev:ff   # Firefox
```

Then load `src/` as an unpacked extension. Re-run the matching `dev` command when switching browsers; it copies the selected manifest template to the generated `src/manifest.json`.

## Validation

- `npm run lint` runs ESLint against `src/`.
- `npm run check:theme-contrast` checks JSON theme contrast.
- `npm run format` formats the repository with Prettier.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Releases

Versions use four numeric components: `MAJOR.MINOR.PATCH.HOTFIX`. Keep browser manifest versions aligned unless a release intentionally targets one browser.

For a release, update the source manifests, add `src/resources/releases/<version>.md`, and add the version to `src/resources/releases/versions.json`. Set `hotfixTarget` to `chrome` or `firefox` only for platform-specific notes. `npm run create-release` validates the notes and catalogue, then creates browser-specific archives under `dist/`.

Use `--force` to overwrite existing archives and `--yes` to skip prompts. The release script may limit output to the higher-version browser when manifest versions differ.

## License

Project code is licensed under GPL-3. Third-party assets retain their own licenses; see [COPYING](COPYING) and the notices in `src/resources/icons/bootstrap/`.
