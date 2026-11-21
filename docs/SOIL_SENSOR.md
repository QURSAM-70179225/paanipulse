# Soil probe (optional, software side only)

An **optional** add-on: a soil probe the farmer pushes into the field sends its readings to PaaniPulse, and the farmer
dashboard shows a **"Soil now"** card. The software side is built and tested. **No probe hardware has been connected.**
You can try everything with the simulator, with no hardware.

> **Status: built on the `feature/soil-sensor` branch; not deployed.** It needs one database migration
> (`20261120072719_soil_readings`) that adds a `SoilReading` table. It does not change the advice engine.

## What the farmer sees

The **Soil now (probe)** card appears on the farmer dashboard **only for farms that have probe readings**. It shows:

- **Moisture** (%, volumetric water content) with a Dry / Enough water / Wet label and a 24-hour line.
- **Soil temperature** and **salinity** (EC, dS/m) when the probe sends them.
- **Nutrients (N, P, K)** when sent, always labelled *indicative*, with a note not to change fertiliser from them.
- A **cross-check** against our water calculation: "agrees", "the probe says the soil is wetter", or "drier. Check the field."
- A **"Simulated reading (demo)"** badge for simulator data, and an "old reading" note when the last reading is over 6 hours old.

Urdu and English are both built in.

## What it does and does not do

- **It is a second opinion.** The advised pump hours still come from the FAO-56 calculation. The probe does **not**
  override them. Letting the probe correct the calculation is a later step, after it is calibrated against real fields.
- **Moisture is the reliable part.** Low-cost probes measure moisture and salinity reasonably; low-cost **nutrient**
  probes are widely reported as unreliable without calibration for each soil. We show them as indicative only, and the
  app's fertiliser figures remain modelled estimates.
- The wet/dry thresholds assume a typical loam (field capacity about 30% VWC, wilting point derived from the soil's
  available water capacity, 140 mm per m, so about 16%). Real soils differ, so a real probe needs per-field calibration.
- The cross-check compares the probe with the model's **start-of-day** depletion, so small differences are normal.
  They "agree" when they differ by less than 0.2 of the available water.

## API

### `POST /api/soil`

Accepts one reading, an array, or `{ "readings": [...] }` (up to 1,000).

| Field | Required | Notes |
|---|---|---|
| `farmId` | yes | Unknown farms are rejected (counted in `rejected`) |
| `moisture_pct` | yes | Volumetric water content, 0–100 |
| `timestamp` | no | ISO time; defaults to now. More than 10 minutes in the future is rejected |
| `temperature_c` | no | −10 to 70 |
| `ec_ds_m` | no | Bulk electrical conductivity, 0–20 dS/m |
| `n_mg_kg`, `p_mg_kg`, `k_mg_kg` | no | 0–5,000 (indicative) |
| `deviceId` | no | Free text, up to 64 characters |
| `source` | no | `sensor` (default), `simulator` or `manual` |

`null` or `""` for an optional field means "not measured" (it is **not** read as zero).

```bash
curl -X POST http://localhost:3000/api/soil -H 'content-type: application/json' \
  -d '{"farmId":"karamat","moisture_pct":24.5,"temperature_c":18,"ec_ds_m":1.1}'
# {"accepted":1,"rejected":0}
```

**Security.** Like `/api/telemetry`, the endpoint is **open unless `TELEMETRY_INGEST_KEY` is set**; then every request
needs the `x-ingest-key` header. Set it before any real device connects.

### `GET /api/farms/{id}/soil`

For signed-in users who can access the farm. Returns the latest reading, the last 24 hours, the status
(`wet` / `ok` / `dry`), the sensor's and the model's depleted fractions, and the cross-check. `{ "hasData": false }`
when there are no readings.

## Simulator (no hardware)

```bash
npm run dev                                   # in one terminal
npm run simulate:soil                         # in another: a drying day for farm "karamat"
npm run simulate:soil -- --scenario dry       # starts dry: the card says "time to irrigate"
npm run simulate:soil -- --scenario wet       # starts wet: barely dries
npm run simulate:soil -- --irrigate           # an irrigation event half way through the day
npm run simulate:soil -- --url https://your-site --farm <farmId>   # send to another deployment
npm run simulate:soil -- --reset              # delete the simulator's readings for the farm
```

It replays the last 24 hours of a field in about a minute and tags every reading `source: "simulator"`. **Do not run it
against a live site during a recording or a judging session**, because it writes to that site's database. `--reset`
removes only simulator readings.

## How a real probe would connect

Options, from cheapest to most costly (to be validated with an installer; none is built):

1. **Its own SIM** (built): the probe reports by itself over 2G, 3G or 4G and keeps readings while offline; the farmer links it once with the code on the box. See [SIM_DEVICES.md](SIM_DEVICES.md). (An earlier Bluetooth-to-phone version was removed: it only worked next to the probe.)
   gateway to buy.
2. **LoRa to a gateway** at the installer's or a neighbour's site: low power and long range, but a gateway and its upkeep.
3. **A SIM or GSM module in the probe**: simplest to deploy, but a recurring data cost per device.

Whichever is chosen, it only needs to `POST` the JSON above. The data model and API are already in place.

## Business impact

This **breaks the "no extra hardware" promise** that separates PaaniPulse from pump-monitoring and flow-meter products,
and it adds hardware cost, distribution, batteries and warranty. We therefore position it as an **optional "Pro" add-on
sold through installers** (who already sell hardware), not part of the base service. It is not in the base-case cost
model in [BUSINESS_PLAN.md](../BUSINESS_PLAN.md). Pricing it needs a device cost quote and an installer conversation.

## Where the code is

| | |
|---|---|
| Table | `SoilReading` in `prisma/schema.prisma`; migration `20261120072719_soil_readings` |
| Ingest and read APIs | `app/api/soil/route.ts`, `app/api/farms/[id]/soil/route.ts` |
| Validation | `lib/services/soilIngest.ts` |
| Interpretation (pure functions) | `lib/engine/soil.ts` |
| Card | `components/farmer/SoilNow.tsx` |
| Simulator | `scripts/simulate-soil.ts` |
| Tests | `tests/soil.test.ts` |
