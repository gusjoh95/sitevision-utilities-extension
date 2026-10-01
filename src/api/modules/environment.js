export async function isFirefox() {
  try {
    // browser.runtime.getBrowserInfo is a Firefox-exclusive API.
    // @ts-ignore
    const info = await browser.runtime.getBrowserInfo();
    return info?.name === 'Firefox';
  } catch {
    return false;
  }
}
