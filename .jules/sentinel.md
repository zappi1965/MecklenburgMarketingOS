# Sentinel Security Journal

## 2026-06-24 - Rate Limiting & Header Hardening
**Vulnerability:** Public endpoints like `/api/public/package-inquiry` were missing specific rate limits, making them targets for automated spam. Redundant and partially incomplete security header middleware existed.
**Learning:** Helmet (v7 in this repo) handles many headers, but `permissions-policy` needs to be applied via its own middleware or correctly configured sub-key.
**Prevention:** Always use centralized security hardening middleware and ensure public-facing forms have strict rate limits.
