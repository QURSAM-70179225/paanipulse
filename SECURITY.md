# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for a security problem. Use GitHub's private reporting instead:
**Security tab → "Report a vulnerability"** on this repository. Include what you found, how to reproduce it, and
the impact. We aim to reply within a few days.

## Supported version

Only the latest commit on `main` is supported (this is a hackathon prototype).

## How the app protects data

- Passwords and PINs are stored only as **bcrypt** hashes. Reset tokens are stored only as hashes (SMS codes as HMAC).
- Sessions are signed JWTs in `httpOnly`, `Secure`, `SameSite=Lax` cookies.
- Every API input is validated with Zod; farm data is only readable by its owner or installer.
- Authorities and lenders only see anonymised, district-level data from farms that consented; locations are blurred
  to about 1 km.
- The phone keeps the latest advice, queued reports and the pump timer in `localStorage`; all of it is wiped on sign-out.
- Secrets live only in environment variables (never in the repository). `.env` is git-ignored.

## Known limitations (also listed in ARCHITECTURE.md)

- The login rate limiter and weather cache are per server instance.
- `/api/telemetry` accepts readings from anyone unless `TELEMETRY_INGEST_KEY` is set; set it before connecting real devices.
- `/api/weather` and `/api/health?full=1` are public (health reports yes/no flags and counts only).
- No email verification and no separate CSRF token (cookies are `SameSite=Lax`).
- The demo accounts (`DEMO_MODE`) have public credentials by design; set `DEMO_MODE=false` for a real launch.

## If a secret is exposed

Rotate it immediately (Neon password, `AUTH_SECRET`, Groq, Azure, Twilio, Resend keys), update the host's environment
variables and redeploy. Changing `AUTH_SECRET` signs everyone out.
