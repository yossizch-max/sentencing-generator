# v94 Architecture Migration Plan

## Scope
This branch is isolated from `main`. Phase 0 is documentation and migration scaffolding only. No production generator, legal wording, sentencing calculation, route behavior, accident logic, save/load behavior, Word/PDF export, or Vercel production deployment is changed.

## Current verified architecture

### Route generators
- `67`: `generate67_core()`; multiple/joined-case flow reaches `generateMultiple()`.
- `10a`: dedicated `generate10a()`.
- `67+10a`: dedicated `generate67_10a()`.
- `shichrut` and `67_shichrut`: live family anchored in `generate67ShichrutV66()`.
- `10a_shichrut` and `67_10a_shichrut`: `generateV74Route()`.
- `accident_injury`: `generateAccidentInjury()` with its own placement/range mechanism.

### State and restoration
- Generic form persistence: `getAllFields()` / `setAllFields()`.
- Route-specific state: `RouteFieldStateManager`.
- Dynamic multiple-card state: `snapshotMultiCardFields()`, `restoreMultiCardFields()`, `applyMultiCardsExact()`.
- Dynamic conditional records: `restoreConditionalRecordLists()`.
- Route switching is layered through multiple wrappers around `chooseMashlul()`.

### Legal text ownership already established
- Evidence submission is distinct from past-record analysis.
- Range-setting circumstances are distinct from defendant placement circumstances.
- `buildPastRecordSection()` is an important placement producer for record-based reasoning.
- `buildPlacementSection()`, `buildPlacementReasons()`, and `buildPlacementClosing()` participate in placement text.
- Insurance in the current case is not a personal placement factor.
- Multiple current events do not, by themselves, prove deterrence failure.
- Similar-prior-offense and prior-sanction claims must be fact-gated.

## v94 target model

```js
CaseModel = {
  schemaVersion: 1,
  route: "",
  defendant: {
    name: "",
    id: "",
    record: {
      traffic: { count: null, detail: "", heavy: false },
      criminal: { count: null, detail: "", heavy: false },
      priorPrison: [],
      pendingConditions: {
        imprisonment: [],
        disqualification: [],
        bonds: []
      }
    }
  },
  proceeding: {
    leadCaseNumber: "",
    mode: "single", // single | multiple | joined
    cases: []
  },
  currentOffense: {
    charges: [],
    facts: {},
    ancillaryOffenses: {}
  },
  sentencing: {
    range: {},
    placement: {},
    petition: {}
  },
  accident: null,
  metadata: {
    createdAt: null,
    updatedAt: null
  }
}
```

## Migration rule
The new model starts as a READ-ONLY adapter over the existing DOM/state.

Phase 1 must not:
- write values back to the form,
- select routes,
- replace any generator,
- change any calculated range,
- change placement keys,
- change petition values,
- change save/load serialization,
- change export behavior.

## Phase 1 deliverables
1. `buildCaseModelFromCurrentState()`: produce a canonical snapshot without side effects.
2. `validateCaseModel()`: detect missing/contradictory data, but do not block existing generation.
3. `compareLegacyStateToCaseModel()`: diagnostic parity report.
4. Browser fixtures for all routes and dynamic-list scenarios.
5. A schema-version field for future migrations, not yet used by production save/load.

## Parity gate
No route can migrate to the new writer until all of these are true for the same inputs:
- existing generated HTML remains byte-identical where wording is not intentionally changed,
- all numeric sentencing outputs are identical,
- save/load round-trips preserve the same user-entered facts,
- joined/multiple case data is preserved exactly,
- conditional-record sparse indexes survive,
- accident HARD/EXTREME behavior is unchanged,
- Copy/Word/PDF contain the same substantive content.

## Recommended route migration order
1. `10a` — relatively contained.
2. `67`.
3. `67+10a`.
4. `shichrut`.
5. `67_shichrut`.
6. `10a_shichrut`.
7. `67_10a_shichrut`.
8. `accident_injury` last, because it has a distinct range/placement engine.

## Non-goals for v94 phase 1
- No legacy deletion.
- No wrapper cleanup.
- No central caselaw database yet.
- No UI redesign.
- No new route support for multiple charges.
- No legal-policy rewrite.

## Safety principle
Every migration step must be reversible and must leave `main` untouched until an independently tested PR is explicitly approved.
