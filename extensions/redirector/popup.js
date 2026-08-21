const BUILTIN_RULESET_ID = "goreecloud_builtin";

const toggle = document.querySelector("#builtin-toggle");
const status = document.querySelector("#status");
const manage = document.querySelector("#manage");

async function refresh() {
  try {
    const enabled = await browser.declarativeNetRequest.getEnabledRulesets();
    const isEnabled = enabled.includes(BUILTIN_RULESET_ID);
    toggle.checked = isEnabled;
    status.textContent = isEnabled ? "Keep → Memos is active." : "Keep → Memos is paused.";
  } catch (error) {
    status.textContent = `Unable to read redirect status: ${error.message}`;
    toggle.disabled = true;
  }
}

toggle.addEventListener("change", async () => {
  toggle.disabled = true;
  status.textContent = toggle.checked ? "Enabling…" : "Pausing…";
  try {
    await browser.declarativeNetRequest.updateEnabledRulesets(toggle.checked
      ? { enableRulesetIds: [BUILTIN_RULESET_ID] }
      : { disableRulesetIds: [BUILTIN_RULESET_ID] });
  } catch (error) {
    status.textContent = `Could not update redirect: ${error.message}`;
  } finally {
    toggle.disabled = false;
    await refresh();
  }
});

manage.addEventListener("click", () => browser.runtime.openOptionsPage());
refresh();
