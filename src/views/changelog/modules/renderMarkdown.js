/**
 * Minimal Markdown-to-DOM renderer for release notes.
 * @description
 * Supports the subset of Markdown used in `src/resources/releases/*.md`: headings (`#`-`######`),
 * bullet lists (`-`/`*`), paragraphs, and inline `**bold**`, `` `code` ``, and `[text](url)` spans.
 * Nodes are built directly via the DOM API (never `innerHTML`), so release note content can never
 * inject arbitrary markup.
 * @param {string} markdown
 * @returns {DocumentFragment}
 */
export function renderMarkdown(markdown) {
  const fragment = document.createDocumentFragment();
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');

  /** @type {HTMLUListElement | null} */
  let currentList = null;
  /** @type {string[]} */
  let paragraphLines = [];

  function flushParagraph() {
    if (paragraphLines.length === 0) return;
    const p = document.createElement('p');
    p.append(...parseInline(paragraphLines.join(' ')));
    fragment.appendChild(p);
    paragraphLines = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === '') {
      flushParagraph();
      currentList = null;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      currentList = null;
      const heading = document.createElement(`h${headingMatch[1].length}`);
      heading.append(...parseInline(headingMatch[2]));
      fragment.appendChild(heading);
      continue;
    }

    const listMatch = line.match(/^[-*]\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      if (!currentList) {
        currentList = document.createElement('ul');
        fragment.appendChild(currentList);
      }
      const li = document.createElement('li');
      li.append(...parseInline(listMatch[1]));
      currentList.appendChild(li);
      continue;
    }

    currentList = null;
    paragraphLines.push(line);
  }

  flushParagraph();
  return fragment;
}

/**
 * Parses inline Markdown spans (`**bold**`, `` `code` ``, `[text](url)`) into DOM nodes.
 * @param {string} text
 * @returns {Node[]}
 */
function parseInline(text) {
  /** @type {Node[]} */
  const nodes = [];
  const pattern = /\*\*(.+?)\*\*|`(.+?)`|\[(.+?)\]\((.+?)\)/g;
  let lastIndex = 0;
  /** @type {RegExpExecArray | null} */
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    if (match[1] !== undefined) {
      const strong = document.createElement('strong');
      strong.textContent = match[1];
      nodes.push(strong);
    } else if (match[2] !== undefined) {
      const code = document.createElement('code');
      code.textContent = match[2];
      nodes.push(code);
    } else if (match[3] !== undefined) {
      const a = document.createElement('a');
      a.href = match[4];
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = match[3];
      nodes.push(a);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(document.createTextNode(text.slice(lastIndex)));
  }

  return nodes;
}
