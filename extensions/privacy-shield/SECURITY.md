# Security

Privacy Shield is a privacy/content-protection extension, not a replacement for Firefox Safe Browsing, TLS validation, sandboxing, site isolation, Wardveil Security, GoreeCloud DNS, host firewalls, or malware scanning.

Security-sensitive rules:

- no remote code execution or remotely hosted scripts;
- no credentials, cookies, tokens, or private keys in source control;
- local CDN replacement requires exact reviewed version mappings and bundled source provenance;
- remote filter-list updates accept HTTPS only, omit credentials, use no-referrer fetches, and are bounded by size/rule limits;
- logger data is memory-only;
- user cosmetic selectors are inserted as CSS selectors, never executed as JavaScript;
- popup suppression only blocks `window.open()` when there is no active user gesture.

Report implementation vulnerabilities through the normal GoreeCloud security process rather than placing sensitive reproduction data in public issues.
