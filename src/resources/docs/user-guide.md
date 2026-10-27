## Find login page

Use **Find login page** to check the predefined login paths and any target paths you add in Options. The search looks for Sitevision login forms and Basic Auth prompts. When a result is found, select it to copy its URL.

## Reindex node tree

Use **Reindex node tree** on an eligible Sitevision page to inspect and reindex its node tree. Select **Preview** to see which nodes will be included, **Start Reindex** to begin, or **Cancel** to stop an active preview or reindex operation.

You can set delays between reindex and REST API calls. Nodes with `robotsIndex=false` are excluded unless you enable **Reindex nodes with robotsIndex=false**.

## Node properties

Choose **Online** or **Offline**, then inspect the **Current node**, **Current user**, or enter a node ID. In the properties view, referenced node IDs can be opened to continue exploring. **Rich JSON view** and its themes are configured in Options.

## Session parameters

Toggle `profiling`, `jsdebug`, or `slimRender` in the popup. Options can reload the active page after a parameter update. Reloading is not available in edit mode.

## Consent cookie

Grant the requested browser permissions to inspect the site's consent cookie. The popup shows accepted and denied cookie categories and lets you delete the cookie.

## Options

Open Options from the gear button in the popup to configure:

- **Target paths** checked by Find login page. Enter paths on separate lines or separated by commas.
- **Rich JSON view** and the selected JSON theme for node properties.
- **Reload on parameter update** for session parameters.
