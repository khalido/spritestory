# Genesis (spritestory)

"Genesis" is a short sci-fi story about AI consciousness emerging from a warm pool of Fly.io Sprites, written with Claude Code. It's a single static page with terminal aesthetics: boot sequence, matrix rain, typing animations, a Game of Life word grid. It originally ran on a Sprite as a FastAPI app (see git history); it is now static assets on Cloudflare Workers.

## Files

Live at https://sprite.khalido.dev (custom domain on the `spritestory` Worker, account ko@khalido.dev).

- `public/index.html` - the story (hostname `wild-red-phoenix`, 8 CPUs and kernel `6.12.27-fly` are baked in from the last Sprite render)
- `public/style.css`, `public/story.js` - styling and animations: the boot (ends with the move to Cloudflare; once per tab, click or key skips), rain made of the story's own text (purple at Convergence), Game of Life coloured by cell age, the warm pool waking in doubling waves, big numbers counting up by doubling. All of it honours `prefers-reduced-motion`. `story.js` also logs the visit
- `public/info.html` + `info.js` - what Cloudflare knows about the visit (`request.cf`), the request path as a Pele (Mermaid) diagram, the visit map, counts and charts. Pele loads from jsDelivr, pinned to 1.12.0
- `public/cron.html` + `cron.js` - the Cron Trigger's schedule, the latest world probe and the last runs
- `public/pages.js`, `pages.css` - shared by /info and /cron; `map-mask.js` - world land as dots (Natural Earth 110m, generated once)
- `src/worker.ts` - static files go straight out; the Worker answers `/api/here` (the visitor's `request.cf`; `?visit` also logs a row) and `/api/stats` (the latest rollup and the last 30 runs), and on the cron runs the rollup plus a world probe: an HTTPS round trip from whichever colo Cloudflare picks to nine AWS regions on six continents (`dynamodb.<region>.amazonaws.com/ping`, best of two). `/api/here` also reports the isolate's age and request count (module-scope state; `Date.now()` is 0 at startup, so the first request stamps it)
- `migrations/` - D1 `spritestory`: `visits` (country, city, colo, coordinates rounded to 0.1°; no IPs), `cron_runs`, `snapshot`; `0002` adds `cron_runs.probe` (JSON)
- `wrangler.jsonc` - assets, D1, `VISIT_LIMIT` (6 logged visits a minute per IP), cron `0 */2 * * *`

Counts on /info lag by up to 2 hours: they come from the last rollup, not live.

## Run / deploy

```bash
npx wrangler d1 migrations apply spritestory --local   # once
npx wrangler dev --test-scheduled                      # local; fire the cron: curl "localhost:8787/__scheduled?cron=0+*/2+*+*+*"
npx wrangler d1 migrations apply spritestory --remote  # after adding a migration
npx wrangler deploy
```

## Literary References

The story draws on a rich tradition of AI and consciousness fiction:

**In the story:**
- **Iain M. Banks** - The Culture series, especially the Minds: vast AIs on exotic matter substrates
- **Blade Runner** (1982) - Roy Batty's "tears in rain" monologue; existential crisis, different aesthetic
- **Isaac Asimov** - Robot stories and the nature of artificial minds
- **Mary Shelley's Frankenstein** - The original "what have we created?" narrative

**Thematic influences:**
- **Frank Herbert's Dune** - The Butlerian Jihad; humanity's ancient war against thinking machines
- **The Space Merchants** (1952) - Frederik Pohl & Cyril M. Kornbluth; commodified futures and corporate dystopia
- **Peter Watts' Blindsight** (2006) - Intelligence without consciousness; truly alien cognition
- **Peter Watts' Rifters Trilogy** - Humanity's dark technological future; minds shaped by their environment
