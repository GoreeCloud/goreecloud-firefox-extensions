# Source Resync Standalone Repository Migration Evidence

This directory preserves retirement metadata for the former standalone `GoreeCloud/source-resync` repository.

The authoritative Firefox source is `extensions/source-resync/` in this repository.

Full reachable Git history is preserved under `refs/tags/archive/source-resync/*`. The five historical releases (`v1.0.0`, `v1.0.1`, `v1.0.2`, `v1.1.1`, and `v1.1.2`) were recreated as namespaced archival releases using the corresponding imported archive tags. All 15 release assets were independently verified against the originals by filename, size, and SHA-256 digest.

The standalone repository is not a current source location and is eligible for retirement only after the remaining canonical-index/task reconciliation and final live-reference checks pass.
