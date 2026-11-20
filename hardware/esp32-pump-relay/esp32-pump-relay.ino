/*
 * PaaniPulse pump control box: BENCH-TEST SKETCH. ESP32 + one relay module, Wi-Fi.
 *
 * !!! SAFETY !!!
 * - NEVER connect a motor or any mains / pump voltage to this prototype. Test it with a lamp or an LED on a low-voltage supply only.
 * - Switching a real pump needs a correctly rated contactor or the pump drive's own start/stop input, fitted by a QUALIFIED ELECTRICIAN,
 *   with overload and dry-run protection, an emergency stop, and a local manual switch. Check the pump drive manual and warranty first.
 * - NOT compiled or run on hardware by the author. TLS certificate checking is OFF below (bench only): replace before any real use.
 *
 * Behaviour (the safety rules, same as the server's):
 * - The relay is OFF at power-up and whenever anything is wrong (no Wi-Fi, bad answer, server error).
 * - The server's order carries runForSeconds. This box counts it down on its OWN clock and switches off when it ends,
 *   even if it never reaches the server again. It never extends a run on its own.
 * - Polls every POLL_MS and reports what the relay is doing now.
 */
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

// ---- settings you must change -----------------------------------------------------------------------------------
const char WIFI_SSID[] = "your-wifi";
const char WIFI_PASS[] = "your-password";
const char SERVER_URL[] = "https://paanipulse.onrender.com/api/device/pump";
const char FARM_ID[] = "karamat";
const char INGEST_KEY[] = "CHANGE-ME";  // same as TELEMETRY_INGEST_KEY on the server
const int RELAY_PIN = 26;               // relay module input
const bool RELAY_ACTIVE_LOW = true;     // most relay modules switch on when the pin is LOW
const unsigned long POLL_MS = 20000;
// -----------------------------------------------------------------------------------------------------------------

bool relayOn = false;
unsigned long stopAtMs = 0;  // millis() value at which the run must end
unsigned long lastPoll = 0;

void setRelay(bool on) {
  relayOn = on;
  digitalWrite(RELAY_PIN, (on != RELAY_ACTIVE_LOW) ? HIGH : LOW);
  Serial.println(on ? "RELAY ON" : "RELAY OFF");
}

void poll() {
  if (WiFi.status() != WL_CONNECTED) { WiFi.reconnect(); return; }
  WiFiClientSecure client;
  client.setInsecure();  // BENCH ONLY: this skips certificate checking
  HTTPClient http;
  if (!http.begin(client, SERVER_URL)) { setRelay(false); return; }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-ingest-key", INGEST_KEY);
  String body = String("{\"farmId\":\"") + FARM_ID + "\",\"on\":" + (relayOn ? "true" : "false") + "}";
  int code = http.POST(body);
  if (code != 200) { Serial.printf("server answered %d\n", code); setRelay(false); http.end(); return; }
  String r = http.getString();
  http.end();
  bool wantOn = r.indexOf("\"command\":\"on\"") >= 0;
  long runFor = 0;
  int i = r.indexOf("\"runForSeconds\":");
  if (i >= 0) runFor = r.substring(i + 16).toInt();
  if (wantOn && runFor > 0) {
    unsigned long wanted = millis() + (unsigned long)runFor * 1000UL;
    stopAtMs = relayOn ? min(stopAtMs, wanted) : wanted;  // never extend a run that is already going
    if (!relayOn) setRelay(true);
  } else {
    setRelay(false);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  setRelay(false);  // always start OFF
  WiFi.begin(WIFI_SSID, WIFI_PASS);
}

void loop() {
  unsigned long now = millis();
  // The local timer always wins over anything the server says.
  if (relayOn && (long)(now - stopAtMs) >= 0) setRelay(false);
  if (now - lastPoll >= POLL_MS || lastPoll == 0) { lastPoll = now; poll(); }
  delay(100);
}
