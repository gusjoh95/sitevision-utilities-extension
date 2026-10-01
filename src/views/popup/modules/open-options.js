import { dom } from '../../../api/index.js';

export async function initOpenOptions() {
  const optionsBtn = dom.getRequiredElement('#open-options');
  optionsBtn.addEventListener('click', () => {
    if (browser.runtime.openOptionsPage) {
      browser.runtime.openOptionsPage();
    } else {
      window.open(browser.runtime.getURL('options.html'));
    }
  });
}
