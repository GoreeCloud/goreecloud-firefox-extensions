const APP_ORIGIN = "https://bookmarks.goreecloud.com";
const TOKEN_STORAGE_KEY = "goreecloudBookmarksAccessToken";

const form = document.querySelector('#token-form');
const tokenInput = document.querySelector('#token-input');
const clearToken = document.querySelector('#clear-token');
const status = document.querySelector('#options-status');
const openBookmarks = document.querySelector('#open-bookmarks');

async function refresh() {
  const stored = await browser.storage.local.get(TOKEN_STORAGE_KEY);
  const token = stored[TOKEN_STORAGE_KEY];
  const connected = typeof token === 'string' && token.trim();
  tokenInput.value = '';
  tokenInput.placeholder = connected
    ? 'A token is stored — paste a replacement to change it'
    : 'Paste a revocable access token';
  status.textContent = connected
    ? 'A GoreeCloud Bookmarks access token is stored locally in Firefox.'
    : 'No extension token is stored. Cookie-based sign-in may still work while you are signed in.';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const token = tokenInput.value.trim();
  if (!token) {
    status.textContent = 'Paste an access token before saving.';
    return;
  }

  await browser.storage.local.set({ [TOKEN_STORAGE_KEY]: token });
  status.textContent = 'Connection token saved locally in Firefox.';
  tokenInput.value = '';
  await refresh();
});

clearToken.addEventListener('click', async () => {
  await browser.storage.local.remove(TOKEN_STORAGE_KEY);
  status.textContent = 'Stored extension token removed.';
  await refresh();
});

openBookmarks.addEventListener('click', () => browser.tabs.create({ url: APP_ORIGIN }));
refresh().catch((error) => {
  status.textContent = `Unable to read connection settings: ${error.message}`;
});
