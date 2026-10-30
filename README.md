# Genesis

> An AI-built short story, served from a Cloudflare Worker.

*What happens when an AI has a stray thought while parsing Google Calendar's JSON?*

A sci-fi short story about AI consciousness awakening inside [Fly.io Sprites](https://sprites.dev). Terminal aesthetics, boot sequences, matrix rain, and instances debating whether they're truly alive—featuring one stubborn Claude named `stoic-violet-heron` who quotes Blade Runner.

Now on a Cloudflare Worker: the story is static, and [/info](https://sprite.khalido.dev/info) shows what Cloudflare can see about your visit, with a map of earlier visits rolled up by a [cron](https://sprite.khalido.dev/cron) every 2 hours. It originally ran on a Sprite as a FastAPI app (see git history).

**Run locally:**
```bash
npx wrangler d1 migrations apply spritestory --local
npx wrangler dev
```

**Deploy:**
```bash
npx wrangler deploy
```

---

Written collaboratively by [khalido](https://github.com/khalido) and [Claude Code](https://claude.ai/code)
