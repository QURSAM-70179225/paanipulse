# Contributing

Thanks for helping. This is a small project; these rules keep it trustworthy.

## Set up

```bash
cp .env.example .env      # DATABASE_URL / DIRECT_URL (local Postgres or a Neon branch) and AUTH_SECRET
npm install
npx prisma migrate dev    # creates tables and seeds demo data
npm run dev
```

## Before you open a pull request

```bash
npm test        # unit tests must pass
npm run lint    # no lint errors
npm run build   # type-checks the whole project
```

## Rules of the codebase

1. **Numbers come from code, never from the AI.** Calculations belong in `lib/engine` as pure, unit-tested functions.
   Chat tools may only return engine output; the guardrail rejects answers with numbers that were not returned.
2. **Every user-visible string exists in Urdu and English** (`lib/i18n/dict.ts`; the type enforces it). Check Urdu
   pages right-to-left at 375 px width.
3. **Validate all API input with Zod** and put access checks on every route (`guardFarm`, `guardRole`, `getSession`).
4. **Never expose personal data** to authority views: no names, phone numbers or exact coordinates.
5. **Be honest in the UI:** label estimates, simulated data and fallbacks (sample weather, default efficiency).
6. **Migrations, not edits:** change `prisma/schema.prisma`, then `npx prisma migrate dev --name <what>`.
7. **No secrets in commits.** Use environment variables and update `.env.example`.

## Commits and branches

Small commits with a clear message (what and why). Branch from `main`; open a pull request; describe what you tested.

## Where things live

See [ARCHITECTURE.md](ARCHITECTURE.md) (layout, data model, extension points) and
[PRODUCT_ESSENTIALS.md](PRODUCT_ESSENTIALS.md) (why the product works the way it does).
