# DIY soil probe over Bluetooth (prototype)

A cheap probe you can build yourself: an **ESP32** board reads a **capacitive soil-moisture sensor** and sends the
reading over **Bluetooth Low Energy** to the farmer's phone. The PaaniPulse page on the phone relays it to the server.

> **Status: prototype, on the `feature/diy-bluetooth-probe` branch, not deployed.**
> - **Tested:** the phone-side software, with a **mocked** Bluetooth device in an automated browser: connecting, live readings,
>   the stored-history transfer, uploads, and the offline queue. Plus unit tests of the protocol helpers.
> - **Not tested:** the **firmware on real hardware**. The sketch has not been compiled or run by its author. Expect to
>   fix small differences between versions of the ESP32 Arduino core.

## What you need

| Part | Notes |
|---|---|
| ESP32 development board | Any common ESP32 dev board with Bluetooth |
| Capacitive soil-moisture sensor | The **capacitive** type (not the two-prong resistive kind, which corrodes). Check the listing: I believe the common module is sold as "HW-390 v1.2", but verify. |
| 3 jumper wires, a USB cable and a power bank | Power from USB for the prototype |
| A waterproof box for the board | Keep the electronics out of the soil and rain; only the sensing blade goes in the ground |

Prices are not listed here: we could not verify local prices. Check local electronics shops.

## Wiring (3.3 V)

| Sensor | ESP32 |
|---|---|
| VCC | 3V3 |
| GND | GND |
| AOUT | GPIO34 (an input-only ADC pin) |

Power the sensor from **3.3 V**, so its output never exceeds what the ESP32's input can take.

## Calibrate

A raw reading is not a percentage. Calibrate each sensor:

1. Flash the sketch as is, and open the Serial Monitor at 115200 (add a `Serial.println(readRaw());` in `loop()` if you want to see raw values).
2. With the probe **dry in air**, note the raw value. This is `AIR_RAW`.
3. With the sensing blade in a glass of **water**, up to the line marked on the sensor, note the value. This is `WATER_RAW`.
4. Put both numbers at the top of the sketch and flash again.

The percentage is then a straight line between the two. It is a **relative** scale, not true volumetric water content,
and it varies with soil type and salinity. A real field needs a check against known wet and dry soil.

## Flash the board

1. Install the Arduino IDE and the **ESP32 board package** (Boards Manager, "esp32" by Espressif).
2. Open `hardware/esp32-soil-probe/esp32-soil-probe.ino`, choose your ESP32 board and port, and upload.
3. The Serial Monitor prints "PaaniProbe ready". The board advertises as **PaaniProbe-1**.

## Use it in the app

1. Use **Chrome on an Android phone**. Web Bluetooth is not available in Safari on iPhone
   ([browser support](https://caniuse.com/web-bluetooth)); an iPhone would need a third-party browser or a native app.
2. Sign in as the farmer and open the farm page with `?probe=1` on the end, for example
   `https://your-site/farmer/<farmId>?probe=1`. (The card also shows by itself once a farm has probe readings.)
3. Tap **Connect probe** and choose **PaaniProbe-1**.
4. The card shows the live moisture. One reading a minute is sent to the server, and the **Soil now** card appears.

### What happens when the phone is away
The probe stores one reading every 15 minutes (the last 24 hours) in memory. When the phone connects, it asks for them and
uploads them with their real times, then the probe clears them. If the phone has **no internet**, readings wait in the
phone's storage and are sent when it is back online.

## How it works

- **BLE service** `7d3f0001-5a0e-4f6b-9a3c-2b1e6c4d8a10` with three characteristics:
  `…0002` *reading* (notify): `"24.5,1834"` (moisture %, raw);
  `…0003` *history* (notify): `"5400,24.5"` (age in seconds, moisture %) and finally `"END"`;
  `…0004` *control* (write): `"H"` asks for the history.
  The same UUIDs are in `lib/bluetooth/probe.ts` and the sketch: change them in both places.
- **Upload:** the phone posts to `POST /api/farms/{id}/soil`, which needs the farmer's sign-in. No ingest key is put in the
  browser. Readings are stored with `source: "sensor"` and shown by the **Soil now** card, as a **second opinion only**:
  they never change the advised pump hours.

## Limits you should know

- **Short range.** Bluetooth reaches roughly 10 metres. A reading only reaches the app while the phone is near the probe,
  except for the 24 hours of stored readings.
- **RAM storage.** Stored readings are lost if the probe loses power. Deep sleep and battery or solar power are not built.
- **Android Chrome only** in the browser.
- **Accuracy.** A capacitive probe is a low-cost indicator. Calibrate it, and do not use it for precise measurement.
- **Open access.** Anyone near the probe could connect to it over Bluetooth; it only holds moisture readings, but there is no pairing or encryption.
- **Waterproofing and sealing** are your job.

## Where the code is

| | |
|---|---|
| Firmware | `hardware/esp32-soil-probe/esp32-soil-probe.ino` |
| Protocol helpers | `lib/bluetooth/probe.ts` |
| Phone card (Web Bluetooth, queue) | `components/farmer/ProbeConnect.tsx` |
| Authenticated upload | `POST` in `app/api/farms/[id]/soil/route.ts` |
| Tests | `tests/probe.test.ts` |
