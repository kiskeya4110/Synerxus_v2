# shared/constants

Reserved for per-domain constant modules added during the incremental
domain-oriented refactor.

The canonical aggregate constants module is `shared/constants.ts` at the
parent directory. New domain constants (evidence statuses, confidence
tiers, role labels, report section labels) currently live there alongside
the existing image, API, scoring, and feature-flag config to avoid
duplicate exports during the transition.

When a single constant group grows large enough to warrant its own file,
extract it here (for example `shared/constants/evidence.ts`) and re-export
from `shared/constants.ts` to preserve the public import path.
