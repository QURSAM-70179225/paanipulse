/*
 * PaaniPulse SIM pump control box: ESP32 + a mobile modem with its own SIM + one relay that drives the pump's contactor or the
 * solar pump drive's start/stop input. The farmer links it ONCE in the app with the code printed on the box (and confirms the safety
 * checklist); after that he can start and stop the pump from his phone wherever he is, over 4G, 3G or 2G.
 *
 * !!! SAFETY !!!
 * - The relay must NOT switch the motor directly. It drives a correctly rated contactor, or the drive's own start/stop input, fitted
 *   by a QUALIFIED ELECTRICIAN, with overload and dry-run protection, an emergency stop, and a local manual switch the farmer can
 *   always use. Check the pump drive's manual and warranty first. Test on a lamp before any pump.
 * - NOT compiled or run on hardware by the author. TinyGSM, ArduinoHttpClient and ESP32 core versions differ: expect to adjust.
 *   Read docs/PUMP_CONTROL.md and docs/SIM_DEVICES.md first.
 *
 * Behaviour (the same safety rules as the server):
 * - The relay is OFF at power-up and after any reset (the watchdog resets the board if it ever hangs).
 * - Every "on" order carries runForSeconds. The box counts it down on its OWN clock and switches off when it ends, even if it never
 *   reaches the server again. It never extends a run by itself.
 * - Weak network: if a check-in fails (no signal, timeout, server busy), the box KEEPS the current state. A run still ends at its own
 *   stop time, so a lost network can never keep the pump on longer than the farmer asked. A stop pressed in the app reaches the box
 *   at its next successful check-in.
 * - If the server says the box is not linked or not known (401/404/409), the relay goes OFF.
 * - Checks in every pollSeconds (the server says: 15 s while running, 30 s while off) and keeps the data connection open between
 *   check-ins to save data on 2G.
 */
#define TINY_GSM_MODEM_SIM7600
#define TINY_GSM_RX_BUFFER 1024
#include <TinyGsmClient.h>
#include <ArduinoHttpClient.h>
#include <esp_task_wdt.h>

// ---- settings you must change -----------------------------------------------------------------------------------
const char APN[] = "";                    // your SIM company's internet APN ("" lets many SIMs use their default)
const char SERVER_HOST[] = "paanipulse.onrender.com";
const char DEVICE_SECRET[] = "PASTE-THE-SECRET";  // from "npm run device:new -- --kind pump" (one per box; never share it)
const int RELAY_PIN = 26;                 // relay module input
const bool RELAY_ACTIVE_LOW = true;       // most relay modules switch on when the pin is LOW
// ---- pins and timing ----------------------------------------------------------------------------------------------
const int MODEM_RX = 16, MODEM_TX = 17, MODEM_PWRKEY = 4;
const uint32_t NETWORK_WAIT_MS = 20000;   // short waits, so the local timer is checked often
const uint8_t RESTART_AFTER = 8;          // failed check-ins in a row before the modem is restarted
const uint32_t WATCHDOG_S = 120;
// -----------------------------------------------------------------------------------------------------------------

bool relayOn = false;
unsigned long stopAtMs = 0;     // millis() at which the current run must end
unsigned long nextPollMs = 0;
uint32_t pollS = 30;
uint8_t failures = 0;

HardwareSerial modemSerial(1);
TinyGsm modem(modemSerial);
TinyGsmClientSecure netClient(modem);
HttpClient http(netClient, SERVER_HOST, 443);

void setRelay(bool on, const char* why) {
  if (on != relayOn) Serial.printf("RELAY %s (%s)\n", on ? "ON" : "OFF", why);
  relayOn = on;
  digitalWrite(RELAY_PIN, (on != RELAY_ACTIVE_LOW) ? HIGH : LOW);
}

// The local timer always wins over anything the server says, and over a missing network.
void enforceTimer() {
  if (relayOn && (long)(millis() - stopAtMs) >= 0) setRelay(false, "run time ended (local timer)");
}

void modemPowerOn() {
  pinMode(MODEM_PWRKEY, OUTPUT);
  digitalWrite(MODEM_PWRKEY, LOW); delay(100);
  digitalWrite(MODEM_PWRKEY, HIGH); delay(1000);
  digitalWrite(MODEM_PWRKEY, LOW);
}

