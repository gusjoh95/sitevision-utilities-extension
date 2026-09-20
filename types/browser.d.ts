// Make the `browser` global available to editors/TS when using `chrome-types`.
// This tells TypeScript/JS language servers that `browser` is the same shape as `chrome`.
declare global {
  // `browser` is available on globalThis in Chromium 148+.
  const browser: typeof chrome;
}

export {};
