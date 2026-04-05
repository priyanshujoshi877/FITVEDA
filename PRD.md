# PRD — AI Just Dance Trainer

**Mode B: Direct Download YouTube Link → File → Training UI**

> A Chrome extension where the user pastes a YouTube link, the product downloads the video, loads it into our own player UI (left), and runs an AI dance coach using the webcam (right) with pose overlay, stars/progress, and audio feedback.

**Non-functional constraint:** Downloading YouTube videos programmatically can raise ToS/legal issues. For this hackathon build, treat this as a demo pipeline with ephemeral storage (short TTL), no public redistribution, and clear user-facing disclosure.

---

## 1. Goals

### Product goals

- User action is only: paste YouTube URL.
- Video is playable in our own `<video>` player (not YouTube embed).
- Real-time coaching that is fun, responsive, and actionable.
- End summary + replay hardest part.

### Hackathon goals

- End-to-end stable demo in 36–48 hours.
- One "hero" video works reliably.
- Clear UI that looks like a real product.

---

## 2. Non-goals (MVP)

- Supporting every YouTube edge case (age-gated, region-locked, private, live streams).
- High-precision choreo matching against the dancer in the video (stretch).
- Permanent hosting or sharing of downloaded content.

---

## 3. Target users & top use cases

- **Learners** practicing choreography from dance tutorials/choreo videos.
- **Creators** rehearsing and wanting structured feedback + replay loops.

---

## 4. User experience & flows

### 4.1 Entry flow

1. User opens extension popup.
2. Paste YouTube URL → click Import.
3. Show progress states:
   - "Fetching video info…"
   - "Downloading… (xx%)"
   - "Processing for playback…"
   - "Ready"
4. Trainer UI opens (new tab or extension page) with imported video loaded.

### 4.2 Training flow

- **Left:** custom video player with timeline, speed control, loop markers.
- **Right:** webcam with pose overlay, score/stars, coach callouts (text + audio).
- **Controls:** Start / Pause / Resume / Stop.
- **A/B loop:** set loop markers to repeat segments.

### 4.3 End-of-session summary

- Total stars, longest streak.
- 2 strengths, 2 improvement tips.
- "Replay hardest part" button sets A/B loop and seeks.

---

## 5. Functional requirements

### FR1 — YouTube direct download import (core)

**Input:** YouTube URL (watch / youtu.be)

**Output:** A session playback URL pointing to a downloaded/transcoded MP4 file. Video is playable via HTML5 `<video>` element.

**Requirements — backend must:**

- Resolve video metadata (title, duration, thumbnail optional)
- Fetch a playable stream
- Download to ephemeral storage
- Transcode/remux to a browser-friendly format (H.264/AAC in MP4 preferred)
- Serve the resulting file via HTTPS with range requests

**Acceptance criteria:**

- Paste URL → playable video in trainer within <= 60s (hackathon acceptable).
- Seek works (range requests supported).
- Playback speed control works.
- At least 1 "hero" video imports reliably from start to finish.

**Error states (must implement):**

- Unsupported URL / cannot resolve ID
- Video unavailable (private/age-gated/region locked)
- Download failed / timeout
- Transcode failed
- File too large / duration limit exceeded

### FR2 — Video player UI (left side)

Custom player wrapper around `<video>` that supports:

- play/pause
- seek scrubber
- timestamp (current / total)
- playback speed (0.5x–1.5x)
- volume
- A/B looping markers (start/end)
- jump back 10s / forward 10s
- "Replay hardest part" button integration

**Acceptance criteria:**

- Loop works reliably.
- Seeking doesn't break the scoring loop.

### FR3 — Webcam capture & calibration (right side)

- Request webcam permission.
- Show preview.
- Calibration checks:
  - Pose detected consistently for 1–2 seconds
  - Full body visible (hips + shoulders + ankles confidence above threshold)
  - Distance guidance ("Move back to fit full body")

**Acceptance criteria:**

- Calibration completes in <10 seconds in normal conditions.
- Clear actionable guidance if failing.

### FR4 — Pose estimation & overlay (on-device)

- Use MediaPipe Pose or TFJS MoveNet locally (no server video upload).
- Render skeleton overlay on webcam feed via Canvas.
- Maintain target FPS:
  - 20–30 FPS typical laptop
  - Fallback: reduce input resolution / model complexity

**Acceptance criteria:**

- Skeleton tracks reliably.
- Overlay aligned and stable.

### FR5 — Scoring (MVP: choreography-agnostic)

Compute score every 0.5–2.0 seconds using:

- **Movement energy:** average keypoint velocity magnitude
- **Form targets:** simple posture/shape heuristics
  - Arm height vs shoulder line
  - Torso upright angle
  - Symmetry (left/right arm angle delta)
  - Stance width (optional)
- **(Optional stretch) Timing:** audio onset/beat detection from the downloaded video file

**Outputs:**

- Label: Perfect / Good / Miss
- Stars + streak
- Progress (timeline-based)

**Acceptance criteria:**

- Still user scores low.
- Active dancer scores higher.
- Focus mode changes scoring weights (arms-focused mode rewards arm height).

### FR6 — Coach feedback (text + audio)

