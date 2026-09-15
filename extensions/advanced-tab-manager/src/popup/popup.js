import { countExactUrlDuplicates, flattenTabs } from "../core/state.js";
const summary = document.querySelector("#summary"); const openSidebar = document.querySelector("#open-sidebar"); const refreshButton = document.querySelector("#refresh");
async function refresh() { const snapshot = await browser.runtime.sendMessage({ type: "atm:get-snapshot" }); const tabs = flattenTabs(snapshot); const duplicates = countExactUrlDuplicates(snapshot); const treeChildren = tabs.filter((tab) => tab.treeParentLogicalId).length; summary.textContent = `${tabs.length} open tabs · ${snapshot.groups.length} native groups · ${treeChildren} tree children · ${duplicates.duplicateTabs} exact duplicate tabs`; }
openSidebar.addEventListener("click", async () => { await browser.sidebarAction.open(); window.close(); }); refreshButton.addEventListener("click", refresh);
refresh().catch((error) => { console.error(error); summary.textContent = "Unable to read live browser state."; });
