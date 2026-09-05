# Changelog

All notable changes to the **Sitevision Utilities Extension** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
For details on the 4-digit versioning strategy (`MAJOR.MINOR.PATCH.HOTFIX`), see the [Versioning Scheme in README.md](README.md#versioning-scheme).

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

## [1.0.0.0] - 2026-09-02

### Added

- Initial release of Sitevision Utilities Extension.
  - **Node properties:** Inspect current page, current user, or custom node ID via Sitevision REST API with clickable node ID traversal.
  - **Session parameters:** Toggle the profiling, jsdebug, and slimRender flags with optional auto-reload.
  - **Consent cookie:** Decode the [`sv-cookie-consent`](https://help.sitevision.se/en/siteCookiesHelp_sv.html) cookie to inspect accepted/denied cookies, with an option to clear it.
  - **Options page:** Configure JSON syntax highlighting, selectable themes, and auto-reload behavior.
- Support for Chromium (Chrome, Edge, Brave) and Firefox using a unified Manifest V3 codebase without a build step.
