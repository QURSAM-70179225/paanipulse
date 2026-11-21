# "Enough water": go home, and get a message when it is time to switch the pump off

**The idea.** A farmer starts the pump, goes home, and a soil probe in the field keeps checking the moisture. When enough
water has reached the probe, he gets an SMS: *"Soil has enough water. If the pump is running, switch it off. Check the field too."*
Then he comes back and turns the pump off.

> **Status: built on the `feature/field-full-alert` branch, not deployed.**
> - **Tested:** the decision rule (unit tests), the SMS service with mocks (unit tests), and the whole flow on a local copy
>   with a **simulated probe and a mock SMS server**: one SMS when the soil fills, none when repeated within the gap, none on a
>   soil that was already wet all day. The "Soil now" banner was checked in English and Urdu.
> - **Not tested:** the 4G probe firmware on real hardware, real mobile coverage, and a real SMS provider.

## It stays open loop for the pump

The app **never switches the pump**. It tells the farmer that water has reached the probe; the farmer decides and acts. A
relay that switches the pump by itself is a different, gated step (see [OPEN_LOOP_AND_RISK.md](OPEN_LOOP_AND_RISK.md)).
The soil probe is optional: the app works without it.

## What the probe tells us, and what it does not

**One probe shows one spot.** "Enough water has reached the probe" is not "the whole field is full". The message and the card
both say to check the field. For flood irrigation, a probe near the **far end** of the field (where water arrives last) is a
safer signal than one near the pump, but **confirm placement with an agronomist**.

## When the alert fires

All of these must hold (these thresholds are our choice, to be confirmed with an agronomist):

1. at least **2 readings**;
2. the newest reading is **recent** (within 30 minutes), so old or back-filled data never alerts;
3. the **last 2 readings are both close to field capacity** (at least 85% of the way from the wilting point to field capacity);
4. the soil **got wetter in the last 3 hours** (a rise of at least 3 percentage points), so soil that was already wet does not trigger a "switch the pump off" message.

Then, if the farmer has **opted in to SMS** (the same setting as the daily advice) and has a phone number, **one SMS** is sent,
and **at most one every 3 hours** per farm. The "Soil now" card also shows a green banner while the condition holds.

## How the probe sends data from the field: GSM / 4G

A farmer who is at home is served by a probe with its own mobile
connection. The server side is **already built**: `POST /api/soil` accepts readings with an ingest key. What is needed is a probe
with a SIM:

- **Our sketch:** `hardware/paanipulse-probe-sim/paanipulse-probe-sim.ino` (ESP32 + an LTE modem with 3G/2G fallback + a capacitive sensor), linked once with its code.
  It wakes, reads, sends over HTTPS, and sleeps: every 15 minutes, or every 3 minutes while the moisture is changing quickly.
  **It has not been compiled or run on hardware.** See [SIM_DEVICES.md](SIM_DEVICES.md).
- **Or a ready-made sensor with a SIM or LoRa gateway** (for example WIT's WaterSense, if WIT can share its data by API or webhook).
  Those send to their own cloud, so a small adapter would be needed to forward readings to PaaniPulse.

## Before you use it for real

- **Set `TELEMETRY_INGEST_KEY` on the server.** Without it, anyone can send readings, which could trigger SMS messages (limited to one
  every 3 hours per farm, but still). With it, only your devices can.
- **SMS provider and cost.** The app sends through Twilio, which is about **Rs 133 per message** to Pakistan. One alert per irrigation is a
  handful per season, but use a **local SMS provider** before you scale.
- **Mobile coverage and 2G shutdown.** The probe needs a signal at the field. Avoid 2G-only modems.
- **Power.** A 4G modem needs a battery or solar supply. The sketch sleeps between readings to save power; battery life is not measured.
- **Wrong or missing data.** If the probe goes silent, no alert is sent (silence is not "full"). The card shows the age of the last reading.

## Where the code is

| | |
|---|---|
| Decision rule | `lib/engine/fieldFull.ts` |
| SMS check and rate limit | `lib/services/fieldFullAlert.ts`, message in `lib/services/smsText.ts` |
| Hooks | `POST /api/soil`, `POST /api/farms/{id}/soil`; the banner is in `components/farmer/SoilNow.tsx` |
| Simulator | `npm run simulate:soil -- --scenario filling` |
| SIM probe firmware (untested) | `hardware/paanipulse-probe-sim/` |
| Tests | `tests/fieldFull.test.ts`, `tests/fieldFullAlert.test.ts` |
