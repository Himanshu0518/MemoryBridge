# server

A project created with FastAPI CLI.

## Quick Start

### Start the development server

```bash
# Bind 0.0.0.0 so a physical phone on the same Wi-Fi can reach the API
# (127.0.0.1 only accepts connections from this machine).
uv run uvicorn main:application --reload --host 0.0.0.0 --port 8000

# Or, with fastapi dev:
uv run fastapi dev --host 0.0.0.0 --port 8000
```

Visit http://localhost:8000

### Connecting from a phone (Expo)

- Run the API on `0.0.0.0` as above and find your machine's LAN IP
  (e.g. `192.168.1.20`), then confirm `curl http://<LAN-IP>:8000/docs` works.
- The app client resolves the API host automatically from the Expo dev server
  host. To pin it explicitly, add `EXPO_PUBLIC_API_URL=http://<LAN-IP>:8000`
  to `app-client/.env` and restart `expo start` with `--clear`.
- Phone and laptop must be on the same network (or use `expo start --tunnel`).

### Deploy to FastAPI Cloud

> FastAPI Cloud is currently in private beta. Join the waitlist at https://fastapicloud.com

```bash
uv run fastapi login
uv run fastapi deploy
```

## Project Structure

- `main.py` - Your FastAPI application
- `pyproject.toml` - Project dependencies

## Learn More

- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [FastAPI Cloud](https://fastapicloud.com)
