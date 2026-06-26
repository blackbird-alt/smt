# Brillyant AI proxy (Cloudflare Worker)

A tiny serverless proxy that lets the (free, static) Brillyant site use OpenAI
**without putting the API key in the browser**. The Worker holds the key as a
secret, only accepts requests from the app's domains, and requires a valid
Firebase sign-in token — so strangers can't run up your OpenAI bill.

Firebase stays on the free Spark plan; only OpenAI bills you for usage.

## One-time deploy

```bash
cd worker
npm install
npx wrangler login                      # opens Cloudflare auth in your browser
npx wrangler secret put OPENAI_API_KEY  # paste your OpenAI key (stays server-side)
npx wrangler deploy
```

`deploy` prints a URL like `https://brillyant-ai-proxy.<your-subdomain>.workers.dev`.

## Point the app at it

In the app root, create `.env.local` (git-ignored) with that URL:

```
VITE_AI_PROXY_URL=https://brillyant-ai-proxy.<your-subdomain>.workers.dev
```

Then rebuild/redeploy the site (`npm run build` + `firebase deploy --only hosting`).
Until `VITE_AI_PROXY_URL` is set, the "Ask for help" feature simply stays hidden
and the rest of the app works unchanged.

## Notes

- Change the model in `wrangler.toml` (`OPENAI_MODEL`, e.g. `gpt-4o`) and re-`deploy`.
- Allowed origins are in `src/index.js` (`ALLOWED_ORIGINS`) — update if your domain changes.
- The key is **never** in the repo; it lives only as a Cloudflare secret.