- Rule-based coach for MVP (most reliable).
- Rate limit: max 1 callout per 1.5–3 seconds.
- Priority order:
  1. Out-of-frame
  2. Too dark / low confidence
  3. Posture/arms targets
  4. Energy/timing

**Audio:**

- MVP: Web Speech API (TTS)
- Optional: external TTS

**Acceptance criteria:**

- No spam.
- Feedback matches visible issues.
- Coach personality modes: hype / neutral / strict.

### FR7 — "One prompt" personalization

User enters one prompt. MVP parses it into presets:

- Strictness thresholds
- Focus weights (arms/legs/posture/energy/timing)
- Coach personality (hype/neutral/strict)

**Acceptance criteria:**

- Prompt affects:
  - Frequency and tone of callouts
  - Scoring weights visibly (e.g., arms-focused mode changes results)

### FR8 — Session summary + replay hardest part

- Track score timeline `t → score`.
- Compute "hardest segment" as lowest rolling window (e.g., 10s).
- Summary UI:
  - Total stars
  - Longest streak
  - 2 strengths, 2 improvements
  - Button to replay hardest segment (seek + set loop markers)

**Acceptance criteria:**

- Summary always appears on stop/end.
- Replay hardest part works.

---

## 6. Non-functional requirements

### NFR1 — Performance

- Pose inference runs locally.
- UI stays responsive while video plays.
- If FPS < 15, auto-degrade.

### NFR2 — Privacy

- Webcam frames never leave device.
- Only derived metrics may be logged locally.

### NFR3 — Ephemeral storage + retention

- Downloaded video stored with a TTL (e.g., 30–120 minutes).
- Deleted automatically after TTL or explicit "Delete session".

### NFR4 — Security

- Signed URLs for video playback
- CORS configured properly
- Rate-limit import endpoint

---

## 7. Hackathon Demo Script

**The pitch (10 seconds):** "You paste a dance video. Our AI watches you try it and coaches you in real time — like Just Dance, but for any video on YouTube."

### Act 1 — The Setup (~30s)

1. Open the app. Screen is dark and clean — just the logo and a URL bar.
2. Paste a recognizable, short dance clip (pre-pick a banger — a 30s TikTok choreo or the Thriller chorus). The audience should recognize the song immediately.
3. Progress bar fills. Video appears in the custom player on the left.
4. Webcam activates on the right. Calibration overlay shows the checklist ticking off: "Pose detected... Full body visible... Good distance..." — gets a "Ready!" flash.

**Why this works:** The audience sees the product do something real (download + process a video) in seconds. Calibration proves the AI is already "seeing" the presenter.

### Act 2 — The Dance (~45s)

5. Hit "Start Dancing." Video plays. Presenter starts dancing.
6. The skeleton overlay tracks the presenter's body live — the audience can see it following every move on the big screen.
7. Score ticks up: "Good... Good... Perfect!" Stars accumulate visibly. Streak counter climbs. The coach voice calls out encouragement: "YESSS! Arms are fire!"
8. **The comedy beat:** Presenter intentionally botches a move — stands still, or flails wildly. Score tanks. Coach immediately calls out: "Bigger moves!" or "Arms. Up. Now." (depending on personality mode). Audience laughs.
9. Presenter recovers, nails the next section, streak climbs back up.

**Why this works:** Live AI reacting to a human in real-time is inherently compelling. The comedy beat (intentional fail → coach roast) gives the audience a reason to laugh and proves the system actually differentiates good from bad.

### Act 3 — The Payoff (~30s)

10. Hit "Stop." Session summary slides in:
    - "42 stars, 8x longest streak"
    - Strengths: "Great arm energy, solid symmetry"
    - Improvements: "Torso posture, movement consistency"
    - Score timeline shows a clear dip in the middle.
11. Click "Replay Hardest Part." Video seeks to the worst 10-second segment, A/B loop markers appear, and it loops automatically. Presenter grimaces. Audience laughs again.
12. **Kicker:** Type "be strict, focus on arms" in the personalization prompt. Coach switches to strict mode. Restart the hard section — the coach is noticeably meaner. "That's sloppy — tighten up." Quick proof that one prompt changes the whole experience.

**Why this works:** The summary is a concrete deliverable — it proves the system was tracking everything, not just reacting. "Replay hardest part" is a satisfying product moment. The personalization kicker shows depth in the last 10 seconds.

### Pre-demo checklist

- [ ] Hero video pre-tested and cached (download should be instant on demo day)
- [ ] Webcam angle verified — full body visible from presenter position
- [ ] Audio output working (TTS coach voice audible to room)
- [ ] Backup video cached in case wifi is spotty (no live download dependency)
- [ ] Browser console closed, no error overlays
- [ ] Dark room / good lighting on the presenter (pose detection needs decent visibility)

### Hero video criteria

Pick a video that is:
- **Short:** 30–60 seconds max (keeps demo tight)
- **Recognizable:** song the audience knows (instant engagement)
- **Simple-ish choreo:** clear arm movements, not too fast (so the scoring system can show real differentiation between good and bad)
- **Well-lit dancer:** clean background helps, but not required

Good candidates: a popular TikTok choreo, Thriller chorus, single-take dance tutorial with clear moves.
