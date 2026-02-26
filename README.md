# Finance Platform (Next.js + Prisma + AI)

![Banner](./public/banner.jpeg)

A full-stack personal finance app that ingests CSV/UPI/PDF statements (with OCR fallback), cleans and normalizes transactions into account currencies, and layers AI for budgets, insights, and anomaly warnings. Built with Next.js App Router, Prisma, Clerk auth, Tailwind/shadcn UI, and optional Python ML hooks.

## Features
- Multi-source import: CSV + GooglePay/PhonePe/Paytm PDF parsing with OCR fallback.
- Currency-aware accounts: balances, imports, and insights in the account’s currency.
- Budgets: per-account goals, 6‑month spend tracking, category status, recommendations.
- Smart insights: forecasts, unusual spend flags, category breakdowns.
- Auth & security: Clerk-protected routes, middleware guards.

## Tech Stack
- Frontend: Next.js 15 (App Router), React 19 RC, Tailwind, shadcn/Radix UI, Recharts.
- Backend: Next.js API routes (runtime: nodejs where PDFs/OCR needed), Prisma ORM, PostgreSQL.
- Auth: Clerk.
- AI/ML: OpenAI/Gemini/Anthropic hooks + Python `ml_models/predictor.py` entrypoint.
- Parsing/OCR: pdf-parse, pdfjs-dist fallback, tesseract.js, papaparse.

## Prerequisites
- Node.js 20+
- PostgreSQL database
- Environment variables (set in `.env` or Render env vars):
  - `DATABASE_URL`, `DIRECT_URL`
  - `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
  - `OPENAI_API_KEY` (optional for AI cards)
  - `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` (optional)

## Local Setup
```bash
npm install --legacy-peer-deps
npm run dev
# visit http://localhost:3000
```
To verify production build:
```bash
npm run build
npm run start
```

## Render Deployment (Node web service)
- Repo root as service root.
- Environment: Node 20.
- Build command: `npm install --legacy-peer-deps && npm run build`
- Start command: `npm run start`
- Add env vars listed above in Render dashboard.
- (Optional) Add a free Render Cron every 10 minutes to ping `/` to reduce cold starts.
- If Prisma is used on a fresh DB: run `npx prisma migrate deploy` once against production DB.

## Docker (alternative deploy)
```Dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build
CMD ["npm","run","start"]
```
Build & run:
```bash
docker build -t finance-platform .
docker run -p 3000:3000 finance-platform
```

## Project Structure (high level)
- `app/` – Next.js routes and API handlers (PDF parsing routes use `runtime = "nodejs"`).
- `actions/` – server actions (budgets, dashboard data).
- `components/` – UI components.
- `prisma/` – schema and migrations.
- `public/` – static assets (logos, `banner.jpeg`).

## Notes & Known Considerations
- PDF/OCR routes rely on Node runtime (not Edge). If you add new parsing routes, export `runtime = "nodejs"`.
- Native deps (`canvas`, pdf parsing) are included; if a host lacks prebuilds, rebuild during install or use the provided Dockerfile for consistency.
- Local per-account budget values are cached in `localStorage` under `account-budgets` to keep dashboard and budget plan in sync.

## Scripts
- `npm run dev` – start dev server
- `npm run build` – production build
- `npm run start` – start production server
- `npm run lint` – lint (may warn on exhaustive-deps in dashboard overview)

## License
MIT (modify as needed for your repo).
