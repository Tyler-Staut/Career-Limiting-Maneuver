# Career-Limiting-Maneuver

A fun site for CareerLimitingManeuver.com, built with [Astro](https://astro.build/) and deployed to [Cloudflare Workers](https://workers.cloudflare.com/).

## ✨ Features
- ASCII art for terminal/curl visitors
- Responsive, accessible homepage with custom art
- Cloudflare Worker SSR deployment
- Live globe presence over WebSockets + Durable Objects
- Modern, mobile-friendly design

## 🚀 Project Structure

```
/
├── public/                           # Static assets (images, .assetsignore, etc.)
├── src/
│   ├── worker-entry.ts               # Unified Worker entrypoint: Party routing first, Astro SSR fallback
│   ├── server/
│   │   └── index.ts                  # Partyserver Durable Object class: Globe
│   ├── components/
│   │   └── GlobeComponent.tsx        # WebSocket client + globe rendering
│   ├── shared.ts                     # Shared websocket message/location types
│   └── pages/
│       └── index.astro               # Homepage (with ASCII art for curl)
├── package.json
├── astro.config.mjs
├── wrangler.toml
└── README.md
```

## 🔌 Unified worker entrypoint (`src/worker-entry.ts`)

`src/worker-entry.ts` is the Worker `main` configured in `wrangler.toml`.

It runs in this order:
1. Try Party routing first (`routePartykitRequest`) so websocket upgrades and `/parties/*` traffic are handled by Partyserver.
2. If Partyserver does not handle the request, lazy-load `dist/_worker.js/index.js` and pass the request to Astro's SSR handler.

This gives one Cloudflare Worker process for both realtime presence and normal page/API SSR.

## 🧱 Durable Object binding (`Globe`)

`wrangler.toml` binds the Durable Object used by Partyserver:

- `[durable_objects]` binding name: `Globe`
- class name: `Globe`
- migration tag `v1` creates the sqlite-backed DO class (`new_sqlite_classes = ["Globe"]`)

If this migration/binding is missing or out of sync in an environment, globe presence will not connect correctly.

## 🌐 WebSocket client/server locations

- **Client UI + websocket hookup:** `src/components/GlobeComponent.tsx`
  - Uses `usePartySocket` with `party: "globe"` and `room: "default"`
  - Receives `GlobeMessage`, updates marker map, and renders the rotating globe
- **Server websocket logic (Partyserver/DO):** `src/server/index.ts`
  - Exports `class Globe extends Server`
  - On connect, stores location and broadcasts current presence map
  - On close/error, rebroadcasts with disconnected client removed
- **Shared protocol types:** `src/shared.ts`
  - `Location` tuple
  - `GlobeMessage` payload shape shared by client + server

## 🧑‍💻 Local development and expected behavior

Install dependencies, then run the unified worker locally:

```sh
pnpm install
pnpm run dev
```

Visit [http://localhost:8787](http://localhost:8787).

`wrangler.toml` now runs `npm run build` before `wrangler dev` and `wrangler deploy`, so the Astro SSR bundle in `dist/_worker.js/index.js` stays in sync with the unified worker entrypoint.

Expected globe behavior:
- A single open tab should show `1 person limiting their career outlooks.`
- Opening additional tabs/browsers increases the count and adds globe markers.
- Closing a tab should reduce the count shortly after disconnect.
- If websocket connection is unavailable, the UI stays at `Connecting...`.

## 🏗️ Build & Deploy

```sh
pnpm exec wrangler deploy                           # Deploy to Cloudflare Workers
```

## ⚠️ Common failures

- **Wrong websocket path / routing bypassed:**
  - Symptom: UI stuck on `Connecting...`
  - Cause: requests are not reaching Party routes (for example, not using the unified `src/worker-entry.ts` path in Worker runtime)
- **Stale or missing Astro SSR build:**
  - Symptom: page or globe behavior differs between source files and the deployed/local worker
  - Cause: `src/worker-entry.ts` imports `dist/_worker.js/index.js`, so `wrangler dev`/`deploy` must rebuild Astro first
- **Missing Durable Object migration:**
  - Symptom: websocket errors or DO class not found
  - Cause: `[[migrations]]` for `Globe` not applied in target environment
- **Stale Wrangler deploy:**
  - Symptom: app code appears updated but websocket/protocol behavior is old or inconsistent
  - Cause: latest worker bundle or migration state not deployed to the environment being tested

## 🖼️ Image Optimization
- Place images in `public/` (use WebP/PNG for best performance)
- Use descriptive `alt` text for accessibility

## 🌐 Accessibility & SEO
- Semantic HTML, responsive CSS, and meta tags for discoverability

## 🛡️ Security & Privacy
- No secrets or sensitive data in the repo
- `.assetsignore` prevents accidental asset uploads

## 📄 License
MIT

---

Made with 🚀 Astro by Tyler Staut
