# Foundation Architecture

The first slice separates four concerns:

- `provider-rules.js`: curated built-in routing knowledge.
- `routing.js`: pure routing decision logic with no browser dependency.
- `containers.js`: Firefox contextual-identity adapter.
- `background.js`: navigation-event orchestration and safe tab migration.

This split keeps the GoreeCloud routing model independently testable and avoids making Firefox cookie-store IDs the durable product identity.
