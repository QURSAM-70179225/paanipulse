# PaaniPulse

**Solar made pumping free. PaaniPulse makes it smart.**
A virtual water and energy meter plus an Urdu irrigation advisor for solar tube wells, with no extra hardware.
LUMS CfE × OGDCL CleanTech Hackathon 2026 · Theme: Renewable & Alternative Energy.

## Setup

```bash
cp .env.example .env
npm install
npx prisma migrate dev     # creates SQLite DB and runs the seed
npm run dev                # http://localhost:3000
```

Re-seed any time with `npm run seed`. Tests: `npm test`.

## Status

- [x] Milestone 1: scaffold, schema, seed (Karamat + 150 simulated farms), landing page
- [x] Milestone 2: engine (FAO-56, soil-water balance, pump physics) + 33 unit tests; engine-driven seed
- [x] Milestone 3: weather service (live → saved → offline sample) + farm dashboard
- [ ] Milestone 4: chat + daily Urdu advisory + voice
- [ ] Milestone 5: authority dashboard
- [ ] Milestone 6: extras, build, backup video

See [`docs/BUILD_SPEC.md`](docs/BUILD_SPEC.md) for the full spec and the decisions behind it.
