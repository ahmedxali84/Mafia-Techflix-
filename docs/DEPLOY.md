# Deploy (Render + Vercel)

Owner: Usman. Backend goes to **Render** (free web service), frontend to **Vercel**. Both deploy automatically from `main` once connected.

## 1. Backend → Render

The repo has a Blueprint in [`render.yaml`](../render.yaml), so you don't have to fill in the settings by hand.

1. Sign in to https://render.com with GitHub.
2. **New → Blueprint** → pick this repo → **Apply**. That creates `mafia-server` with:
   - Root directory `server`, build `npm ci`, start `node index.js`
   - Health check `/health`, `NODE_ENV=production`, Node 22
   - `PORT` is set by Render automatically (the server reads `process.env.PORT`)
3. Render asks for `CLIENT_ORIGIN`. Leave it empty for the first deploy, then fill it in after step 2 (Vercel URL).
4. When it's live, copy the URL, e.g. `https://mafia-server.onrender.com`, and check it:

   ```bash
   node tests/checkServer.js https://mafia-server.onrender.com
   ```

Without the Blueprint (manual): **New → Web Service**, root `server`, build `npm ci`, start `node index.js`, health check path `/health`, env `NODE_ENV=production`.

## 2. Frontend → Vercel

1. Sign in to https://vercel.com with GitHub → **Add New → Project** → import this repo.
2. **Root Directory: `client`**. The framework is detected as Next.js, so keep the default build settings.
3. Environment variable: `NEXT_PUBLIC_SERVER_URL` = the Render URL from step 1 (no trailing slash).
4. Deploy. Copy the Vercel URL, e.g. `https://mafia-game.vercel.app`.

`NEXT_PUBLIC_*` values are baked in at build time. If you change it, **redeploy** the frontend.

## 3. Lock down CORS

Back in Render → `mafia-server` → Environment → `CLIENT_ORIGIN` = the Vercel URL (comma-separate several, e.g. production + preview domain). Save, and Render redeploys. Leaving it empty allows every origin (`*`), which is fine for testing but not for the beta.

## 4. Smoke test after every deploy

1. `node tests/checkServer.js <render-url>` prints `Server is awake and ready.`
2. Open the Vercel URL, create a room, and from your laptop run
   `node tests/addBots.js <CODE> 5 <render-url>`. Five fake players join and play.
3. Start the game and play to Game over. Then run the [testing checklist](TESTING_CHECKLIST.md).

## 5. Discord button and feedback form

| Where | Variable | Value |
|---|---|---|
| Vercel | `NEXT_PUBLIC_DISCORD_URL` | Your invite, e.g. `https://discord.gg/abc123` (Server settings → Invites → never expires). Only `discord.gg/…` or `discord.com/invite/…` links are accepted; unset = Discord buttons hidden. Redeploy after setting it. |
| Render | `FEEDBACK_TOKEN` | A long random secret. Read feedback with `curl -H "Authorization: Bearer <token>" https://<backend>/feedback`. Unset = nobody can read it over HTTP. |
| Render | `FEEDBACK_FILE` | Optional path for the feedback file. The free Render disk is wiped on every deploy, so read/download feedback before redeploying (or add a Render disk). |

## 6. Custom domain (optional)

1. Buy the domain (e.g. Namecheap, Cloudflare).
2. Vercel → Project → Settings → Domains → add `mafia.yourdomain.com`, then add the DNS record Vercel shows (CNAME `cname.vercel-dns.com`).
3. Render → `CLIENT_ORIGIN` = `https://mafia.yourdomain.com,https://mafia-frontend-lyart.vercel.app` (both, comma separated), then redeploy.
4. Open the new domain and play one game to check.

## Things to know

- **Free Render sleeps** after ~15 min with no traffic. The first visit then takes 30–60 s. Run `checkServer.js` a few minutes before a demo or stream.
- Game state lives in server memory, so a redeploy or restart (or sleep) ends all running games.
- Voice chat needs `https` (Vercel and Render both give you that). For players behind strict NATs set `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL` on Render.
- Bots ("Play with bots", "Add bot") are a feature and stay on in production.
- Never commit `.env` files. Set secrets in the Render/Vercel dashboards and keep `server/.env.example` and `client/.env.local.example` up to date.
