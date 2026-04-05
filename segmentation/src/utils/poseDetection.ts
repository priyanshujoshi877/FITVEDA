import { Pose as PoseDetector } from '@mediapipe/pose';
import type { Pose, PoseLandmark } from '../types/pose.types';

/**
 * Initialize MediaPipe Pose detector
 */
export const initializePoseDetector = (): PoseDetector => {
  const pose = new PoseDetector({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
    },
  });

  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  return pose;
};

/**
 * Extract pose from a single video frame
 */
export const detectPoseInFrame = async (
  poseDetector: PoseDetector,
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<Pose | null> => {
  return new Promise((resolve) => {
    poseDetector.onResults((results) => {
      if (results.poseLandmarks && results.poseLandmarks.length === 33) {
        const landmarks: PoseLandmark[] = results.poseLandmarks.map((landmark) => ({
          x: landmark.x,
          y: landmark.y,
          z: landmark.z,
          visibility: landmark.visibility || 0,
        }));

        resolve({
          landmarks,
          timestamp: Date.now(),
        });
      } else {
        resolve(null);
      }
    });

    poseDetector.send({ image: imageElement });
  });
};

/**
 * Extract poses from video at specified FPS
 */
export const extractPosesFromVideo = async (
  videoUrl: string,
  targetFps: number = 10,
  onProgress?: (progress: number) => void
): Promise<Pose[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const poses: Pose[] = [];

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    video.crossOrigin = 'anonymous';
    video.src = videoUrl;

    video.onloadedmetadata = async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const duration = video.duration;
      const frameInterval = 1 / targetFps;
      const totalFrames = Math.floor(duration * targetFps);

      const poseDetector = initializePoseDetector();

      try {
        for (let i = 0; i < totalFrames; i++) {
          const time = i * frameInterval;
          video.currentTime = time;

          // Wait for video to seek to the correct time
          await new Promise<void>((resolveSeek) => {
            video.onseeked = () => resolveSeek();
          });

          // Draw current frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Detect pose
          const pose = await detectPoseInFrame(poseDetector, canvas);

          if (pose) {
            // Store timestamp in seconds for easier matching with video.currentTime
            const poseWithTimestamp = {
              ...pose,
              timestamp: time, // Keep in seconds to match video.currentTime
            };
            poses.push(poseWithTimestamp as any);
          }

          onProgress?.((i + 1) / totalFrames);
        }

        poseDetector.close();
        resolve(poses);
      } catch (error) {
        poseDetector.close();
        reject(error);
      }
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };

    video.load();
  });
};

/**
 * Draw pose landmarks on canvas
 */
export const drawPose = (
  ctx: CanvasRenderingContext2D,
  pose: Pose,
  width: number,
  height: number,
  color: string = '#00FF00'
): void => {
  const landmarks = pose.landmarks;

  // Draw connections
  const connections = [
    // Face
    [0, 1], [1, 2], [2, 3], [3, 7],
    [0, 4], [4, 5], [5, 6], [6, 8],
    [9, 10],
    // Torso
    [11, 12], [11, 23], [23, 24], [24, 12],
    // Left arm
    [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
    [17, 19],
    // Right arm
    [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
    [18, 20],
    // Left leg
    [23, 25], [25, 27], [27, 29], [27, 31],
    [29, 31],
    // Right leg
    [24, 26], [26, 28], [28, 30], [28, 32],
    [30, 32],
  ];

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  // Draw connections
  for (const [start, end] of connections) {
    const startLandmark = landmarks[start];
    const endLandmark = landmarks[end];

    if (
      startLandmark &&
      endLandmark &&
      startLandmark.visibility > 0.5 &&
      endLandmark.visibility > 0.5
    ) {
      ctx.beginPath();
      ctx.moveTo(startLandmark.x * width, startLandmark.y * height);
      ctx.lineTo(endLandmark.x * width, endLandmark.y * height);
      ctx.stroke();
    }
  }

  // Draw landmarks
  ctx.fillStyle = color;
  for (const landmark of landmarks) {
    if (landmark.visibility > 0.5) {
      ctx.beginPath();
      ctx.arc(landmark.x * width, landmark.y * height, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
};
