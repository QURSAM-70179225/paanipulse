# Changelog

All notable changes. Dates are 2026.

## [Unreleased]
- Land units: farmers and installers can enter land in acre, kanal, marla, murabba or ghumaon (stored in acres, shown in the farmer's unit). Fertiliser for your land: the farmer enters the rate from a soil test or officer; the app totals it for his area, splits the urea and times doses with irrigation, holding a dose if heavy rain is forecast. Migration `land_unit_fert_plan`. See `docs/LAND_UNITS_AND_FERTILISER.md`.
- Optional soil probe (software side, no hardware): `POST /api/soil`, `GET /api/farms/{id}/soil`, a "Soil now" card with a cross-check against the water-balance model, `npm run simulate:soil`, and a `SoilReading` table (migration `20261120072719_soil_readings`). See `docs/SOIL_SENSOR.md`.
- Docs: business plan (`BUSINESS_PLAN.md`): value-based pricing, revenue wheels, cost model, unit economics, ROI, phases, KPIs, assumptions register, Australia comparison.
- Docs: simple 7-slide pitch deck (cover with name and logo, problem, idea, existing solutions, what is built, features, close; no demo slide) in `docs/slides/`.
- Docs: 3-minute pitch deck (PPTX and PDF, 7 slides) and 5-minute mentor deck (10 slides plus 6 hidden appendix slides), both with speaker notes, in `docs/slides/`.
- Docs: demo video (2:30, voice-over, spoken question and answer, role sign-in scenes) and live-site screenshots; mentor session prep; pitch deck outline and video storyboard.
- Sign-in page: large role cards (Farmer / Installer / Irrigation Dept); `?as=installer|authority`; home page links for installers and the department.
- Weather: OpenWeatherMap as a backup provider (`OPENWEATHER_API_KEY`) with estimated ET₀ and sunlight, clearly labelled.
- Bucket test accepts the solar controller's kW reading (more accurate than the sunlight estimate).
- Weather: failure reason shown in `/api/health?full=1`; one retry; `npm run weather:prime` stores real weather from a laptop.
- Docs: bucket-test field guide; printable QR card.
- Offline mode: last advice saved on the phone and shown by the offline page; pump-hour reports queue offline.
- Pump timer with loud alarm and full-screen "switch the pump off"; over-run warning on the live meter.
- Opt-in daily advice and pump over-run alerts by SMS / WhatsApp; hours API accepts today with `add`.
- Weather: hourly temperature, humidity, wind and rain chance for the next 24 hours; the weather card refreshes
  itself while the app is open; cache shortened to 30 minutes; optional `WEATHER_CACHE_MINUTES` and `OPEN_METEO_BASE_URL`.

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
