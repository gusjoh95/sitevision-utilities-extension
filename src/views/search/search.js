import { dom, errors, i18n } from '../../api/index.js';
import { initSearchView } from './modules/initSearchView.js';

try {
  await i18n.initialize();
  i18n.localizeDocument();
  await initSearchView();
} catch (error) {
  dom.getRequiredElement('#error').textContent = i18n.getMessage('common_errorPrefix', [
    errors.messageOf(error),
  ]);
}
