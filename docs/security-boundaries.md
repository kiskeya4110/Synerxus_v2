# Security Boundaries

This document describes the security and disclosure boundaries that the
Synerxus frontend and report generators must respect. The boundaries are
deliberately conservative: when in doubt, redact.

## Sanitization

All HTML rendered into the DOM via `dangerouslySetInnerHTML`, written to a
print window, or downloaded as an `.html` blob **must** pass through the
helpers in `client/src/lib/report-sanitizer.ts`:

- `sanitizeReportStyles()` — strips `<style>` tags, `@import`, `expression(...)`,
  `javascript:` / `data:` URLs, and `url(...)` references.
- `sanitizeReportBody()` / `sanitizeReportHtml()` — DOMPurify with an
  explicit allow-list of attributes and an explicit forbid-list of tags
  (`script`, `iframe`, `object`, `embed`, `form`, `input`, `button`) and
  attributes (`onerror`, `onload`, `onclick`, `onmouseover`, `srcdoc`).

No user-controlled string may be inserted into an HTML sink without going
through this layer.

## Redaction in public reports

Public-facing generated reports must include the canonical **Redaction
Note** and must not surface any of the following inside the report body:

- Device identifiers (raw or hashed).
- SMS routing rules and phone workflows.
- Raw telemetry signals (sensor logs, low-level network traces).
- Fraud-control logic, scoring weights, and thresholds.
- Proprietary verification mechanics (the algorithm by which the strict
  gate is evaluated, internal queue priorities, etc.).

The redaction note text is asserted by the
`public-report-redaction` test. Any change to the wording requires a
matching test update.

## Verification metadata exposure

| Field                | Public report | Authenticated org / corporate UI | Admin UI |
|----------------------|---------------|----------------------------------|----------|
| `verifierId` (raw)   | no            | no                               | yes      |
| `verifierName`       | no            | yes (display name only)          | yes      |
| `verifiedAt`         | yes (date)    | yes                              | yes      |
| Internal review notes| no            | no                               | yes      |
| Fraud signals        | no            | no                               | yes      |

The principle: a corporate or NGO partner can see *that* a verifier
confirmed a record and *who* (display name) inside their own authenticated
view, but never the internal mechanics or scoring that led to the decision.

## Modal and form security baselines

- Every modal must declare `role="dialog"`, `aria-modal="true"`, and an
  `aria-labelledby` pointing at its title.
- ESC must close the modal; backdrop click is allowed but never required.
- Initial focus must land on a safe control (Cancel button or first
  non-destructive field), not on a destructive action.
- Every form input must have an associated `<label htmlFor>` and an `id`.
- Email-list inputs must enforce a regex `pattern` and a `maxLength`.
- Forms that submit user input over the network must rate-limit on the
  server (see `sensitiveRateLimiter` in `server/middleware`).

## What this document is not

This document is an **engineering contract**. It is not a SOC 2 statement,
a penetration-test report, or a substitute for independent assurance. The
formal scope of what Synerxus does and does not represent is in
`docs/verification-boundary.md` and in the canonical
`SYNERXUS_BOUNDARY_STATEMENT`.
