const APP_ORIGIN = "https://bookmarks.goreecloud.com";
const SAVE_ENDPOINT = `${APP_ORIGIN}/api/v1/bookmarks/extension-capture`;

const form = document.querySelector('#save-form');
const titleInput = document.querySelector('#title-input');
const urlInput = document.querySelector('#url-input');
const collectionInput = document.querySelector('#collection-input');
const tagsInput = document.querySelector('#tags-input');
const noteInput = document.querySelector('#note-input');
const status = document.querySelector('#status');
const saveButton = document.querySelector('#save-button');
const openBookmarks = document.querySelector('#open-bookmarks');

async function getActiveTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function parseTags(value) {
  return [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))].slice(0, 30);
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

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  saveButton.disabled = true;
  status.textContent = 'Saving…';

  try {
    const response = await fetch(SAVE_ENDPOINT, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: titleInput.value.trim(),
        url: urlInput.value.trim(),
        collection: collectionInput.value.trim() || null,
        tags: parseTags(tagsInput.value),
        note: noteInput.value.trim() || null
      })
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Sign in to GoreeCloud Bookmarks, then try again.');
    }
    if (!response.ok) throw new Error(`GoreeCloud Bookmarks returned ${response.status}.`);
    status.textContent = 'Bookmark saved.';
  } catch (error) {
    status.textContent = error.message;
  } finally {
    saveButton.disabled = false;
  }
});

openBookmarks.addEventListener('click', () => browser.tabs.create({ url: APP_ORIGIN }));
populateCurrentPage().catch((error) => {
  status.textContent = `Unable to read the current page: ${error.message}`;
  saveButton.disabled = true;
});
