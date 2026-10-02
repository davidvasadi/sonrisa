# Data Sources

## Research checklist

Each candidate source must be checked with a real call against these points. Raw responses go in [raw-responses/](raw-responses/). Nothing is taken from memory or from AI output without a stored response that backs it up.

| # | Check | Why | Decision |
| --- | --- | --- | --- |
| 1 | Free, with no key or registration? | Zero-config run. For market data, a key or registration means markets are dropped | [D-008](../05-decisions/decision-log.md#d-008-free-sources-keyless-where-possible-verified-by-a-real-call), [D-009](../05-decisions/decision-log.md#d-009-zero-config-local-run), [D-016](../05-decisions/decision-log.md#d-016-drop-markets-if-they-need-a-key-or-registration) |
| 2 | **Which categories does it actually offer?** (event types, sections, feeds, codes) Record the exact values seen in the response, not the ones in the docs | Users pick from these. There is no fixed list | [D-013](../05-decisions/decision-log.md#d-013-categories-come-from-the-sources-not-a-fixed-list) |
| 3 | **How much does it publish per category?** (events per day, measured from real responses over a period) | There is no filter, so a category that floods users rules the source out | [D-018](../05-decisions/decision-log.md#d-018-no-importance-filter-the-source-decides) |
| 4 | Is there a stable unique ID per event? | Deduplication | [D-005](../05-decisions/decision-log.md#d-005-deduplicate-events-and-notifications) |
| 5 | Push (stream, SSE, webhook) or polling only? | Push is built only where verified | [D-003](../05-decisions/decision-log.md#d-003-push-where-supported-polling-otherwise), [D-017](../05-decisions/decision-log.md#d-017-accepted-ai-recommendations) |
| 6 | Rate limits and terms of use | Is automated use allowed, and how often can we poll? | [D-008](../05-decisions/decision-log.md#d-008-free-sources-keyless-where-possible-verified-by-a-real-call) |

## Candidates

## Category inventory

For each source: the categories it offers, the exact values seen in a stored response, and how they would appear to the user.

## Comparison

## Choice

## Verification

Raw API responses used for verification are stored in [raw-responses/](raw-responses/).
