/**
 * @typedef {Object} MatchOptions
 * @property {string} [selector='*'] - CSS selector to target specific elements (e.g., 'script', 'meta').
 * @property {RegExp | string} [pattern] - The regex pattern to match against element content.
 */

/**
 * Tests HTML content against a CSS selector and a regular expression pattern.
 *
 * @param {string} html - The raw HTML string to parse and check.
 * @param {MatchOptions} [options={}] - Matching configuration options.
 * @returns {boolean} True if the HTML yields matching content, otherwise false.
 */
export default function matchDOM(html, { selector = '*', pattern = '' } = {}) {
  if (!html) {
    return false;
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const elements = doc.querySelectorAll(selector);

  const patternSource = pattern instanceof RegExp ? pattern.source : pattern;
  const patternFlags = pattern instanceof RegExp ? pattern.flags : 'i';
  const regex = new RegExp(patternSource, patternFlags);

  for (const el of elements) {
    const targetText = el.textContent || el.getAttribute('content') || '';
    if (regex.test(targetText)) {
      return true;
    }
  }

  return false;
}
