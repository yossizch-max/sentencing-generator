# v94 Phase 1 Status

## Safety boundary
- Branch only: `v94/architecture-migration`
- `main` / production `index.html`: unchanged
- No generator replaced
- No production save/load writer replaced
- No sentencing calculation changed

## Canonical CaseModel coverage now implemented
### Core
- canonical route + legacy route alias handling
- defendant name
- traffic and criminal record counts/details
- prior imprisonment signals
- pending imprisonment/disqualification/bond lists
- lead case, single/multiple/joined mode, joined-card facts
- current ancillary offenses
- imprisonment range, placement, prosecution petition
- stable portable serialization with schema guard

### Route-specific facts
- section 67 prior count, disqualification knowledge/source
- section 10a prior signal, no-fix signal, relation/detail
- intoxication finding/circumstances/repeat/accident/40a/alcohol level/type/prior count
- section 40a request families
- conditional-petition request fields

### Accident route
- injury, negligence, placement, manual-placement reason
- imprisonment/disqualification ranges
- victim count/status/type
- relevant-history signals
- aggravating and mitigating circumstance sets
- prosecution petition fields

## Validation diagnostics
Read-only warnings/info now cover:
- missing route
- joined case without case number
- multiple/joined mode with insufficient cards
- traffic record count without detail
- criminal record count without detail
- conditional record without source case
- empty section 67 disqualification detail
- manual accident placement without reason
- victim count with empty accident description

## Automated gates
- production index unchanged
- JS syntax / inline script compilation
- critical DOM contract
- read-only and deterministic adapter behavior
- all canonical routes
- joined cards and sparse dynamic lists
- core and expanded legacy parity
- schema + portable serialization
- route-specific and accident canonical facts
- real-browser route switching
- 250-capture mutation stress
- route-switch stress
- viewport matrix
- multiple-card 3→2 model + DOM checks
- conditional lists
- legacy state roundtrip
- live-DOM route-specific mapping
- route-specific legacy roundtrip

## Next phase
1. Finish full-browser green run for current head.
2. Produce mapped-vs-unmapped legacy field coverage report from the 253-key inventory.
3. Expand canonical model for defense/prosecution-response and policy/caselaw selection state.
4. Add canonical snapshot fixtures for every route.
5. Only then evaluate a first shadow writer. No production generator migration before full parity.
