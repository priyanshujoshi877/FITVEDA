/**
 * MediaPipe Pose Landmark
 * MediaPipe returns 33 keypoints with x, y, z coordinates and visibility
 */
export interface PoseLandmark {
  x: number; // Normalized x coordinate (0-1)
  y: number; // Normalized y coordinate (0-1)
  z: number; // Depth relative to hips (in approximate meters)
  visibility: number; // Confidence score (0-1)
}

/**
 * Complete pose with all 33 landmarks
 */
export interface Pose {
  landmarks: PoseLandmark[];
  timestamp?: number; // Time in milliseconds
}

/**
 * Normalized pose with scaling information
 */
export interface NormalizedPose {
  landmarks: PoseLandmark[];
  scale: number; // Scale factor used for normalization
  centerX: number; // Center x coordinate
  centerY: number; // Center y coordinate
  timestamp?: number; // Time in seconds
}

/**
 * Replicate API Prediction Status
 */
export type ReplicateStatus = 'starting' | 'processing' | 'succeeded' | 'canceled' | 'failed';

/**
 * Replicate API Prediction Response
 */
export interface ReplicatePrediction {
  id: string;
  status: ReplicateStatus;
  input?: {
    video: string;
    prompt?: string;
    mask_opacity?: number;
  };
  output?: string; // URL to segmented video
  error?: string;
  metrics?: {
    predict_time: number;
  };
}

/**
 * Video with extracted poses
 */
export interface VideoWithPoses {
  videoUrl: string;
  segmentedVideoUrl?: string;
  poses: Pose[];
  fps: number;
  duration: number;
}

/**
 * Pose comparison result
 */
export interface PoseComparison {
  deviationScore: number; // Overall deviation score (0-100, lower is better)
  keypointDistances: number[]; // Distance for each of 33 keypoints
  confidence: number; // Confidence of comparison (0-1)
  timestamp: number;
}

/**
 * MediaPipe Pose landmark indices
 * Reference: https://google.github.io/mediapipe/solutions/pose.html
 */
export const PoseLandmarkIndex = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

/**
 * Weights for different body parts in deviation calculation
 * Higher weight means more importance in the score
 */
export const LANDMARK_WEIGHTS: Record<number, number> = {
  // Torso (most important)
  [PoseLandmarkIndex.LEFT_SHOULDER]: 1.5,
  [PoseLandmarkIndex.RIGHT_SHOULDER]: 1.5,
  [PoseLandmarkIndex.LEFT_HIP]: 1.5,
  [PoseLandmarkIndex.RIGHT_HIP]: 1.5,

  // Major joints (important)
  [PoseLandmarkIndex.LEFT_ELBOW]: 1.3,
  [PoseLandmarkIndex.RIGHT_ELBOW]: 1.3,
  [PoseLandmarkIndex.LEFT_KNEE]: 1.3,
  [PoseLandmarkIndex.RIGHT_KNEE]: 1.3,

  // Extremities (moderate importance)
  [PoseLandmarkIndex.LEFT_WRIST]: 1.0,
  [PoseLandmarkIndex.RIGHT_WRIST]: 1.0,
  [PoseLandmarkIndex.LEFT_ANKLE]: 1.0,
  [PoseLandmarkIndex.RIGHT_ANKLE]: 1.0,

  // Hands and feet (less important)
  [PoseLandmarkIndex.LEFT_PINKY]: 0.7,
  [PoseLandmarkIndex.RIGHT_PINKY]: 0.7,
  [PoseLandmarkIndex.LEFT_INDEX]: 0.7,
  [PoseLandmarkIndex.RIGHT_INDEX]: 0.7,
  [PoseLandmarkIndex.LEFT_THUMB]: 0.7,
  [PoseLandmarkIndex.RIGHT_THUMB]: 0.7,
  [PoseLandmarkIndex.LEFT_HEEL]: 0.7,
  [PoseLandmarkIndex.RIGHT_HEEL]: 0.7,
  [PoseLandmarkIndex.LEFT_FOOT_INDEX]: 0.7,
  [PoseLandmarkIndex.RIGHT_FOOT_INDEX]: 0.7,

  // Face (least important for body pose)
  [PoseLandmarkIndex.NOSE]: 0.5,
  [PoseLandmarkIndex.LEFT_EYE_INNER]: 0.3,
  [PoseLandmarkIndex.LEFT_EYE]: 0.3,
  [PoseLandmarkIndex.LEFT_EYE_OUTER]: 0.3,
  [PoseLandmarkIndex.RIGHT_EYE_INNER]: 0.3,
  [PoseLandmarkIndex.RIGHT_EYE]: 0.3,
  [PoseLandmarkIndex.RIGHT_EYE_OUTER]: 0.3,
  [PoseLandmarkIndex.LEFT_EAR]: 0.3,
  [PoseLandmarkIndex.RIGHT_EAR]: 0.3,
  [PoseLandmarkIndex.MOUTH_LEFT]: 0.3,
  [PoseLandmarkIndex.MOUTH_RIGHT]: 0.3,
};
