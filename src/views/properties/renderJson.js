export function renderJSON(value) {
  const json = typeof value === "string" ? value : JSON.stringify(value, null, 2);

  const svIdPattern = /^\d{1,3}\.[0-9a-z]+(?:_.+)?$/;
  
  // Group 1: Matches the entire quoted string
  // Group 2 (\s*:): Optional capturing group to check for trailing whitespace + colon
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

    // Append punctuation or whitespace between tokens
    if (idx > lastIndex) {
      frag.appendChild(document.createTextNode(json.slice(lastIndex, idx)));
    }

    const token = m[0];

    // If the first group (the quoted string) matched...
    if (m[1] !== undefined) {
      const stringLiteral = m[1];
      const hasColon = m[2] !== undefined; // If Group 2 exists, it's a JSON key!

      if (hasColon) {
        // Append the string and its trailing colon/whitespace together as the key
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