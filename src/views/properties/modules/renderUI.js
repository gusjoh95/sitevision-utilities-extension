import {
  assertTargetTabAccessible,
  getErrorMessage,
  getOption,
  getRequiredElement,
  getTargetAccessErrorMessage,
  highlightJson,
  withDeferredSpinner,
} from '../../../api/index.js';
import { restApiPath } from '../properties.js';
import { fetchInTabContext } from '../../../api/index.js';
import { getCurrentState } from './getCurrentState.js';

const useSyntaxHighlighting = await getOption('useSyntaxHighlighting');

/** @type {HTMLPreElement} */
const preElem = getRequiredElement('.json-holder pre');
const errorElem = getRequiredElement('#error');

if (useSyntaxHighlighting) {
  // Event Delegation: Set up click listener once on the parent container
  preElem.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const target = event.target.closest('.json-id');
    if (target) {
      const nextNode = target.textContent.replace(/"/g, '');
      void navigateToNode(nextNode, null, 'push').catch((error) => {
        preElem.textContent = `Error: ${getErrorMessage(error)}`;
      });
    }
  });
}

/**
 * @param {any} data
 * @param {{ origin: string, version: string, node: string, anchorTabId: string }} state
 */
export function renderUI(data, state) {
  document.title = `${state.origin}${restApiPath}/${state.version}/${state.node}/properties`;

  if (!data) {
    preElem.textContent = 'Error: No data available to render';
    return;
  }

  if (data.error) {
    preElem.textContent = `${data.error}: ${data.message}`;
    return;
  }

  errorElem.textContent = '';

  if (!useSyntaxHighlighting) {
    preElem.textContent = JSON.stringify(data, null, 2);
    return;
  }

  preElem.replaceChildren(highlightJson(data));
}

/**
 * @param {string} nextNode
 * @param {any} [cachedData=null]
 * @param {"push" | "replace" | "none"} [historyAction="push"]
 */
export async function navigateToNode(nextNode, cachedData = null, historyAction = 'push') {
  const state = getCurrentState();
  state.node = nextNode;

  const params = new URLSearchParams(state);
  const newUrlString = `${window.location.pathname}?${params.toString()}`;

  let data = cachedData;
  const previousPreContent = preElem.cloneNode(true);

  if (!data) {
    try {
      await assertTargetTabAccessible(Number(state.anchorTabId), state.origin);
      preElem.textContent = 'Loading...';
      const url = new URL(
        `${restApiPath}/${state.version}/${state.node}/properties`,
        state.origin
      ).toString();
      const res = await withDeferredSpinner(
        () => fetchInTabContext(Number(state.anchorTabId), url, { responseType: 'json' }),
        {
          spinnerEl: getRequiredElement('#spinner'),
          delayMs: 250,
        }
      );

      if (res?.__isError) {
        throw new Error(res.errorMessage ?? 'Unknown error during in-tab fetch');
      }

      if (!res.ok) {
        const payload = res.data
          ? JSON.stringify(res.data)
          : `HTTP ${res.status} ${res.statusText}`;
        throw new Error(payload);
      }

      data = res.data;
    } catch (error) {
      const msg = getErrorMessage(error);
      const targetAccessErrorMessage = getTargetAccessErrorMessage(msg);
      let errorData;

      if (targetAccessErrorMessage) {
        preElem.replaceChildren(...previousPreContent.childNodes);
        errorElem.textContent = `Warning: ${targetAccessErrorMessage}`;
        return;
      } else {
        // Safely check if the thrown error message is a JSON payload from the API
        try {
          const parsed = JSON.parse(msg);
          errorData = {
            error: 'API Error',
            message: JSON.stringify(parsed, null, 2),
          };
        } catch {
          errorData = { error: 'Fetch failed', message: msg };
        }
      }
      data = errorData;
    }
  }

  renderUI(data, state);

  const currentIndex = window.history.state?.index ?? 0;

  if (historyAction === 'push') {
    const nextIndex = currentIndex + 1;
    sessionStorage.setItem('maxHistoryIndex', String(nextIndex));
    window.history.pushState(
      { node: nextNode, cachedData: data, index: nextIndex },
      '',
      newUrlString
    );
  } else if (historyAction === 'replace') {
    window.history.replaceState(
      { node: nextNode, cachedData: data, index: currentIndex },
      '',
      newUrlString
    );
  }

  // Dispatch event AFTER history state has been updated
  window.dispatchEvent(new CustomEvent('nodeChanged'));
}
