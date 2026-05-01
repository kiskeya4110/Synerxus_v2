# Text Capture Verification System

## Overview

The Synerxus text capture verification system is a background analysis layer for volunteer impact logs.

It evaluates free-text outcome submissions such as:

- what the volunteer says they completed
- who benefited
- whether the text contains measurable evidence
- whether the language appears specific or low-signal
- which UN SDGs are likely relevant

The current implementation is production-safe and non-blocking. It does not stop log submission. Instead, it generates a structured verification result that NGO reviewers or future AI services can use to speed up human verification.

An optional AI second-pass verifier can now be enabled behind a feature flag. It is disabled by default.

## Purpose

The system exists to improve verification quality before and during NGO review.

It helps answer:

- Is the impact text descriptive enough?
- Does it mention actions taken?
- Does it mention beneficiaries?
- Does it contain measurable numbers?
- Does the text align with the recorded quantity?
- Does it appear to be placeholder or test content?
- Which SDGs are suggested by the text?

## Current Architecture

### 1. Capture

Volunteers submit impact logs through `POST /api/logs`.

Relevant fields already supported in the data model include:

- `outcomeText`
- `outcomes`
- `outcomeQuantity`
- `beneficiaryCount`
- `sdgTags`
- `editedOutcomeText`
- `editedSdgTags`

### 2. Queue

After a log is created, the background verifier is queued automatically.

It is also re-queued when NGO staff verify a log and edit:

- outcome text
- outcome quantity
- SDG tags

### 3. Analysis

The background verifier runs asynchronously and computes:

- `status`
- `confidence`
- `recommendation`
- `suggestedSdgs`
- `extractedNumbers`
- `flags`
- `reasons`
- `normalizedText`
- `summary`

### 4. Read Access

Clients can fetch the current analysis result from:

`GET /api/logs/:id/text-verification`

This returns either:

- `queued`
- `processing`
- `complete`
- `failed`

## Current Scoring Logic

The current version is heuristic-first.

It increases confidence when text:

- is sufficiently descriptive
- includes action verbs
- references beneficiaries
- includes measurable numbers
- aligns with detectable SDG themes

It decreases confidence when text:

- is too short
- lacks action verbs
- does not mention quantities that were recorded elsewhere
- contains placeholder or test wording
- lacks beneficiary context
- has no detectable SDG signal

## Optional AI Second Pass

The system now supports an optional AI-assisted refinement stage.

This stage:

- is disabled by default
- only runs on borderline cases
- never blocks log submission
- falls back cleanly to heuristic results if AI is unavailable

Environment flags:

- `IMPACT_TEXT_VERIFICATION_AI_ENABLED=true`
- `IMPACT_TEXT_VERIFICATION_AI_MODEL=gpt-4o-mini`

The AI pass reuses the same output contract and can refine:

- confidence
- recommendation
- reasons
- flags
- summary
- suggested SDGs

## Recommendations Produced

The system returns one of:

- `approve`
- `review`
- `reject`

These are not final verification decisions.

They are decision-support outputs for:

- NGO reviewers
- internal trust workflows
- future AI second-pass verification

## Production Characteristics

The current implementation is optimized for safe rollout:

- non-blocking
- deterministic
- low-cost
- queue-based
- bounded concurrency
- cache-backed
- no schema migration required

It is designed to be useful immediately while preserving a clean upgrade path.

## Current Limitations

The current system is not yet a full semantic verifier.

What it does not yet do:

- persist results in a dedicated database table
- use LLM reasoning for borderline cases
- learn from NGO approval/rejection outcomes
- score cross-log consistency across multiple records
- provide organization-level trust analytics

## Upgrade Path

The current API contract was designed so the engine can be upgraded without changing frontend consumers.

Recommended next steps:

1. Persist verification results to DB or Redis.
2. Add optional AI-backed second-pass verification behind a feature flag.
3. Track queue metrics, latency, confidence distribution, and false-positive rates.
4. Feed NGO verification outcomes back into the scoring model.
5. Add organization-level dashboards for low-signal and high-risk submissions.

## Relevant Files

- `server/services/impact-text-verification.ts`
- `server/routes/logs.router.ts`
- `server/__tests__/impact-text-verification.test.ts`
- `shared/schema.ts`

## Summary

The text capture verification system is now built as a background framework.

It already provides:

- structured trust analysis
- SDG suggestion support
- confidence scoring
- review recommendations
- low-signal detection
- API access for downstream use

It is ready for near-term production use as a verification-assist layer, and it can be upgraded later into a deeper AI verification system without breaking the current integration surface.
