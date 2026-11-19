> **Note:** this is the original build specification (decisions from the hackathon planning phases). It is kept as
> history. For the current system see [ARCHITECTURE.md](../ARCHITECTURE.md) and
> [PRODUCT_ESSENTIALS.md](../PRODUCT_ESSENTIALS.md); where they differ, those two win (for example, the database is now
> PostgreSQL, not SQLite).

# PaaniPulse — Revised Build Spec (v2, after Phases 1–5)

This replaces the original build prompt PDF wherever they differ.

## Team
- Qursam Bibi, Muzammil Hussain (2 people)

## Positioning
- **Hackathon:** LUMS CfE × OGDCL CleanTech Hackathon 2026
- **Primary theme:** Renewable & Alternative Energy (supporting: Energy Storage & Efficiency, Energy Finance & Business Model Innovation)
- **Pitch line:** "Solar made pumping free. PaaniPulse makes it smart."
- **Value prop:** We help newly-solarised wheat–rice farmers in central Punjab save fertiliser and turn spare
  sunshine into income by telling them — in a daily Urdu voice note — exactly when to run their pump and when to
  keep it off, without installing a single meter.

## ICP
- **User:** wheat–rice farmer, 5–25 acres, solarised 7.5–20 kW submersible in the last 2–3 years, flood irrigation,
  WhatsApp voice-note user. Districts: Sheikhupura, Gujranwala, Hafizabad, Narowal (incl. Shakargarh tehsil), plus
  Sargodha, Okara, Kasur for the regional map.
- **Customers:** solar installers (onboard at point of sale) → aarhtis / input dealers (ongoing channel) →
  lenders → Punjab Agriculture / Irrigation Dept (scale; data buyer). Farmer: free first 1–2 months, optional
  Rs 200–500/month later (hypothesis).
- **Farmer-facing framing:** "khaad aur fasal bachao" (save fertiliser & crop) + spare-solar income.
  Groundwater/energy framing is for the authority view and the pitch.

## Golden path (must run reliably in < 90 s)
1. Karamat's WhatsApp-style feed: **"Kal aap ne X ghantay chalaya — gandum ko Y ki zaroorat thi"**
2. **"Aaj pump band rakhein — agli baari ~N din baad"** (or "Aaj X ghantay chalayen") + ▶ Urdu voice note
3. This week saved: khaad (kg, estimate) · Rs · kWh
4. Chat: "kal barish hogi?" / "aaj kitne ghantay pump chalaun?" → grounded answer (same numbers as dashboard)
5. Authority map: 150+ farms, district hotspots, **MWh solar wasted**, export CSV

## Engine changes vs original prompt
1. **Soil-water balance (FAO-56 ch. 8, simplified bucket)** replaces "daily hours" as the primary advice.
   - TAW = (θFC − θWP) × Zr; default θFC−θWP = 140 mm/m (loam); Zr grows linearly from 0.3 m at sowing to crop max
     (wheat 1.2 m, rice 0.5 m, maize 1.0 m, cotton 1.2 m, sugarcane 1.2 m) by end of dev stage.
   - RAW = p × TAW (wheat p 0.55, rice 0.20, maize 0.55, cotton 0.65, sugarcane 0.65).
   - Dr(today) = Dr(yesterday) + ETc − effective rain − net irrigation (pumped × efficiency); clamp 0…TAW;
     water applied above TAW counts as **excess / deep percolation**.
   - If Dr ≥ RAW → irrigate: hours = (Dr / irrigation efficiency × area) ÷ expected hourly flow, rounded to 0.5 h,
     clamped 0–12 per day (multi-day if needed: "aaj X ghantay, phir kal").
   - Else → "keep pump off"; days until next irrigation = (RAW − Dr) / forecast ETc (use 7-day forecast).
   - Rice while flooded keeps the daily-need model (ETc + percolation − effective rain).
2. **Static water level ≠ bore/pipe depth.** Pump model takes `staticDepthFt` (water level) — onboarding copy must
   ask for "pani kitne foot par hai" not "bore kitna gehra hai".
3. **Flow shown as a range** (η ± 0.08 uncalibrated, ± 0.03 calibrated) with calibrated/default badge.
4. **Spare solar** = PV energy available on the day − energy actually used by pump. On "pump off" days this is the
   whole day's PV yield → biggest PKR number in the demo.
5. Over-pumping vs need is computed against crop water use (gross equivalent), consistent with the water balance.

