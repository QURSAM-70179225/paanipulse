/**
 * Simulates the pump control box (no hardware). It checks in with the server, follows the order, and, like the real box must,
 * switches off by itself when the run time has passed, even if it loses contact.
 *
 *   PUMP_CONTROL_ENABLED=true must be set on the server; TELEMETRY_INGEST_KEY on both sides.
 *   npm run simulate:pump -- --url http://localhost:3000 --farm karamat --interval 3
 *   npm run simulate:pump -- --drop 3      # lose contact after 3 check-ins: the local timer must still stop the pump
 */
const arg = (name: string, def: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : def;
};
const URL_BASE = arg("url", "http://localhost:3000");
const FARM_ID = arg("farm", "karamat");
const INTERVAL_S = Number(arg("interval", "3"));
const DROP_AFTER = Number(arg("drop", "0")); // 0 = never lose contact
const KEY = process.env.TELEMETRY_INGEST_KEY ?? "";

let relayOn = false;
let stopAtMs = 0; // local hard stop, on this device's own clock
let polls = 0;

const stamp = () => new Date().toISOString().slice(11, 19);
function setRelay(on: boolean, why: string) {
  if (on !== relayOn) console.log(`${stamp()}  RELAY ${on ? "ON " : "OFF"}  (${why})`);
  relayOn = on;
}

async function main() {
  console.log(`Pump control box simulator -> ${URL_BASE}, farm "${FARM_ID}", every ${INTERVAL_S}s${DROP_AFTER ? `, losing contact after ${DROP_AFTER} check-ins` : ""}. Ctrl+C to stop.`);
  for (;;) {
    // The local timer always wins: past the hard stop the relay is off, whatever the server says or whether it can be reached.
    if (relayOn && Date.now() >= stopAtMs) setRelay(false, "local timer ended");
    const lostContact = DROP_AFTER > 0 && polls >= DROP_AFTER;
    if (!lostContact) {
      polls++;
      try {
        const res = await fetch(`${URL_BASE}/api/device/pump`, { method: "POST", headers: { "Content-Type": "application/json", "x-ingest-key": KEY }, body: JSON.stringify({ farmId: FARM_ID, on: relayOn }) });
        if (!res.ok) {
          console.log(`${stamp()}  server answered ${res.status}: ${(await res.text()).slice(0, 120)}  -> relay stays/turns OFF`);
          setRelay(false, `server ${res.status}`);
        } else {
          const d = (await res.json()) as { command: "on" | "off"; runForSeconds: number };
          if (d.command === "on") {
            const wanted = Date.now() + d.runForSeconds * 1000;
            stopAtMs = relayOn ? Math.min(stopAtMs, wanted) : wanted; // never extend a run that is already going
            setRelay(true, `server says on for ${d.runForSeconds}s`);
          } else setRelay(false, "server says off");
        }
      } catch (e) {
        console.log(`${stamp()}  cannot reach the server (${(e as Error).message}); the local timer will still stop the pump`);
      }
    } else if (polls === DROP_AFTER) {
      console.log(`${stamp()}  (simulated: lost contact with the server)`);
      polls++;
    }
    await new Promise((r) => setTimeout(r, INTERVAL_S * 1000));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
