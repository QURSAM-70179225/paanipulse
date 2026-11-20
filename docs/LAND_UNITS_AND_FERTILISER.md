# Land units and "Fertiliser for your land"

Two features that make the advice specific to a farmer's own land. Both are **built on the `feature/land-units-fertiliser`
branch and not deployed**. They need one additive database migration (`land_unit_fert_plan`: a `areaUnit` column with a
default of `acre`, and a nullable `fertPlan` JSON column). Existing farms are unaffected.

## 1. Land in the farmer's own unit

A farmer thinks in kanal, marla or murabba, not only acres. The farm set-up form (farmer and installer) now has a unit
selector next to the area, and shows the conversion as you type ("100 kanal ≈ 12.5 acre").

| Unit | In acres |
|---|---|
| acre | 1 |
| kanal | 1/8 (so 1 acre = 8 kanal) |
| marla | 1/160 (1 kanal = 20 marla) |
| murabba | 25 |
| ghumaon | 1 |

This is the **Punjab convention**. Local custom varies in places, so confirm the unit with the farmer. The engine's kanal
(505.857 m²) matches it.

- **Stored value:** the app still stores the area in **acres** (`areaAcres`), so every calculation is unchanged. The unit
  the farmer chose is saved as `areaUnit` and used for display only.
- **Where it shows:** the farmer dashboard header, the farmer's farm list, and the installer's farm table. Reports and the
  authority dashboard stay in acres (a common unit for lenders and officials).
- **Limits:** the typed value must be between 0.5 and 500 acres once converted, so a typo cannot silently become a huge farm.

## 2. Fertiliser for your land

**The app does not decide how much fertiliser to use.** The rate per acre comes from the farmer's **soil test or an
agriculture officer** and is typed in by the farmer or installer. The app then:

1. **Multiplies the rate by the land area**: "Total for your 12.5 acre: urea 25 bags (1,250 kg), DAP 12.5 bags …". A bag is 50 kg.
2. **Splits the urea into 1–3 doses** and orders the work: DAP and potash **at sowing**, urea doses before the irrigations.
   The Punjab Agriculture Department's wheat advisory says to apply P and K at sowing and to split nitrogen into 2–3
   doses ([Profit report](https://profit.pakistantoday.com.pk/2025/02/02/punjab-agriculture-department-issues-advisory-for-wheat-farmers/)).
3. **Times each urea dose with the irrigation.** On an irrigation day the card says to spread the next dose just before
   irrigating. On other days it says to wait. **If 10 mm or more of rain is forecast for today and tomorrow, it says to hold
   the dose**, because rain can wash urea away. That 10 mm threshold is a general rule of thumb: **confirm it with an agronomist**.
4. **Tracks doses**: the farmer taps "I applied dose 2", and can undo the last tap.

### Safeguards

- **A confirmation is required.** The save button stays off until the person confirms the rate is from a soil test or an
  officer, not from the app, and chooses the source.
- **Typo guard.** Rates above 6 bags per acre (urea), 4 (DAP) or 3 (potash), negative rates, and an empty plan are
  rejected, and the message says to check the number with an officer. These limits are our choice, not an official one.
- **Authorisation.** Only the farm's farmer or installer can read or change the plan. The authority role cannot.
- **Clear wording.** The card says "The rate is yours. PaaniPulse only multiplies it for your land and times it with your
  irrigation. Please check with your agriculture officer."

### What it does not do

- It does not suggest a rate, adjust it for the soil, variety or yield target, or check it against any official table.
- It does not know the real timing of your crop's stages beyond the irrigation days, so "dose 1 of 3" is an order, not a date.
- The official Punjab notice was not readable from our environment, so no bag rates from it are built in.

## API

`PUT /api/farms/{id}/fertiliser` saves `{ urea, dap, sop, ureaSplits, source, confirmed: true }` (bags per acre).
`PATCH` with `{ action: "applied" | "undo" }` marks or unmarks a urea dose. `DELETE` removes the plan.
Rates above the typo guard return `400 { error: "rate", problem }`; a `PATCH` with no saved plan returns `404`.

## Where the code is

| | |
|---|---|
| Unit conversion | `lib/engine/landUnits.ts`, display helper `lib/i18n/area.ts` |
| Fertiliser maths (pure) | `lib/engine/fertiliser.ts` |
| Plan storage and API | `prisma/schema.prisma` (`areaUnit`, `fertPlan`), `app/api/farms/[id]/fertiliser/route.ts`, `lib/services/fertPlan.ts` |
| Card and form | `components/farmer/FertiliserPlan.tsx`, `components/onboard/OnboardWizard.tsx` |
| Tests | `tests/landFert.test.ts` |
