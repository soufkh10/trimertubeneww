# ClipPilot

ClipPilot is a Vercel-ready SaaS MVP for browser-based video clipping. It supports previewing public YouTube videos with official embed playback, trimming uploaded videos and approved direct media URLs, exporting MP4/WebM/MP3 clips, and managing saved exports from a dashboard.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Auth.js credentials auth
- Prisma + PostgreSQL
- Stripe subscriptions
- BullMQ + Redis queue
- S3-compatible object storage
- FFmpeg worker in `/worker`

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment example and fill in credentials:

```bash
cp .env.example .env
```

3. Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Start the Next.js app:

```bash
npm run dev
```

5. In a second terminal, start the worker:

```bash
npm run worker:dev
```

## Environment variables

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STORAGE_PROVIDER`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `REDIS_URL`
- `WORKER_SHARED_SECRET`

`STORAGE_PROVIDER=mock` is useful for local UI testing because uploads can complete without a real object store. For production, configure an S3-compatible provider.

## Database commands

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
```

## Stripe webhook setup

Use the Stripe CLI to forward events locally:

```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

Copy the returned webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## Vercel deployment

1. Create a PostgreSQL database and set `DATABASE_URL`.
2. Configure Auth.js secret and app URL.
3. Add Stripe keys and publishable key.
4. Add Redis and S3-compatible storage credentials.
5. Deploy the Next.js app to Vercel. `vercel.json` already enables Fluid compute.
6. Run `npm run prisma:deploy` as part of deployment or post-deploy setup.
7. Configure Stripe to send webhooks to `/api/stripe/webhook`.

## Worker deployment

The worker lives in `/worker` and can be deployed to Railway, Render, Fly.io, or any Docker-compatible service.

```bash
docker build -f worker/Dockerfile -t clippilot-worker .
```

Runtime requirements:

- Access to the same `DATABASE_URL`
- Access to the same `REDIS_URL`
- Access to the same object storage credentials
- `ffmpeg` available in the container image

For a step-by-step production checklist, see [docs/deployment.md](/Users/soufiane/Documents/New%20project/docs/deployment.md).

## Testing

- `npm test` runs unit and validation tests.
- `npm run test:e2e` runs the Playwright flow.

## Legal and compliance note

ClipPilot intentionally does not implement DRM bypassing, paywall bypassing, private-content downloading, or unauthorized downloading of copyrighted videos. Public YouTube URLs are used for metadata preview and official/public embed playback only. Downloadable exports are limited to uploaded files and direct media URLs that the user owns or is authorized to process.
# trimerTube
