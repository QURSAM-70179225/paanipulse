# Changelog

All notable changes. Dates are 2026.

## [0.1.0] hackathon release (November 2026)

### Core
- Irrigation engine: FAO-56 crop water need, soil-water balance, pump physics (sunlight and drive-telemetry modes),
  bucket-test calibration, savings estimates, wheat crown-root first-irrigation rule. Unit-tested.
- Farmer dashboard: yesterday vs need, today's advice, weekly waste, 7-day chart, spare-sunshine income ideas,
  live weather now, pump output in litres per minute and area per hour, live meter.
- Urdu / English throughout (right-to-left, Nastaliq).
- Urdu voice notes (neural TTS, recorded file or browser voice) and Urdu voice input (Whisper).
- WhatsApp-style AI chat with tool calling, number guardrail and rule-based fallback.

### Platform
- PostgreSQL (Neon) with migrations; seed only when the database is empty.
- Accounts for farmers (phone + PIN), installers and authorities (email + password); role-based access.
- Farm onboarding, installer portal, PIN reset by installer or SMS/WhatsApp code, email reset for installers/officials.
- Authority dashboard: heatmap, filters, KPIs, district table and chart, anonymised CSV export (simulated data).
- Printable per-well report for lenders; meter field checks; telemetry API and simulator.
- Daily 06:00 advisory job; installable web app (PWA) with offline page.
- Deployment: Render + Neon, GitHub Actions schedules, health diagnostics at `/api/health?full=1`.

### Known gaps
- Not yet validated against a real flow measurement or with real farmers (see PRODUCT_ESSENTIALS.md).
- Regional data is simulated.
