# Authenticated Cookie Acceptance — GoreeCloud Download Manager Extension

## Status

Accepted on Firefox 155.0.1 / Flathub Flatpak for GoreeCloud Download Manager Extension 0.2.3 source candidate.

## Scope

This acceptance validates the explicit optional Firefox cookie-permission path for a native segmented download against a controlled authenticated HTTP range server.

## Evidence

- The protected endpoint returned HTTP 401 before a valid target-site cookie was forwarded.
- The test login endpoint installed the Firefox cookie `goreecloud_dm_auth_test=accepted-0.2.2` for `127.0.0.1`.
- GoreeCloud Download Manager Extension 0.2.3 successfully acquired the optional Cookies + All Sites permission through the Settings-page user-action flow fixed in PR #43.
- The native helper authenticated successfully and issued one authenticated HEAD probe followed by eight HTTP 206 Partial Content requests.
- The eight accepted byte ranges exactly covered the 256 MiB source file:
  - `0-33554431`
  - `33554432-67108863`
  - `67108864-100663295`
  - `100663296-134217727`
  - `134217728-167772159`
  - `167772160-201326591`
  - `201326592-234881023`
  - `234881024-268435455`
- The assembled authenticated output was `/home/slickkredd/Downloads/goreecloud-auth-range-test.bin` in the target-runtime evidence.
- Source and output SHA-256 were identical: `a6d72ac7690f53be6ae46ba88506bd97302a093f7108472bd9efc3cefda06484`.
- Byte-for-byte comparison reported `AUTHENTICATED FILE INTEGRITY: PASS`.
- Native staging was empty after successful completion.
- A recursive scan of `.goreecloud-downloads` for the test cookie name, value, and `Cookie` marker reported `NATIVE COOKIE PERSISTENCE: PASS`.
- Firefox extension storage was serialized in the extension Developer Tools console and checked for the test cookie name/value; the result was `BROWSER COOKIE PERSISTENCE: PASS`.

## Acceptance conclusion

The tested 0.2.3 path accepts explicit Firefox optional permission acquisition, target-site cookie lookup, ephemeral cookie forwarding through Native Messaging, authenticated native range probing, eight-way segmented authenticated transfer, final assembly and integrity, and absence of the test credential from extension download-state storage and native staging metadata.

## Boundary

This acceptance applies to the controlled Firefox 155.0.1 / Flathub Flatpak target environment and a cookie-authenticated HTTP GET/range flow. It does not establish support for arbitrary POST bodies, JavaScript-generated tokens, anti-bot challenges, DRM, short-lived signed headers, service-worker-only state, or every authorization mechanism. It also does not establish Mozilla signing, persistent signed installation, full-browser restart recovery, Release Candidate status, or Stable status.