String networkName() {
  modem.sendAT(GF("+CPSI?"));
  String r;
  if (modem.waitResponse(3000L, r) != 1) return "";
  if (r.indexOf("LTE") >= 0) return "4G";
  if (r.indexOf("WCDMA") >= 0 || r.indexOf("HSPA") >= 0) return "3G";
  if (r.indexOf("GSM") >= 0 || r.indexOf("EDGE") >= 0 || r.indexOf("GPRS") >= 0) return "2G";
  return "";
}

bool ensureNetwork() {
  if (!modem.isNetworkConnected()) {
    enforceTimer();
    if (!modem.waitForNetwork(NETWORK_WAIT_MS)) return false;
  }
  enforceTimer();
  if (!modem.isGprsConnected() && !modem.gprsConnect(APN)) return false;
  return true;
}

long jsonNumber(const String& r, const char* key) {
  int i = r.indexOf(key);
  return i < 0 ? -1 : r.substring(i + strlen(key)).toInt();
}

void checkIn() {
  if (!ensureNetwork()) { failures++; Serial.println("no network; keeping the current state"); return; }
  String net = networkName();
  int csq = modem.getSignalQuality();
  String body = String("{\"on\":") + (relayOn ? "true" : "false");
  if (net.length()) body += ",\"n\":\"" + net + "\"";
  if (csq >= 0 && csq <= 31) body += ",\"q\":" + String(csq);
  body += "}";

  http.setHttpResponseTimeout(30000);
  http.connectionKeepAlive();
  http.beginRequest();
  if (http.post("/api/device/pump") != 0) { http.stop(); failures++; Serial.println("could not connect; keeping the current state"); return; }
  http.sendHeader("Content-Type", "application/json");
  http.sendHeader("Content-Length", body.length());
  http.sendHeader("Authorization", String("Bearer ") + DEVICE_SECRET);
  http.beginBody();
  http.print(body);
  http.endRequest();
  int status = http.responseStatusCode();
  String r = status > 0 ? http.responseBody() : String("");
  enforceTimer();

  if (status <= 0 || status >= 500) {  // timeout or server trouble: like no network
    http.stop();
    failures++;
    Serial.printf("check-in failed (%d); keeping the current state\n", status);
    return;
  }
  failures = 0;
  if (status != 200) {  // not linked, unknown box, or a bad request: stay safe
    setRelay(false, "server refused");
    pollS = 60;
    return;
  }
  long p = jsonNumber(r, "\"pollSeconds\":");
  pollS = (p >= 10 && p <= 120) ? (uint32_t)p : 30;
  bool wantOn = r.indexOf("\"command\":\"on\"") >= 0;
  long runFor = jsonNumber(r, "\"runForSeconds\":");
  if (wantOn && runFor > 0) {
    unsigned long wanted = millis() + (unsigned long)runFor * 1000UL;
    stopAtMs = relayOn ? ((long)(wanted - stopAtMs) < 0 ? wanted : stopAtMs) : wanted;  // never extend a run already going
    setRelay(true, "server says on");
  } else {
    setRelay(false, "server says off");
  }
  Serial.printf("%s signal %d: %s, poll %lus\n", net.c_str(), csq, relayOn ? "ON" : "OFF", (unsigned long)pollS);
}

void setup() {
  pinMode(RELAY_PIN, OUTPUT);
  setRelay(false, "power-up");  // always start OFF, before anything else
  Serial.begin(115200);
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  esp_task_wdt_config_t wdt = { .timeout_ms = WATCHDOG_S * 1000, .idle_core_mask = 0, .trigger_panic = true };
  esp_task_wdt_reconfigure(&wdt);
#else
  esp_task_wdt_init(WATCHDOG_S, true);
#endif
  esp_task_wdt_add(NULL);
  modemSerial.begin(115200, SERIAL_8N1, MODEM_RX, MODEM_TX);
  modemPowerOn();
  delay(3000);
  if (!modem.init()) modem.restart();
  modem.setNetworkMode(2);  // automatic: LTE, else 3G, else 2G
}

void loop() {
  esp_task_wdt_reset();
  enforceTimer();
  if ((long)(millis() - nextPollMs) >= 0) {
    checkIn();
    esp_task_wdt_reset();
    if (failures >= RESTART_AFTER) {
      Serial.println("restarting the modem");
      modem.restart();
      modem.setNetworkMode(2);
      failures = 0;
    }
    nextPollMs = millis() + (failures ? 10000UL : pollS * 1000UL);  // retry sooner after a failure
  }
  delay(200);
}
