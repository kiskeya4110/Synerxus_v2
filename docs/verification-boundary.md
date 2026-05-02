# Verification Boundary

Synerxus operates a clearly bounded verification model. This document
describes what verification means inside the platform, what it does
**not** mean, and what claims may or may not be made on top of a verified
record.

## What "Verified" means

A record is treated as a **Verified Evidence Record** if and only if every
condition below is met:

1. `verificationStatus === 'approved'`
2. `verifiedAt` is present (timestamp of partner confirmation).
3. `verifiedBy` is present (id of the partner user who confirmed).
4. `date` is present (date the activity actually occurred).

The single source of truth for this rule is
`shared/validation/index.ts → isFullyVerified()`. Every report generator,
badge component, and export must call this helper rather than re-implement
the predicate.

## What "Verified" does NOT mean

- It does **not** mean Synerxus performed an independent assurance
  engagement.
- It does **not** mean a regulator or auditor has reviewed the record.
- It does **not** mean the activity caused a measured outcome
  (see Contribution vs Attribution below).
- It does **not** mean the underlying organization, partner, or program is
  certified by Synerxus.

For the canonical legal phrasing of this scope, use
`SYNERXUS_BOUNDARY_STATEMENT` from `shared/content/boundary-statements.ts`.

## Contribution vs Attribution

Synerxus reports **contribution**, not **attribution**.

- **Contribution**: structured, partner-confirmed evidence that a program's
  activities and outputs occurred and plausibly fed into a stated outcome or
  framework alignment. This is what Synerxus produces.
- **Attribution**: a causal claim that a specific activity *caused* a
  specific outcome to a measurable degree. Attribution requires controlled
  study designs (randomized control trials, difference-in-differences, etc.)
  that Synerxus does not perform.

Contribution language ("supports", "documents", "is aligned with", "is
consistent with") is allowed. Attribution language ("proves", "causes",
"guarantees", "is responsible for") is on the prohibited-claims list and is
blocked by the prohibited-copy scan.

## Confidence Tiers

Every figure on a Synerxus report is shown alongside one of three tiers,
exported as `CONFIDENCE_TIER` from `shared/constants.ts`:

| Tier               | Source                                       | Display label        |
|--------------------|----------------------------------------------|----------------------|
| `verified`         | Passes the full strict-verification gate.    | **Verified**         |
| `partner_reported` | Partner-confirmed but missing a strict field.| **Partner-Reported** |
| `derived_mapped`   | Programmatic alignment inferred from inputs. | **Derived / Mapped** |

Tier classification is performed by
`shared/validation/index.ts → classifyConfidenceTier()`. Reports must always
display the tier alongside the figure — never the figure alone.

## Synerxus Boundary Statement

The canonical disclosure that must appear on every generated report and
adjacent to verified-evidence claims:

> Synerxus provides structured, independently confirmed evidence that
> supports reporting and assurance preparation. Synerxus does not replace
> independent assurance providers, provide formal assurance opinions,
> guarantee regulatory compliance, or establish causal attribution.

Source of truth: `shared/content/boundary-statements.ts`. Do not paraphrase.
