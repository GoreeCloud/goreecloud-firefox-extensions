export const PROVIDER_RULES = Object.freeze([
  // GoreeCloud is intentionally explicit and root-domain based so future
  // *.goreecloud.com services inherit the Webspace without per-service rules.
  { id: "goreecloud-root", webspaceId: "goreecloud", kind: "domain", value: "goreecloud.com", source: "builtin-goreecloud" },

  { id: "google-google", webspaceId: "google", kind: "domain", value: "google.com", source: "provider" },
  { id: "google-gmail", webspaceId: "google", kind: "domain", value: "gmail.com", source: "provider" },
  { id: "google-youtube", webspaceId: "google", kind: "domain", value: "youtube.com", source: "provider" },
  { id: "google-ytimg", webspaceId: "google", kind: "domain", value: "ytimg.com", source: "provider" },

  { id: "microsoft-root", webspaceId: "microsoft", kind: "domain", value: "microsoft.com", source: "provider" },
  { id: "microsoft-live", webspaceId: "microsoft", kind: "domain", value: "live.com", source: "provider" },
  { id: "microsoft-outlook", webspaceId: "microsoft", kind: "domain", value: "outlook.com", source: "provider" },
  { id: "microsoft-office", webspaceId: "microsoft", kind: "domain", value: "office.com", source: "provider" },
  { id: "microsoft-sharepoint", webspaceId: "microsoft", kind: "domain", value: "sharepoint.com", source: "provider" },
  { id: "microsoft-xbox", webspaceId: "microsoft", kind: "domain", value: "xbox.com", source: "provider" },

  { id: "meta-facebook", webspaceId: "meta", kind: "domain", value: "facebook.com", source: "provider" },
  { id: "meta-instagram", webspaceId: "meta", kind: "domain", value: "instagram.com", source: "provider" },
  { id: "meta-threads", webspaceId: "meta", kind: "domain", value: "threads.net", source: "provider" },
  { id: "meta-messenger", webspaceId: "meta", kind: "domain", value: "messenger.com", source: "provider" },
  { id: "meta-whatsapp", webspaceId: "meta", kind: "domain", value: "whatsapp.com", source: "provider" },
  { id: "meta-root", webspaceId: "meta", kind: "domain", value: "meta.com", source: "provider" },
  { id: "meta-oculus", webspaceId: "meta", kind: "domain", value: "oculus.com", source: "provider" },

  { id: "proton-root", webspaceId: "proton", kind: "domain", value: "proton.me", source: "provider" },
  { id: "proton-mail-legacy", webspaceId: "proton", kind: "domain", value: "protonmail.com", source: "provider" },
  { id: "proton-vpn", webspaceId: "proton", kind: "domain", value: "protonvpn.com", source: "provider" }
]);
