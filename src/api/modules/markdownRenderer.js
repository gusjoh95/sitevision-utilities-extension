/**
 * Minimal Markdown-to-DOM renderer for release notes and documentation.
 * @description
 * Supports headings (`#`-`######`), nested bullet lists (`-`/`*`), paragraphs, and inline
 * `**bold**`, `~~strikethrough~~`, `` `code` ``, and `[text](url)` spans. Nodes are built directly via the DOM API.
 * @param {string} markdown
 * @returns {DocumentFragment}
 */
export function renderMarkdown(markdown) {
  const fragment = document.createDocumentFragment();
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');

  /** @type {Array<{ list: HTMLUListElement, lastItem: HTMLLIElement | null, childList?: HTMLUListElement }>} */
  let listStack = [];
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
      listStack = [];
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      listStack = [];
      const heading = document.createElement(`h${headingMatch[1].length}`);
      heading.append(...parseInline(headingMatch[2]));
      fragment.appendChild(heading);
      continue;
    }

    const listMatch = rawLine.match(/^(\s*)[-*]\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      let depth = Math.floor(listMatch[1].replace(/\t/g, '  ').length / 2);
      depth = Math.min(depth, listStack.length);

      /** @type {HTMLUListElement} */
      let list;
      if (depth === 0) {
        list = listStack[0]?.list ?? document.createElement('ul');
        if (!listStack.length) fragment.appendChild(list);
        listStack.length = 1;
        listStack[0] = { list, lastItem: null };
      } else {
        listStack.length = depth + 1;
        const parent = listStack[depth - 1];
        if (!parent.childList) {
          parent.childList = document.createElement('ul');
          parent.lastItem?.appendChild(parent.childList);
        }
        list = parent.childList;
      }

      const li = document.createElement('li');
      li.append(...parseInline(listMatch[2]));
      list.appendChild(li);

      if (depth > 0) {
        listStack[depth] = { list, lastItem: li };
      } else {
        listStack[0] = { list, lastItem: li };
      }
      continue;
    }

    listStack = [];
    paragraphLines.push(line);
  }

  flushParagraph();
  return fragment;
}

/**
 * Parses inline Markdown spans (`**bold**`, `~~strikethrough~~`, `` `code` ``, `[text](url)`) into DOM nodes.
 * @param {string} text
 * @returns {Node[]}
 */
function parseInline(text) {
  /** @type {Node[]} */
  const nodes = [];
  const pattern = /\*\*(.+?)\*\*|~~(.+?)~~|`(.+?)`|\[(.+?)\]\((.+?)\)/g;
  let lastIndex = 0;
  /** @type {RegExpExecArray | null} */
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    if (match[1] !== undefined) {
      const strong = document.createElement('strong');
      strong.append(...parseInline(match[1]));
      nodes.push(strong);
    } else if (match[2] !== undefined) {
      const del = document.createElement('del');
      del.append(...parseInline(match[2]));
      nodes.push(del);
    } else if (match[3] !== undefined) {
      const code = document.createElement('code');
      code.textContent = match[3];
      nodes.push(code);
    } else if (match[4] !== undefined) {
      let url;
      try {
        url = new URL(match[5], document.baseURI);
      } catch {
        nodes.push(document.createTextNode(match[4]));
        lastIndex = pattern.lastIndex;
        continue;
      }

      const isWebUrl = url.protocol === 'http:' || url.protocol === 'https:';
      const isSameOriginUrl = url.origin === window.location.origin;
      if (!isWebUrl && !isSameOriginUrl) {
        nodes.push(document.createTextNode(match[4]));
        lastIndex = pattern.lastIndex;
        continue;
      }

      const anchor = document.createElement('a');
      anchor.href = url.href;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = match[4];
      nodes.push(anchor);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(document.createTextNode(text.slice(lastIndex)));
  }

  return nodes;
}
