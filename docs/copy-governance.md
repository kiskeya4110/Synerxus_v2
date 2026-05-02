# Copy Governance

All user-facing strings on legally sensitive surfaces (reports, marketing,
in-product disclosures) must come from a single source of truth in
`shared/content/`. Hand-typed paraphrases are not allowed.

## Sources of truth

| File                                         | What it owns                                       |
|----------------------------------------------|----------------------------------------------------|
| `shared/content/boundary-statements.ts`      | Synerxus scope/boundary disclaimers.               |
| `shared/content/approved-claims.ts`          | Positioning copy and product/label vocabulary.     |
| `shared/content/prohibited-claims.ts`        | Phrases that must NOT appear anywhere user-facing. |
| `shared/content/report-language.ts`          | Reusable narrative blocks for generated reports.   |
| `shared/content/framework-language.ts`       | Approved phrasing for SDG / GRI / ESRS references. |
| `shared/content/cta-copy.ts`                 | Approved call-to-action and form-success strings.  |

Aggregated and re-exported from `shared/content/index.ts`.

## Approved labels

Use the `PRODUCT_LABELS` constant from `approved-claims.ts`. Never type
these strings inline.

- `Verified Evidence Summary`
- `Evidence Alignment`
- `Reporting and Assurance Support`
- `Partner-Confirmed Output`
- `Partner-Reported Reach`
- `Derived / Mapped Alignment`
- `Verified Evidence Record`

## Prohibited claims

The full machine-checkable list is in
`shared/content/prohibited-claims.ts → PROHIBITED_CLAIMS`. The
`prohibited-copy-scan` test asserts that none of these phrases appear in
the canonical content modules. The phrases include (non-exhaustive):

- "guarantees compliance"
- "proves impact" / "impact proof"
- "certified CSRD compliant" / "CSRD compliant evidence"
- "formal assurance opinion"
- "causal proof"
- "auditor-approved"
- "fully compliant"
- "only evidence infrastructure"
- "immutable audit trail" *(conditional — only if technically documented)*

When new copy is added that conflicts with this list, the resolution is to
adopt the approved alternative wording listed alongside the prohibited
phrase, never to weaken the rule.

## Form / toast success copy

Forms that send a request to a Synerxus team member (sales enquiries,
report-schedule requests, contact forms) must use the standard
production-safe success line:

> Thank you. Your request has been received. A Synerxus team member will
> follow up.

Prototype phrasing such as "Scheduled", "Saved (demo)", or "Coming soon"
is not permitted in production UI.
