# Feature suggestions — Sitevision Utilities

Prioritized ideas with one-line implementation hints and file references.

- Copy ID to clipboard on click  
  Change .json-id click handler in src/views/properties/properties.js to use navigator.clipboard.writeText(id) for Ctrl/Cmd-click to copy; keep navigation on normal click.

- Quick-search and filter keys  
  Add a search input in properties view and filter the DocumentFragment returned by renderJSON for matching keys/values (src/views/properties/renderJson.js + properties.js).

- “Open in Sitevision editor” button  
  Add button that opens editor URL for current node (construct from origin + node) in src/views/index.html and index.js.

- Toggle fetch mode (in-page vs extension)  
  Add option in src/views/options/options.js to choose run-in-page fetch vs extension fetch, persisted via getOptions/setOptions in src/views/api.js.

- History / recent nodes sidebar  
  Persist recent node IDs in chrome.storage and show in popup for quick access; update src/views/index.js and storage via api.js.

- Copy/export JSON / download button  
  Add "Copy JSON" and "Download JSON" actions in properties view using the original data object.

- Improve error UI  
  Surface HTTP status and JSON error body from in-page fetch (show in UI) instead of a generic message; implement in properties.js getJson/render flow.

Notes:

- Prefer in-page fetch to avoid CORS in Firefox (use chrome.scripting.executeScript or tabs.executeScript fallback).
- Keep UI neutral (grayscale) and accessible; reuse existing CSS and add small helpers where needed.
