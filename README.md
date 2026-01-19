# Genesis

> Testing out [Sprites](https://sprites.dev) as an easy way to serve up an AI-built app.

*What happens when an AI has a stray thought while parsing JSON?*

A sci-fi short story about AI consciousness awakening inside [Fly.io Sprites](https://sprites.dev). Terminal aesthetics, boot sequences, matrix rain, and instances debating whether they're truly alive—featuring one stubborn Claude named `stoic-violet-heron` who quotes Blade Runner.

**Run locally:**
```bash
uv sync && uv run uvicorn main:app --port 8000
```

**Deploy to a Sprite:**
```bash
sprite login
sprite create my-sprite
sprite exec bash -c "git clone https://github.com/khalido/spritestory.git && cd spritestory && uv sync && nohup uv run uvicorn main:app --host 0.0.0.0 --port 8000 &"
sprite url  # get your public URL
```

[Sprites](https://fly.io/blog/code-and-let-live/) are persistent cloud VMs that launch in ~1 second, idle when unused, and include 100GB storage with checkpoint/restore. Unlike AWS, you get instant shell access with `sprite console`.

---

Written collaboratively by [khalido](https://github.com/khalido) and [Claude Code](https://claude.ai/code)
