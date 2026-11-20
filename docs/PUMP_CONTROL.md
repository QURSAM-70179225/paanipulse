# Remote pump control (prototype): start and stop the pump from the phone

**The idea.** The farmer does not have to walk to the pump and wait for hours. From the app he starts the pump for a set time,
stops it when he wants, and can ask it to **stop by itself when the soil probe shows enough water**.

> **Status: built on the `feature/pump-control` branch, not deployed, and OFF unless the server sets `PUMP_CONTROL_ENABLED=true`.**
> - **Tested:** the safety rules (unit tests) and the whole flow on a local copy with a **simulated control box**: enabling by the
>   installer, start and stop, refusals, the confirmation when the app advises keeping the pump off, automatic stop when a simulated
>   soil probe fills, and the control box stopping the pump on its **own timer** after losing contact.
> - **Not tested:** any real relay, contactor, motor or solar pump drive. **Nothing here has been connected to a real pump.**
>   The bench sketch has not been compiled.

## This is no longer "advice only"

Everything else in PaaniPulse only advises. This feature **acts on a motor.** A mistake can flood a field, damage a pump, or hurt
someone. That is why it is built **gated and conservative**, is **off by default**, and should be introduced in stages (below).

It also goes against the mentors' main advice (stay open loop). It is therefore an **optional extra for farmers who want it**,
installed by an installer, and it does not replace the advice or the farmer's judgement.

## Safety rules built into the design

1. **Automation can only stop the pump, never start it.** "Stop automatically when the soil is full" is the only automatic action,
   and stopping is the safe direction. Starting always needs an explicit command from the farmer, with a duration.
2. **Every run has a hard stop time.** The control box enforces it on its **own clock**, so a lost phone, a dead network or a server
   outage cannot leave the pump running past it. (Tested: the simulated box switched off by itself with no contact.)
3. **Runs are limited to 0.5–12 hours.**
4. **A stop is always accepted, immediately.**
5. **The pump cannot be started from the app if the control box has not been heard from in 10 minutes**, because we would not know
   what it does. The screen says so.
6. **If the app advises keeping the pump off, starting asks for confirmation.** The choice is logged.
7. **The control box turns the relay off at power-up and whenever anything is wrong** (no network, bad answer, server error).
8. **Only an installer can switch remote control on for a pump**, after the box is fitted and tested. A farmer cannot.
9. **The device endpoint is never open.** It needs the device key (`TELEMETRY_INGEST_KEY`), even in a demo, and is refused if no key is configured.
10. **Every start, stop and automatic stop is logged** (who, what, when).

## What it needs on the pump side (not provided)

A **control box** that switches the pump. Options, all to be chosen and installed by a **qualified electrician**:

- a correctly rated **contactor** driven by a relay, or
- the **start/stop input of the solar pump drive** (many drives have one; check the manual and the warranty), or
- a ready-made **GSM / 4G motor starter** (these exist commercially; we have not evaluated any).

The installation must have: overload and **dry-run protection**, an **emergency stop**, and a **local manual switch** that the
farmer can always use. The app cannot give these.

## How it works

- **Farmer's screen** (the "Pump control" card, shown only when the installer enabled it): shows ON or OFF and the time left; **Start pump** for N hours
  (default: the advised hours); a big red **Stop pump now**; and the tick box for automatic stop.
- **Control box**: checks in with the server every 20 seconds or so (`POST /api/device/pump` with the device key), reports whether the
  relay is on, and gets back `{ command, runForSeconds }`. It counts `runForSeconds` down locally and never extends a run by itself.
- **Automatic stop**: when soil readings arrive and the pump is running with the option on, the same "enough water" rule as the SMS
  alert (see [FIELD_FULL_ALERT.md](FIELD_FULL_ALERT.md)) can stop it. One probe shows one spot, so this is a convenience, not a guarantee.

## Switching it on (pilot only)

1. On the server set `PUMP_CONTROL_ENABLED=true` and `TELEMETRY_INGEST_KEY`.
2. After the control box is fitted and tested, the **installer** enables it for that farm:
   `PUT /api/farms/{id}/pump-control` with `{"enabled": true}` (signed in as that farm's installer).
3. Try it on the bench: `npm run simulate:pump` (a software control box), then a **bench sketch** (`hardware/esp32-pump-relay/`)
   driving only a **lamp** on a low-voltage supply.

## Roll-out stages (our proposal)

1. **Software only** (done): simulated control box.
2. **Bench**: the sketch and a relay driving a lamp. Test Wi-Fi loss, power loss, and a server outage.
3. **A test pump you own** (no crop at risk), installed by an electrician with the protections above.
4. **One consenting farmer**, with an installer present, short runs, and the local switch in reach.
5. Only then more farms.

## Limits and open questions

- **Liability.** If the pump runs when it should not, who is responsible? Decide terms with the installer before any real use.
- **Connectivity.** The box needs a Wi-Fi or mobile signal at the pump. The hard stop time is the safety net when it has none.
- **Wi-Fi bench sketch** has certificate checking off. Production firmware needs proper certificate handling.
- **No dry-run or overload logic in the app.** That belongs in the hardware.
- **Clock and time zones:** times on screen are Pakistan time; the run length is counted in seconds on the box.

## Where the code is

| | |
|---|---|
| Safety rules (pure) | `lib/engine/pumpControl.ts` |
| Server logic and audit log | `lib/services/pumpControl.ts`; tables `Pump` (new columns) and `PumpControlLog` |
| APIs | `/api/farms/{id}/pump` (farmer), `/api/farms/{id}/pump-control` (installer), `/api/device/pump` (control box) |
| Screen | `components/farmer/PumpControl.tsx` |
| Simulated control box | `npm run simulate:pump` (`scripts/simulate-pump-device.ts`) |
| Bench sketch (untested) | `hardware/esp32-pump-relay/esp32-pump-relay.ino` |
| Tests | `tests/pumpControl.test.ts` |
