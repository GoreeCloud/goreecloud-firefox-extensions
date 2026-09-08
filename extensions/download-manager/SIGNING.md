# Mozilla Signing — GoreeCloud Download Manager Extension

## Current state

GoreeCloud Download Manager Extension **0.2.11** is currently an unsigned Active Development source candidate and is **not Stable**. The canonical add-on ID is `download-manager@goreecloud.com`; the Linux Native Messaging host manifest authorizes that same ID.

Temporary loading of an unsigned XPI through `about:debugging` is development-only evidence. It is not persistent installation and must not be represented as Mozilla signing, Release Candidate acceptance, or Stable release acceptance.

0.2.11 supersedes the signed 0.2.10 diagnostic artifact. The governed 0.2.10 restart run proved persistent installation, full Firefox restart survival, same-job native recovery dispatch, partial-range reuse, and recovery of the complete 64 MiB fixture, but final segmented publication failed because the native helper assembled binary segment bytes through a text-mode output stream. 0.2.11 fixes that native publication path and therefore requires a new signed artifact and fresh restart acceptance.

## Governed signing workflow

The repository maintains `.github/workflows/download-manager-mozilla-signing.yml`. It supports manual `workflow_dispatch` and an automated release branch named `release/download-manager-signing`.

For the automated path, the workflow refuses to sign unless the release branch points **exactly** at authoritative `main`. It then:

1. validates the canonical repository and the complete Download Manager deterministic source suite;
2. compiles the native helper and signed-restart acceptance source;
3. builds the deterministic unsigned XPI for the manifest-declared Download Manager version;
4. verifies the fixed add-on ID and exact manifest version in the packaged candidate;
5. records the candidate SHA-256 and source Git revision;
6. requires repository secrets `AMO_JWT_ISSUER` and `AMO_JWT_SECRET`;
7. submits the exact extracted candidate payload to Mozilla Add-ons through `web-ext` using the unlisted signing channel, or retrieves the exact already-approved version only when Mozilla reports that same version already exists;
8. verifies the returned XPI contains Mozilla `META-INF/` signature material, preserves the fixed add-on ID/version, and matches the candidate runtime payload under the governed manifest-normalization rules;
9. installs the matching Linux native helper from the same source revision;
10. installs the Mozilla-signed XPI non-temporarily into a real Firefox profile;
11. starts a throttled eight-segment native transfer, exits the Firefox process while validated partial staging exists, and starts a new Firefox process against the same profile without reinstalling the add-on;
12. requires the signed extension UI and native helper to return after restart, the original staged job to resume through non-boundary HTTP Range offsets, the final output to reproduce source SHA-256 exactly, and the original staging directory to clean after completion; and
13. retains the signed XPI, candidate/signed hashes, source revision, signed-restart log, and a machine-readable signing evidence record as a GitHub Actions artifact.

## Required release evidence

A successful 0.2.11 signing workflow must establish all of these facts before lifecycle promotion:

- exact source revision and deterministic candidate SHA-256;
- Mozilla-signed 0.2.11 XPI SHA-256;
- fixed add-on ID `download-manager@goreecloud.com` preserved through signing;
- matching 0.2.11 native helper and protocol/capability handshake;
- persistent non-temporary installation;
- full Firefox process restart without a second install call;
- extension UI/background availability after restart;
- matching native helper connection after restart;
- native partial staging present before process exit and preserved across exit;
- same-job native range recovery after restart rather than a fresh transfer;
- binary-safe final segmented assembly/publication;
- exact final output integrity and successful staging cleanup; and
- retained GitHub workflow/run provenance.

The Platform-System applicability review is documented separately in `PLATFORM_SYSTEM_RELEASE_REVIEW.md`. Its 0.2.11 delta review carries forward the existing local-product conclusions while accounting for the binary-publication fix; it does not claim integrations that do not exist.

## Promotion boundary

Even a Mozilla-signed artifact is not automatically Stable. Stable promotion requires a successful signed-install/restart/native-recovery workflow, inspection of the retained evidence, explicit repository lifecycle promotion, and synchronization of the canonical GoreeCloud project specification and changelog with the exact signing artifact hashes and workflow provenance.
