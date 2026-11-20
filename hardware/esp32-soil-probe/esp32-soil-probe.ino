/*
 * PaaniProbe: ESP32 + capacitive soil-moisture sensor, read by the PaaniPulse web app over Bluetooth Low Energy.
 *
 * STATUS: PROTOTYPE. Written against the ESP32 Arduino core's BLE library. It has NOT been compiled or run on real
 * hardware by the author; expect to fix small API differences between core versions. Treat readings as a second opinion.
 *
 * Wiring (3.3 V logic): sensor VCC -> 3V3, GND -> GND, AOUT -> GPIO34 (an input-only ADC pin).
 *
 * Calibrate before use (see docs/SOIL_PROBE_DIY.md): note the raw value with the probe dry in air (AIR_RAW) and with the
 * sensing part in a glass of water up to the line (WATER_RAW), then edit the two numbers below.
 *
 * Protocol (also in lib/bluetooth/probe.ts, keep the UUIDs identical):
 *   reading  (notify/read): "24.5,1834"  = moisture %, raw
 *   history  (notify):      "5400,24.5"  = age in seconds, moisture %   ... then "END"
 *   control  (write):       "H"          = send the stored history, then clear it
 */
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ---- settings you may change -------------------------------------------------------------------------------
const int SENSOR_PIN = 34;
const int AIR_RAW = 3200;    // raw value in dry air (higher = drier on most capacitive sensors). CALIBRATE.
const int WATER_RAW = 1400;  // raw value in water.                                                 CALIBRATE.
const unsigned long LIVE_MS = 5000;                 // notify the live reading this often while connected
const unsigned long LOG_MS = 15UL * 60UL * 1000UL;  // store one reading this often (kept in RAM until synced)
const int MAX_RECORDS = 96;                         // 24 hours at 15 minutes
// -------------------------------------------------------------------------------------------------------------

#define SERVICE_UUID "7d3f0001-5a0e-4f6b-9a3c-2b1e6c4d8a10"
#define READING_UUID "7d3f0002-5a0e-4f6b-9a3c-2b1e6c4d8a10"
#define HISTORY_UUID "7d3f0003-5a0e-4f6b-9a3c-2b1e6c4d8a10"
#define CONTROL_UUID "7d3f0004-5a0e-4f6b-9a3c-2b1e6c4d8a10"

struct Record {
  unsigned long at;  // millis() when taken
  float moisture;
};

BLEServer *server = nullptr;
BLECharacteristic *readingChar = nullptr;
BLECharacteristic *historyChar = nullptr;
bool connected = false;
volatile bool historyRequested = false;
Record records[MAX_RECORDS];
int recordCount = 0;
unsigned long lastLive = 0, lastLog = 0;

int readRaw() {
  long sum = 0;
  for (int i = 0; i < 16; i++) {
    sum += analogRead(SENSOR_PIN);
    delay(5);
  }
  return (int)(sum / 16);
}

float rawToMoisture(int raw) {
  float m = (float)(AIR_RAW - raw) * 100.0f / (float)(AIR_RAW - WATER_RAW);
  if (m < 0) m = 0;
  if (m > 100) m = 100;
  return m;
}

void storeRecord(float m) {
  if (recordCount == MAX_RECORDS) {  // full: drop the oldest
    for (int i = 1; i < MAX_RECORDS; i++) records[i - 1] = records[i];
    recordCount--;
  }
  records[recordCount++] = {millis(), m};
}

void notifyText(BLECharacteristic *c, const String &text) {
  c->setValue(text.c_str());
  c->notify();
}

void sendHistory() {
  unsigned long now = millis();
  for (int i = 0; i < recordCount; i++) {
    String line = String((now - records[i].at) / 1000UL) + "," + String(records[i].moisture, 1);
    notifyText(historyChar, line);
    delay(30);  // give the phone time to take each notification
  }
  notifyText(historyChar, "END");
  recordCount = 0;  // the phone has them now (it keeps its own offline queue)
}

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *s) { connected = true; }
  void onDisconnect(BLEServer *s) {
    connected = false;
    BLEDevice::startAdvertising();  // be findable again
  }
};

class ControlCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) {
    String v = c->getValue();
    if (v.length() > 0 && v[0] == 'H') historyRequested = true;  // do the sending in loop(), not in the callback
  }
};

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);  // 0..4095
  BLEDevice::init("PaaniProbe-1");
  server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());
  BLEService *service = server->createService(SERVICE_UUID);

  readingChar = service->createCharacteristic(READING_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  readingChar->addDescriptor(new BLE2902());
  historyChar = service->createCharacteristic(HISTORY_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  historyChar->addDescriptor(new BLE2902());
  BLECharacteristic *controlChar = service->createCharacteristic(CONTROL_UUID, BLECharacteristic::PROPERTY_WRITE);
  controlChar->setCallbacks(new ControlCallbacks());

  service->start();
  BLEAdvertising *adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);  // the web app finds the probe by this service
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();

  storeRecord(rawToMoisture(readRaw()));
  lastLog = millis();
  Serial.println("PaaniProbe ready. Open PaaniPulse in Chrome on Android and tap Connect probe.");
}

void loop() {
  unsigned long now = millis();
  if (now - lastLog >= LOG_MS) {
    lastLog = now;
    storeRecord(rawToMoisture(readRaw()));
  }
  if (connected && now - lastLive >= LIVE_MS) {
    lastLive = now;
    int raw = readRaw();
    notifyText(readingChar, String(rawToMoisture(raw), 1) + "," + String(raw));
  }
  if (connected && historyRequested) {
    historyRequested = false;
    sendHistory();
  }
  delay(20);
}
