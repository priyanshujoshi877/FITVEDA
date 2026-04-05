# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Jiggle Wiggle" — a real-time AI dance coaching web app (TreeHacks 2026 hackathon). User pastes a YouTube URL, the video downloads server-side, plays in a custom player alongside a webcam feed with live pose detection, scoring, and AI coaching feedback.

## Commands

- **Dev server:** `npm run dev` (runs on localhost:3000)
- **Build:** `npm run build`
- **Lint:** `npm run lint` (ESLint with Next.js config)
- **No test suite currently exists**

## System Dependencies

- **yt-dlp** — required for YouTube video downloads (spawned via child_process)
- **ffmpeg** — used by yt-dlp for muxing
- **OPENAI_API_KEY** — env var required for AI coach (set in `.env.local`)

## Architecture

### Data Flow

```
YouTube URL → /api/download (SSE: progress → done → classified) → temp/fitveda/{id}.mp4
  → classified event sets mode (gym/dance) → ModeOverlay flash (3s)
  → /api/video/[id] (serves MP4 with range requests)
  → Client: pose extraction (hidden video+canvas, MediaPipe, 10fps)
  → PoseTimeline displayed as MoveQueue strip

Webcam → MediaPipe Pose (CDN-loaded, on-device) → skeleton overlay + scoring
  → buildPoseSummary() → /api/coach (OpenAI) → text + OpenAI TTS audio
```

### Key Files

- **`app/page.tsx`** — Main orchestrator. Owns all top-level state (download, extraction, scoring, coaching). Coordinates the full pipeline.
- **`app/lib/pose.ts`** — MediaPipe Pose setup via CDN (`@mediapipe/pose@0.5.1675469404`). Exports `loadPose()`, `drawSkeleton()` (parameterized with `SkeletonStyle`), and pose connection/landmark types.
- **`app/lib/videoPoseExtractor.ts`** — Client-side pipeline: creates hidden video+canvas, seeks through frames at 0.1s intervals, runs MediaPipe on each, returns `PoseTimeline`.
- **`app/lib/scoring.ts`** — Choreography-agnostic scoring: movement energy (keypoint velocity), form heuristics (arm height, torso angle, symmetry). Exports `computeScore()` and `buildPoseSummary()`.
- **`app/lib/coach.ts`** — Maintains conversation history (last 6 exchanges), throttles to one call per 3s. Sends pose summaries to `/api/coach`.
- **`app/components/ModeOverlay.tsx`** — Full-screen flashy overlay announcing the detected mode ("BEAST MODE" / "LET'S GROOVE"). Triggered by a `seq` counter prop. Uses layered CSS animations: expanding ring bursts, horizontal streaks, diagonal flashes, slam-in text, and expanding-letter-spacing subtitle. Auto-hides after 3s, `pointer-events: none`.
- **`app/api/download/route.ts`** — POST endpoint. Spawns yt-dlp, parses stdout for progress, streams SSE events (`progress`, `done`, `classified`, `error`). Caches to temp/fitveda/."
- **`app/api/video/[id]/route.ts`** — GET endpoint. Serves MP4 with HTTP range request support. Uses `cancelled` flag pattern to prevent ERR_INVALID_STATE on stream cancellation.
- **`app/api/coach/route.ts`** — POST endpoint. OpenAI chat completion with system prompt for dance coaching personality.

### Important Patterns

- **Classification gate:** `page.tsx` holds a `classificationStatus` (`idle → pending → done`). After download completes, the arena UI stays hidden (shows "Detecting mode..." indicator) until the `classified` SSE event arrives. An 8s safety timeout defaults to dance mode if classification never resolves. The `ModeOverlay` fires on transition to `done`.
- **SSE streaming for downloads:** `/api/download` streams `data: {json}\n\n` events including `classified` for mode detection. Client reads with `res.body.getReader()` and parses line-by-line.
- **forwardRef + useImperativeHandle:** `YoutubePanel` exposes `getCurrentTime()` so `page.tsx` can poll video position via rAF loop for MoveQueue sync.
- **Stable callback ref:** `onPoseRef` pattern in `page.tsx` prevents CameraPanel remounts when scoring/coaching logic changes. The actual `handlePose` callback passed to CameraPanel has empty deps.
- **MediaPipe loaded from CDN:** Not bundled — loaded dynamically via script injection in `pose.ts` to avoid large WASM in the Next.js bundle.
- **Video ID validation:** Regex `^[a-zA-Z0-9_-]{11}$` in download route. Files stored at temp/fitveda/{videoId}.mp4."

### Chrome Extension

Manifest v3 extension in `/extension/`. Sends the current YouTube tab URL to `http://localhost:3000?url=...`. The web app reads the `?url=` query param on mount.

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4 (via `@tailwindcss/postcss`)
- MediaPipe Pose (CDN, client-side WASM)
- OpenAI API (server-side, for coaching)
- OpenAI TTS (server-side, via `/api/coach`)
- yt-dlp + ffmpeg (server-side, video download)
