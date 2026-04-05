# Pose Comparison System

A real-time pose comparison application that uses AI-powered video segmentation and pose detection to help users match reference poses from videos.

## Features

- **Video Upload & Segmentation**: Upload a reference video and automatically segment the person using Replicate's SAM3-Video API
- **Real-time Pose Detection**: Detect 33 body landmarks using MediaPipe Pose in both the reference video and live webcam feed
- **Pose Comparison**: Compare your webcam pose against the reference video with real-time deviation scoring
- **Visual Overlay**: See the segmented reference video overlaid on your webcam feed for easy visual guidance
- **Score Feedback**: Get instant feedback on how well you're matching the reference pose

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Pose Detection**: MediaPipe Pose (33 keypoints)
- **Video Segmentation**: Replicate API (lucataco/sam3-video)
- **Styling**: Inline React styles with custom dark theme

## Prerequisites

- Node.js 16+ and npm
- Replicate API account and API token
- Webcam access

## Setup

### 1. Install Dependencies

```bash
cd segmentation
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `segmentation` directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Replicate API token:

```
VITE_REPLICATE_API_TOKEN=your_replicate_api_token_here
```

Get your API token from: https://replicate.com/account/api-tokens

### 3. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## How to Use

1. **Upload a Reference Video**
   - Click "Select Video" and choose a video showing the pose or movement you want to learn
   - Wait for the system to process the video (segmentation + pose extraction)

2. **Start Your Webcam**
   - Click "Start Webcam" to begin the live comparison
   - Grant camera permissions when prompted

3. **Match the Reference Pose**
   - Follow the segmented video overlay that appears on your webcam feed
   - Adjust your body position to match the reference pose
   - Watch your match score improve in real-time

4. **Improve Your Score**
   - Green = Your pose (webcam)
   - Blue = Reference pose (from video)
   - Try to align the colored skeletons to achieve a higher match percentage

## Project Structure

```
segmentation/
├── src/
│   ├── components/
│   │   ├── VideoUploader.tsx       # Video upload & processing
│   │   ├── WebcamFeed.tsx         # Webcam + overlay + pose detection
│   │   └── DeviationScore.tsx     # Score display & feedback
│   ├── utils/
│   │   ├── replicateClient.ts     # Replicate API integration
│   │   ├── poseDetection.ts       # MediaPipe pose detection
│   │   ├── poseNormalization.ts   # Pose scaling & normalization
│   │   └── deviationCalculator.ts # Pose comparison logic
│   ├── types/
│   │   └── pose.types.ts          # TypeScript type definitions
│   ├── App.tsx                    # Main app component
│   └── main.tsx                   # Entry point
├── .env.example                   # Environment variables template
└── package.json                   # Dependencies
```

## How It Works

### 1. Video Segmentation
- Uses Replicate's SAM3-Video model to segment the person from the background
- Creates a clean overlay video with just the person visible

### 2. Pose Extraction
- Extracts frames from the segmented video at 10 FPS
- Runs MediaPipe Pose on each frame to detect 33 body landmarks
- Stores poses with timestamps for synchronization

### 3. Pose Normalization
- Normalizes poses based on body scale (shoulder width + torso height)
- Centers poses at the hip midpoint
- Ensures fair comparison regardless of distance from camera

### 4. Deviation Calculation
- Calculates Euclidean distance for each of 33 keypoint pairs
- Applies weights to prioritize important joints (shoulders, elbows, hips, knees)
- Aggregates into a single 0-100 score (higher = better match)

### 5. Real-time Comparison
- Syncs webcam pose with closest reference pose based on video timestamp
- Updates score every frame (smoothed with moving average)
- Provides color-coded visual feedback

## Scoring System

| Score Range | Rating | Color |
|-------------|--------|-------|
| 90-100 | Excellent | Green |
| 70-90 | Good | Chartreuse |
| 50-70 | Fair | Yellow |
| 30-50 | Needs Work | Orange |
| 0-30 | Poor | Red |

## Development

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Troubleshooting

### "Replicate API token not configured"
- Make sure you created a `.env` file with `VITE_REPLICATE_API_TOKEN`
- Restart the dev server after adding the `.env` file

### Webcam not working
- Ensure you granted camera permissions in your browser
- Check that no other application is using the webcam
- Try using HTTPS (required for webcam access on some browsers)

### Video segmentation fails
- Ensure the video clearly shows a person
- Try a shorter video (processing time increases with length)
- Check your Replicate API quota/credits

### Poor pose detection
- Ensure good lighting in your webcam environment
- Make sure your full body is visible in the frame
- Avoid wearing clothing that's too similar to the background

## Credits

- **MediaPipe Pose**: Google's ML solution for pose detection
- **Replicate SAM3-Video**: lucataco's video segmentation model
- Built with React, TypeScript, and Vite

## License

MIT
