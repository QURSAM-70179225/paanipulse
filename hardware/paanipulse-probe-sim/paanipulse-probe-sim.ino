/*
 * PaaniPulse SIM soil probe: ESP32 + capacitive soil-moisture sensor + a mobile modem with its own SIM.
 * It needs no phone, no Wi-Fi and no Bluetooth. The farmer links it ONCE in the app by typing the code printed on the box; after that
 * it reports by itself wherever the farmer is.
 *
 * What it does on every wake-up:
 *  1. Reads the soil (16 samples, averaged) and stores the reading in RTC memory (kept during deep sleep).
 *  2. Joins whatever network is there: 4G (LTE), 3G or 2G. The modem chooses automatically.
 *  3. Sends ALL stored readings in small batches, oldest first. Each reading carries its age in seconds, so the board needs no clock.
 *  4. If there is no network, the readings stay stored (up to MAX_STORED, about 2 days) and go out at the next wake that has one.
 *     After 3 failed tries in a row it only tries once an hour, to save the battery, but it keeps reading every 15 minutes.
 *  5. Powers the modem off and deep-sleeps: 15 minutes, or 3 minutes while the moisture is changing fast (an irrigation).
 *
 * STATUS: NOT compiled or run on hardware by the author. TinyGSM and ArduinoHttpClient versions and modem firmware differ:
 * expect to adjust. Read docs/SIM_DEVICES.md first. Stored readings are lost if the battery is fully disconnected.
 *
 * Hardware (assumed): ESP32 dev board; a modem that does LTE with 3G and 2G fallback and is supported by TinyGSM, here a SIM7600
 * "-H" variant (UART); capacitive soil sensor (AOUT -> GPIO34, 3V3, GND); a SIM with a small data plan; a battery and regulator
 * that can deliver the modem's peak current (often 1-2 A for a moment), not the ESP32's own 3V3 pin.
 *
 * Server: POST https://<SERVER_HOST>/api/device/soil, header "Authorization: Bearer <DEVICE_SECRET>",
 *         body {"n":"2G","q":14,"r":[[ageSeconds,moisture,temperature],...]}.
 */
#define TINY_GSM_MODEM_SIM7600
#define TINY_GSM_RX_BUFFER 1024
#include <TinyGsmClient.h>
#include <ArduinoHttpClient.h>

// ---- settings you must change ----------------------------------------------------------------------------------
const char APN[] = "";                    // your SIM company's internet APN ("" lets many SIMs use their default)
const char SERVER_HOST[] = "paanipulse.onrender.com";
const char DEVICE_SECRET[] = "PASTE-THE-SECRET";  // from "npm run device:new -- --kind probe" (one per box; never share it)
const int AIR_RAW = 3200;                 // raw value in dry air.   CALIBRATE (see docs/SIM_DEVICES.md)
const int WATER_RAW = 1400;               // raw value in water.     CALIBRATE
// ---- pins and timing -------------------------------------------------------------------------------------------
const int SENSOR_PIN = 34;
const int MODEM_RX = 16, MODEM_TX = 17, MODEM_PWRKEY = 4;
const uint32_t SLEEP_NORMAL_S = 15 * 60;  // read every 15 minutes
const uint32_t SLEEP_FAST_S = 3 * 60;     // every 3 minutes while the moisture changes quickly
const float FAST_CHANGE_PP = 1.5f;        // percentage points that count as "changing quickly"
const uint32_t NETWORK_WAIT_MS = 120000;  // 2G can take a while to register
const uint8_t BACKOFF_AFTER = 3;          // failed tries in a row before backing off
const uint32_t BACKOFF_EVERY_S = 60 * 60; // then try once an hour
const int MAX_STORED = 192;               // 2 days at one reading every 15 minutes
const int SEND_BATCH = 48;                // readings per upload (about 1 kB, fine on 2G)
// ------------------------------------------------------------------------------------------------------------------

struct Reading { uint32_t at; int16_t pct10; };  // at = seconds on the probe's own running clock; moisture x10

RTC_DATA_ATTR Reading stored[MAX_STORED];
RTC_DATA_ATTR int storedCount = 0;
RTC_DATA_ATTR uint32_t clockS = 0;        // seconds since first power-up (advanced by each sleep)
RTC_DATA_ATTR float lastMoisture = -1;
RTC_DATA_ATTR uint8_t failures = 0;
RTC_DATA_ATTR uint32_t lastTryS = 0;

HardwareSerial modemSerial(1);
TinyGsm modem(modemSerial);
TinyGsmClientSecure netClient(modem);
HttpClient http(netClient, SERVER_HOST, 443);

uint32_t nowS() { return clockS + millis() / 1000; }

int readRaw() {
  long sum = 0;
  for (int i = 0; i < 16; i++) { sum += analogRead(SENSOR_PIN); delay(5); }
  return (int)(sum / 16);
}

float rawToMoisture(int raw) {
  float m = (float)(AIR_RAW - raw) * 100.0f / (float)(AIR_RAW - WATER_RAW);
  return m < 0 ? 0 : (m > 100 ? 100 : m);
}

