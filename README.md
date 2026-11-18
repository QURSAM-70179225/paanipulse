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

### Environment variables

| Variable | Needed? | What happens without it |
|---|---|---|
| `DATABASE_URL` | yes | — |
| `GROQ_API_KEY` | for AI chat | Chat uses rule-based answers (same numbers) |
| `GROQ_MODEL` | no | Defaults to `openai/gpt-oss-120b` (falls back to `openai/gpt-oss-20b` on rate limit) |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | no | Voice note plays `public/audio/advisory-<farmId>.mp3` if present, else the phone's own Urdu voice |
| `DEMO_MODE` | no (default `true`) | With `true`, offline sample weather is used if Open-Meteo is unreachable |

**Recorded voice note (recommended for the demo):** record the daily advisory in your own voice and save it as
`public/audio/advisory-karamat.mp3`. It plays when Azure TTS is not configured, and works with no internet.

## Status

- [x] Milestone 1: scaffold, schema, seed (Karamat + 150 simulated farms), landing page
- [x] Milestone 2: engine (FAO-56, soil-water balance, pump physics) + 33 unit tests; engine-driven seed
- [x] Milestone 3: weather service (live → saved → offline sample) + farm dashboard
- [x] Milestone 4: Urdu/English switch, WhatsApp-style AI chat (Groq tools + number guardrail + offline fallback), voice notes
- [ ] Milestone 5: authority dashboard
- [ ] Milestone 6: extras, build, backup video

See [`docs/BUILD_SPEC.md`](docs/BUILD_SPEC.md) for the full spec and the decisions behind it.
