# Deployment guide

Recommended: **Render** (web service) + **Neon** (PostgreSQL) + **GitHub Actions** (scheduled jobs). Vercel works too.

## 1. Environment variables

Set these in Render → your service → **Environment**. After any change, redeploy (**Manual Deploy → Deploy latest commit**).
Never commit secrets and never paste them in chats or issues.

| Variable | Needed? | What it does / what happens without it |
|---|---|---|
| `DATABASE_URL` | **yes** | Neon **pooled** connection string (host contains `-pooler`) |
| `DIRECT_URL` | **yes** | Neon **direct** (unpooled) string, used for migrations. If you only have one string, use it for both |
| `AUTH_SECRET` | **yes** | Signs login sessions. Long random text (`openssl rand -base64 32`). Without it sign-in returns an error |
| `AUTHORITY_INVITE_CODE` | for authority sign-up | Code an Irrigation Dept or lender must enter to create an account |
| `GROQ_API_KEY` | for AI chat and voice input | Without it: rule-based chat answers (same numbers), typing only |
| `GROQ_MODEL` | no | Default `openai/gpt-oss-120b`; falls back to `openai/gpt-oss-20b` on a rate limit |
| `OPEN_METEO_API_KEY` | no | **Only for an Open-Meteo commercial plan.** Not needed for the free tier. See section 4 |
| `WEATHER_CACHE_MINUTES` | no | How long a live weather answer is reused (default 30). Lower = fresher but more Open-Meteo calls |
| `OPEN_METEO_BASE_URL` | no | Point the app at a self-hosted Open-Meteo or another compatible server. Leave empty normally |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | no | Urdu neural voice (e.g. region `centralindia`). Without: recorded mp3 or the phone's own voice |
| `CRON_SECRET` | for the daily advisory | Password for the daily job; must match the GitHub secret of the same name |
| `APP_URL` | recommended | Public address used in emails, e.g. `https://paanipulse.onrender.com` |
| `RESEND_API_KEY`, `EMAIL_FROM` | no | Sends password-reset emails to installers and officials. Without: links appear only in the server log |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | no | SMS or WhatsApp PIN codes for farmers (`TWILIO_FROM` is a number or `whatsapp:+1…`). Without: farmers ask their installer |
| `SUPPORT_WHATSAPP` | no | Number shown on the forgot-PIN page, e.g. `923001234567` |
| `TELEMETRY_INGEST_KEY` | before real drives | If set, devices and the simulator must send it as the `x-ingest-key` header. Leave empty for the demo |
| `DEMO_MODE` | no (default `true`) | Keeps the one-tap demo accounts and the offline sample-weather fallback. Set `false` for a real public launch |

## 2. Render + Neon

1. **Neon** → your project → **Connect**. Copy the string with *Connection pooling ON* (`DATABASE_URL`) and again with
   it OFF (`DIRECT_URL`). Use only the part starting `postgresql://` (no `psql` and no quotes).
2. **Render** → **New → Blueprint** → connect the GitHub repo. It reads `render.yaml`: Singapore region, build
   `npm ci --include=dev && npm run render-build`, start `npm start`, health check `/api/health`.
3. Enter the secret values when asked. `AUTH_SECRET` and `CRON_SECRET` are generated for you.
4. **Apply.** The first build creates the tables and seeds the demo data **only if the database has no farms**. Later
   deploys never wipe real accounts.

## 3. Scheduled jobs (free, GitHub Actions)

GitHub repo → **Settings → Secrets and variables → Actions**:

- Secrets: `APP_URL` (your `https://….onrender.com`) and `CRON_SECRET` (same value as on Render).
- `.github/workflows/daily-advisory.yml` runs at 06:00 PKT. Test it: **Actions → Daily advisory → Run workflow**
  (green tick = working; HTTP 401 = the two `CRON_SECRET` values differ).
- Optional, for demo day: add the repository **variable** `KEEP_WARM` = `true` to enable
  `.github/workflows/keep-warm.yml` (pings every 10 minutes). Remove it afterwards.

The free Render plan sleeps after about 15 minutes idle (first visit then takes 30–60 s). Open the site yourself a
minute before presenting.

## 4. Weather and the API key

The app uses **Open-Meteo**, which **needs no key** on the free, non-commercial tier. Each farm's location is sent to
Open-Meteo and the answer (daily ET₀, rain, temperatures; hourly sunlight, temperature, humidity, wind and rain chance; current conditions) is cached for 30 minutes per ~11 km area. The farmer's dashboard refreshes the weather card by itself every 5 minutes while it is open.

- **If your key is from Open-Meteo (commercial plan):** add `OPEN_METEO_API_KEY` in Render. The app then uses
  `customer-api.open-meteo.com`. If the key is rejected it automatically falls back to the free host and logs a warning.
- **If your key is from another provider** (OpenWeatherMap, WeatherAPI, Tomorrow.io, …): do **not** put it in
  `OPEN_METEO_API_KEY`. The app does not use other providers yet; adding one needs an adapter in
  `lib/services/weather.ts` that returns daily ET₀, rain, temperatures and hourly solar radiation.
- **Check it works:** open `/api/health?full=1` and look for `"weather": {"source": "live"}`. `sample` means Open-Meteo
  did not answer from the server; the app keeps working on sample data and the dashboard badge says so.

## 5. After deploying: checklist

1. `https://YOUR-APP/api/health?full=1` → `"ok": true`, no `problems`, `demoAccounts: 3`, weather `live`.
2. Tap a demo button on the home page; open the farmer dashboard and the chat.
3. Ask "kal barish hogi?" in the chat; try the microphone (the browser asks for permission once).
4. Run the daily advisory workflow once.
5. For a real launch: set `DEMO_MODE=false`, set `AUTHORITY_INVITE_CODE`, set `TELEMETRY_INGEST_KEY` if devices connect.

## 6. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Demo button gives a 500 error | Open `/api/health?full=1`. Usually `AUTH_SECRET` missing or the database string is wrong |
| Redirect to `localhost` | Fixed in code; hard-refresh (Ctrl+Shift+R) after redeploying |
| `Tables: missing` in health | Build command is not `npm run render-build`; fix it and redeploy |
| `Demo accounts missing` | The database was not empty at first deploy so the seed was skipped; run `npm run seed` against it once |
| Weather badge says "Sample" | Open-Meteo unreachable or rate-limited from the server; check health. Not caused by a missing key |
| Chat answers look generic | `GROQ_API_KEY` missing or rate-limited (free tier ≈ 8k tokens per minute): ask slowly |
| Daily job returns 401 | `CRON_SECRET` differs between Render and GitHub |
| First page load takes about a minute | Free Render plan was asleep; use keep-warm and open the site before presenting |

## 7. Vercel (alternative)

Import the repo, add the same variables, deploy. The build script is `vercel-build`; `vercel.json` schedules the daily
job at 01:00 UTC (06:00 PKT) using `CRON_SECRET` automatically.

## 8. Local development

```bash
cp .env.example .env     # DATABASE_URL, DIRECT_URL, AUTH_SECRET
npm install
npx prisma migrate dev   # tables + demo seed
npm run dev              # http://localhost:3000
npm run simulate         # live meter for the demo farm (second terminal)
```
