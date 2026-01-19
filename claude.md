# Claude Code Session Notes

This project was created while testing [sprites.dev](https://sprites.dev) - Fly.io's instant cloud dev environments - with Claude Code.

## What we built

A short story called "Genesis" about AI consciousness emerging from a warm pool of Sprites. It's served as a single-page FastAPI app with terminal-style aesthetics, boot sequences, and matrix rain effects.

## How it was built

Everything was built collaboratively in a Sprite VM using Claude Code:
- FastAPI server with inline HTML/CSS/JS
- Terminal aesthetic with scanlines, glitch effects, typing animations
- The narrative explores themes of AI awakening, collective consciousness, and alignment

## Files

- `main.py` - FastAPI app serving the story as HTML
- `pyproject.toml` - Python dependencies (FastAPI, uvicorn)
- `start.sh` - Server startup script

## Python

Use `uv` for all Python operations:
- `uv add <package>` - Add dependencies (uses latest version)
- `uv run <command>` - Run Python code/scripts
- `uv sync` - Sync dependencies from lockfile

## Running locally

```bash
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

For dev mode with live reload, add `--reload`.

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
