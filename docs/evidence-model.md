# Evidence Model

This document defines the core data concepts the Synerxus evidence framework
operates on. Every report, badge, claim, and downstream verification flow is
built from these primitives. Use the canonical labels from
`shared/content/approved-claims.ts` whenever they appear in UI or generated
reports.

## Concepts

### Activity
A timestamped log of work performed by a volunteer or program participant
(e.g. hours contributed, sessions delivered, deliverables produced). An
activity is the atomic unit of input. By itself an activity is **self-reported
data** and is not yet evidence.

| Attribute              | Required | Notes                                    |
|------------------------|----------|------------------------------------------|
| `userId`               | yes      | Volunteer or participant.                |
| `projectId`            | yes      | Anchors the activity to a program.       |
| `date`                 | yes      | Activity-of-record date.                 |
| `hours` / `quantity`   | yes      | Volume of work.                          |
| `description`          | yes      | Short narrative of what was done.        |

### Output
A reportable result produced by one or more activities (e.g. *"30 students
trained"*, *"5 wells installed"*). Outputs translate raw activity volume into
program-meaningful quantities. They are still pre-verification.

### Partner Confirmation
A signed acknowledgement from the **delivery partner** (typically the NGO or
implementing organization) that the activity occurred and the output was
delivered. Confirmation is recorded against the activity by the partner's
authorized account and timestamps the moment of acknowledgement.

A confirmation captures three things:
1. **Who** confirmed (the partner user id).
2. **When** they confirmed (`verifiedAt`).
3. **What** they confirmed (status = `approved`, with the activity date and
   output quantity intact).

### Verified Evidence Record
An activity that has cleared the **full strict-verification gate**:

```
verificationStatus === 'approved'
  AND verifiedAt    is present
  AND verifiedBy    is present
  AND date          is present
```

Only records meeting **all four** conditions may carry the
`Verified Evidence Record` label or appear in the *Sample Verified Evidence
Records* section of a report. The canonical predicate lives in
`shared/validation/index.ts → isFullyVerified()`. See
[verification-boundary.md](./verification-boundary.md) for the rules.

### Partner-Reported Reach
A partner-confirmed activity that is missing one or more strict-verification
fields (for example: approved but no recorded `verifiedAt`/`verifiedBy`, or
beneficiary counts reported without a per-record date). It is real, the
partner stands behind it, but Synerxus has not closed the verification loop
on it yet. Reported separately from Verified Evidence Records and never shown
under the same label.

### Derived / Mapped Alignment
Programmatic alignment Synerxus computes from confirmed inputs to a
recognized framework taxonomy (SDGs, GRI, ESRS, etc.). Derived alignment is
**inference**, not new evidence; it must always be presented as such and
must never be combined with Verified Evidence Record counts.

## Evidence Statuses

The canonical statuses are exported from `shared/constants.ts`:

| Status        | Meaning                                                              |
|---------------|----------------------------------------------------------------------|
| `pending`     | Submitted, awaiting partner confirmation.                            |
| `verified`    | Partner has confirmed; treated as Verified Evidence Record only when full strict gate passes. |
| `rejected`    | Partner has rejected the submission. Excluded from all evidence counts. |
| `incomplete`  | Submitted but missing required fields; cannot progress to verified. |

Use the `EVIDENCE_STATUS` constant — never hand-type these strings.

## Lifecycle

```
draft ─▶ pending ─▶ (partner review)
                     ├─▶ approved ─▶ [strict gate] ─▶ Verified Evidence Record
                     │                          └─▶ Partner-Reported Reach
                     ├─▶ rejected
                     └─▶ incomplete (returned for completion)
```

A record can only enter `Verified Evidence Record` state once. Demotion is
allowed when filters or re-review reveal a missing strict-gate field, in
which case the record is reclassified as `Partner-Reported Reach` for the
current report run.
