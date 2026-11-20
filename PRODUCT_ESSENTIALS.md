# PaaniPulse: Product Essentials

> **Solar made pumping free. PaaniPulse makes it smart.**
>
> A virtual water and energy meter plus a daily Urdu irrigation advisor for solar tube wells, with no extra hardware.

Hackathon: LUMS Centre for Entrepreneurship × OGDCL CleanTech Hackathon 2026
Theme: **Renewable & Alternative Energy** (supporting: Energy Storage & Efficiency, Energy Finance & Business Model Innovation)
Team: Qursam Bibi, Muzammil Hussain
Status: working prototype, deployed; **not yet piloted with real farmers** (see [Validation status](#6-validation-status-be-honest-about-this))

---

## 1. The problem

Pakistan has added solar tube wells at speed. Once the panels are paid for, **each extra hour of pumping costs nothing**, so there is no price signal telling a farmer to stop. Nobody measures how much is pumped, so neither the farmer nor the government can see the effect on the aquifer.

| Claim | Evidence | Confidence |
|---|---|---|
| About **650,000 solar tube wells** in Pakistan, about **250,000 added since 2023** | Expert estimate reported by Reuters, Dawn and Geo | An estimate, not a census. Say "an estimated". |
| In **77% of 30 matched farm pairs**, the solar farm extracted more water than a comparable diesel farm | Journal of Agriculture and Food Research, April 2025 | Peer-reviewed, but a small sample |
| Running cost per acre is roughly Rs 3,000 (diesel), Rs 1,500 (grid), Rs 50 (solar) | Punjab government figures quoted at the 2025 solarisation launch | Government claim |
| The Punjab solarisation scheme targets about 8,000 more tube wells with Rs 9 bn | Government announcements, 2025 (figures differ slightly between outlets) | Reported |
| Punjab has **no metering** of groundwater; the Water Act 2019 commission and volumetric pricing are not operating | Dawn, Friday Times, 2025 study | Reported |
| The power minister says solar is not depleting groundwater; Punjab says it is "still studying" | Reuters / Dawn | **The debate cannot be settled because nobody measures.** |

Avoid quoting "water table falls ~1 m a year": the common figures are for **Indian** Punjab.

### What it costs

- **Farmer:** fertiliser washed below the roots, waterlogging and yield loss in some crops, and ever-deeper bores (a farmer we spoke to had to deepen a bore from about 120 ft to 180–200 ft at roughly Rs 1.5–2 lakh).
- **Society:** an aquifer being drawn down that nobody can price or regulate.

## 2. Who it is for

**User (daily):** a rice–wheat farmer in central Punjab (Sheikhupura, Gujranwala, Hafizabad, Narowal incl. Shakargarh), 5–25 acres, who installed a 7.5–20 kW solar submersible pump in the last 2–3 years, irrigates by flooding, and uses WhatsApp voice notes. Low literacy is expected: Urdu, voice in and voice out.

**Customers (who pays):**

| Customer | Why they pay | Priority |
|---|---|---|
| **Solar installers / dealers** | After-sales service and a reason to choose them; fewer warranty problems from dry running | First |
| **Aarhtis and input dealers** | They stay in touch with the farmer and are repaid from the crop, so they want good yields | Channel |
| **Lenders** | Proof the financed pump works, plus income data for repayment | Second |
| **Punjab Agriculture / Irrigation Dept** | Water accounting for subsidised wells; makes the Water Act workable | At scale |

Farmers use it **free** at first. A farmer premium of about Rs 200–500 a month is a hypothesis to test after they see the value, not a plan.

## 3. The solution

| Pillar | What PaaniPulse does |
|---|---|
| **Measure** | Estimates litres pumped from pump specs, sunlight and run-hours (or from the solar drive's own power readings). A 5-minute bucket test calibrates it to the pump. |
| **Advise** | Computes the crop's real water need (FAO-56) and a soil-moisture balance, then tells the farmer in an Urdu voice note whether to run the pump today or keep it off. |
| **Earn / save** | Turns the hours not pumped into saved fertiliser, saved solar energy and the income that energy could earn (battery charging, grain drying, cold storage). The farmer gets a private reason to pump less. |
| **Map** | Aggregates anonymised, district-level data for authorities and lenders, with CSV export and a per-well report. |

### Why earlier approaches fell short

| Approach | Gap | PaaniPulse |
|---|---|---|
| Advisory apps and SMS (e.g. BaKhabar Kissan, PCRWR) | Advice with no measurement of what this well actually pumped | Closes the loop per well: "yesterday you ran 6 h, the crop needed 0" |
| Brand-locked drive monitoring (Lorentz, Shakti, Antares) | Needs hardware and a fee, reports kW and faults, not litres against crop need | Works with any brand; the drive is an optional upgrade |
| Flow meters / SCADA | Hardware per well; municipal use; cannot reach 650k farms | No hardware |
| "Save groundwater" campaigns | Saving helps everyone but costs the farmer | Gives the farmer a private reward |
| Regulation | Assumes measurement that does not exist | Supplies the measurement, from the bottom up |

## 4. What is built

| Area | Status |
|---|---|
| Crop water need, soil-water balance, pump physics, savings (unit-tested, 60 tests) | Built |
| Farmer dashboard: yesterday vs need, today's advice, weekly waste, 7-day chart, spare-sunshine income ideas, live weather, pump output (L/min, area per hour) | Built |
| Urdu / English across the app (Urdu is right-to-left with a Nastaliq font) | Built |
| Urdu voice note (neural TTS when configured, recorded file or browser voice otherwise) and Urdu voice input (Whisper) | Built |
| WhatsApp-style AI chat with tools and a number guardrail; rule-based fallback | Built |
| Bucket-test calibration and meter field checks | Built |
| Live meter from pump-drive telemetry (API, CSV upload, simulator) | Built (simulated data source) |
| Accounts: farmer (phone + PIN), installer and authority (email + password); PIN reset by installer or by SMS/WhatsApp code | Built |
| Farm onboarding, installer portal (register farmers) | Built |
| Authority dashboard: heatmap, filters, KPIs, district table, CSV | Built, **on simulated data** |
| Per-well report for lenders (printable, anonymised for lenders) | Built |
| Daily 06:00 advisory job | Built (GitHub Actions or Vercel Cron) |
| Installable web app (PWA); **offline mode**: last advice is saved on the phone and shown with no internet, reports are queued and sent later | Built |
| **Pump timer with loud alarm** ("switch the pump off now"), works with no internet; **over-run warning** on the live meter | Built |
| **Daily advice by SMS / WhatsApp** and a **"pump ran too long" text** (drive-connected farms), opt-in, one message a day | Built (needs a Twilio account; costs per message) |

### What is simulated or assumed

- The **150 regional wells are simulated** and labelled as such. Rankings between districts (e.g. Narowal worst) come from the simulation, not from field data.
- Karamat's farm is a **demo farm** modelled on a real farmer interview, not a connected farm.
- Weather falls back to a **sample** when Open-Meteo is unreachable; the badge says so.
- Fertiliser and income figures are **estimates**, labelled as such.
- Pump-drive telemetry in the demo comes from a **simulator**.

## 5. Principles

1. **Code computes, AI speaks.** Every number comes from deterministic, tested code. The AI can only fetch numbers through four tools, and an answer containing any number not returned by a tool is replaced by a rule-based answer.
2. **Honest ranges, not false precision.** Flow is shown as a range with a "default estimate / calibrated" badge.
3. **The farmer owns the data.** Authorities see only district-level, anonymised data from farms that consented; locations are blurred to about 1 km.
4. **Works when the network does not.** Cached weather, template messages and a recorded voice note keep the demo alive.

## 6. Validation status (be honest about this)

| Question | Status |
|---|---|
| Do farmers over-pump after going solar? | One real farmer interview says yes ("about double"). One peer-reviewed study supports it. **No data of our own yet.** |
| Is the virtual meter accurate? | Physics is standard and unit-tested. **Not yet checked against a real flow measurement.** The in-app field check exists to do this. |
| Will farmers follow a daily voice note? | Interview: yes if it is simple Urdu/Punjabi and explains fertiliser savings. **Untested.** |
| Will installers pay? | Interview points to the installer or aarhti paying. **No installer has agreed.** |
| Wheat first-watering timing (20–25 days after sowing) | Standard Punjab practice, built as a rule. **Not yet confirmed locally.** |

### The pilot that closes these gaps (1–2 weeks)

1. Do a drum-and-stopwatch field check on one real pump and record predicted vs measured flow.
2. Onboard the farmer contact and 5–10 neighbours (installer-registered), free.
3. Track: farmers who open the advice, hours reported, and **pump hours before vs after** (the behaviour-change number).
4. Collect one letter or message of interest from a solar dealer or aarhti.
5. Get one agronomy check of the wheat timing.

## 7. Business model (hypotheses to test)

> The full business plan (pricing, costs, ROI, phases, KPIs) is in [BUSINESS_PLAN.md](BUSINESS_PLAN.md).

- **Installers:** about Rs 1,000–2,000 per pump per year, bundled into the sale or service.
- **Lenders / government:** per-well annual fee for verified use and regional data.
- **Farmers:** free; optional premium later.
- **Channel:** installers register farmers at the point of sale; aarhtis and input dealers stay in touch.

## 8. Roadmap

| Next | Later |
|---|---|
| Field validation of the meter; real pilot farms | Smart relay or timer fitted by installers so "keep the pump off" can be enforced, with the farmer's permission |
| Local SMS provider (cheaper than Twilio); WhatsApp delivery of the daily voice note; background push alerts | Multiple fields and pumps per farm |
| Crop-stage rules for rice, maize, cotton, sugarcane | Punjabi voice; more crops and regions |
| Real drive integrations (Modbus / vendor APIs) | Satellite soil-moisture cross-checks |

## 9. Risks

| Risk | Mitigation |
|---|---|
| Meter accuracy challenged | Show ranges; bucket-test calibration; publish field-check results |
| Farmers fear a water tax | Farmer-owned data, anonymised district view, savings-first language |
| Nobody pays | Installer channel tested early; lender report as a second revenue path |
| Advice followed incorrectly | The pump is switched at the breaker by the farmer. The app can warn (timer alarm, SMS) but **cannot switch the motor off**; a smart relay or timer fitted by the installer is the real fix |
| Patchy village internet | Offline advice page, queued reports, SMS fallback, a recorded or phone voice. **Limits:** the timer alarm needs the app open and the phone awake; over-run SMS needs a connected drive |
| Free-tier limits (weather, AI) | Caching and fallbacks at every external dependency |

## 10. Sources

- [Dawn: How solar-powered farming is digging Pakistan into a water catastrophe](https://www.dawn.com/news/1946104)
- [Geo: Solar-powered farming digging Pakistan into a water catastrophe](https://www.geo.tv/latest/626604-solar-powered-farming-digging-pakistan-into-a-water-catastrophe)
- [Journal of Agriculture and Food Research (Apr 2025): solar vs diesel groundwater extraction](https://doaj.org/article/0152eb507c7e41b09f5e46d49f2548cc)
- [ScienceDirect: diesel to solar transition and groundwater extraction, Lower Indus Basin](https://www.sciencedirect.com/science/article/pii/S266615432500170X)
- [Friday Times: Punjab's Solar Tubewell Push: A Water Crisis In The Making](https://www.thefridaytimes.com/04-Jun-2025/punjab-s-solar-tubewell-push-a-water-crisis-in-the-making)
- [Business Recorder: CM inaugurates solarisation of agricultural tube wells](https://www.brecorder.com/news/40345871)
- [BaKhabar Kissan](https://bkk.ag/about-us), [PCRWR irrigation advisory](https://dialogue.earth/en/water/satellites-and-sms-help-pakistans-farmers-with-smart-irrigation/), [LORENTZ Global](https://partnernet.lorentz.de/files/datasheet-lorentz-global-and-ps-commander_en.pdf)
- FAO Irrigation and Drainage Paper 56 (Allen et al., 1998); [Open-Meteo](https://open-meteo.com/)
