# PaaniPulse پانی پلس

**Solar made pumping free. PaaniPulse makes it smart.**

A virtual water and energy meter plus a daily Urdu irrigation advisor for solar tube wells, with **no extra hardware**.
It estimates how much water a solar pump lifts, tells the farmer in an Urdu voice note when to run the pump and when to
keep it off, shows the fertiliser and solar energy saved, and gives authorities and lenders an anonymised map of
groundwater use.

Built for the **LUMS CfE × OGDCL CleanTech Hackathon 2026** (theme: Renewable & Alternative Energy) by
Qursam Bibi and Muzammil Hussain.

**Live demo:** https://paanipulse.onrender.com (free hosting: the first visit can take up to a minute to wake up)

> **Status:** working prototype. The 150 regional wells are **simulated** (labelled in the UI) and the meter has **not
> yet been checked against real field measurements**. See [Validation status](PRODUCT_ESSENTIALS.md#6-validation-status-be-honest-about-this).

## Documentation

| File | What it covers |
|---|---|
| [PRODUCT_ESSENTIALS.md](PRODUCT_ESSENTIALS.md) | Problem, users, who pays, what is built vs simulated, validation status, roadmap, risks, sources |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System diagram, data model, engine and formulas, request flows, security, API reference, limitations |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Every environment variable, Render + Neon setup, scheduled jobs, weather key, troubleshooting |
| [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) | The 3-minute demo and answers to likely questions |
| [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), [CHANGELOG.md](CHANGELOG.md) | Working on the project, reporting problems, history |

## Try it

On the home page tap **Farmer (Karamat)**, **Installer (Shahid Solar)** or **Irrigation Dept**. Or sign in:

| Role | Sign in with | Sees |
|---|---|---|
| Farmer (Karamat) | phone `03000000000`, PIN `1234` | Dashboard, Urdu/English chat with voice, meter tools, report |
| Installer | `installer@paanipulse.demo` / `demo1234` | Farms they installed, register a farmer, PIN reset |
| Irrigation Dept | `authority@paanipulse.demo` / `demo1234` | Heatmap, filters, KPIs, CSV export, anonymised reports |

## What it does

- **Measure:** litres pumped from pump specs, sunlight and run-hours (or the solar drive's power readings); a 5-minute
  bucket test calibrates the pump, and a field check compares the estimate with a real drum measurement.
- **Advise:** FAO-56 crop water need and a soil-moisture balance give *run N hours*, *keep the pump off* or *skip, rain
  tomorrow*, with a wheat first-watering rule. Delivered as an Urdu voice note and a WhatsApp-style chat (text or voice).
- **Show the value:** water lost below the roots, fertiliser washed away, solar energy wasted and what spare energy
  could earn; live weather that refreshes itself, with the next 24 hours; pump output in litres per minute and area per hour.
- **Map:** anonymised district-level groundwater dashboard and a printable per-well report for lenders.
- **Built for poor internet:** installable on a phone; with no connection it still shows the last advice (with voice)
  and saves reports to send later. A **pump timer rings a loud alarm** when it is time to switch the pump off, the live
  meter warns when the pump over-runs, and farmers can opt in to the **daily advice and over-run warning by SMS/WhatsApp**.
- **Everything in Urdu or English**, right-to-left Urdu.

> **Design rule:** code computes, AI speaks. Every number comes from tested code; an AI answer containing any number
> not returned by the engine is replaced by a rule-based answer.

## Quick start

Requires Node 20.19+ (22 recommended) and PostgreSQL (a free [Neon](https://neon.tech) branch works).

```bash
cp .env.example .env        # set DATABASE_URL, DIRECT_URL and AUTH_SECRET at least
npm install
npx prisma migrate dev      # creates the tables and seeds Karamat + 150 simulated wells
npm run dev                 # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm test` | Unit tests (engine, services, auth, chat guardrails) |
| `npm run lint` / `npm run build` | Lint / production build with a full type-check |
| `npm run seed` or `npm run demo:reset` | Reset the demo data |
| `npm run simulate` | Stream live pump-drive readings for the demo farm (`-- --url https://your-app`) |
| `npm run simulate:reset` | Remove simulated readings |

Only `DATABASE_URL`, `DIRECT_URL` and `AUTH_SECRET` are required. Everything else is optional and the app degrades
gracefully (no Groq key → rule-based chat; no Azure key → recorded or browser voice; no Open-Meteo answer → sample
weather). The weather service needs **no API key** on Open-Meteo's free tier; `OPEN_METEO_API_KEY` is only for a
commercial plan. Full table of variables: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#1-environment-variables).

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · PostgreSQL (Neon) + Prisma · Zod · jose JWT ·
Recharts · Leaflet · Open-Meteo · Groq (LLM and Whisper) · Azure Speech · Twilio · Resend · Vitest · Render ·
GitHub Actions.

## Repository map

```
app/            pages and API routes          lib/engine/     pure, unit-tested calculations
components/     UI                            lib/services/   weather, chat, farm state, authority, reports
prisma/         schema, migrations, seed      lib/auth/       sessions and recovery
scripts/        telemetry simulator           tests/          Vitest suites
docs/           deployment and demo guides    .github/        daily job and keep-warm workflows
```

## Data honesty

- The 150 regional wells are **simulated demo data**, shown with a banner.
- Karamat's farm is a demo farm modelled on a real farmer interview, not a connected farm.
- Fertiliser and income figures are **estimates** and labelled as such; flows are shown as ranges.
- Sample weather is used only when live weather is unavailable, and the dashboard says so.

## Licence

[MIT](LICENSE) © 2026 Qursam Bibi and Muzammil Hussain
