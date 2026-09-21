# Changelog

All notable changes to the **Sitevision Utilities Extension** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
For details on the 4-digit versioning strategy (`MAJOR.MINOR.PATCH.HOTFIX`), see the [Versioning section in README.md](README.md#versioning).

## [Unreleased]

### Added

- New function: `find-login` where supplied endpoints are traversed in order to find an instance of [`sv-login-portlet`](https://help.sitevision.se/en/loginHelp.html).
  - Also checks for Basic Auth promps (on certain pre-configured WebDAV paths).
  - Add configurable custom login paths to options.
- Add quick link to the extension options in popup view.
- Add browser-specific Chrome and Firefox manifests.
- Add `assertTargetTabAccessible` and `registerTargetPermissionListener` helpers to standardize detection of closed tabs, origin changes, and revoked host permissions (developer-facing API).
- Add changelog for end-user which is shown on update. See more in [README/Architecture](README.md#architecture).
- Add hover/focus tooltips to popup and options controls (find-login, open-options, custom login paths, highlight JSON, edit-mode notices) that previously had none.

### Changed

- Parameters: UI feedback and state rollback for session parameter toggles (disable checkbox + indeterminate while processing; revert state on failure).
- Properties: Add six JSON themes (`neon-noir`, `pastel-sunset`, `matrix-glow`, `solar-flare`, `retro-wave`, `aurora-borealis`).
- Properties: Improve key emphasis (`--json-key-fg` + bold `.json-key`) for clearer key/value separation.
- Properties: Move `.json-id` presentation to global styles; themes now only provide color tokens.
- Properties: Preserve rendered properties JSON when the originating tab becomes inaccessible; show a non-destructive target-access warning in `#error`.
- Runtime: Adopt `browser` runtime namespace for Chromium (Chrome ≥148). Added `types/browser.d.ts` to map `browser` to `typeof chrome` for editor type-checking, updated `jsconfig.json` and `eslint.config.js`, and migrated runtime API calls from `chrome.*` to `browser.*` across `src/`. JSDoc/type annotations remain `chrome.*` to preserve `chrome-types` resolution. This change requires setting `minimum_chrome_version` in the Chromium manifest and may be incompatible with older Chrome versions.
- Tooling: Add `scripts/check-theme-contrast.js` to validate theme contrast and suggest fixes; add `check:theme-contrast` npm script and README note.
- Tooling: Development and release workflows now select a browser manifest before loading or packaging the extension (`npm run dev:ch` or `npm run dev:ff`).
- Tooling: Update release packaging to create browser-specific archives and validate manifest differences.
- Views: Rework tooltips to use a `data-tooltip` attribute with required `sr-only`/`aria-label` text instead of the `.tooltipped` class; add HTML lint rules (`tooltip-requires-nested-sronly`, `tooltip-text-match`) to enforce it.
- Views: Standardize JSON spacing with `--spacing-*` variables in `resources/style/base.css`.

### Deprecated

- Chromium: Extension is now only compatible with versions >= 147.

### Removed

- Updating paramaters is no longer possible in edit-mode.

### Fixed

- Fix tab reload after parameter updates on 404 pages ([#1](https://github.com/gusjoh95/sitevision-utilities-extension/issues/1)).
- The session state when populating the checkboxes is no longer evaluated in edit-mode either (the checkboxes are kept disabled). ([#2](https://github.com/gusjoh95/sitevision-utilities-extension/issues/2)).
- Remove fixed layout width in options page and refine input element styling ([#3](https://github.com/gusjoh95/sitevision-utilities-extension/issues/3)).

### Security

## [1.0.0.0] - 2026-09-02

### Added

- Initial release of Sitevision Utilities Extension.
  - **Node properties:** Inspect current page, current user, or custom node ID via Sitevision REST API with clickable node ID traversal.
  - **Session parameters:** Toggle the profiling, jsdebug, and slimRender flags with optional auto-reload.
  - **Consent cookie:** Decode the [`sv-cookie-consent`](https://help.sitevision.se/en/siteCookiesHelp_sv.html) cookie to inspect accepted/denied cookies, with an option to clear it.
  - **Options page:** Configure JSON syntax highlighting, selectable themes, and auto-reload behavior.
- Support for Chromium (Chrome, Edge, Brave) and Firefox using a unified Manifest V3 codebase without a build step.
