# Customer, scope and "will they buy?"

Answers to the mentor questions on customers, market, scope, risk and readiness to buy. The honest summary first:

> **The product exists and works (not only on paper). Nobody has yet paid, signed or agreed to pilot.** Technical feasibility
> is shown; **desirability and viability are not.** The next step is to test whether the primary customer, the installer, will buy.

---

## 1. Who is the customer?

**The user is not the payer.** The farmer uses the app free. The customer is whoever pays for it.

| | Segment | Role | Pays? | Priority |
|---|---|---|---|---|
| **Primary customer** | **Solar installers and dealers** | Sell and service solar tube wells; the farmer already trusts them | Yes (planned, Rs 1,000–2,000 per pump per year, a hypothesis) | **1st** |
| **Primary user** | **Farmers** with solar tube wells, 5–25 acres, rice–wheat, central Punjab | Use the daily advice; give the usage data | No | Served through the installer |
| Secondary | **Lenders and aarhtis / input dealers** | Want proof the financed pump works and a repayment signal | Later | 2nd |
| Secondary | **Irrigation and Agriculture Departments** | Water accounting for subsidised wells | At scale | 3rd |

### Mass market or niche?

**A niche, not a mass market.** There are an estimated 650,000 solar tube wells in Pakistan (an expert estimate, not a census).
Illustration, not a forecast: 650,000 pumps × Rs 1,500 = about **Rs 975 million a year, roughly US$3.5 million** (at Rs 280
per dollar) if every well paid. The break-even point in the business plan is about **1,500 paying pumps, about 0.2% of that**.
So the first target is small and specific. The serviceable share (5–25 acres, central Punjab, reachable through installers)
has **not been estimated**.

### Multiple segments, one first

We have several possible customers, but we should **start with one primary segment (installers) and one beachhead**:
**wheat and rice farms with solar tube wells in central Punjab (Sheikhupura, Gujranwala, Hafizabad, Narowal), sold through
2–5 partner installers.** The other segments are added only after the first one pays (the "wheels" in
[BUSINESS_PLAN.md](../BUSINESS_PLAN.md) section 6).

---

## 2. What type of business?

| Model | Fit |
|---|---|
| **B2B2C** (business to business to consumer) | **Primary.** The installer (business) pays and gives the service to the farmer (consumer). |
| **B2B** | Lenders, aarhtis and input dealers pay for the data and the report. |
| **B2G** (business to government) | The Irrigation Department, later. This is slow and needs a contract. |
| B2C (farmer pays directly) | Not the plan. The measurable saving (about Rs 3,600 a season in the base case) cannot support a high farmer fee. An optional premium of about Rs 200 a month is a later idea. |
| C2C (consumer to consumer) | Does not apply. |

---

## 3. Solution scope: narrow or broad?

We have built a lot, and **breadth is a risk**: a product that does many things may not do the first one well enough to be bought.

**Proposed core promise (the minimum product to sell):**
> Every morning the farmer is told **whether to run the pump and how much water the field needs**, in Urdu, and the installer
> sees which of his farmers over-pump.

**Core** (needed to sell): the daily advice and water quantity, the water chart, the pump alarm, the installer portal, offline mode.

**Extensions** (valuable, but not needed to sell first): fertiliser timing for the farmer's land, the soil probe and
Bluetooth, the lender report, the Irrigation Department map, SMS, spare-energy ideas, more crops.

**Rule for the next phase: do not build more features until the core has a paying customer.** Spend the time on installers
and on measuring the advice.

**Is it narrow enough or stuck?** The product is narrow in who it serves (solar tube wells, Punjab) but wide in features. The
risk is not that it is stuck; it is that it is unproven.

---

## 4. Solution risks and constraints

