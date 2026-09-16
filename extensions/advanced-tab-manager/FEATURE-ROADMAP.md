# GoreeCloud Advanced Tab Manager — Feature Roadmap

**Lifecycle:** source-candidate 0.1.7  
**Authoritative project record:** `GoreeCloud/Projects/Project Specification — Advanced Tab Manager.md`

| ID | Obligation | Priority | State |
| --- | --- | --- | --- |
| ATM-001 | Establish manifest identity, canonical directory, inventory, validation, and deterministic packaging. | High | Implemented and source-verified |
| ATM-002 | Reconstruct authoritative live Firefox tab/window/native-group state after background cold starts. | High | Implemented and source-verified |
| ATM-003 | Provide accessible sidebar and popup foundations with safe tab actions. | High | Implemented and source-verified |
| ATM-004 | Add durable tree relationships and restoration behavior. | High | Implemented in 0.1.1+ source candidate; runtime acceptance pending |
| ATM-004A | Add tree drag-and-drop, branch move/close/discard operations, and richer manual reparenting UX. | Medium | Planned |
| ATM-005 | Add persistent Tab Sets and transactional stashing. | High | Implemented in 0.1.2+ source candidate; runtime acceptance pending |
| ATM-006 | Add duplicate review and policy-controlled cleanup. | Medium | Implemented in 0.1.3+ source candidate with exact-URL review and guarded cleanup; runtime acceptance pending |
| ATM-006A | Add optional conservative normalized-URL matching and durable protected-tab cleanup exclusions. | Medium | Planned |
| ATM-007 | Add restart-safe snoozing and deadline reconstruction. | High | Implemented in 0.1.4+ source candidate with one-shot local deadlines, restart alarm reconstruction, rescheduling, and source-preserving restore; runtime acceptance pending |
| ATM-007A | Add richer arbitrary-date/time snooze scheduling and optional recurring schedules only after a separate policy/UX design. | Medium | Planned |
| ATM-008 | Add rule engine, command palette, full manager, import/export, and large-session performance qualification. | Medium | In progress — deterministic local rule engine, explicit rule actions, and bounded command palette implemented through 0.1.7; remaining surfaces/qualification planned |
| ATM-008A | Add explicit rule-action execution and user-facing rule management after separate mutation-safety and UX acceptance. | Medium | Implemented in 0.1.6 source candidate; representative runtime acceptance pending |
| ATM-008B | Add a keyboard-first command-palette foundation without widening browser authority. | Medium | Implemented in 0.1.7 source candidate with deterministic local command search/navigation; representative runtime acceptance pending |
| ATM-009 | Complete privacy/security review, Firefox runtime acceptance, Mozilla signing, and later Stable qualification. | High | Planned |

No roadmap entry is a release or Stable claim without exact implementation and acceptance evidence.
