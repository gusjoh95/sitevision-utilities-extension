export function renderJSON(value) {
  const json = typeof value === "string"
    ? value
    : JSON.stringify(value, null, 2);

  const esc = json
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  return esc.replace(
		/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (m) => {
      if (m[0] === '"') {
        return m.endsWith(":")
          ? `<span class="json-key">${m}</span>`
          : `<span class="json-string">${m}</span>`;
      }
      if (m === "true" || m === "false") return `<span class="json-boolean">${m}</span>`;
      if (m === "null") return `<span class="json-null">${m}</span>`;
      return `<span class="json-number">${m}</span>`;
    }
  );
}