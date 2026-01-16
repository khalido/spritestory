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

## Running locally

```bash
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```
