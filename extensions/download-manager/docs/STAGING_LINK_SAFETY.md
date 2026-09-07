# Download Manager 0.2.10 Staging Link Safety

## Status

Deterministic source-candidate hardening. This document describes the 0.2.10 implementation boundary and does not claim Stable or signed-release acceptance.

## Purpose

The native helper stores resumable transfer state beneath `<download-directory>/.goreecloud-downloads/<job-id>/`. 0.2.9 made trusted metadata a prerequisite for reusing staged bytes. 0.2.10 additionally prevents symbolic-link substitution at the staging root, job staging directory, metadata file, partial files, assembled staging file, and final staging-source publication boundary.

## Implemented controls

- The `.goreecloud-downloads` staging root must be an actual directory and must not be a symbolic link.
- The per-job staging path must be an actual directory and must not be a symbolic link.
- Staging-file inspection uses `lstat` semantics so a link is identified as a link rather than followed to its target.
- Metadata and transfer-part files are required to be regular files before reuse.
- File opens use `O_NOFOLLOW` where the host platform provides it.
- Metadata replacement uses a separately created job-local temporary regular file, flush/fsync, a symlink check on the destination entry, and `os.replace`.
- Clearing invalid staging unlinks a link entry itself rather than recursively deleting or truncating the link target.
- Segmented assembly and part-file reads/writes use the same staging-file validation helpers.
- Final no-overwrite publication requires the staging source to be a regular non-link file and links it with `follow_symlinks=False`.
- Native protocol 2 now advertises and requires the `staging-link-rejection` capability; a 0.2.10 extension therefore rejects an older helper that does not provide this contract.

## Deterministic regression scope

`tests/test_staging_link_safety.py` verifies staging-root link rejection, per-job directory link rejection, metadata-link rejection without reading the target, partial-link rejection without modifying the target, safe invalid-staging cleanup, final-publication source rejection, and the ordinary regular-file path.

## Boundary

These controls materially reduce symlink-following risk at the persistent staging boundary. They do not claim a universal filesystem race-proof sandbox, protection against a malicious process with unrestricted access to the same user account between every individual filesystem operation, or native-host support on operating systems whose filesystem semantics have not been separately validated. Linux is the implemented native-host platform for this candidate.
