# Rabtchibloger

Production-ready Next.js application for creating, managing, and exporting articles.

## GitHub

Repository: https://github.com/rabtchi/Rabtchibloger

## Deployment

1. Push the contents of this repository to GitHub.
2. Import the repository into Vercel as a **Next.js** project.
3. Do **not** add a custom `vercel.json` with a `functions` runtime. Next.js App Router route handlers under `app/api/**/route.js` are detected automatically. This avoids the common **Function Runtimes must have a valid version** error caused by obsolete runtime configuration.
4. Set the environment variables from `.env.example` in Vercel.
5. Run `supabase/schema.sql` in the Supabase SQL Editor.
6. Configure PayPal credentials if payments are enabled.
7. Deploy.

## Required environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only; required for secure payment order creation/capture)
- `PAYPAL_ENV`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `PAYPAL_CLIENT_SECRET` to the browser.

## Local verification

```bash
npm install
npm run build
npm start
```

The project intentionally contains no `vercel.json`; Vercel should use its native Next.js runtime detection.
