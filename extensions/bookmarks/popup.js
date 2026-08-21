const APP_ORIGIN = "https://bookmarks.goreecloud.com";
const SAVE_ENDPOINT = `${APP_ORIGIN}/api/v1/bookmarks/extension-capture`;
const COLLECTIONS_ENDPOINT = `${APP_ORIGIN}/api/v1/collections`;
const TOKEN_STORAGE_KEY = "goreecloudBookmarksAccessToken";

const form = document.querySelector('#save-form');
const titleInput = document.querySelector('#title-input');
const urlInput = document.querySelector('#url-input');
const collectionInput = document.querySelector('#collection-input');
const tagsInput = document.querySelector('#tags-input');
const noteInput = document.querySelector('#note-input');
const status = document.querySelector('#status');
const saveButton = document.querySelector('#save-button');
const openBookmarks = document.querySelector('#open-bookmarks');
const connectionSettings = document.querySelector('#connection-settings');

async function getAccessToken() {
  const stored = await browser.storage.local.get(TOKEN_STORAGE_KEY);
  const token = stored[TOKEN_STORAGE_KEY];
  return typeof token === 'string' && token.trim() ? token.trim() : null;
}

async function authHeaders() {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    ...(await authHeaders())
  };

  return fetch(url, {
    ...options,
    credentials: 'include',
    headers
  });
}

async function getActiveTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function parseTags(value) {
  return [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))].slice(0, 30);
}

async function readResponseMessage(response) {
  try {
    const body = await response.json();
    if (typeof body?.response === 'string') return body.response;
  } catch {
    // Non-JSON errors fall back to the HTTP status below.
  }
  return `GoreeCloud Bookmarks returned ${response.status}.`;
}

async function populateCurrentPage() {
  const tab = await getActiveTab();
  if (!tab?.url || !/^https?:/i.test(tab.url)) {
    status.textContent = 'This page cannot be saved.';
    saveButton.disabled = true;
    return;
  }
  titleInput.value = tab.title || tab.url;
  urlInput.value = tab.url;
}

async function populateCollections() {
  const response = await apiFetch(COLLECTIONS_ENDPOINT);
  if (response.status === 401 || response.status === 403) {
    status.textContent = 'Connect the extension or sign in to load collections.';
    return;
  }
  if (!response.ok) {
    status.textContent = await readResponseMessage(response);
    return;
  }

  const body = await response.json();
  const collections = Array.isArray(body?.response) ? body.response : [];
  for (const collection of collections) {
    if (!Number.isSafeInteger(collection?.id) || typeof collection?.name !== 'string') continue;
    const option = document.createElement('option');
    option.value = String(collection.id);
    option.textContent = collection.parent?.name
      ? `${collection.parent.name} / ${collection.name}`
      : collection.name;
    collectionInput.append(option);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  saveButton.disabled = true;
  status.textContent = 'Saving…';

  try {
    const response = await apiFetch(SAVE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: titleInput.value.trim(),
        url: urlInput.value.trim(),
        collectionId: collectionInput.value ? Number(collectionInput.value) : null,
        tags: parseTags(tagsInput.value),
        note: noteInput.value.trim() || null
      })
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Connect the extension or sign in to GoreeCloud Bookmarks, then try again.');
    }
    if (response.status === 409) {
      throw new Error('This page is already saved in GoreeCloud Bookmarks.');
    }
    if (!response.ok) throw new Error(await readResponseMessage(response));
    status.textContent = 'Bookmark saved.';
  } catch (error) {
    status.textContent = error.message;
  } finally {
    saveButton.disabled = false;
  }
});

openBookmarks.addEventListener('click', () => browser.tabs.create({ url: APP_ORIGIN }));
connectionSettings.addEventListener('click', () => browser.runtime.openOptionsPage());

Promise.all([populateCurrentPage(), populateCollections()]).catch((error) => {
  status.textContent = `Unable to initialize GoreeCloud Bookmarks: ${error.message}`;
});
