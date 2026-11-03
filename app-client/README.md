# MemoryBridge — Mobile App (app-client)

This is the **Expo (React Native)** mobile client for MemoryBridge.

Full setup instructions, environment variable reference, platform-specific notes (web, Android emulator, physical device), and architecture documentation are in the **[root README](../README.md#mobile-app-app-client)**.

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Create your .env (see root README for all variables)
cp .env.example .env   # then edit with your keys

# 3. Start the dev server
pnpm expo start           # interactive menu
pnpm expo start --web     # web browser
pnpm expo start --lan     # physical device (same Wi-Fi)
```

> Make sure the FastAPI server is running first — see [`server/`](../server/) or the [root README](../README.md#setup--running-locally).
