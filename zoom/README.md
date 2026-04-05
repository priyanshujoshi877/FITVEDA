# Zoom App Configuration

This folder contains documentation for setting up **Jiggle Wiggle** as a Zoom App.

## How It Works

The Zoom App runs inside a Zoom meeting as a side panel. It shows:
- Your webcam feed with a skeleton pose overlay
- Real-time scoring of your dance movements
- LLM-powered coaching feedback (same as the YouTube app)

No YouTube panel — the Zoom version is focused on the camera + coach experience.

## Setup Steps

### 1. Create a Zoom App

1. Go to [Zoom Marketplace](https://marketplace.zoom.us/)
2. Click **Develop** → **Build App**
3. Choose **Zoom Apps** type
4. Fill in basic info:
   - **App Name:** FITVEDA
   - **Short Description:** Real-time dance coaching with AI
   - **Developer Name:** Your name

### 2. Configure URLs

Set these URLs in the Zoom App configuration:

| Field | Value |
|-------|-------|
| **Home URL** | `https://your-tunnel.ngrok.io/zoom` |
| **Redirect URL** | `https://your-tunnel.ngrok.io/zoom` |
| **Allow List** | `your-tunnel.ngrok.io` |

### 3. Set Required Scopes

No special scopes are needed for the MVP. The app only uses:
- Camera access (standard browser `getUserMedia`)
- Zoom Apps SDK for context

### 4. Run Locally with a Tunnel

Since Zoom Apps require HTTPS, use ngrok or cloudflared:

```bash
# Terminal 1: Start the Next.js dev server
pnpm dev

# Terminal 2: Start ngrok tunnel
ngrok http 3000
```

Copy the ngrok HTTPS URL and paste it into your Zoom App configuration.

### 5. Test Inside Zoom

1. Open Zoom desktop client
2. Join or start a meeting
3. Click **Apps** in the toolbar
4. Find **Jiggle Wiggle** and open it
5. Allow camera access
6. Start dancing!

### 6. Standalone Testing

You can also test without Zoom by opening:
```
http://localhost:3000/zoom
```

The app detects it's not inside Zoom and falls back to standalone mode with standard `getUserMedia`.

## Environment Variables

Same as the main app — create `.env.local` with:

```
OPENAI_API_KEY=sk-your-key-here
```

## Architecture

The Zoom app reuses shared modules from `app/shared/`:
- `CameraPanel.tsx` — webcam + skeleton overlay
- `CoachPanel.tsx` — score display + coaching text
- `pose.ts` — MediaPipe Pose
- `scoring.ts` — movement scoring
- `coach.ts` — LLM coaching client
- `speech.ts` — text-to-speech
