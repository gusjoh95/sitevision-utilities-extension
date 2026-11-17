import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('search console loads indexes and sends queries through the target tab', async () => {
  const messages = JSON.parse(
    await readFile(new URL('../src/_locales/en/messages.json', import.meta.url))
  );
  const requests = [];
  let responseStatus = 200;
  let searchResponse = [{ id: '12.abc', title: 'Result' }];
  let targetListener;
  let removedListener;
  let beforeTabAccess = () => {};
  const windowHandlers = {};

  class Element {
    constructor() {
      this.disabled = false;
      this.textContent = '';
      this.value = '';
      this.handlers = {};
      this.classList = { add() {}, remove() {} };
    }

    addEventListener(type, handler) {
      this.handlers[type] = handler;
    }

    setCustomValidity(message) {
      this.validityMessage = message;
    }

    reportValidity() {}
  }

  class Select extends Element {
    constructor() {
      super();
      this.options = [];
    }

    replaceChildren() {
      this.options = [];
      this.value = '';
    }

    append(option) {
      this.options.push(option);
    }
  }

  const form = new Element();
  let shortcutSubmissions = 0;
  form.requestSubmit = () => {
    shortcutSubmissions++;
  };
  const index = new Select();
  const query = new Element();
  const filter = new Element();
  const fields = new Element();
  fields.value = 'id, name, title, URI, svtype, lastModified';
  const limit = new Element();
  limit.value = '25';
  const submit = new Element();
  const error = new Element();
  const status = new Element();
  const results = new Element();
  const spinner = new Element();
  const versions = [new Element(), new Element()];
  const elements = {
    '#search-form': form,
    '#search-index': index,
    '#search-query': query,
    '#search-filter': filter,
    '#search-fields': fields,
    '#search-limit': limit,
    'input[name="version"][value="1"]': versions[0],
    'input[name="version"][value="0"]': versions[1],
    '#search-submit': submit,
    '#error': error,
    '#search-status': status,
    '#search-results': results,
    '#spinner': spinner,
  };
  globalThis.window = {
    addEventListener(type, handler) {
      windowHandlers[type] = handler;
    },
    location: {
      search: '?origin=https%3A%2F%2Fexample.test&anchorTabId=42&siteId=2.abc&version=1',
    },
  };
  globalThis.document = {
    documentElement: {},
    querySelector(selector) {
      return elements[selector] ?? null;
    },
    querySelectorAll(selector) {
      return selector === 'input[name="version"]' ? versions : [];
    },
    createElement() {
      return new Element();
    },
  };
  globalThis.browser = {
    storage: {
      sync: {
        async get() {
          return { locale: 'en' };
        },
      },
    },
    i18n: { getUILanguage: () => 'en', getMessage: () => '' },
    runtime: {
      getURL: (path) => path,
      sendMessage() {},
      onMessage: {
        addListener(listener) {
          targetListener = listener;
        },
        removeListener(listener) {
          removedListener = listener;
        },
      },
    },
    tabs: {
      async get() {
        await beforeTabAccess();
        return { url: 'https://example.test/page' };
      },
    },
    scripting: {
      async executeScript({ target, func, args }) {
        assert.equal(target.tabId, 42);
        return [{ result: await func(...args) }];
      },
    },
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, options) => {
    if (input === '_locales/en/messages.json') {
      return {
        ok: true,
        async json() {
          return messages;
        },
      };
    }
    const url = new URL(input);
    requests.push({ url, options });
    const data = url.pathname.endsWith('/nodes')
      ? [
          { id: '303.custom', name: 'Custom', type: 'sv:nodeIndex' },
          { id: '303.online-v1', name: 'Online', type: 'sv:nodeIndex' },
          { id: '301.user-v1', name: 'User', type: 'sv:applicationIndex' },
          { id: 'irrelevant', name: 'Other', type: 'sv:folder' },
        ]
      : searchResponse;
    return {
      ok: responseStatus === 200,
      status: responseStatus,
      statusText: '',
      url: url.toString(),
      headers: new Headers(),
      async text() {
        return JSON.stringify(data);
      },
    };
  };

  try {
    await import('../src/views/search/search.js');
    assert.equal(requests[0].url.pathname, '/rest-api/1/1/2.abc_indexRepository/nodes');
    assert.equal(index.options.length, 4);
    assert.equal(index.value, '303.online-v1');
    assert.equal(submit.disabled, false);

    query.value = '+name.analyzed:(test & more)';
    filter.value = '  +svtype:page  ';
    fields.value = ' id, title, URI, , svtype, ';
    await form.handlers.submit({ preventDefault() {} });
    const search = requests.at(-1);
    assert.equal(search.url.pathname, '/rest-api/1/1/303.online-v1/search');
    assert.equal(search.url.searchParams.get('format'), 'json');
    assert.deepEqual(JSON.parse(search.url.searchParams.get('json')), {
      query: query.value,
      filterQuery: '+svtype:page',
      fields: ['id', 'title', 'URI', 'svtype'],
      limit: 25,
    });
    assert.equal(search.options.headers['X-Requested-With'], 'Sitevision-Utilities-Extension');
    assert.deepEqual(JSON.parse(results.textContent), [{ id: '12.abc', title: 'Result' }]);
    assert.match(status.textContent, /^Showing 1 hits - \d+ ms\.$/);

    filter.value = ' ';
    fields.value = ' , ';
    searchResponse = Array.from({ length: 25 }, (_, id) => ({ id: String(id) }));
    await form.handlers.submit({ preventDefault() {} });
    assert.deepEqual(JSON.parse(requests.at(-1).url.searchParams.get('json')), {
      query: query.value,
      limit: 25,
    });
    assert.match(status.textContent, /Showing 25 hits/);
    assert.match(status.textContent, /Limit reached; more hits may exist/);

    limit.value = '100';
    await form.handlers.submit({ preventDefault() {} });
    assert.equal(JSON.parse(requests.at(-1).url.searchParams.get('json')).limit, 100);
    assert.doesNotMatch(status.textContent, /Limit reached/);

    searchResponse = [];
    await form.handlers.submit({ preventDefault() {} });
    assert.equal(results.textContent, '[]');
    assert.match(status.textContent, /^Showing 0 hits - \d+ ms\.$/);

    searchResponse = { unexpected: 'object' };
    await form.handlers.submit({ preventDefault() {} });
    assert.match(error.textContent, /expected an array/);
    assert.equal(results.textContent, '');
    assert.equal(status.textContent, '');
    searchResponse = [{ id: '12.abc', title: 'Result' }];

    const requestCount = requests.length;
    query.value = ' ';
    await form.handlers.submit({ preventDefault() {} });
    assert.equal(requests.length, requestCount);
    assert.equal(query.validityMessage, messages.search_queryRequired.message);
    query.handlers.input();
    assert.equal(query.validityMessage, '');
    query.value = '*:*';
    limit.value = '500';
    await form.handlers.submit({ preventDefault() {} });
    assert.equal(requests.length, requestCount);
    assert.equal(limit.validityMessage, messages.search_invalidLimit.message);
    limit.value = '10';
    limit.handlers.change();
    assert.equal(limit.validityMessage, '');
    let defaultPrevented = false;
    query.handlers.keydown({
      key: 'Enter',
      ctrlKey: true,
      metaKey: false,
      preventDefault() {
        defaultPrevented = true;
      },
    });

    assert.equal(defaultPrevented, true);
    assert.equal(shortcutSubmissions, 1);

    responseStatus = 400;
    await form.handlers.submit({ preventDefault() {} });
    assert.match(error.textContent, /HTTP 400/);
    assert.equal(results.textContent, '');
    assert.equal(submit.disabled, false);

    responseStatus = 403;
    await form.handlers.submit({ preventDefault() {} });
    assert.match(error.textContent, /HTTP 403/);
    responseStatus = 404;
    await form.handlers.submit({ preventDefault() {} });
    assert.match(error.textContent, /HTTP 404/);
    index.handlers.change();
    assert.equal(error.textContent, '');

    responseStatus = 200;
    versions[0].checked = false;
    versions[1].checked = true;
    await versions[1].handlers.change();
    assert.equal(requests.at(-1).url.pathname, '/rest-api/1/0/2.abc_indexRepository/nodes');
    assert.equal(index.value, '');
    assert.equal(submit.disabled, true);
    index.value = '303.custom';
    index.handlers.change();
    await form.handlers.submit({ preventDefault() {} });
    assert.equal(requests.at(-1).url.pathname, '/rest-api/1/0/303.custom/search');

    let releaseTabAccess;
    beforeTabAccess = () =>
      new Promise((resolve) => {
        releaseTabAccess = resolve;
      });
    const pendingSearch = form.handlers.submit({ preventDefault() {} });
    const requestsWhileBusy = requests.length;
    assert.equal(submit.disabled, true);
    await form.handlers.submit({ preventDefault() {} });
    await versions[0].handlers.change();
    assert.equal(requests.length, requestsWhileBusy);
    releaseTabAccess();
    await pendingSearch;
    assert.equal(requests.length, requestsWhileBusy + 1);
    assert.equal(submit.disabled, false);

    const requestsBeforeTargetLoss = requests.length;
    beforeTabAccess = () => {
      targetListener({ type: 'TARGET_LOST', tabId: 42, reason: 'closed' });
    };
    await form.handlers.submit({ preventDefault() {} });
    assert.equal(requests.length, requestsBeforeTargetLoss);
    assert.equal(submit.disabled, true);
    assert.equal(index.disabled, true);
    assert.equal(filter.disabled, true);
    assert.equal(fields.disabled, true);
    assert.equal(limit.disabled, true);
    assert.ok(error.textContent);
    const targetLostMessage = error.textContent;
    index.handlers.change();
    await versions[0].handlers.change();
    await form.handlers.submit({ preventDefault() {} });
    assert.equal(requests.length, requestsBeforeTargetLoss);
    assert.equal(error.textContent, targetLostMessage);
    windowHandlers.pagehide();
    assert.equal(removedListener, targetListener);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('popup opens the console with the originating tab and edit-mode context', async () => {
  const button = {
    disabled: true,
    addEventListener(type, handler) {
      assert.equal(type, 'click');
      this.click = handler;
    },
  };
  let windowOptions;
  globalThis.document = {
    querySelector: (selector) => (selector === '#open-search' ? button : null),
  };
  globalThis.browser.windows = {
    async create(options) {
      windowOptions = options;
    },
  };
  const { initSearch } = await import('../src/views/popup/modules/search.js');
  for (const siteId of ['', ' ', 'invalid', '4.abc', '2.abc_indexRepository', null, undefined]) {
    await initSearch({ id: 42, url: 'https://example.test/edit' }, siteId, true);
    assert.equal(button.disabled, true);
    assert.equal(button.click, undefined);
  }
  await initSearch({ id: 42, url: 'https://example.test/edit' }, '2.abc', true);
  assert.equal(button.disabled, false);
  await button.click();
  const url = new URL(windowOptions.url, 'https://extension.invalid');
  assert.equal(url.pathname, '/views/search/search.html');
  assert.equal(url.searchParams.get('origin'), 'https://example.test');
  assert.equal(url.searchParams.get('anchorTabId'), '42');
  assert.equal(url.searchParams.get('siteId'), '2.abc');
  assert.equal(url.searchParams.get('version'), '0');
});

test('search entrypoint displays initialization failures', async () => {
  const errorElement = { textContent: '' };
  const originalDocument = globalThis.document;
  const originalGet = globalThis.browser.storage.sync.get;
  globalThis.document = {
    querySelector: (selector) => (selector === '#error' ? errorElement : null),
  };
  globalThis.browser.storage.sync.get = async () => {
    throw new Error('Storage unavailable');
  };
  try {
    await import('../src/views/search/search.js?initialization-failure');
    assert.match(errorElement.textContent, /Storage unavailable/);
  } finally {
    globalThis.document = originalDocument;
    globalThis.browser.storage.sync.get = originalGet;
  }
});
