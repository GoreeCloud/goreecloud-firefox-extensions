const $ = (selector) => document.querySelector(selector);

async function refreshCookiePermission() {
  const result = await browser.runtime.sendMessage({ type: "cookie-permission-status" });
  $("#cookieStatus").textContent = result.granted ? "Optional cookie permission granted" : "Optional cookie permission not granted";
  return result.granted;
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

$("#grantCookies").addEventListener("click", async () => {
  $("#grantCookies").disabled = true;
  try {
    const result = await browser.runtime.sendMessage({ type: "request-cookie-permission" });
    $("#cookieStatus").textContent = result.granted ? "Optional cookie permission granted" : "Permission was not granted";
  } finally {
    $("#grantCookies").disabled = false;
  }
});

$("#save").addEventListener("click", async () => {
  $("#save").disabled = true;
  try {
    let forwardCookies = $("#forwardCookies").checked;
    if (forwardCookies && !(await refreshCookiePermission())) {
      const result = await browser.runtime.sendMessage({ type: "request-cookie-permission" });
      if (!result.granted) {
        forwardCookies = false;
        $("#forwardCookies").checked = false;
        $("#status").textContent = "Saved without cookie forwarding because permission was not granted.";
      }
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
    if (!$("#status").textContent) $("#status").textContent = "Settings saved.";
    setTimeout(() => { $("#status").textContent = ""; }, 2200);
  } finally {
    $("#save").disabled = false;
  }
});

$("#test").addEventListener("click", async () => {
  $("#test").disabled = true;
  try {
    const result = await browser.runtime.sendMessage({ type: "native-status" });
    $("#status").textContent = result.available ? "Native helper connection opened." : "Native helper unavailable. Install or repair the native host first.";
  } finally {
    $("#test").disabled = false;
  }
});

load();
