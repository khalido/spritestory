#!/bin/bash
cd /home/sprite/test
exec /home/sprite/test/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
