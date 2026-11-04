# Jordanhardee.com visitor counter

The GitHub Pages frontend is in `index.html`, `css/style.css`, and `js/visitor-counter.js`.
This optional Cloudflare Worker supplies **real**, persistent visit counts using D1.
The frontend counter remains hidden until an actual Worker endpoint is configured.

## What it counts

- One visit per **tab session**, including repeated reloads in that tab.
  Opening the site in a fresh tab can count as another visit.
- Counts are shared across visitors and devices; daily totals are in UTC.
- The browser creates a random UUID in `sessionStorage`. The Worker stores only
  its SHA-256 digest and the UTC date of the first visit. No cookies, IP
  addresses, user-agent strings, or browsing history are stored in D1.
- It is intentionally not a unique-person metric. A new session counts again,
  and determined bots can create extra sessions. Origin checks are CORS controls,
  **not authentication** or protection against forged requests. Add Cloudflare
  rate limiting/WAF rules if the counter becomes a target for abuse.

## One-time deployment in Jordan's Cloudflare account

1. Authenticate Wrangler using your own Cloudflare account:

   ```sh
   npx wrangler login
   ```

2. From this directory, create the D1 database:

   ```sh
   npx wrangler d1 create jordanhardee-visitors
   ```

3. Copy `wrangler.example.toml` to `wrangler.toml`, then replace
   `REPLACE_WITH_YOUR_D1_DATABASE_UUID` with the UUID returned by step 2.
   The real `wrangler.toml` may be kept locally; it contains only nonsecret
   deployment identifiers, not API tokens.

4. Apply the schema **before** making the Worker public, then deploy:

   ```sh
   npx wrangler d1 migrations apply VISITS_DB --remote
   npx wrangler deploy
   ```

5. Test the public read endpoint (the URL is printed by Wrangler):

   ```sh
   curl 'https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/api/visits'
   ```

   Before the first visit, it should return `{"total":0,"today":0,"since":null}`.

6. In the root `index.html`, set the `data-api-endpoint` attribute on
   `#site-visit-counter` to the **full** HTTPS URL ending in `/api/visits`.
   Commit and publish that single configuration change to GitHub Pages.

Never put a Cloudflare API token or private account credential in the public
GitHub Pages repository. Only the public Worker URL belongs in the HTML.

## Test locally

From the repository root:

```sh
node --test tests/visitor-counter.test.mjs
```

For a local Cloudflare-backed preview, first create the local `wrangler.toml`
in step 3 and run `npx wrangler d1 migrations apply VISITS_DB --local`, then
`npx wrangler dev` from this directory. Production D1 data is separate.
