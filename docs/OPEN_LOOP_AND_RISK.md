# Open loop, field-specific advice, and managing risk

This page records a design decision and the safeguards that follow from it. In short: **PaaniPulse advises; the
farmer decides and acts.** Because a wrong instruction can damage a field and ruin a farmer, reliability matters more
than cleverness. Each section says what is **built**, what is **planned**, and what is **not yet known**.

---

## Mentor feedback: where each point stands

The mentors (Dr. Usman and Dr. Salman) praised the app and had one main criticism: **be more open loop**. Their points and the status:

| Mentor point | Status |
|---|---|
| Closed loop needs too much data, must be very reliable, and costs more | **Agreed.** The core advice already works with no sensor: it uses crop, sowing date, area, method, pump and a weather feed. Sensors (pump drive, soil probe) are optional extras. Cost comparison: [BUSINESS_PLAN.md](../BUSINESS_PLAN.md) section 8b. |
| Build **look-up charts** from crop, growth stage, soil type, area and season | **Built** (this branch): the [water chart](WATER_CHART.md) and the public `/water-chart` page. |
| **Output the water quantity** the farmer should apply | **Built**: the chart gives mm, litres and pump hours; the dashboard "Water for your field" gives the same for today. |
| **Soil type** as an input | **Built** (this branch): a soil-type choice in farm set-up (sand, sandy loam, loam, clay), used by the daily advice. Default is loam, the old fixed value, so existing farms are unchanged. |
| Land area | Built. Units (kanal, marla, murabba) are on a separate branch. |
| Season and weather from an API, not hardware | **Built**: Open-Meteo with an OpenWeather backup and offline fallbacks. |
| Keep an **optional** low-cost sensor (hybrid) | **Built as optional**: the soil probe is a second opinion that never changes the advised hours. |
| Use **FAO** methods (Kc × ET₀) | **Built**: FAO-56 throughout; every chart value cites it. |
| Explain the **precision-for-cost trade** and show **cost before and after** | Written: [BUSINESS_PLAN.md](../BUSINESS_PLAN.md) section 8b (hardware prices are illustrative until WIT quotes). The size of the precision loss is **not yet measured**. |

## 1. Open loop, not closed loop

| | **Open loop** (what we do) | **Closed loop** (what we do not do) |
|---|---|---|
| Who acts | The farmer, who switches the pump on and off | A device switches the pump or valve by itself |
| What the app does | Measures, calculates and tells the farmer **how much water** (and when) | Measures, decides and acts without a person |
| Data needed | Weather, crop, field size, pump, soil defaults | Continuous, accurate sensor data from every field, plus reliable control hardware |
| If the data is wrong | The farmer can see it is wrong and ignore it | The error is carried out automatically |
| Status | **Built** | **Not built, deliberately** |

**Why open loop.** Closed loop needs far more data than we have, and its errors are not visible to anyone. One bad
decision (for example, switching a pump off during a heat spell) could damage a crop. The farmer also knows things the
app cannot: how the field looks today, whether the channel is running, whether it rained overnight.

**What would have to be true before any closed loop** (smart relay, valve control). All of these:
1. Measured meter error on real pumps, within a stated band (field checks, not simulation).
2. Advice checked against an agronomist on real fields across a full season, with the miss rate recorded.
3. Soil-probe or telemetry data on those fields, with calibration (see [SOIL_SENSOR.md](SOIL_SENSOR.md)).
4. A farmer-controlled override and a safe default if the app or the network fails (pump stays under farmer control).
5. Written sign-off from an agronomist and the installer, and insurance or liability terms agreed.

Until then, the "smart relay" in the roadmap is a **pilot with the farmer's permission**, not a product.

---

## 2. "How much water do I give my field?"

The farmer should not only hear "run the pump 5 hours". Different fields need different amounts, so on an irrigation day
the app now states the water in field terms (**built**):

> **Water for your field.** Give about **45 mm** of water (1.8 acre-inch). For your **12.5 acres** that is about
> **2,300 m³** (2,300,000 litres). *This is a guide, not a command. Look at your field: stop if water runs off or
> stands too long.*

It is shown on the dashboard in Urdu and English, and written into the advisory voice note. The numbers come from the
engine (`netMm`, `grossMm`), not from the AI: net depth = what the soil is short of; field depth = net depth ÷ the
efficiency of the irrigation method (flood 55%, furrow 65%, sprinkler 75%, drip 90%).

### What already makes the answer specific to a field

| Factor | How it enters | Status |
|---|---|---|
| **Field area** (acres) | Total volume = depth × area | Built |
| **Crop** (wheat, rice, maize, cotton, sugarcane) | Crop coefficient and growth-stage lengths (FAO-56); critical stages | Built |
| **Sowing date** | Growth stage, root depth and so water need change through the season | Built |
| **Irrigation method** | Efficiency losses: how much extra to apply | Built |
| **Pump flow** | Converts volume into pump-hours; calibrated by the bucket test | Built |
| **Rain and heat** | Daily weather feeds the soil-water balance | Built |

### What is **not** field-specific yet