| Type | Risk or constraint | Effect | What we do |
|---|---|---|---|
| **Demand** | No installer will pay | No revenue | Test price and a pilot with installers first (section 6) |
| **Adoption** | Farmers do not follow the advice | No saving, no value | Alarm, installer follow-up, measure adherence |
| **Accuracy** | The virtual meter is not yet checked on a real pump | Credibility | Field check; compare with real soil readings (WIT); show ranges |
| **Safety** | Wrong advice damages a field | Harm to the farmer, loss of trust | Open loop, conservative rain rule, confidence line, no fertiliser doses without sign-off ([OPEN_LOOP_AND_RISK.md](OPEN_LOOP_AND_RISK.md)) |
| **Data** | No local station or soil data | Estimates only | Typical FAO values, labelled; pilot data |
| **Cost** | SMS, weather licence and AI costs | Margin | Local SMS, opt-in; paid weather plan priced in ([BUSINESS_PLAN.md](../BUSINESS_PLAN.md) section 7) |
| **Trust** | Farmers fear a water tax | Refusal | Farmer-owned data, anonymised district view |
| **Competition** | A drive maker adds the same feature | Lost position | Move first on installer relationships and calibration data |
| **Constraint** | Two-person team, no budget yet | Slow growth | One segment, one beachhead; funding need about Rs 1.8 million to the end of year one |
| **Constraint** | Poor village internet; Android only for Bluetooth | Reach | Offline advice; SMS option |

---

## 5. Does the solution fit the customer? Will they buy?

**Where we are (honest).**

| Question | Evidence | Status |
|---|---|---|
| Does the solution exist or is it only on paper? | A working app on a live site, with tests, in Urdu and English | **Exists** |
| Is the problem real? | One farmer interview, one peer-reviewed study, government statements | Supported; thin |
| Do farmers want it? | One interview says yes if it is simple and explains fertiliser savings | **Untested** |
| Will installers pay? | Interview points to the installer or aarhti as payer; **no installer asked** | **Unknown** |
| Is the customer ready to buy? | **No customer has agreed, signed or paid** | **No evidence yet** |

### The "ready to buy" ladder

A customer becomes real by climbing these steps. We are at step 1.

| Step | Signal | Today |
|---|---|---|
| 1 | Interested ("sounds useful") | A farmer interview and positive mentors |
| 2 | Agrees to a free pilot on named pumps | **None** |
| 3 | Signs a letter of intent with a price | **None** |
| 4 | Pays for the pilot | **None** |
| 5 | Renews after the pilot | **None** |

### Smallest experiments to get there (weeks 1–4)

1. **Five installer interviews.** Ask: how many pumps do you sell a year, what do farmers ask after the sale, and would you pay Rs 1,000,
   1,500 or 2,000 per pump per year. Ask for a pilot on 10 pumps.
2. **Pilot with 5–10 farmers for two weeks, free.** Measure: how many open the advice, whether pump hours fall, and whether they say it helped.
3. **One written line of interest** (a message or letter of intent) from an installer or aarhti.
4. **Meter field check** on one real pump (drum and stopwatch).

### Decision rules (our proposal, to confirm with mentors)

- If **at least 2 of 5 installers** would pay **Rs 1,000 or more**, continue with the installer route.
- If **fewer than 2**, test the **lender or aarhti** route, or look for a grant or public-sector pilot.
- If **fewer than half of pilot farmers** open the advice after the first week, fix the product before adding customers.

---

## 6. Is the business feasible?

| Lens | Question | Status |
|---|---|---|
| **Desirability** | Do customers want it? | **Not proven** (section 5) |
| **Technical feasibility** | Can we build and run it? | **Shown**: working, tested; meter accuracy on a real pump is the open item |
| **Financial viability** | Can it earn more than it costs? | **On paper**: about 1,500 paying pumps to break even at Rs 1,500; depends on what installers will actually pay |
| **Operational feasibility** | Can two people run it? | At pilot scale, yes; at about 1,500 pumps it needs a field coordinator |

Details and assumptions: [BUSINESS_PLAN.md](../BUSINESS_PLAN.md).
