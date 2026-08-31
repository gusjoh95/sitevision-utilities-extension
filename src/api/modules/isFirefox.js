export async function isFirefox() {
  try {
    // browser.runtime.getBrowserInfo is a Firefox-exclusive API.
    // In Chromium-based browsers, this call throws an error.
    // @ts-ignore
    // eslint-disable-next-line no-undef
    const info = await browser.runtime.getBrowserInfo();
    return info?.name === 'Firefox';
  } catch {
    return false;
  }
}
