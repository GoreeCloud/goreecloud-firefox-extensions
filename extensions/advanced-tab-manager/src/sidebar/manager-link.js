const openManager = document.querySelector("#open-manager");

openManager?.addEventListener("click", async () => {
  await browser.tabs.create({ url: browser.runtime.getURL("src/manager/manager.html") });
});
