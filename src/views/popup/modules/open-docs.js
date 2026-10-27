import { dom } from '../../../api/index.js';

export async function initOpenDocs() {
  const docsButton = dom.getRequiredElement('#open-docs');
  docsButton.addEventListener('click', () => {
    void browser.tabs.create({ url: browser.runtime.getURL('views/docs/docs.html') });
  });
}
