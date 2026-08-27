# Release Gate

Version 0.1.0 is **Stable** for Firefox unlisted/self-distribution.

All required release gates passed for the accepted candidate:

1. repository and extension validation passed on the exact candidate revision;
2. JavaScript syntax checks passed;
3. deterministic unsigned packaging succeeded and archive contents were inspected;
4. temporary Firefox installation validated manifest permissions and startup behavior;
5. runtime acceptance covered tracking cleanup, redirect bypass, copied-link cleaning, ETag removal, ping/beacon blocking, request filtering, custom rules, subscriptions, cosmetic filtering, picker/zapper, script/frame controls, logger, site exceptions, and local CDN substitution;
6. compatibility tests covered the reviewed normalize.css 8.0.1 local-resource mappings;
7. privacy review confirmed the local-first logging and remote-transmission boundaries;
8. Mozilla signing succeeded through the unlisted/self-distribution channel;
9. the returned Mozilla-signed XPI passed persistent installation, critical protection checks before restart, a full Firefox restart using the same profile without reinstalling the add-on, and the same critical checks after restart.

## Stable 0.1.0 evidence

- Release-source revision: `5546097d6985935c14ac36518008e54039ef7e94`
- Deterministic unsigned candidate SHA-256: `cf794ca17f8443f1a05162d16305315714fb432a9245c98513bbf131490a4e97`
- Mozilla-signed XPI SHA-256: `da7aa76ed45fededd66735e357ce93fb0e613ca1c4563b5a2cee09ded3b7a037`
- Mozilla signing workflow: `Privacy Shield Mozilla Signing` run `33077859664`, successful rerun job `98601740648`
- Accepted Firefox version: `154.0.1`
- Extension ID: `privacy-shield@goreecloud.com`
- Distribution channel: Mozilla unlisted/self-distribution

The signing workflow is `.github/workflows/privacy-shield-mozilla-signing.yml`; signed restart acceptance is implemented by `tests/signed_restart_smoke.py`. The workflow stages the exact deterministic package payload before Mozilla submission, checks returned signature metadata and archive integrity, and requires restart acceptance before retaining a signed artifact.

Public AMO listing is not part of this Stable release. A public listing requires a separate explicit publication decision.
