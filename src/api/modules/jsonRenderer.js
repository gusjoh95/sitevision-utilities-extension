/**
 * Parses JSON and returns a syntax-highlighted fragment for insertion into a view.
 *
 * @param {string | JSON} input - The JSON string or object to highlight.
 * @returns {DocumentFragment} Highlighted JSON with the view's JSON classes applied.
 */
export function highlight(input) {
  const json = typeof input === 'string' ? input : JSON.stringify(input, null, 2);

  const svIdPattern = /^\d{1,3}\.[0-9a-z]+(?:_.+)?$/;
  const tokenRe =
    /("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*")(:)?|\b(?:true|false|null)\b|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/gu;
  const fragment = document.createDocumentFragment();

  /**
   * @param {string} className
   * @param {string} text
   * @returns {HTMLSpanElement}
   */
  const createSpan = (className, text) => {
    const element = document.createElement('span');
    element.className = className;
    element.textContent = text;
    return element;
  };

  let lastIndex = 0;
  let match;

  while ((match = tokenRe.exec(json)) !== null) {
    const index = match.index;
    if (index > lastIndex) {
      fragment.appendChild(document.createTextNode(json.slice(lastIndex, index)));
    }

    const token = match[0];
    if (match[1] !== undefined) {
      const stringLiteral = match[1];
      const hasColon = match[2] !== undefined;

      if (hasColon) {
        fragment.appendChild(createSpan('json-key', token));
      } else {
        const inner = stringLiteral.slice(1, -1);
        const className = svIdPattern.test(inner) ? 'json-id' : 'json-string';
        fragment.appendChild(createSpan(className, stringLiteral));
      }
    } else if (token === 'true' || token === 'false') {
      fragment.appendChild(createSpan('json-boolean', token));
    } else if (token === 'null') {
      fragment.appendChild(createSpan('json-null', token));
    } else {
      fragment.appendChild(createSpan('json-number', token));
    }

    lastIndex = tokenRe.lastIndex;
  }

  if (lastIndex < json.length) {
    fragment.appendChild(document.createTextNode(json.slice(lastIndex)));
  }

  return fragment;
}