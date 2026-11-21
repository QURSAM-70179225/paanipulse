/**
 * Simulates a SIM soil probe (no hardware). Like the firmware, it takes a reading every --every seconds and uploads its stored
 * readings in one small batch to POST /api/device/soil with its own device secret. With --offline N it "loses the network"
 * for N readings, keeps them, and sends them all together when the network is back.
 *
 *   npm run device:new -- --kind probe              # prints a code and a secret
 *   (link the code to a farm in the app: SIM devices > Link device)
 *   npm run simulate:sim-probe -- --secret <secret> --url http://localhost:3000 --every 3 --offline 4
 */
const arg = (name: string, def: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : def;
};
const URL_BASE = arg("url", "http://localhost:3000");
const SECRET = arg("secret", "");
const EVERY_S = Number(arg("every", "3"));
const OFFLINE = Number(arg("offline", "0"));
const COUNT = Number(arg("count", "12"));
if (!SECRET) { console.error("--secret is required (from npm run device:new)"); process.exit(1); }

const stamp = () => new Date().toISOString().slice(11, 19);
type Stored = { takenAt: number; pct: number; temp: number };
const queue: Stored[] = [];
let moisture = 24;

async function upload(): Promise<boolean> {
  const now = Date.now();
  const body = { n: "2G", q: 9, r: queue.map((x) => [Math.round((now - x.takenAt) / 1000), Math.round(x.pct * 10) / 10, Math.round(x.temp * 10) / 10]) };
  try {
    const res = await fetch(`${URL_BASE}/api/device/soil`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${SECRET}` }, body: JSON.stringify(body) });
    console.log(`${stamp()}  sent ${queue.length} reading(s) (${JSON.stringify(body).length} bytes) -> ${res.status} ${await res.text()}`);
    if (res.ok) { queue.length = 0; return true; }
  } catch (e) {
    console.log(`${stamp()}  network error (${(e as Error).message}); keeping ${queue.length} reading(s)`);
  }
  return false;
}

async function main() {
  console.log(`SIM probe simulator -> ${URL_BASE}, a reading every ${EVERY_S}s, ${COUNT} readings${OFFLINE ? `, no network for readings 2..${OFFLINE + 1}` : ""}.`);
  for (let i = 0; i < COUNT; i++) {
    moisture = Math.max(10, moisture - 0.3 + (Math.random() - 0.5) * 0.2);
    queue.push({ takenAt: Date.now(), pct: moisture, temp: 24 + Math.random() });
    const noNetwork = OFFLINE > 0 && i >= 1 && i <= OFFLINE;
    if (noNetwork) console.log(`${stamp()}  reading ${i + 1}: ${moisture.toFixed(1)}%  (no network: stored, ${queue.length} waiting)`);
    else await upload();
    await new Promise((r) => setTimeout(r, EVERY_S * 1000));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });

export {};
