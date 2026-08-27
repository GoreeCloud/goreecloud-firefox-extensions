# Release Gate

Version 0.1.0 is a source candidate and must not be described as Stable until all required gates pass:

1. repository and extension validation pass on the exact candidate revision;
2. JavaScript syntax checks pass;
3. deterministic unsigned packaging succeeds and archive contents are inspected;
4. temporary Firefox installation validates manifest permissions and startup behavior;
5. runtime acceptance covers tracking cleanup, redirect bypass, copied-link cleaning, ETag removal, ping/beacon blocking, request filtering, custom rules, subscriptions, cosmetic filtering, picker/zapper, script/frame controls, logger, site exceptions, and local CDN substitution;
6. compatibility tests include sites that use normalize.css 8.0.1 from each cataloged CDN URL and prove no functional regression from local substitution;
7. privacy review confirms no unexpected remote transmission or persistent browsing log;
8. Mozilla signing succeeds for the exact accepted source candidate;
9. the signed XPI survives a full Firefox restart and the critical tests are repeated.

Gates 8 and 9 are implemented by `.github/workflows/privacy-shield-mozilla-signing.yml` and `tests/signed_restart_smoke.py`. The signing workflow uses Mozilla's unlisted/self-distribution channel, stages the exact deterministic package payload before submission, and requires the returned signed XPI to pass non-temporary installation plus a second Firefox process using the same profile without reinstalling the add-on. See `SIGNING.md` for the credential and release boundary.

Any failure keeps the candidate below Stable.
