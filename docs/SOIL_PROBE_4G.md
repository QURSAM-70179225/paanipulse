# 4G soil probe (prototype): parts, wiring, setup

A probe that sends its own readings over the mobile network, so it works with the farmer at home. The server side is built;
**the firmware is a prototype that has not been compiled or run on hardware.**

## Parts

| Part | Notes |
|---|---|
| ESP32 development board | |
| **4G (LTE) modem** supported by TinyGSM, for example SIM7600 | Avoid 2G-only modems (SIM800L): 2G networks are being switched off in many places. Check which bands your network uses. |
| Capacitive soil-moisture sensor | AOUT to GPIO34, 3V3, GND. Calibrate (see [SOIL_PROBE_DIY.md](SOIL_PROBE_DIY.md)). |
| SIM with a data plan | Each reading is about 150 bytes: about 15,000 bytes a day at one reading every 15 minutes, which is small. Plan prices were not checked. |
| Power: battery and a regulator that can deliver the modem's peak current (often 1 A or more) | An ESP32's 3V3 pin cannot power a 4G modem. A small solar panel can recharge the battery. Battery life is not measured. |
| Waterproof box, an antenna, and a way to keep the blade in the soil | |

## Set up

1. Install the Arduino IDE, the **ESP32 board package**, and the libraries **TinyGSM** and **ArduinoHttpClient**.
2. Open `hardware/esp32-soil-probe-4g/esp32-soil-probe-4g.ino` and set: `APN`, `SERVER_HOST`, `FARM_ID`, `INGEST_KEY`, `DEVICE_ID`, and the two calibration numbers.
3. On the server, set **`TELEMETRY_INGEST_KEY`** to the same value as `INGEST_KEY`.
4. Flash. Open the Serial Monitor at 115200: each wake prints `raw=… moisture=… -> HTTP 200` and the sleep time.
5. In the app, open the farm page: the **Soil now** card appears. Turn on **SMS** in Account settings to get the "enough water" message.

## How it behaves

- Wakes, reads 16 times and averages, powers the modem, joins the network, **POSTs JSON over HTTPS**, powers the modem off, and deep-sleeps.
- Reports every **15 minutes**, or every **3 minutes** while the moisture moved by 1.5 points or more since the last report (an irrigation).
- If the network or the POST fails, it tries again at the next wake. Readings are **not stored** on the board while it is offline.

## Limits

- Not tested on hardware: modem power-up timing, APN settings and SSL support differ between modems and library versions.
- Needs mobile signal at the field.
- The ingest key sits in the firmware: anyone with the board could read it. Use a key only for devices and rotate it if a probe is lost.
- One probe shows one spot of the field.
