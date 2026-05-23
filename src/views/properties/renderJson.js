export function renderJSON(value) {
  const json = typeof value === "string" ? value : JSON.stringify(value, null, 2);


  const svIdPattern = /^\d{1,3}\.[0-9a-z]+(?:_.+)?$/;;

  const tokenRe = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;

  const frag = document.createDocumentFragment();

  let lastIndex = 0;
  let m;
  while ((m = tokenRe.exec(json)) !== null) {
    const idx = m.index;
    // append text between tokens (punctuation, whitespace)
    if (idx > lastIndex) {
      frag.appendChild(document.createTextNode(json.slice(lastIndex, idx)));
    }

    const token = m[0];
    if (token[0] === '"') {
      if (token.endsWith(":")) {
        const el = document.createElement("span");
        el.className = "json-key";
        el.textContent = token;
        frag.appendChild(el);
      } else {
        // string value
        const inner = token.slice(1, -1); // without surrounding quotes
        const el = document.createElement("span");
        if (svIdPattern.test(inner)) {
          el.className = "json-id";
        } else {
          el.className = "json-string";
        }
        // Keep the surrounding quotes for display
        el.textContent = `"${inner}"`;
        frag.appendChild(el);
      }
    } else if (token === "true" || token === "false") {
      const el = document.createElement("span");
      el.className = "json-boolean";
      el.textContent = token;
      frag.appendChild(el);
    } else if (token === "null") {
      const el = document.createElement("span");
      el.className = "json-null";
      el.textContent = token;
      frag.appendChild(el);
    } else {
      // number
      const el = document.createElement("span");
      el.className = "json-number";
      el.textContent = token;
      frag.appendChild(el);
    }

    lastIndex = tokenRe.lastIndex;
  }

  if (lastIndex < json.length) {
    frag.appendChild(document.createTextNode(json.slice(lastIndex)));
  }

  return frag;
}