| Missing | Why it matters | Plan |
|---|---|---|
| **Crop variety** | Rice and wheat have many varieties with different durations and water needs | See section 3 |
| **Soil type** (sand, loam, clay) | It sets how much water the soil holds; today every field is assumed loam (140 mm per m) | A soil-type choice in farm set-up, with defaults from the FAO-56 range; confirm with a soil test |
| **Several fields or plots** | A farmer's land is rarely one uniform block | One plan per field |
| **Slope, field levelling, unevenness** | Water is not spread evenly | Out of scope for now; the "stop if water runs off" note covers the basics |
| **Local rainfall and soil data** | Our inputs are regional model data | Pilot measurements, soil probe |

---

## 3. Varieties

Today the app knows **crop type only**, and uses typical FAO-56 values. Real varieties differ (for example, short- and
long-duration rice, early and late wheat). We have **no local variety data**, so we will not invent per-variety numbers.

**Planned approach (not built):**
1. Add a **variety or maturity group** to the farm profile (early, medium, late, or "I don't know").
2. Scale the growth-stage lengths by maturity group, within limits set with **extension officers** or the research
   institute. "I don't know" keeps today's typical values.
3. Show "assumes a typical variety" in the confidence note until a variety is chosen.
4. Check the result against farmer-reported irrigation dates in the pilot.

---

## 4. Fertiliser: how much and when

**Built today:** the app estimates how much urea the farmer **lost** to over-irrigation (water carrying nitrogen below
the roots) and shows it per week. It does **not** tell a farmer how much fertiliser to apply.

**Why we do not simply output a dose.** The right dose depends on the crop, variety, soil test, previous crop and
target yield. A wrong number costs money, can burn or lodge a crop, and cannot be undone. We could not confirm an
official per-acre table (the Punjab notice was not reachable from our environment), so the app must not invent one.

**Planned approach (not built):**
- **The dose comes from a soil test or the Agriculture Department / extension officer's recommendation**, entered or
  chosen by the farmer or installer. The app does not overrule it.
