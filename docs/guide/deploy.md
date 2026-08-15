# Deploy

When your app is ready, M.A.D. BOLT-REMIX can **deploy it to the cloud** with one click.

## Supported Targets

| Target | How |
| --- | --- |
| **Netlify** | One-click deploy via the built-in Netlify integration. |
| **Vercel** | One-click deploy via the built-in Vercel integration. |
| **Cloudflare Pages** | The app itself runs on Cloudflare Pages (via `wrangler`). |

## Netlify

1. In the app, click the **deploy** action and choose **Netlify**.
2. Sign in to Netlify (OAuth).
3. M.A.D. proxies your deploy through your credentials and publishes your build.

## Vercel

1. Click the **deploy** action and choose **Vercel**.
2. Sign in to Vercel (OAuth).
3. Your app is published to Vercel.

## Cloudflare Pages (self-hosting M.A.D.)

If you want to host **M.A.D. BOLT-REMIX itself** on Cloudflare Pages:

```bash
pnpm run build
pnpm run deploy      # wrangler pages deploy
```

This is exactly how the reference deployment works — the app runs statelessly on Cloudflare Pages with no traditional database.

> **Note:** Deploys are proxied through your own OAuth credentials (`api.netlify-deploy` / `api.vercel-deploy` routes). Nothing is shared with any third party beyond what you authorize.

## Related

- [Git & GitHub](/guide/git) — commit your code before you deploy.
- [WebContainer](/guide/webcontainer) — preview your app before shipping.
