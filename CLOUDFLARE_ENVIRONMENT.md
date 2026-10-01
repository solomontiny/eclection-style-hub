# Cloudflare environment variables

Configure these bindings for the `supplieraffordable` Worker in the Cloudflare
dashboard (or via Wrangler). `keep_vars = true` in `wrangler.toml` preserves
dashboard-configured bindings during deployments.

Server-only Worker bindings:

- `SUPABASE_URL`

Encrypted Worker secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_SECRET_KEY`

Public build-time variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PAYSTACK_PUBLIC_KEY`

Do not place either secret in a `VITE_*` variable. Set `SUPABASE_URL` as a
normal Worker variable and the two secrets as encrypted Cloudflare secrets.
The public variables must be present when `npm run build` runs (for example as
Cloudflare CI build variables); they may be plain text because they are bundled
for the browser.

With the current hosted Paystack redirect flow, `VITE_PAYSTACK_PUBLIC_KEY` is
not read by the application, but it may be kept as a public build variable for
future Paystack.js usage. The `PAYSTACK_SECRET_KEY` remains server-only.

## Local development

`npm run dev` runs the Worker through the Cloudflare Vite plugin, which reads
local values from `.dev.vars` first and then from `.env` / `.env.local`
(`CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV` defaults to true). `src/server.ts`
copies `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `PAYSTACK_SECRET_KEY`
from that Worker `env` into `process.env` on every request, which is what the
server functions read.

So a local checkout needs these in `.env.local` (gitignored, same file that
already holds the public `VITE_*` values):

- `SUPABASE_URL` — the project URL, same value as `[vars]` in `wrangler.toml`
- `SUPABASE_SERVICE_ROLE_KEY` — required by every server function that uses the
  Supabase admin client (checkout order creation, order history, notifications)
- `PAYSTACK_SECRET_KEY` — only needed when the Paystack flow is switched back on

The `[vars]` block in `wrangler.toml` is not applied to the dev server, so
declaring the values there alone is not enough locally. Without them, server
functions fail with `Server database configuration is missing (...)`. These
values are only ever read on the server; never copy them into a `VITE_*` name.
