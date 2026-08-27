# Broad Host Permission Review

## Decision

`<all_urls>` is required for the GoreeCloud Privacy Shield Firefox adapter.

## Why broad host access is necessary

The extension's explicit user-facing role is browser-wide privacy and request protection. Core features cannot function correctly with a narrow fixed host list because they must operate on arbitrary sites the user visits and arbitrary third-party requests those sites initiate.

Broad access is used for:

- tracking-parameter and redirect cleanup on navigations;
- page-link cleanup and anti-rewrite handling;
- network cancellation for ads, trackers, miners, malicious-domain rules, scripts, frames, media, beacons, and user-defined rules;
- ETag request/response header removal;
- cosmetic filtering and the element picker/zapper on ordinary HTTP/HTTPS pages;
- reviewed exact-match CDN-to-local resource substitution.

## Constraints

- The extension declares no remote telemetry endpoint.
- Request logs are memory-only and are not persisted across browser restarts.
- Allowed-request logging is disabled by default.
- Filter-list subscriptions are empty by default and only contact HTTPS URLs explicitly configured by the user.
- Local CDN substitutions use an exact reviewed catalog; unknown resources are not heuristically replaced.
- Firefox restricted/privileged pages remain outside content-script access.
- Broad access does not confer authority outside Firefox or replace Privacy Shield platform capability acceptance elsewhere.

## Review status

Approved as a source-level functional requirement for this extension. Mozilla signing, Firefox runtime acceptance, privacy review, performance review, and Stable promotion remain separate gates.
