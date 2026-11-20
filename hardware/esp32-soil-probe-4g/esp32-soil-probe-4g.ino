/*
 * PaaniProbe 4G: ESP32 + capacitive soil-moisture sensor + a 4G (LTE) modem. It wakes up, reads the soil moisture, sends the
 * reading to PaaniPulse over the mobile network (no phone, no Wi-Fi, no Bluetooth), and goes back to sleep.
 * This is what lets a farmer stay at home: the server sees the readings and sends an SMS when enough water has reached the probe.
 *
 * STATUS: PROTOTYPE. NOT compiled or run on real hardware by the author. Library APIs (TinyGSM, ArduinoHttpClient) and modem
 * behaviour differ between versions and boards: expect to adjust. Read docs/SOIL_PROBE_4G.md before building.
 *
 * Hardware (assumed): ESP32 dev board; a 4G modem supported by TinyGSM, here SIM7600 (UART); capacitive soil sensor (AOUT -> GPIO34,
 * 3V3, GND); a SIM with a data plan; a power supply that can deliver the modem's peak current (a 4G modem can draw 1 A or more for a
 * moment: a battery or a good regulator, not the ESP32's own 3V3 pin).
 * Avoid 2G-only modems (for example SIM800L): 2G networks are being switched off in many places.
 *
 * Server: POST https://<SERVER_HOST>/api/soil with the header x-ingest-key (set TELEMETRY_INGEST_KEY on the server before real use).
 * The server stamps the reading with its own time, so the device needs no clock.
 */
#define TINY_GSM_MODEM_SIM7600
#define TINY_GSM_RX_BUFFER 1024
#include <TinyGsmClient.h>
#include <ArduinoHttpClient.h>

// ---- settings you must change ----------------------------------------------------------------------------------
const char APN[] = "internet";            // your SIM's APN
const char SERVER_HOST[] = "paanipulse.onrender.com";
const char FARM_ID[] = "karamat";         // the farm this probe belongs to (see the farm's page address)
const char INGEST_KEY[] = "CHANGE-ME";    // the same value as TELEMETRY_INGEST_KEY on the server
const char DEVICE_ID[] = "probe-4g-1";
const int AIR_RAW = 3200;                 // raw value in dry air.   CALIBRATE (see docs/SOIL_PROBE_DIY.md)
const int WATER_RAW = 1400;               // raw value in water.     CALIBRATE
// ---- pins and timing -------------------------------------------------------------------------------------------
const int SENSOR_PIN = 34;
const int MODEM_RX = 16, MODEM_TX = 17, MODEM_PWRKEY = 4;
const uint64_t SLEEP_NORMAL_S = 15 * 60;  // report every 15 minutes
const uint64_t SLEEP_FAST_S = 3 * 60;     // every 3 minutes while the moisture is changing quickly (an irrigation)
const float FAST_CHANGE_PP = 1.5f;        // percentage points of change that count as "changing quickly"
// ------------------------------------------------------------------------------------------------------------------

RTC_DATA_ATTR float lastMoisture = -1;    // kept in RAM across deep sleep

HardwareSerial modemSerial(1);
TinyGsm modem(modemSerial);
TinyGsmClientSecure netClient(modem);
HttpClient http(netClient, SERVER_HOST, 443);

int readRaw() {
  long sum = 0;
  for (int i = 0; i < 16; i++) { sum += analogRead(SENSOR_PIN); delay(5); }
  return (int)(sum / 16);
}

float rawToMoisture(int raw) {
  float m = (float)(AIR_RAW - raw) * 100.0f / (float)(AIR_RAW - WATER_RAW);
  return m < 0 ? 0 : (m > 100 ? 100 : m);
}

void modemPower() {
  pinMode(MODEM_PWRKEY, OUTPUT);
  digitalWrite(MODEM_PWRKEY, LOW); delay(100);
  digitalWrite(MODEM_PWRKEY, HIGH); delay(1000);
  digitalWrite(MODEM_PWRKEY, LOW);
}

bool sendReading(float moisture, int raw) {
  modemSerial.begin(115200, SERIAL_8N1, MODEM_RX, MODEM_TX);
  modemPower();
  delay(3000);
  if (!modem.restart()) return false;
  if (!modem.waitForNetwork(60000L)) return false;
  if (!modem.gprsConnect(APN)) return false;

  String body = String("{\"farmId\":\"") + FARM_ID + "\",\"deviceId\":\"" + DEVICE_ID + "\",\"moisture_pct\":" + String(moisture, 1) +
                ",\"source\":\"sensor\"}";
  http.beginRequest();
  http.post("/api/soil");
  http.sendHeader("Content-Type", "application/json");
  http.sendHeader("Content-Length", body.length());
  http.sendHeader("x-ingest-key", INGEST_KEY);
  http.beginBody();
  http.print(body);
  http.endRequest();
  int status = http.responseStatusCode();
  http.stop();
  modem.gprsDisconnect();
  modem.poweroff();
  Serial.printf("raw=%d moisture=%.1f -> HTTP %d\n", raw, moisture, status);
  return status == 200;
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  int raw = readRaw();
  float moisture = rawToMoisture(raw);
  bool ok = sendReading(moisture, raw);
  bool changingFast = lastMoisture >= 0 && fabsf(moisture - lastMoisture) >= FAST_CHANGE_PP;
  if (ok) lastMoisture = moisture;  // if sending failed, compare again next time
  uint64_t sleepS = changingFast ? SLEEP_FAST_S : SLEEP_NORMAL_S;
  Serial.printf("sleeping %llu s (%s)\n", sleepS, changingFast ? "moisture changing" : "normal");
  esp_sleep_enable_timer_wakeup(sleepS * 1000000ULL);
  esp_deep_sleep_start();
}

void loop() {}  // never reached: the board sleeps at the end of setup()
