# RepeatOS Check-in Widget Open Questions

This document tracks decisions that should be locked before or during implementation.  
Each item includes the impact area and a recommended default to keep momentum.

## 1) Token and QR Lifecycle

### Q1. Should QR tokens expire?

- **Impact:** Security posture, support load, vendor operations.
- **Default recommendation:** No expiry in MVP, but allow manual deactivation and regeneration.

### Q2. Do vendors need multiple active QR tokens per location or campaign?

- **Impact:** Table design usage patterns, analytics segmentation.
- **Default recommendation:** Yes, support multiple active tokens per business from day one.

### Q3. What is the rotation flow if a token leaks?

- **Impact:** Incident response time.
- **Default recommendation:** Admin action: deactivate old token, generate new token, immediate propagation.

## 2) Origin and Embed Policy

### Q4. Single allowed origin or multiple origins per business?

- **Impact:** CORS model and onboarding friction.
- **Default recommendation:** Multiple origins (prod + staging + `www/non-www` variants).

### Q5. How strict should origin matching be?

- **Impact:** False rejections vs abuse tolerance.
- **Default recommendation:** Exact scheme + host + optional port match (no wildcard in MVP).

### Q6. Should scans without `Origin` ever be accepted?

- **Impact:** Browser vs non-browser abuse surface.
- **Default recommendation:** Reject if `Origin` missing for public endpoint requests.

## 3) Customer Identity Rules

### Q7. What phone normalization level is acceptable?

- **Impact:** Duplicate identities and reward fairness.
- **Default recommendation:** Minimal normalization (trim, remove spaces/dashes, preserve leading `+`).

### Q8. Is phone uniqueness per business always correct?

- **Impact:** Shared phone edge cases.
- **Default recommendation:** Keep uniqueness at `(business_id, phone)` for MVP.

### Q9. Do we support non-phone fallback identifiers?

- **Impact:** UX flexibility and abuse risk.
- **Default recommendation:** No; keep only phone in MVP.

## 4) Visit and Reward Semantics

### Q10. Cooldown window is fixed at 60 seconds or configurable per business?

- **Impact:** Product flexibility vs complexity.
- **Default recommendation:** Fixed at 60 seconds in MVP.

### Q11. Can one customer earn multiple rewards in one scan if thresholds overlap?

- **Impact:** Reward calculation logic.
- **Default recommendation:** Return all matched rewards or highest threshold only; lock this explicitly (preferred: all exact threshold matches for current count).

### Q12. What happens when reward rules are edited mid-day?

- **Impact:** Determinism and support expectations.
- **Default recommendation:** New scans use latest active rules only; no retroactive recalculation.

## 5) Idempotency and Reliability

### Q13. Should API support idempotency keys at launch?

- **Impact:** Double-increment prevention under network retries.
- **Default recommendation:** Add in v1.1 if not in MVP launch.

### Q14. What transaction boundary is required?

- **Impact:** Consistency under partial failure.
- **Default recommendation:** Wrap upsert + scan log + reward lookup in one DB transaction.

### Q15. Retry strategy from widget?

- **Impact:** User experience and accidental duplicates.
- **Default recommendation:** No automatic retries for non-network errors; one controlled retry button for users.

## 6) Data Retention and Compliance

### Q16. How long should `scans` and `customers` data be retained?

- **Impact:** Storage growth, privacy policy, legal exposure.
- **Default recommendation:** Retain indefinitely in MVP; define policy before scale.

### Q17. Is there a deletion/anonymization requirement?

- **Impact:** Compliance obligations.
- **Default recommendation:** Not in MVP unless contractually required.

### Q18. What PII protections are required beyond DB access control?

- **Impact:** Security and trust.
- **Default recommendation:** Encrypt at rest via managed DB defaults; restrict admin/API access by least privilege.

## 7) Monitoring and Incident Response

### Q19. What are launch-blocking alert thresholds?

- **Impact:** On-call readiness.
- **Default recommendation:** Alert on sharp spikes in 4xx, token-specific scan bursts, and sustained 5xx.

### Q20. Which metrics are mandatory for v1 launch?

- **Impact:** Debuggability.
- **Default recommendation:** accepted/rejected scans, cooldown hits, invalid token count, origin rejection count, reward trigger count, P95 latency.

### Q21. Who owns incident triage between product and engineering?

- **Impact:** Response speed.
- **Default recommendation:** Engineering primary during MVP pilots.

## 8) Vendor Experience and Support

### Q22. Minimum vendor integration requirements?

- **Impact:** Onboarding speed.
- **Default recommendation:** server-side token injection + container div + script include; no custom JS required.

### Q23. Should widget support deep theming in MVP?

- **Impact:** Scope and visual consistency.
- **Default recommendation:** Limited theme inputs only (labels/colors), defer full theming.

### Q24. How are integration errors surfaced to vendors?

- **Impact:** Support burden.
- **Default recommendation:** Widget console warnings + docs troubleshooting matrix.

## Decision Log Template

Use this template for each resolved question:

```md
### Decision: <short title>
- Date:
- Owner:
- Chosen option:
- Reason:
- Consequences:
- Follow-up tasks:
```

## Immediate Pre-Implementation Decisions to Lock (Priority)

1. Q4/Q5: allowed origin model (single vs multi + strictness)
2. Q7: phone normalization policy
3. Q10/Q11: cooldown and reward trigger semantics
4. Q14: transaction boundary
5. Q19/Q20: launch observability minimums
