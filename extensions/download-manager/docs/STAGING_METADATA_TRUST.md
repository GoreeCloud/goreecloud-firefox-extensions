# Native Staging Metadata Trust Contract

## Status

GoreeCloud Download Manager Extension 0.2.9 source-candidate design and deterministic source-test contract. This document does not establish target-device acceptance, Mozilla signing, Release Candidate status, or Stable status.

## Purpose

Native same-job recovery can reuse partially downloaded bytes from `.goreecloud-downloads/<job-id>/`. Reuse is safe only when GoreeCloud can first establish that the persisted recovery record belongs to the same managed job and a source identity that remains compatible with the current request.

0.2.9 therefore makes trusted `metadata.json` a prerequisite for persisted partial reuse. Orphaned or structurally invalid part files are not authoritative recovery state.

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

After structural validation, the helper compares the persisted and current source using the existing recovery identity signals:

- URL;
- known source length;
- ETag when both old and new values are available; and
- Last-Modified when ETag cannot provide the comparison.

A mismatch invalidates the old partial data.

## Fail-closed behavior

If metadata is missing, malformed, unsupported, foreign to the current job, or structurally invalid, GoreeCloud removes the existing staged part files before the replacement transfer begins. A fresh valid metadata record is then written for the current source and destination selection.

Valid same-job metadata for an unchanged source preserves the existing partial files so durable recovery remains available.

## Explicit boundary

0.2.9 does not yet claim symlink/no-follow protection for the staging directory, `metadata.json`, `single.part`, `assembled.part`, or segmented part files. Filesystem link substitution and related path-race behavior remain separate hardening work and must not be represented as accepted by this contract.