void store(float moisture) {
  if (storedCount == MAX_STORED) {  // full: drop the oldest
    memmove(&stored[0], &stored[1], sizeof(Reading) * (MAX_STORED - 1));
    storedCount--;
  }
  stored[storedCount++] = { nowS(), (int16_t)lroundf(moisture * 10) };
}

void dropOldest(int n) {
  memmove(&stored[0], &stored[n], sizeof(Reading) * (storedCount - n));
  storedCount -= n;
}

void modemPowerOn() {
  pinMode(MODEM_PWRKEY, OUTPUT);
  digitalWrite(MODEM_PWRKEY, LOW); delay(100);
  digitalWrite(MODEM_PWRKEY, HIGH); delay(1000);
  digitalWrite(MODEM_PWRKEY, LOW);
}

// "4G", "3G" or "2G", from the modem's own report of the network it is on.
String networkName() {
  modem.sendAT(GF("+CPSI?"));
  String r;
  if (modem.waitResponse(3000L, r) != 1) return "";
  if (r.indexOf("LTE") >= 0) return "4G";
  if (r.indexOf("WCDMA") >= 0 || r.indexOf("HSPA") >= 0) return "3G";
  if (r.indexOf("GSM") >= 0 || r.indexOf("EDGE") >= 0 || r.indexOf("GPRS") >= 0) return "2G";
  return "";
}

bool connectNetwork() {
  modemSerial.begin(115200, SERIAL_8N1, MODEM_RX, MODEM_TX);
  modemPowerOn();
  delay(3000);
  if (!modem.init() && !modem.restart()) { Serial.println("modem did not start"); return false; }
  modem.setNetworkMode(2);  // automatic: LTE, else 3G, else 2G
  if (!modem.waitForNetwork(NETWORK_WAIT_MS)) { Serial.println("no network"); return false; }
  if (!modem.gprsConnect(APN)) { Serial.println("no data connection"); return false; }
  return true;
}

// Sends readings [0, n) and returns the HTTP status (or a negative number on a network error).
int sendBatch(int n, const String& net, int csq) {
  uint32_t t = nowS();
  String body = "{";
  if (net.length()) body += "\"n\":\"" + net + "\",";
  if (csq >= 0 && csq <= 31) body += "\"q\":" + String(csq) + ",";
  body += "\"r\":[";
  for (int i = 0; i < n; i++) {
    if (i) body += ",";
    body += "[" + String(t - stored[i].at) + "," + String(stored[i].pct10 / 10.0f, 1) + "]";
  }
  body += "]}";
  http.setHttpResponseTimeout(60000);
  http.beginRequest();
  int err = http.post("/api/device/soil");
  if (err != 0) { http.stop(); return -1; }
  http.sendHeader("Content-Type", "application/json");
  http.sendHeader("Content-Length", body.length());
  http.sendHeader("Authorization", String("Bearer ") + DEVICE_SECRET);
  http.beginBody();
  http.print(body);
  http.endRequest();
  int status = http.responseStatusCode();
  http.skipResponseHeaders();
  http.stop();
  return status;
}

bool uploadAll() {
  if (!connectNetwork()) return false;
  String net = networkName();
  int csq = modem.getSignalQuality();
  bool ok = true;
  while (storedCount > 0) {
    int n = storedCount < SEND_BATCH ? storedCount : SEND_BATCH;
    int status = sendBatch(n, net, csq);
    Serial.printf("sent %d reading(s) on %s (signal %d) -> %d\n", n, net.c_str(), csq, status);
    if (status == 200) { dropOldest(n); continue; }
    ok = false;  // 409: not linked to a farm yet; 401: wrong secret; <0: network. Keep the readings either way.
    break;
  }
  modem.gprsDisconnect();
  modem.poweroff();
  return ok;
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  int raw = readRaw();
  float moisture = rawToMoisture(raw);
  store(moisture);
  Serial.printf("raw=%d moisture=%.1f stored=%d\n", raw, moisture, storedCount);

  bool tryNow = failures < BACKOFF_AFTER || nowS() - lastTryS >= BACKOFF_EVERY_S;
  if (tryNow) {
    lastTryS = nowS();
    if (uploadAll()) failures = 0;
    else if (failures < 255) failures++;
  } else {
    Serial.println("backing off: will try the network later");
  }

  bool changingFast = lastMoisture >= 0 && fabsf(moisture - lastMoisture) >= FAST_CHANGE_PP;
  lastMoisture = moisture;
  uint32_t sleepS = changingFast ? SLEEP_FAST_S : SLEEP_NORMAL_S;
  clockS = nowS() + sleepS;  // the clock carries on through the sleep
  Serial.printf("sleeping %lu s\n", (unsigned long)sleepS);
  esp_sleep_enable_timer_wakeup((uint64_t)sleepS * 1000000ULL);
  esp_deep_sleep_start();
}

void loop() {}  // never reached: the board sleeps at the end of setup()
