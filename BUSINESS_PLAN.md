# PaaniPulse: Business Plan

> **Solar made pumping free. PaaniPulse makes it smart.**
>
> This is the business documentation for the LUMS CfE × OGDCL CleanTech Hackathon 2026
> (team: Qursam Bibi, Muzammil Hussain). It covers the problem, who pays, pricing, costs, return on investment,
> phases, KPIs and risks.
>
> **How to read the numbers.** Nothing here has been measured with real customers yet. Every figure is marked as
> **App** (computed by our own engine on the demo farm), **Sourced** (with a link), or **Assumption** (our estimate,
> to be tested). The full list of assumptions is in [section 12](#12-assumptions-register). Change an assumption and
> the conclusions move; the formulas are in [section 13](#13-how-the-numbers-are-calculated).

---

## 0. The mentor's points, and where each is answered

| Mentor point | Where |
|---|---|
| Problem, solution, is it feasible, competitors, how we differ | [2](#2-problem-and-why-now), [3](#3-solution-and-how-it-is-different) |
| Users and customers, who pays, revenue model | [4](#4-users-and-customers), [6](#6-revenue-model-the-wheels) |
| Pricing: what we sell and what it costs, cost versus value | [5](#5-value-and-pricing) |
| One, two or three "wheels" | [6](#6-revenue-model-the-wheels) |
| Cost model: how much is invested, acquisition | [7](#7-cost-model), [9](#9-go-to-market-and-acquisition) |
| ROI (return on investment) | [8](#8-unit-economics-break-even-and-roi) |
| Phases done and still to do | [10](#10-phases-done-and-to-do) |
| KPIs: the value we deliver | [11](#11-kpis) |
| The three goals: finance, green, reliable (plus technical) | [1](#1-the-three-goals) |
| Sell what people already know; right time | [3](#3-solution-and-how-it-is-different), [2](#2-problem-and-why-now) |
| Energy access and stability; Australia comparison; post-harvest waste; the north | [2](#2-problem-and-why-now), [14](#14-international-comparison-australia-and-pakistan), [15](#15-scope-and-what-we-have-not-covered) |

---

## 1. The three goals

The mentor's test: a new solution must be **cheaper to run, greener, and as reliable as what exists**, and technically sound.

| Goal | What we claim | How we will measure it | Status |
|---|---|---|---|
| **Finance** | Costs the farmer nothing; pays for itself through the installer fee and, later, lender and government data | Gross margin per pump, break-even pumps, cost per pump onboarded (section 8) | Model only, no revenue yet |
| **Green** | Solar is already clean. We add **resource efficiency**: water not over-pumped, fertiliser not washed away, solar energy freed for other uses | m³ of water saved, kWh of solar energy freed, kg of urea avoided, per pump per season (section 11) | App estimates on one demo farm; not measured in the field |
| **Reliable** | Never makes today's operation worse: the app does not control the pump, and every outside service has a fallback | % of daily advisories delivered by 06:30, app uptime, advice-accuracy checks | Fallbacks built; accuracy not yet validated |
| **Technical** | Standard, tested methods (FAO-56 crop water, pump physics), 75 unit tests, number guardrail on the AI | Meter error against a real flow measurement (target: within the stated ± band) | Built; **meter accuracy on a real pump is the open item** |

---

## 2. Problem and why now

**The problem.** Solar tube wells cost nothing to run once the panels are paid for, so the price signal that made farmers
stop pumping has gone. Nobody measures how much is pumped. Farmers over-irrigate (water and fertiliser lost below the
roots, solar energy wasted) and drill deeper as the water table falls, and the government cannot regulate what it cannot
measure. Full evidence and sources: [PRODUCT_ESSENTIALS.md](PRODUCT_ESSENTIALS.md#1-the-problem).

| Fact | Status |
|---|---|
| About 650,000 solar tube wells in Pakistan | **Sourced**, expert estimate (Reuters, Dawn), not a census |
| In 77% of 30 matched farm pairs the solar farm extracted more water than the diesel farm | **Sourced**, peer-reviewed, small sample (2025) |
| Punjab has no metering of groundwater use | **Sourced** (Dawn, Friday Times) |
| One farmer we interviewed deepened a bore from about 120 to 180–200 ft (about Rs 1.5–2 lakh) | **Interview**, one farmer |

### Why now: the grid is unreliable, so farmers went solar

The energy-access numbers in circulation **disagree**, so quote them as a range and name the source:

- The latest SDG 7 tracking report puts the population with no electricity access at about **10.8 million** (2024 data), as
  [reported by Profit](https://profit.pakistantoday.com.pk/2026/06/25/over-108-million-pakistanis-still-without-electricity-report-says).
- Older World Bank work cites close to **50 million** without grid access, and notes there is no consensus on the access
  rate ([World Bank blog](https://blogs.worldbank.org/en/endpovertyinsouthasia/what-s-keeping-pakistan-dark)).
- A [Dawn analysis](https://www.dawn.com/news/1948392/connected-but-still-in-the-dark) of World Bank work says nearly a
  quarter of the population lacks **reliable** power, which is a different measure from access.
- In April 2026 the power shortfall was reported at about 6,500 MW with outages of up to 16 hours in some areas
  ([Profit](https://profit.pakistantoday.com.pk/2026/04/16/pakistan-faces-6500mw-power-shortfall-outages-hit-up-to-16-hours/)).

> The "50 million without electricity, 30 million with no stability" figures from the mentor session **could not be
> confirmed** as stated. Use the ranges above, and ask the mentor for the source.

**The link to our idea:** an unreliable, costly grid is why farmers moved to solar pumping. Solar fixed the supply
problem; it created a new one, over-use, that nobody manages. PaaniPulse manages it.

### Post-harvest loss: where spare solar energy could help

Crops are abundant at harvest, but a large share is lost afterwards. Perishable fruit and vegetable losses are reported
at **20–44%** (an FAO-attributed range, quoted in a [Dawn op-ed](https://www.dawn.com/news/1949950/corporate-window-fixing-pakistans-food-loss-crises);
we have not seen the FAO source), and wheat losses at about **9%**
([Business Recorder, 2024](https://www.brecorder.com/news/amp/40324664)). The "30–50%" figure from the session is at the
top of what these sources show for perishables, not for all crops.

PaaniPulse works **before** harvest. But the "spare sunshine" ideas in the app (grain drying, small cold rooms,
battery charging) are exactly the energy uses that reduce **post-harvest** loss. This is a Phase 4 extension (section 10),
not something we have built or tested.

---

## 3. Solution and how it is different

**What it is, in one line:** a virtual water meter and a daily Urdu advisor for solar tube wells, with no extra hardware.

| Pillar | What it does |
|---|---|
| **Measure** | Litres pumped, from pump size, sunlight and run-hours (or the drive's own readings); a 5-minute bucket test calibrates it |
| **Advise** | A daily Urdu voice note and chat: run the pump today, or keep it off |
| **Earn** | Hours not pumped become saved fertiliser and solar energy that could earn money |
| **Map** | An anonymised district view for the Irrigation Department and lenders |

**Sell what people already know.** Farmers already take voice notes and advice from installers and aarhtis. We should
sell **"your pump's daily advice"** and **"after-sales service for installers"**, not "a virtual meter".

### Competitors (from our research; check before quoting)

| Approach | What it does | The gap | PaaniPulse |
|---|---|---|---|
| Advice apps and SMS (BaKhabar Kissan, PCRWR) | Crop and irrigation advice | No measurement of what **this** well pumped | Closes the loop per well |
| Pump-drive monitoring (Lorentz, Shakti, Antares) | Power, faults, remote monitoring | Hardware and a fee; brand-locked; kW, not litres against crop need | Any brand; drive data optional |
| Flow meters, SCADA | Measure flow at the well | Hardware on every well; cannot reach 650,000 farms | No hardware |
| "Save groundwater" campaigns | Ask farmers to pump less | Saving costs the farmer and helps everyone else | A private reward for the farmer |

**Not yet done:** we have no competitor **prices** or customer numbers. Collecting these is a Phase 1 task.

---

## 4. Users and customers

| Role | Who | What they get | Do they pay? |
|---|---|---|---|
| **User** | Rice–wheat farmer, 5–25 acres, 7.5–20 kW solar pump | Daily advice, weekly waste report, alarm | No |
| **Customer 1** | Solar installers and dealers | A service to sell after the sale; fewer dry-running and warranty problems; a reason to be chosen | Yes (planned) |
| **Customer 2** | Lenders and aarhtis | Proof the financed pump works; income signal for repayment | Later |
| **Customer 3** | Irrigation Department, Agriculture Department | Water accounting for subsidised wells | At scale |

---

## 5. Value and pricing

The mentor's rule: **price follows the value delivered**. So we start from what the farmer actually gains.

### What the farmer gains (modelled on the demo farm)

The demo farm (Karamat, 12.5 acres of wheat) shows these weekly figures from our own engine (**App**):
about **450 m³** of water pumped beyond need, **5 kg of urea** washed below the roots, and about **102 kWh** of solar
energy spent on it. Urea is priced at Rs 90 per kg, from about Rs 4,300–4,750 per 50 kg bag in 2026
([Ministry of National Food Security fertilizer review](https://mnfsr.gov.pk/SiteImage/Publication/FRApril%202026.pdf)).
Energy is valued at Rs 20 per kWh (**Assumption**) **only if** the spare energy is actually sold or used.

A farmer only benefits if he follows the advice, so we apply an **adherence** share (**Assumption**).

| Per farm, per season | Low | **Base** | High |
|---|---|---|---|
| Weeks with excess irrigation | 12 | **16** | 20 |
| Share of the excess he actually avoids | 25% | **50%** | 75% |
| Water saved (m³) | 1,350 | **3,600** | 6,750 |
| **Fertiliser saved** (Rs, certain value) | 1,350 | **3,600** | 6,750 |
| Solar energy freed (kWh) | 307 | **818** | 1,533 |
| Energy value **if monetised** (Rs, uncertain) | 6,100 | **16,400** | 30,700 |
| Fertiliser saved per acre (Rs) | 108 | **288** | 540 |

Not counted: avoided bore deepening (one farmer spent about Rs 1.5–2 lakh) and less pump wear, because we cannot
attribute them yet.

### What this means for the price

- The **measurable** cash saving to the farmer is small: about **Rs 3,600 a season** in the base case, from fertiliser alone.
- A price of **Rs 1,500 per pump per year** is about **40%** of that base saving. That is too high to charge the
  farmer directly, which is why **the farmer does not pay** and the installer does.
- Charging farmers **Rs 500 a month** (the earlier idea) is **not supported** by fertiliser savings alone: six months
  would cost Rs 3,000, almost the whole base saving. A farmer fee of about **Rs 200 a month** (Rs 1,200 a season,
  one third of the base saving) is the most the numbers support, and only after a farmer has seen results.
- The installer pays for **their own** value (after-sales service, fewer warranty claims), not for the farmer's fertiliser.
  **This is untested.** The pilot must ask installers directly what they would pay (section 10).

**Price points to test with installers:** Rs 1,000, Rs 1,500 and Rs 2,000 per pump per year.

---

## 6. Revenue model: the wheels

The mentor asked whether the model has one, two or three "wheels" (revenue sources). Our three possible wheels, in the
order we should turn them:

| Wheel | Payer | Offer | Price (hypothesis) | When |
|---|---|---|---|---|
| **1. Installers** | Solar installer or dealer | Branded after-sales service for every pump they sell: daily advice, alarm, service dashboard, farmer sign-up at the point of sale | Rs 1,000–2,000 per pump per year | Phase 2 |
| **2. Lenders and aarhtis** | Bank, microfinance lender, aarhti | Verified-usage report per well for financed pumps; income signal | Rs 500–1,000 per report per year (placeholder, no evidence) | Phase 3 |
| **3. Government** | Irrigation or Agriculture Department | Water accounting for subsidised wells; regional dashboard | Per-well annual fee, or a project contract (no evidence yet) | Phase 4 |

**Farmers are users, not a wheel.** An optional premium (about Rs 200 a month, section 5) is a possible later addition.

**Recommendation: start with one wheel (installers) and prove it before adding the others.** A proven one-wheeler is
more convincing than three untested ones. Add the next wheel only after the previous one passes its gate (section 10).

**Today: no wheel is turning.** No installer, lender or department has agreed to pay.

---

## 7. Cost model

### What it costs today

At demo scale the app runs mostly on free tiers (hosting on Render, database on Neon, free weather data, free AI-model
quota). The real cost so far is the **team's time**: two people over the hackathon period. *Cash invested so far: Rs ___
(fill in).*

### What it will cost to run as a business (first year)

All **Assumption**, to be replaced with real quotes.

| Fixed costs | Rs per month | Rs per year |
|---|---|---|
| Hosting, database, a **commercial** weather data plan, monitoring | 18,000 | 216,000 |
| Field coordinator (part-time agronomist and installer liaison) | 60,000 | 720,000 |
| Travel and pilot costs | 15,000 | 180,000 |
| Admin, registration, accounting | 5,000 | 60,000 |
| **Total** | **98,000** | **1,176,000** |

Two items need action before launch:
- **Weather data.** Open-Meteo's free tier is for non-commercial use, so a paid plan is needed once we charge. The code
  already supports an API key.
- **SMS.** Twilio charges about **$0.47 per message to Pakistan**
  ([Twilio pricing](https://www.twilio.com/en-us/sms/pricing/pk)), roughly **Rs 133**, so a daily SMS would cost about
  **Rs 48,000 per farmer per year**. That is impossible. SMS must go through a **local provider** (assumed Rs 3 per
  message) and stay **opt-in**, or be replaced by WhatsApp or a voice note.

| Variable costs per pump per year | Rs |
|---|---|
| AI model, weather, database | 300 |
| Support (first line is the installer) | 200 |
| SMS: 20% of farmers opt in × 365 messages × Rs 3 | 219 |
| **Total** | **719** |

---

## 8. Unit economics, break-even and ROI

**Per pump per year** (variable cost Rs 719):

| Fee per pump | Margin per pump | Gross margin | Pumps to break even | Installers needed (100 pumps each) |
|---|---|---|---|---|
| Rs 1,000 | Rs 281 | 28% | about 4,200 | about 42 |
| **Rs 1,500** | **Rs 781** | **52%** | **about 1,500** | **about 15** |
| Rs 2,000 | Rs 1,281 | 64% | about 920 | about 9 |

**Reading this:** at Rs 1,500 we need about **1,500 paying pumps**, roughly 15 installers, to cover year-one running
costs. That is **0.2%** of the estimated 650,000 solar wells. At Rs 1,000 the business is much harder, so the
installer's real willingness to pay is the number that matters most.

### Three-year illustration

An illustration, **not a forecast**. Fee Rs 1,500; variable cost Rs 719 per pump; fixed costs grow with the team.

| | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| Average paying pumps | 500 | 2,500 | 8,000 |
| Revenue (Rs) | 750,000 | 3,750,000 | 12,000,000 |
| Variable cost (Rs) | 360,000 | 1,798,000 | 5,752,000 |
| Fixed cost (Rs) | 1,180,000 | 2,500,000 | 5,000,000 |
| **Profit (Rs)** | **−790,000** | **−548,000** | **+1,248,000** |

The cumulative loss over years one and two is about **Rs 1.3 million**, and profit arrives in year three. The funding need
below (about Rs 1.4 million for year one alone) is higher because it also counts pilot-phase costs that this simple
illustration leaves out: free pilots, installer onboarding and a relay pilot.

### Funding need (to the end of year one)

| Phase | Cost (Rs) | Basis |
|---|---|---|
| 1. Field check and first farmers (2 weeks) | 70,000 | Kit, travel, farmer incentives |
| 2. Installer pilot (3 months) | 389,000 | Running costs, coordinator, local SMS set-up, onboarding 5 installers |
| 3. Growth to about 1,000 pumps (9 months) | 1,506,000 | Running costs, coordinator, onboarding, pump costs, relay pilot |
| Less revenue in phase 3 | −563,000 | 500 average paying pumps × Rs 1,500 × 9/12 |
| **Net need to end of year 1** | **about Rs 1.4 million** | |
| **With a 30% buffer** | **about Rs 1.8 million (about $6,500)** | At Rs 280 per dollar (**Assumption**) |

### Return on investment, by party

| Party | They put in | They get back | Status |
|---|---|---|---|
| **Farmer** | Nothing (the installer pays) | About Rs 3,600 fertiliser saved per season, plus water and energy | Modelled on one demo farm; not measured |
| **Installer** | Rs 1,000–2,000 per pump per year | After-sales service, fewer warranty claims, a reason to be chosen | **Untested.** Ask them. |
| **Investor or grant** | About Rs 1.8 million | Payback around year three in the illustration; social return in water and energy saved | Illustration only |
| **Society** | n/a | About 5.4 million m³ of water and 1.2 GWh of solar energy freed per season at 1,500 pumps (base case) | Estimate |

---

## 9. Go-to-market and acquisition

**Channel: installers.** An installer registers each farmer at the point of sale (the installer portal is built), so the
farmer arrives already onboarded and a person he trusts explains the advice.

| Step | What | Cost (Assumption) |
|---|---|---|
| Find installers | Calls and visits in Sheikhupura, Gujranwala, Hafizabad, Narowal | Part of coordinator time |
| Onboard an installer | One visit, demo, training, first 10 farmers | About Rs 15,000 each |
| Per pump | PIN set-up and a welcome message | About Rs 150 (Rs 15,000 ÷ 100 pumps) |
| Aarhtis and input dealers | Referral channel; they stay with the farmer | Referral terms to be worked out |

**Why installers first:** they already have the farmer's trust and the pump's details, they sell 20–200 pumps a year,
and they need a reason to be chosen over a competitor.

---

## 10. Phases: done and to do

| Phase | When | What | Gate to the next phase |
|---|---|---|---|
| **0. Prototype (done)** | Hackathon | Engine, farmer, installer and authority apps, Urdu and English, offline mode, alarm, live site, tests, docs, demo video, pitch decks | A working demo |
| **1. Prove the meter** | Weeks 1–2 | Drum-and-stopwatch field check on one real pump; the farmer contact plus 5–10 neighbours, free; collect competitor prices; ask installers about price | Measured error within the stated band; 5+ farmers open the advice |
| **2. Installer pilot** | Months 1–3 | 3–5 installers, 100–300 pumps; local SMS provider; commercial weather plan; track KPIs (section 11) | At least 1 installer **pays**; hours pumped fall |
| **3. Grow wheel 1, test wheel 2** | Months 4–12 | About 1,000 pumps; a lender pilot; a smart-relay pilot with the farmer's permission; an **optional soil probe** sold through installers (software side built, see [docs/SOIL_SENSOR.md](docs/SOIL_SENSOR.md); hardware cost not in the base case) | About 1,500 paying pumps in sight; one lender signs |
| **4. Wheel 3 and extensions** | Year 2 onwards | Irrigation Department pilot; more crops (rice, maize, cotton, sugarcane); spare-energy uses (drying, cold storage) | Department contract |

---

## 11. KPIs

| Type | KPI | Target (to be set after phase 1) |
|---|---|---|
| **Value to the farmer** | Pump hours before vs after | A measurable fall |
| | Share of advisories followed | 50% (base-case adherence) |
| | Fertiliser and water saved per season | Section 5 base case |
| **Business** | Installers signed; pumps active; **pumps paying** | 15 installers, 1,500 paying pumps (break-even) |
| | Monthly recurring revenue; gross margin | At least 50% |
| | Cost to onboard one pump | About Rs 150 |
| | Installer retention after 12 months | Above 80% |
| **Green** | m³ of water saved; kWh of solar energy freed | Section 8, "society" row |
| **Reliable** | Advisories delivered by 06:30; app uptime; forecast error | 99% delivered; 99.5% uptime |
| **Technical** | Meter error against a real flow measurement | Within the stated ± band |

---

## 12. Assumptions register

Everything below is an assumption unless it says Sourced or App. Replace each with a measured or quoted value.

| # | Assumption | Value | Type | How to check |
|---|---|---|---|---|
| 1 | Urea price | Rs 90 per kg | Sourced (about Rs 4,300–4,750 per 50 kg bag, 2026) | Latest fertilizer review |
| 2 | Weekly excess (demo farm) | 450 m³, 5 kg urea, 102 kWh | App | Field check; real pilot farms |
| 3 | Weeks of excess irrigation per season | 16 (12–20) | Assumption | Farmer interviews, pilot |
| 4 | Share of excess avoided (adherence) | 50% (25–75%) | Assumption | Pilot: hours before vs after |
| 5 | Energy value | Rs 20 per kWh, only if monetised | Assumption (app setting) | Test with a charging or drying user |
| 6 | Installer fee | Rs 1,500 (1,000–2,000) | Assumption | Ask installers |
| 7 | Lender fee | Rs 500–1,000 per report | Assumption (no evidence) | Lender conversation |
| 8 | Variable cost | Rs 719 per pump per year | Assumption | Real usage costs |
| 9 | Local SMS price; opt-in share | Rs 3; 20% | Assumption | Local provider quote |
| 10 | Fixed costs | Rs 98,000 per month | Assumption | Quotes, real salaries |
| 11 | Pumps per installer | 100 | Assumption | Installer interviews |
| 12 | Onboarding cost per installer | Rs 15,000 | Assumption | Phase 2 actuals |
| 13 | Exchange rate | Rs 280 per dollar | Assumption | Current rate |
| 14 | Twilio SMS to Pakistan | $0.4734 per message | Sourced (may change) | Twilio pricing page |

---

## 13. How the numbers are calculated

- **Farmer value per season** = weekly excess × weeks × adherence. Fertiliser = 5 kg × weeks × adherence × Rs 90.
  Water = 450 m³ × weeks × adherence. Energy = 102 kWh × weeks × adherence.
- **Variable cost per pump** = 300 + 200 + (0.20 × 365 × 3) = Rs 719.
- **Margin per pump** = fee − 719. **Break-even pumps** = fixed cost per year (Rs 1,176,000) ÷ margin per pump.
- **Phase 2 cost** = 3 × (18,000 + 5,000 + 15,000) + 3 × 60,000 + 20,000 + 5 × 15,000 = Rs 389,000.
- **Phase 3 cost** = 9 × 98,000 + 10 × 15,000 + 600 × 719 × 9/12 + 150,000 = about Rs 1,506,000.
- **Society** = 1,500 pumps × (450 m³ or 102 kWh) × 16 weeks × 50%.

---

## 14. International comparison: Australia and Pakistan

| | Australia (New South Wales) | Pakistan (Punjab) |
|---|---|---|
| Groundwater use | Licensed, and **metered**: a non-urban metering framework started in 2018 as part of Murray–Darling Basin commitments | **Not metered**; the Water Act 2019 commission is not operating |
| Cost of meters | Borne by water users, with a government telemetry support program for eligible users | No meters, so no data |
| Result | The regulator can see who takes what | The government says solar is not depleting groundwater; Punjab says it is "still studying"; nobody can settle it |

**What it means for us.** Metering of groundwater **works elsewhere and is becoming a legal requirement**. Pakistan has
the rules on paper but not the measurement. A hardware meter is too costly for 650,000 small farms, so a **virtual**,
no-hardware meter is a realistic first step. Scale differs too: Australia's licensed users are large, and its support
program is for entitlements of 100 ML or more, while Pakistan's wells are small and private.

Sources: [NSW Natural Resources Access Regulator, metering](https://www.nrar.nsw.gov.au/how-to-comply/metering);
[NSW non-urban water metering policy](https://water.dpie.nsw.gov.au/__data/assets/pdf_file/0017/312335/nsw-non-urban-water-metering-policy.pdf);
[Telemetry Uplift Program](https://www.dpie.nsw.gov.au/water/our-work/nsw-non-urban-water-metering/what-water-users-need-to-know/telemetry-uplift-program).
**Check the current deadlines and thresholds on those pages before quoting them**; our search found only fragments.

---

## 15. Scope and what we have not covered

- **Punjab first.** The product is built around tube wells in central Punjab (Sheikhupura, Gujranwala, Hafizabad,
  Narowal including Shakargarh) and wheat first.
- **Gilgit-Baltistan and the north: not covered.** Our understanding is that irrigation there relies mainly on
  glacier-fed channels, not tube wells, so the product would not transfer directly. **We have not researched this.** The
  honest answer today is "not yet". If the mentor wants a plan, it needs its own research.
- **Solar and hydro seasonality: not investigated.** We have not studied how solar and hydropower output complement each
  other through the year, or what that means for energy storage. We are unsure what the mentor intended; ask.
- **Post-harvest loss:** a Phase 4 extension (section 2), not built.

---

## 16. Risks

| Risk | What could happen | Response |
|---|---|---|
| No installer will pay | Wheel 1 fails | Test price early; fall back to lenders or a grant-funded pilot |
| Meter inaccurate | Credibility lost | Field check first; show ranges; calibrate by bucket test |
| Farmers ignore the advice | No saving, so no value | Alarm, relay pilot, installer follow-up; track adherence |
| Direct saving too small | Farmer will not pay | Farmer stays free; the installer pays; sell the service, not the saving |
| Costs rise (SMS, weather, AI) | Margin falls | Local SMS, opt-in only; commercial weather plan priced in; cache everything |
| Water-tax fear | Farmers refuse | Farmer-owned data; anonymised district view; savings-first language |
| Copying by a drive maker | A competitor adds it | Move fast on installer relationships and calibration data |

---

## 17. What to do next, in order

1. **Field check on one real pump** (phase 1): the single biggest credibility gain.
2. **Ask three installers** what they would pay (Rs 1,000, 1,500 or 2,000) and how many pumps they sell a year.
3. **Replace assumptions 3, 4, 6, 8, 9, 10** with real numbers (section 12).
4. **Get a local SMS quote** and a **commercial weather plan quote**.
5. **Ask the mentor** the open questions: what "wheeler" meant, the source of the 50 million / 30 million figures,
   and what "abundant versus harvest" meant.