- **The app handles timing and splitting**, which is where water and fertiliser meet:
  - Split nitrogen into 2–3 equal doses rather than one large dose, and apply **P and K at sowing** (Punjab Agriculture
    Department wheat advisory, as [reported by Profit](https://profit.pakistantoday.com.pk/2025/02/02/punjab-agriculture-department-issues-advisory-for-wheat-farmers/)).
  - Apply the nitrogen top-dressing with or just before an irrigation, not before an irrigation that would flush it
    below the roots; hold it if heavy rain is forecast. (General agronomic principle; confirm the thresholds with an agronomist.)
  - Show "how much of your last dose was lost" using the existing leaching estimate.
- Every figure shown to farmers must be signed off by an agronomist first.

Sources checked: [Punjab wheat advisory (Profit)](https://profit.pakistantoday.com.pk/2025/02/02/punjab-agriculture-department-issues-advisory-for-wheat-farmers/),
[Agriculture Department Punjab notice](https://punjab.gov.pk/node/5127) (not read; confirm bag rates there).

---

## 5. When the forecast is wrong: "rain is a bet"

**The risk.** A forecast says rain tomorrow, the app says "keep the pump off", and the rain does not come. If the crop
was already close to stress, that mistake costs yield. A farmer should never depend fully on a forecast.

**The rule (built).** Forecast rain can excuse an irrigation only when **all** of these hold. Otherwise the app says
"water today" and explains why:

| Check | Rule | If it fails |
|---|---|---|
| **Data is real** | The weather is live or a recent saved copy, not offline sample data | "Weather data is not live, so do not rely on a rain forecast" |
| **Not a critical stage** | Not in a critical growth window (for example, wheat crown-root stage, 20–25 days after sowing) | Water today |
| **Clear margin** | Forecast rain ≥ **1.5 ×** the water the soil needs, so a smaller shower still refills it | "Rain is forecast, but forecasts can be wrong, so water today to be safe" |
| **Safe if it misses** | If no rain falls, depletion one day later stays within the safe half of the gap between stress start (RAW) and wilting (TAW) | Water today |

**Plan B on a "skip for rain" day.** The advice text says: *"If the rain does not come, check the app tomorrow: it will tell
you to water."* Next morning the app recalculates with the **rain that actually fell**, so a missed forecast turns into
"water now" without the farmer doing anything. The chat assistant no longer says "no need to run the pump tomorrow" when
rain is forecast; it says forecasts can be wrong.

**Why this leans toward watering.** Missing an irrigation at a critical stage can cost yield. Watering a day too early
wastes some water and energy but rarely harms the crop. The app therefore accepts the second error to avoid the first.
This reduces savings a little, which is the price of safety.

**Not yet built:** using a **rain probability** (Open-Meteo offers a daily maximum probability) and a rain-gauge or
satellite check of what actually fell. Adding the probability changes the weather request and needs a live test first.

---

## 6. When local data does not exist

Many places have no weather station, soil survey or yield records. What we use and what it costs us:

| We use | Because | Limitation |
|---|---|---|
| Gridded weather and evapotranspiration (Open-Meteo; OpenWeather as a backup) | Works anywhere, free to start | Regional model, not a local station; the backup *estimates* ET₀ |
| FAO-56 typical crop values | A standard method with published values | Not tuned to local varieties |
| Loam soil by default | We have no soil data | A sandy or clay field behaves differently |
| Calibration by bucket test | Corrects the pump estimate | Only the pump, not the crop or soil |

**Honesty about it (built).** Each day's advice carries a **"How sure is this advice?"** line: *High*, *Medium* or *Low*,
with the reasons: offline sample weather (always *Low*), saved or estimated weather, an uncalibrated pump, yesterday's
hours not reported, or a rain-dependent day. Telemetry from a pump drive removes the pump and hours reasons.

**Planned:** a simple "was this advice right?" tap from the farmer, an agronomist review of a sample of days, and soil
probes for fields that want a second opinion.

---

## 7. Reliability and risk are the business

PaaniPulse's value is that a farmer can trust it. If the advice is unreliable, the product has no value and the farmer
bears the loss. So the business depends on **how reliable the data is, how precise the numbers are, and how risk is
handled**.

### Principles

1. **Do no harm first.** Prefer the error that costs water over the error that costs yield (section 5).
2. **Say how sure we are.** Ranges, a confidence line, and an "estimate" label wherever a number is estimated.
3. **The farmer stays in control.** Advice, not commands. The app cannot switch the pump (and may not, until the gates in section 1 are met).
4. **No invented agronomy.** Doses, variety adjustments and critical-stage rules need local expert sign-off.
5. **Pilot before promise.** No accuracy or savings claim without measured results.

### Risk register

| Failure | Harm | Today's control | Remaining risk and next step |
|---|---|---|---|
| Rain forecast is wrong | Crop stress if watering is skipped | Conservative rain rule, critical-stage block, safe-buffer check, next-day recalculation (section 5) | Forecast error still possible; add rain probability and observed-rain check |
| Weather data is offline or stale | Advice based on sample data | Sample weather never excuses watering; confidence line says *Low* | Source labelled but data still approximate |
| Meter (pump flow) is inaccurate | Wrong hours, wrong savings | Range shown; bucket test; field check | **Not yet measured on a real pump**: first priority |
| Crop variety differs from "typical" | Stage timing off | Critical-stage rule and conservative bias | Variety input and validation (section 3) |
| Soil is not loam | Water-holding wrong | Probe as a second opinion (optional) | Soil-type choice; soil test |
| Fertiliser advice wrong | Burnt or lodged crop, wasted money | **The app gives no dose** | Dose from a soil test or extension officer only |
| Farmer follows advice blindly | A bad day becomes a bad outcome | "Guide, not a command: look at your field" note | Training through installers; feedback tap |
| Probe or telemetry bad data | Misleading cross-check | Probe is a second opinion only, never overrides advice | Calibration per field before any use in decisions |
| Closed-loop automation fails | Crop damage without a human noticing | **Not built** | Gates in section 1 |

### Measures to track (set targets in the pilot)

- **Advice accuracy:** share of days an agronomist agrees with the advice; share of "skip for rain" days where rain
  did not come (the **false-skip rate**) and whether stress followed.
- **Meter accuracy:** error between predicted and measured flow, per pump.
- **Confidence mix:** share of days rated *High / Medium / Low*.
- **Harm events:** any crop-stress report linked to advice. **Zero tolerated without review.**

### Commercial consequence

Installers, lenders and government will only pay for data they can rely on, and a single high-profile failure could end
the product. So the order is: **prove accuracy → pilot with installers → only then add paid tiers or any automation**.
The business plan ([BUSINESS_PLAN.md](../BUSINESS_PLAN.md)) lists reliability and accuracy among its KPIs and risks.

---

## 8. Built versus planned

| Item | Status |
|---|---|
| Open-loop advice (farmer acts) | Built |
| Water to give: depth, volume for the field's area, pump hours | Built |
| Conservative rain-skip rule, plan B text, sample-weather guard | Built, with unit tests |
| "How sure is this advice?" line | Built |
| Chat no longer implies a forecast removes the need to irrigate | Built |
| Soil probe (optional second opinion) | Built on the software side; see [SOIL_SENSOR.md](SOIL_SENSOR.md) |
| Crop variety / maturity | **Planned** |
| Soil-type choice | **Planned** |
| Fertiliser timing and splitting from a farmer-entered dose | **Planned** (needs agronomist sign-off) |
| Rain probability and observed-rain check | **Planned** |
| Farmer "was this right?" feedback and agronomist review | **Planned** |
| Closed loop (smart relay / valve) | **Not built, gated** (section 1) |

## Where the code is

| | |
|---|---|
| Rain rule, water depth | `lib/engine/advice.ts` (`rainVerdict`, `adviseFromBalance`, `adviseFlooded`), settings in `lib/engine/config.ts` |
| Confidence | `lib/engine/confidence.ts` |
| Dashboard | `app/farmer/[id]/page.tsx` (water plan, rain note, confidence line) |
| Advisory text | `lib/services/advisoryText.ts` |
| Tests | `tests/engine.test.ts` |
