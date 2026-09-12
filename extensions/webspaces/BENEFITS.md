# GoreeCloud Webspaces — Benefits

## Current foundation

The implemented routing core establishes a local-first path toward separating browser login state across Firefox contextual identities while reducing manual Webspace selection for recognized domains.

The built-in **Standard** Webspace now gives ordinary unassigned HTTP(S) browsing its own isolated identity instead of routinely leaving those sites in Normal Firefox. This creates a safer and more consistent baseline: websites start in Standard until a more specific user or provider assignment places them elsewhere, while explicit exceptions, routing pauses, and local-development rules retain their intended behavior.

Deterministic routing and explicit precedence are designed to make decisions testable and explainable rather than dependent on incidental event ordering. The user can still see why a site entered Standard or another Webspace and can assign it to a more appropriate destination later.

The replacement-before-removal tab migration design reduces the risk of losing the user's source tab when a destination Webspace cannot be created.

## Planned benefits

The full product is intended to make multi-account browsing, account separation, privacy-conscious session organization, and workspace switching more approachable. Those broader benefits remain planned until the corresponding capabilities are implemented and accepted.
