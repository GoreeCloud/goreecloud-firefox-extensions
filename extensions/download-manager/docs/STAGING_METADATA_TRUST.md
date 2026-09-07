# Native Staging Metadata Trust Contract

## Status

Introduced in GoreeCloud Download Manager Extension 0.2.9 and retained by the 0.2.10 source candidate. This document describes deterministic source-test behavior and does not establish Mozilla signing, Release Candidate status, or Stable status.

## Purpose

Native same-job recovery can reuse partially downloaded bytes from `.goreecloud-downloads/<job-id>/`. Reuse is allowed only after GoreeCloud establishes that the persisted recovery record belongs to the same managed job and a source identity that remains compatible with the current request.

0.2.9 made trusted `metadata.json` a prerequisite for persisted partial reuse. Orphaned or structurally invalid part files are not authoritative recovery state. 0.2.10 retains that contract and adds a separate filesystem-link boundary documented in `STAGING_LINK_SAFETY.md`.

## Required metadata structure

A reusable record must:

- parse as a JSON object;
- use metadata schema version `1`;
- contain a `job_id` exactly equal to the current GoreeCloud job ID;
- contain a canonical valid HTTP or HTTPS `url`;
- use an integer `size` value no smaller than `-1` and not a Boolean;
- use strings or `null` for `filename`, `destination`, `etag`, and `last_modified`; and
- keep each accepted persisted string field at or below 64 KiB when encoded as UTF-8.

Structural validation authorizes only the next identity-validation step. It does not by itself authorize partial reuse.

## Source identity validation

After structural validation, the helper compares the persisted and current source using:

- URL;
- known source length;
- ETag when both old and new values are available; and
- Last-Modified when ETag cannot provide the comparison.

A mismatch invalidates the old partial data.

## Fail-closed behavior

If metadata is missing, malformed, unsupported, foreign to the current job, or structurally invalid, GoreeCloud removes existing staged transfer parts before the replacement transfer begins. A fresh valid metadata record is then written for the current source and destination selection.

Valid same-job metadata for an unchanged source preserves existing partial files so durable recovery remains available.

## Filesystem relationship

0.2.10 does not replace metadata/source validation with filesystem checks; both boundaries apply. The staging root and per-job directory must be non-link directories, reusable staging files must be regular non-link files, and supported file opens use no-follow semantics as described in `STAGING_LINK_SAFETY.md`.

The 0.2.10 link controls do not claim a universal race-proof filesystem sandbox against a process with unrestricted access to the same user account. That distinction must remain explicit in release/security claims.
