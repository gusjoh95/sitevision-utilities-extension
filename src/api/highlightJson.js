/**
 * Parse a JSON string or object and return a DocumentFragment with syntax highlighting applied.
 * @param {string|JSON} input - The JSON string or object to highlight.
 * @returns {DocumentFragment} Highlighted JSON as a DocumentFragment ready for DOM insertion.
 */
export function highlightJson(input) {
  const json = typeof input === "string" ? input : JSON.stringify(input, null, 2);

  const svIdPattern = /^\d{1,3}\.[0-9a-z]+(?:_.+)?$/;
  const tokenRe = /("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(?:true|false|null)\b|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/gu;
  const frag = document.createDocumentFragment();

  const createSpan = (className, text) => {
    const el = document.createElement("span");
    el.className = className;
    el.textContent = text;
    return el;
  };

  let lastIndex = 0;
  let m;

  while ((m = tokenRe.exec(json)) !== null) {
    const idx = m.index;
    if (idx > lastIndex) {
      frag.appendChild(document.createTextNode(json.slice(lastIndex, idx)));
    }

    const token = m[0];
    if (m[1] !== undefined) {
      const stringLiteral = m[1];
      const hasColon = m[2] !== undefined;

      if (hasColon) {
        frag.appendChild(createSpan("json-key", token));
      } else {
        const inner = stringLiteral.slice(1, -1);
        const className = svIdPattern.test(inner) ? "json-id" : "json-string";
        frag.appendChild(createSpan(className, stringLiteral));
      }
    }
    else if (token === "true" || token === "false") {
      frag.appendChild(createSpan("json-boolean", token));
    }
    else if (token === "null") {
      frag.appendChild(createSpan("json-null", token));
    }
    else {
      frag.appendChild(createSpan("json-number", token));
    }

    lastIndex = tokenRe.lastIndex;
  }

  if (lastIndex < json.length) {
    frag.appendChild(document.createTextNode(json.slice(lastIndex)));
  }

  return frag;
}