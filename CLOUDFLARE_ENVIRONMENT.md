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
