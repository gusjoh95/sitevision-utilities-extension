Open the extension while viewing a Sitevision page. Its tools and windows operate on that tab; if it is closed or navigates to another site, reopen the extension from the intended page. Most features use temporary access to the active tab. Reading the `sv-cookie-consent` cookie requires optional cookie and host permissions for the active site.

## Find login page

Use **Find login page** to look for login endpoints on the active site's origin. It checks `/edit`, `/webdav/images/`, `/webdav/files/`, and the target paths configured in Options. Target paths are paths on the current site, not full URLs; enter one per line or separate them with commas. A leading slash is added if needed.

The search prefers a Sitevision login form. If none is found, a WebDAV endpoint protected by HTTP Basic Auth can be reported as a fallback. Select the result link to open its URL in a new tab. A path that redirects to another origin is not treated as a login result.

## Reindex node tree

Use **Reindex node tree** to discover and reindex the tree starting at the current node. You must be logged in through the active Sitevision tab; without a valid session token, **Preview** and **Start Reindex** are unavailable.

**Preview** discovers nodes depth-first and shows which will be reindexed, skipped because `robotsIndex=false`, or unsupported. It sends no reindex requests. Containers such as `sv:folder` and repositories are traversed to reach their children, but are not reindexed themselves. By default, nodes with `robotsIndex=false` are skipped; the checkbox includes otherwise eligible nodes without changing that property. A completed preview is reused by **Start Reindex** for the same tab, site, and root; the current checkbox setting still determines which eligible nodes are sent.

Both delay settings default to 125 ms: one paces reindex requests and the other tree-discovery REST calls. Delays below 100 ms require confirmation and may trigger rate limits or freeze the session. **Cancel** stops further requests; one already in progress may finish. Leaving or reloading the Sitevision tab during Preview or reindexing may show a browser confirmation.

## Node properties

Choose **Online** (published data) or **Offline** (editor data). The popup defaults to Offline in edit mode and Online otherwise. Use **Current node**, **Current user**, or enter a node ID. Outside edit mode, **Current node** uses the ID exposed as `window.sv.PageContext.pageId`. In edit mode, it prefers the most specific node ID in the URL; when the current view has no URL ID, it reads the matching entry in `window.editor.appContext.lastNode` (for example, `page`, `file`, or `template`). If no node can be resolved, **Current node** is unavailable. **Current user** uses the identity in the page context and is unavailable if that identity cannot be read.

The Properties window shows node data as JSON. Its toolbar provides back/forward navigation, copy, word wrap, and an Online/Offline switch. The selected version follows node navigation and browser history; word wrap is remembered. **Rich JSON view** in Options adds syntax highlighting and clickable, individually copyable node IDs. The JSON theme changes colors only; with Rich JSON view off, node IDs are not clickable.

## Session parameters

The popup's `profiling`, `jsdebug`, and `slimRender` controls are available on online pages, not in edit mode. The page reloads after an update if **Reload on parameter update** is enabled in Options; otherwise, reload it when needed.

The displayed `jsdebug` state is inferred from page assets and may be inaccurate.

## Consent cookie

The popup shows accepted and denied entries in the active site's `sv-cookie-consent` cookie, or reports when it is missing. Reading it requires optional cookie and host permissions for that site; grant them via the prompt button when permissions are missing. **Delete consent cookie** removes the cookie and reloads the page.

## Options

Open Options from the popup's gear button. Changes apply when you select **Save**:

- **Target paths** adds site-relative paths for Find login page to check. Separate paths with newlines or commas; a leading slash is added if missing.
- **Rich JSON view** enables syntax highlighting and clickable node IDs in Properties. **JSON theme** changes the colors; its preview uses sample data.
- **Reload on parameter update** controls whether session-parameter changes reload the active page. Pages in edit mode are not reloaded.
- The version link at the bottom opens the release notes in a new tab.
