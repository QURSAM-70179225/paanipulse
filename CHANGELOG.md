# Changelog

All notable changes. Dates are 2026.

## [Unreleased]
- Water awareness card "Where does the water go?" on the farm page: a picture of the water level underground falling as the pump runs, the farm's own wasted water this week shown as drums of 200 L (with the urea lost), and one short tip a day. It quotes no area-wide statistics; the numbers are the farm's own. Has a voice note in Urdu, English and Punjabi.
- Pictures you understand without reading: each feature card (pump control, pump control box, soil probe, pump timer, live meter, bucket test, fertiliser, farm location) opens with a small drawing of how it works, for example sun, solar panel, motor with SIM box, signal to the phone. Inline SVG, works offline, with a spoken-style label for screen readers. Some visible text shortened; details stay under More info.
- About page: new "PaaniPulse in short" section in Urdu and English: the problem, how we solve it, who the customer is, how farmers manage today and what is missing, why PaaniPulse is different, and how it earns.
- Farm location from the field: sign-up often happens at home, so a farm that has only its district centre shows a "Where is your field?" card with one button, "I am at my farm: save this spot". The phone GPS fix is checked (inside Pakistan, accuracy within 150 m, within 120 km of the district) and becomes the farm location, so weather and rain are for that field. Until then a weekly SMS reminder goes to farmers who get SMS advice. New Farm fields locationSource, locationSetAt, lastLocationReminderAt (migration farm_location_source; existing farms with a place picked at sign-up are marked "signup").
- Help for farmers without hardware: the Soil probe and Pump control box cards show Call and WhatsApp buttons (with a ready message in the farmer's language) when nothing is linked. Numbers come from SUPPORT_PHONE and SUPPORT_WHATSAPP; nothing shows until one is set.
- Pictures instead of sentences: a soil-water bar on the advice card, a three-block confidence meter, pumped vs needed bars on the weekly waste card, one sun per sunny hour, and a bar per spare-sunshine idea. The replaced sentences stay under More info.
- Business: two more revenue wheels that need no farmer subscription (hardware margin through vendors, telecom package share), in BUSINESS_PLAN.md section 6b and the Business Report.
- Simpler farm page: explanations ("theory") are folded behind a "More info" / "مزید معلومات" button on every card, so each card shows only what the farmer needs to act; the advice card keeps the headline, next watering and confidence level visible. Every feature card now has a Listen button: new voice notes in Urdu, English and Punjabi for Pump control, Pump control box, Pump timer, Live meter, Soil probe, Soil now, Last 7 days, Fertiliser, Bucket test and Field check.
- Pump auto-stop made clear: the Pump control card shows "The motor stops by itself" with "when the time you set is over" (always on) and "when the soil is wet enough" (on by default when a pump box is linked; needs a soil probe). With a pump box linked, the phone-only Pump timer card is hidden.
- The soil probe and the pump control box now have separate cards on the farm page: "Soil probe (SIM)" and "Pump control box (SIM)" (under Pump control, where the farmer switches the motor on and off from anywhere). Each card only links its own kind of device; a code typed in the wrong card is refused with a message saying which card it belongs in.
- SIM devices replace Bluetooth: the soil probe and the pump control box each have their own SIM and are linked once by typing the code printed on the box ("SIM devices" card). They report over 4G, 3G or 2G wherever the farmer is; the probe keeps up to 2 days of readings while offline and sends them later with their real times. Each device has its own secret (`npm run device:new`); the server takes the farm from the link. Remote pump control is no longer an experiment: it is on for every farm that links a pump box (with a safety checklist), and `PUMP_CONTROL_ENABLED=false` is now only an emergency switch. On a failed check-in the box keeps its state but still stops at its own stop time. Removed: the Bluetooth probe card and sketch, the Wi-Fi bench sketch, the installer-only enable endpoint, and the phone relay upload. New SIM firmware for both devices (not yet compiled or run on hardware). Migration `sim_devices`. See `docs/SIM_DEVICES.md`.
- Voice guide for farmers: a one-minute voice note explaining the whole app (dismissible card on the farm page, a "How to use" header button, and a public `/guide` page with every feature written out in Urdu and English). The assistant now also answers how to use any feature through a new `getAppGuide` tool, and still refuses unrelated topics. Voice uses the neural voice if configured, then `public/audio/guide-ur.mp3` / `guide-en.mp3` if present, then the phone's own voice. See `docs/GUIDE_AND_ASSISTANT.md`.
- Several farms in one account (up to 10): optional farm name, a farm switcher and "Add a farm" in the farm header, and a My farms overview (`/farmer/farms`) showing each farm's advice, pump and probe. The Soil probe and Pump control cards are now always visible, dull when nothing is connected. Each farm's pump and probe are controlled separately. Migration `farm_nickname`. See `docs/MULTI_FARM.md`.
- Crop variety and ripening time: the farm form offers a short list of seed names per crop (or "other" with a typed name) and a ripening time (normal, early, late). The name is recorded; only the ripening time changes the calculation, by a rough 10% shift of the growth stages. Existing farms unchanged. Migration `crop_variety`. See `docs/VARIETIES.md`.
- Remote pump control (prototype, gated by `PUMP_CONTROL_ENABLED`, off by default): start for a set time, stop at once, automatic stop when a soil probe shows enough water (stop only, never start), a hard stop time enforced by the control box, installer-only enabling, audit log, simulated control box (`npm run simulate:pump`) and a bench relay sketch. Not connected to any real pump. Migration `pump_control`. See `docs/PUMP_CONTROL.md`.
- "Enough water" alert: when a soil probe shows the soil got wetter and is now near field capacity, the farmer gets one SMS (opt-in, at most one every 3 hours) and the Soil now card shows a banner, so he can go and switch the pump off. 4G probe firmware sketch (untested on hardware), `--scenario filling` in the soil simulator, migration `farm_full_alert`. See `docs/FIELD_FULL_ALERT.md`.
- Docs: `docs/CUSTOMER_AND_SCOPE.md` (customer segments, business type, scope, risks, the "ready to buy" ladder and next experiments).
- Water chart (look-up, open loop): public `/water-chart` page and `npm run water:chart`; soil type (sand, sandy loam, loam, clay) in farm set-up and in the daily advice (default loam, so existing farms are unchanged; migration `soil_type`). Cost comparison of open loop versus sensor-based in the business plan. Mentor-feedback status in `docs/OPEN_LOOP_AND_RISK.md`.
- Open loop and risk: the farmer dashboard and voice note now say how much water to give the field (mm, acre-inch, m³ for the farm's area, pump hours). Forecast rain now skips an irrigation only with a 1.5× margin, a safe buffer, real weather and no critical growth stage; otherwise "water today to be safe". New "how sure is this advice" line (high / medium / low). Chat no longer says a forecast removes the need to irrigate. Design and risk notes in `docs/OPEN_LOOP_AND_RISK.md`.
- Land units: farmers and installers can enter land in acre, kanal, marla, murabba or ghumaon (stored in acres, shown in the farmer's unit). Fertiliser for your land: the farmer enters the rate from a soil test or officer; the app totals it for his area, splits the urea and times doses with irrigation, holding a dose if heavy rain is forecast. Migration `land_unit_fert_plan`. See `docs/LAND_UNITS_AND_FERTILISER.md`.
- DIY Bluetooth soil probe (prototype): ESP32 sketch in `hardware/esp32-soil-probe/`, a "Connect probe" card using Web Bluetooth (Chrome on Android) with an offline queue, and an authenticated `POST /api/farms/{id}/soil`. Tested with a mocked Bluetooth device; firmware not yet tested on hardware. See `docs/SOIL_PROBE_DIY.md`.
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
