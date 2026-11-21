# Remote pump control: start and stop the pump from the phone

**The idea.** The farmer does not have to walk to the pump and wait for hours. From the app he starts the pump for a set time,
stops it when he wants, and can ask it to **stop by itself when the soil probe shows enough water**.

> **Status: part of the app, on for every farm that links a SIM control box.** The server can switch it off site-wide in an
> emergency with `PUMP_CONTROL_ENABLED=false`.
> - **Tested:** the safety rules (unit tests) and the whole flow with a **simulated SIM control box**: linking with the box's code and
>   the safety checklist, start and stop, refusals, the confirmation when the app advises keeping the pump off, automatic stop when a
>   soil probe fills, and the box keeping a run only until its **own stop time** when the network drops.
> - **Not tested:** any real relay, contactor, motor or solar pump drive. **Nothing here has been connected to a real pump yet.**
>   The SIM firmware has not been compiled. Follow the roll-out stages below before using it on a farmer's pump.

## This is no longer "advice only"

Everything else in PaaniPulse only advises. This feature **acts on a motor.** A mistake can flood a field, damage a pump, or hurt
someone. That is why it is built **gated and conservative**, is **off by default**, and should be introduced in stages (below).

It is an **optional extra for farmers who want it**, fitted by an electrician, and it does not replace the advice or the farmer's
judgement.

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
7. **The control box turns the relay off at power-up, after any reset, and whenever the server refuses it** (not linked, unknown box).
8. **Remote control is on only while a pump box is linked to the farm**, and linking it needs the safety checklist (electrician,
   overload and dry-run protection, a local switch). Unlinking the box switches control off and stops any run.
9. **The device endpoint is never open.** Each box has its own secret; the server takes the farm from the box's link, so a box can
   only ever control the pump it is linked to.
10. **Every start, stop and automatic stop is logged** (who, what, when).
11. **A weak network cannot make a run longer.** If a check-in fails (no signal, timeout, server trouble), the box keeps its state, so
    a 2G drop-out does not stop the pump every few minutes, but a run still ends at its own stop time. A stop pressed in the app
    reaches the box at its next successful check-in; the app says when the box will stop by itself.

## What it needs on the pump side (not provided)

A **control box** that switches the pump. Options, all to be chosen and installed by a **qualified electrician**:

- a correctly rated **contactor** driven by a relay, or
- the **start/stop input of the solar pump drive** (many drives have one; check the manual and the warranty), or
- a ready-made **GSM / 4G motor starter** (these exist commercially; we have not evaluated any; it would need our check-in
  protocol or an adapter).

The installation must have: overload and **dry-run protection**, an **emergency stop**, and a **local manual switch** that the
farmer can always use. The app cannot give these.

## How it works

- **Linking** (once): the farmer or installer types the code printed on the box in the **Pump control box** card (separate from the soil probe card) and confirms the safety checklist.
  See [SIM_DEVICES.md](SIM_DEVICES.md).
- **Farmer's screen** (the "Pump control" card, shown once a box is linked): shows ON or OFF and the time left; **Start pump** for N hours
  (default: the advised hours); a big red **Stop pump now**; and the tick box for automatic stop.
- **Control box**: has its own SIM and checks in over 4G, 3G or 2G (`POST /api/device/pump` with its own secret), reports whether the
  relay is on and which network it uses, and gets back `{ command, runForSeconds, pollSeconds }`: every 15 seconds while running,
  30 while off. It counts `runForSeconds` down locally and never extends a run by itself.
- **Automatic stop**: when soil readings arrive and the pump is running with the option on, the same "enough water" rule as the SMS
  alert (see [FIELD_FULL_ALERT.md](FIELD_FULL_ALERT.md)) can stop it. One probe shows one spot, so this is a convenience, not a guarantee.

## Setting up a box

1. Make the box's code and secret: `npm run device:new -- --kind pump`. Print the code on the box; flash the secret into
   `hardware/paanipulse-pump-box-sim/paanipulse-pump-box-sim.ino` (see [SIM_DEVICES.md](SIM_DEVICES.md)).
2. An electrician fits it with the protections above. Test it on a **lamp** first.
3. The farmer (or installer) links it on the farm page with the code and the safety checklist.
4. Try it without hardware: `npm run device:new -- --kind pump`, link the code, then `npm run simulate:pump -- --secret <secret>`.

## Roll-out stages (our proposal)

1. **Software only** (done): simulated SIM control box, including network loss.
2. **Bench**: the SIM sketch and a relay driving a lamp. Test 2G, 3G and 4G, signal loss, power loss, and a server outage.
3. **A test pump you own** (no crop at risk), installed by an electrician with the protections above.
4. **One consenting farmer**, with an installer present, short runs, and the local switch in reach.
5. Only then more farms.

## Limits and open questions

- **Liability.** If the pump runs when it should not, who is responsible? Decide terms with the installer before any real use.
- **Connectivity.** The box needs some mobile signal (2G is enough) at the pump. The hard stop time is the safety net when it has none.
  An external antenna helps where the signal is weak.
- **Certificates.** The SIM sketch relies on the modem's own TLS; check how your modem verifies the server's certificate.
- **No dry-run or overload logic in the app.** That belongs in the hardware.
- **Clock and time zones:** times on screen are Pakistan time; the run length is counted in seconds on the box.

## Several farms and motors

Each farm has its own pump and control box, so one account can control several motors separately (see [MULTI_FARM.md](MULTI_FARM.md)). One motor per farm is supported; a second motor needs a second farm.

## Where the code is

| | |
|---|---|
| Safety rules (pure) | `lib/engine/pumpControl.ts` |
| Server logic and audit log | `lib/services/pumpControl.ts`; tables `Pump` (new columns) and `PumpControlLog` |
| APIs | `/api/farms/{id}/pump` (farmer), `/api/farms/{id}/devices` (link the box), `/api/device/pump` (control box) |
| Screen | `components/farmer/PumpControl.tsx` |
| Simulated control box | `npm run simulate:pump -- --secret …` (`scripts/simulate-pump-device.ts`) |
| SIM firmware (untested) | `hardware/paanipulse-pump-box-sim/paanipulse-pump-box-sim.ino` |
| Tests | `tests/pumpControl.test.ts` |
