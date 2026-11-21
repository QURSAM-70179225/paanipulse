# SIM devices: soil probe and pump control box

Both devices have **their own SIM** and talk to PaaniPulse over the mobile network. There is no Bluetooth and no Wi-Fi.
The farmer **links a device once** by typing the code printed on it; after that it works wherever the farmer is: at home, in town,
or with his phone switched off.

> **Status**
> - **Built and tested in software:** device codes and keys, linking and unlinking, the probe's batch upload (including readings
>   stored while offline), the pump box check-in with its own key, the separate Soil probe and Pump control box cards, and both flows end to end with simulated
>   devices (`npm run simulate:sim-probe`, `npm run simulate:pump -- --secret …`).
> - **Not tested:** the two firmware sketches have **not been compiled or run on hardware**, and nothing has been connected to a
>   real pump. Modem behaviour on 2G, 3G and 4G in Pakistan is not measured.

## How a farmer links a device (once)

1. The probe and the pump box are **separate devices with separate cards** on the farm page: **Soil probe (SIM)** further down, and
   **Pump control box (SIM)** near the top, under Pump control.
2. In the right card, type the code printed on the box, for example `PP-7K3Q-9M2X` (lower case, spaces and missing dashes are fine),
   and tap **Link probe** or **Link pump box**. A probe code typed in the pump card (or the other way round) is refused with a message
   saying which card it belongs in.
3. **Probe:** linked at once. Its readings appear in **Soil now**.
   **Pump control box:** the app shows a safety checklist (an electrician fitted the box with overload and dry-run protection, and
   there is a local switch at the pump). After the farmer ticks it, the box is linked and **Pump control** appears just above it:
   from there the farmer switches the motor on and off, sitting anywhere.
4. That is all. The device needs no phone nearby. To move it to another farm, tap the bin icon and link it there.

A farm can have several probes (several spots) and one pump box (one motor). An installer who manages the farm can link and
unlink devices the same way.

## Weak or no internet

| | Soil probe | Pump control box |
|---|---|---|
| Network | 4G, else 3G, else 2G: the modem picks automatically | same |
| Data per report | about 100 bytes per reading, sent in batches of up to 48 | about 300 bytes per check-in, connection kept open |
| No network | keeps up to 192 readings (2 days) in memory and sends them all when the network is back, with their real times | keeps the current state; a run **still ends at its own stop time** |
| Many failures | keeps reading every 15 min, tries the network once an hour (saves battery) | retries every 10 s; restarts the modem after 8 failures |
| Not linked yet | keeps its readings and tries again later | relay stays OFF |

The app shows each device's last report, its network (2G, 3G or 4G) and signal (good, fair, weak).

## Making devices (for whoever builds the boxes)

1. Run against the database the devices will report to (production for real boxes):
   ```
   npm run device:new -- --kind probe --count 10
   npm run device:new -- --kind pump --count 2
   ```
   Each line prints `kind,code,secret`. **Print the code on a sticker on the box. Put the secret into that box's firmware.**
   The secret is shown only once; the server keeps only its SHA-256 hash.
2. Flash the firmware with the box's own secret:
   - Probe: `hardware/paanipulse-probe-sim/paanipulse-probe-sim.ino`
   - Pump box: `hardware/paanipulse-pump-box-sim/paanipulse-pump-box-sim.ino` (read [PUMP_CONTROL.md](PUMP_CONTROL.md) first)
3. Set `APN` if the SIM needs one (ask the SIM company), and calibrate the probe (below).
4. Arduino IDE needs the **ESP32 board package** and the libraries **TinyGSM** and **ArduinoHttpClient**.

## Parts

| Part | Notes |
|---|---|
| ESP32 development board | |
| Modem with **LTE plus 3G and 2G fallback**, supported by TinyGSM | The sketches assume a SIM7600 "-H" variant. A 4G-only (Cat-M/NB-IoT) modem would lose the 2G fallback. Check the bands your SIM company uses. |
| SIM with a small data plan | A probe sends roughly 10–15 kB a day; a pump box more while it is checking in (about 30 kB an hour while off, more while running). Prices not checked. |
| Battery and a regulator for the modem's peak current (1–2 A for a moment) | Not the ESP32's 3V3 pin. A small solar panel can charge the probe's battery. Battery life not measured. |
| Probe only: capacitive soil-moisture sensor | AOUT to GPIO34, 3V3, GND. |
| Pump box only: one relay module | Drives a contactor or the drive's start/stop input, fitted by an electrician. Never the motor directly. |
| Waterproof box and an external antenna | An antenna helps a lot where the signal is weak. |

## Calibrating the probe

A raw reading is not a percentage. For each sensor: flash the sketch, open the Serial Monitor at 115200, note the raw value with the
probe **dry in air** (`AIR_RAW`) and with the blade **in a glass of water** up to its line (`WATER_RAW`). Put both numbers in the
sketch and flash again. Readings outside 0–100 are clamped.

## Security

- Each device has its **own secret**. A lost box can be unlinked in the app and its secret stops working for that farm; it cannot
  speak for any other device.
- The device never sends a farm id; the server takes the farm from the link, so a box cannot write to a farm it is not linked to.
- The secret sits in the firmware: anyone holding the board could read it. Unlink a stolen box.
- Pump commands also need the pump box to be linked with the safety checklist; a probe's secret cannot control a pump.

## Where the code is

| | |
|---|---|
| Codes, upload format, signal words (pure) | `lib/devices/code.ts` |
| Making, linking, recognising devices | `lib/services/devices.ts`; table `Device` (migration `sim_devices`) |
| APIs | `POST /api/device/soil` (probe), `POST /api/device/pump` (pump box), `GET/POST /api/farms/{id}/devices`, `DELETE /api/farms/{id}/devices/{deviceId}` |
| Screen | `components/farmer/DeviceCard.tsx` (one card per kind: probe, pump box) |
| Make devices | `npm run device:new` (`scripts/device-new.ts`) |
| Simulators | `npm run simulate:sim-probe`, `npm run simulate:pump -- --secret …` |
| Firmware (untested) | `hardware/paanipulse-probe-sim/`, `hardware/paanipulse-pump-box-sim/` |
| Tests | `tests/devices.test.ts` |