## Demo farm (seed) — honest numbers
- Karamat, Muridke (Sheikhupura), 31.80 N 74.26 E, **12.5 acres ("aadha murabba")**, **wheat**, sown **today − 13 days**
  (after a pre-sowing "rauni" irrigation that filled the profile), flood irrigation.
- Pump **15 kW**, PV **20 kWp**, **static water level 90 ft** (bore/pipe at 200 ft; deepened from 120 ft 3 years ago
  at ~Rs 1.5–2 lakh — pitch hook), drawdown 3 m, η 0.40 default.
- Head ≈ (27.4 + 3) × 1.1 ≈ 33.5 m → full-power flow ≈ 66 m³/h; ≈ 0.23 kWh per m³ pumped.
- November Lahore climatology (until live data): ET₀ ≈ 2.0 mm/d, little rain, daily GHI ≈ 3.3 kWh/m² (smog season).
  Wheat Kc ini 0.4 → ETc ≈ 0.8 mm/d → ~ 40 m³/day net crop use on 12.5 acres.
- Expected honest advice mid-November: **"Aaj pump band rakhein — agli baari ~1–2 hafte baad"** (first wheat irrigation
  around crown-root initiation, ~20–25 days after sowing — matches local agronomy).
- History: farmer ran ~4–6 h on most days "kyunke dhoop muft hai" → pumped ≈ 2× crop water use (matches interview Q3).
- All dates in the seed are **relative to today**, so the demo stays coherent on hackathon day.

## Scope (MoSCoW)
- **MUST:** engine + tests; weather + cached fallback; farm dashboard (golden path 1–3); cached Urdu mp3 for the
  daily advisory; chat (Groq tools + template fallback); authority dashboard (heatmap, district/crop filters, KPIs incl.
  MWh wasted, CSV); seed (Karamat + 150 synthetic, 7 districts, clearly labelled "Simulated demo data").
- **SHOULD:** bucket-test calibration; telemetry simulator ("installer upgrade"); /about methodology; minimal landing;
  one-line data consent ("Aap ka data aap ka hai — sirf zila level par, bina naam ke share hoga").
- **COULD:** one-page onboarding form; live Azure TTS for every chat reply.
- **Added after Phase 5 (team decision):** full Urdu / English switch (Urdu = RTL + Nastaliq) on landing, dashboard and chat.
- **WON'T (roadmap slide):** Twilio WhatsApp, telemetry CSV upload, Postgres,
  Punjabi voice, multi-field farms.

## Milestones
1. Scaffold + schema + seed (farms/pumps/pump-hours history) + minimal landing
2. Engine (FAO-56, water balance, pump physics Mode A/B, calibration, savings) + Vitest; seed computes DailyRecords
3. Weather service (Open-Meteo + 1 h cache + DEMO_MODE fallback) + farm dashboard (golden path 1–3)
4. Chat (Groq tool calling, template fallback) + daily advisory (Urdu / Roman Urdu / English) + cached mp3
5. Authority dashboard
6. Extras: simulator, bucket test UI, /about, landing polish; `npm run build` + `npm test` green; record backup video

## Known risks
- `llama-3.3-70b-versatile` was retired on Groq; using `openai/gpt-oss-120b` (tool calling). Free tier: 8k tokens/min →
  retry on `gpt-oss-20b`, then rule-based fallback. Every AI answer is checked: numbers must come from tool outputs.
- Open-Meteo free tier is rate-limited per IP (hit during dev on a shared IP) → DEMO_MODE cache is mandatory, and
  refresh `data/sample-weather.json` with a real response before the event.
- Browser Urdu TTS missing on many laptops → pre-generate the advisory mp3.
- Interview answers (10 questions) are from a real farmer contact — keep the raw notes; ask permission before
  quoting by name in the pitch.

## Added after Milestone 6 (team decision)
- PostgreSQL (Neon) + Vercel deployment; DB-backed weather/audio caches; migrate + seed-if-empty on build
- Accounts: farmer (phone + PIN), installer and authority (email + password; authority needs invite code)
- 4-step farm onboarding; installer portal (register farmers at point of sale)
- Urdu voice input (Groq Whisper); daily 06:00 advisory job (Vercel Cron) + farmer hour reports
- Wheat crown-root (CRI) first-irrigation rule, only when the soil has started drying
- Printable well report for lenders / installers (anonymised for lenders)
