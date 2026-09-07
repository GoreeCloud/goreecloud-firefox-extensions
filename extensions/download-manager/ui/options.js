const $ = (selector) => document.querySelector(selector);

const COOKIE_PERMISSION = Object.freeze({
  permissions: ["cookies"],
  origins: ["<all_urls>"]
});

async function refreshCookiePermission() {
  const granted = await browser.permissions.contains(COOKIE_PERMISSION);
  $("#cookieStatus").textContent = granted ? "Optional cookie permission granted" : "Optional cookie permission not granted";
  return granted;
}

async function load() {
  const settings = await browser.runtime.sendMessage({ type: "get-settings" });
  for (const key of ["mode", "segments", "maxConcurrent", "retryCount", "nativeDirectory"]) {
    $("#" + key).value = settings[key] ?? "";
  }
  $("#forwardCookies").checked = Boolean(settings.forwardCookies);
  $("#completionNotifications").checked = settings.completionNotifications !== false;
  await refreshCookiePermission();
}

$("#grantCookies").addEventListener("click", () => {
  // Firefox requires permissions.request() to run directly from a user-action
  // handler. Do not move this request behind runtime messaging or an awaited
  // operation, or the transient user activation will be lost.
  let request;
  try {
    request = browser.permissions.request(COOKIE_PERMISSION);
  } catch (error) {
    $("#cookieStatus").textContent = "Optional cookie permission request failed";
    $("#status").textContent = `Permission request failed: ${error.message || String(error)}`;
    return;
  }

  $("#grantCookies").disabled = true;
  $("#status").textContent = "Waiting for Firefox permission decision…";

  request.then((granted) => {
    $("#cookieStatus").textContent = granted ? "Optional cookie permission granted" : "Permission was not granted";
    $("#status").textContent = granted
      ? "Cookie permission granted. Save settings to enable forwarding."
      : "Firefox did not grant the optional cookie permission.";
  }).catch((error) => {
    $("#cookieStatus").textContent = "Optional cookie permission request failed";
    $("#status").textContent = `Permission request failed: ${error.message || String(error)}`;
  }).finally(() => {
    $("#grantCookies").disabled = false;
  });
});

$("#save").addEventListener("click", async () => {
  $("#save").disabled = true;
  try {
    const forwardCookies = $("#forwardCookies").checked;
    if (forwardCookies && !(await refreshCookiePermission())) {
      $("#status").textContent = "Cookie forwarding was not saved. Click Grant optional cookie permission, approve Firefox's prompt, then save again.";
      return;
    }

    const settings = {
      mode: $("#mode").value,
      segments: Number($("#segments").value),
      maxConcurrent: Number($("#maxConcurrent").value),
      retryCount: Number($("#retryCount").value),
      nativeDirectory: $("#nativeDirectory").value.trim(),
      forwardCookies,
      completionNotifications: $("#completionNotifications").checked
    };
    await browser.runtime.sendMessage({ type: "save-settings", settings });
    $("#status").textContent = "Settings saved.";
    setTimeout(() => { $("#status").textContent = ""; }, 2200);
  } finally {
    $("#save").disabled = false;
  }
});

$("#test").addEventListener("click", async () => {
  $("#test").disabled = true;
  try {
    const result = await browser.runtime.sendMessage({ type: "native-status" });
    if (result.available && result.compatible !== false) {
      const version = result.helperVersion || "unknown";
      const protocol = result.protocolVersion ?? "unknown";
      $("#status").textContent = `Native helper ${version} · protocol ${protocol} ready.`;
    } else {
      $("#status").textContent = result.error || "Native helper unavailable. Install or repair the current native host first.";
    }
  } finally {
    $("#test").disabled = false;
  }
});

browser.permissions.onAdded.addListener(() => {
  refreshCookiePermission().catch(() => {});
});

browser.permissions.onRemoved.addListener(() => {
  refreshCookiePermission().catch(() => {});
});

load();
