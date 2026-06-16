# Dor Finance Live

Fork of [`Shaya16/Spent`](https://github.com/Shaya16/Spent), adapted for Dor's real live finance workflow.

## What changed from upstream Spent

This is not an Excel/dashboard mockup. It preserves the upstream Spent foundation:

- live Israeli bank/card connections through `israeli-bank-scrapers`
- encrypted local credential storage
- local SQLite/WAL transaction store
- bank/card sync runs and connection health
- AI categorization, merchant memory, transfer detection, budgets and transactions

Dor-specific additions:

- `/ceo` live command center route that reads real Spent APIs (`/api/home`, `/api/integrations`, `/api/setup/status`)
- CEO Live nav item in the sidebar
- decision-first Hebrew dashboard: live income, live expenses, live net, attention count, top merchants, recent transactions
- connection state + sync-now action from the CEO screen
- business-unit model for EdenOS, TaskClo, Style My Look, TripWeaver, GEM, AI/tools and infra
- bootstrap API scaffold for Dor-specific categories: `POST /api/ceo/bootstrap`
- invoice-matching roadmap surface for email/PDF invoices vs bank/card charges

## Run locally

```bash
npm install
npm run dev
open http://127.0.0.1:3000/ceo
```

## Connect accounts

Do **not** paste bank passwords into chat.

Open the local setup flow:

```text
http://127.0.0.1:3000/setup
```

Add bank/card credentials locally. They are encrypted on disk by the inherited Spent credential store.

## Remote access

For finance data, prefer Tailscale/private network access instead of public tunnels. If binding to remote devices:

```bash
npx next dev -H 0.0.0.0 -p 3000
```

Then open from a device in the tailnet:

```text
http://<tailscale-ip>:3000/ceo
```

## Next implementation steps

1. Connect Dor's actual bank/card accounts through Setup.
2. Run sync and verify live transactions on `/ceo`.
3. Bootstrap Dor categories via `POST /api/ceo/bootstrap`.
4. Add read-only invoice email ingestion.
5. Match invoices to transactions by amount/date/merchant/VAT metadata.
6. Connect Hermes/Paperclip loop: anomaly → task → state-change report.
