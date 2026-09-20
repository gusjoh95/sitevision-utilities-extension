# Changelog

All notable changes to the **Sitevision Utilities Extension** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
For details on the 4-digit versioning strategy (`MAJOR.MINOR.PATCH.HOTFIX`), see the [Versioning section in README.md](README.md#versioning).

## [Unreleased]

### Added

- New function: `find-login` where supplied endpoints are traversed in order to find an instance of [`sv-login-portlet`](https://help.sitevision.se/en/loginHelp.html)
- Add configurable custom login paths and a dedicated discovery view for detecting local login forms and external identity-provider redirects.
- Add browser-specific Chrome and Firefox manifests and popup controls for launching login discovery.
- Add shared target-tab access helpers and background tab watchers for detecting closed tabs, origin changes, and revoked browser permissions across extension views.
- Add `assertTargetTabAccessible` and `registerTargetPermissionListener` helpers to standardize detection of closed tabs, origin changes, and revoked host permissions (developer-facing API).

### Changed

- Development and release workflows now select a browser manifest before loading or packaging the extension (`npm run dev:ch` or `npm run dev:ff`).
- Add Firefox host-permission handling from the popup click gesture and update the UI when discovery requires permission.
- Improve tooltip accessibility across the UI by switching to `data-tooltip` and `sr-only` descriptions, while updating the HTML lint rules to enforce the new pattern.
- Update release packaging to create browser-specific archives and validate manifest differences.
- UI feedback and state rollback for session parameter toggles ([#1](https://github.com/gusjoh95/sitevision-utilities-extension/issues/1)):
  - Disable checkbox and set indeterminate state while processing network request.
  - Revert checkbox state if the background request fails.
- Preserve rendered properties JSON when the originating tab becomes inaccessible; show a non-destructive target-access warning in `#error` instead of replacing the JSON output.
- Make `find-login` discovery stop and report a clear `Target unavailable` status when the originating tab is closed or host permissions are revoked, avoiding repetitive network error logs.

- Adopt `browser` runtime namespace for Chromium (Chrome ≥148). Added `types/browser.d.ts` to map `browser` to `typeof chrome` for editor type-checking, updated `jsconfig.json` and `eslint.config.js`, and migrated runtime API calls from `chrome.*` to `browser.*` across `src/`. JSDoc/type annotations remain `chrome.*` to preserve `chrome-types` resolution. This change requires setting `minimum_chrome_version` in the Chromium manifest and may be incompatible with older Chrome versions.

### Deprecated

### Removed

### Fixed

- Fix tab reload after parameter updates on 404 pages ([#1](https://github.com/gusjoh95/sitevision-utilities-extension/issues/1)).
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
