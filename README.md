# Career-Limiting-Maneuver

A fun site for CareerLimitingManeuver.com, built with [Astro](https://astro.build/) and deployed to [Cloudflare Workers](https://workers.cloudflare.com/).

## ✨ Features
- ASCII art for terminal/curl visitors
- Responsive, accessible homepage with custom art
- Cloudflare Worker SSR deployment
- Modern, mobile-friendly design

## 🚀 Project Structure

```
/
├── public/                # Static assets (images, .assetsignore, etc.)
├── src/
│   └── pages/
│       └── index.astro    # Homepage (with ASCII art for curl)
├── package.json
├── astro.config.mjs
├── wrangler.toml
└── README.md
```

## 🧑‍💻 Local Development

```sh
pnpm install
pnpm run dev
```
Visit [localhost:4321](http://localhost:4321) in your browser.

## 🏗️ Build & Deploy

```sh
pnpm run build
pnpm exec wrangler dev ./dist/_worker.js/index.js  # Local Cloudflare Worker preview
pnpm exec wrangler deploy                          # Deploy to Cloudflare Workers
```

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
