import type { Pose, PoseLandmark, NormalizedPose } from '../types/pose.types';
import { PoseLandmarkIndex } from '../types/pose.types';

/**
 * Calculate bounding box for pose
 */
const calculateBoundingBox = (landmarks: PoseLandmark[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
} => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const landmark of landmarks) {
    if (landmark.visibility > 0.5) {
      minX = Math.min(minX, landmark.x);
      maxX = Math.max(maxX, landmark.x);
      minY = Math.min(minY, landmark.y);
      maxY = Math.max(maxY, landmark.y);
    }
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

/**
 * Calculate pose scale based on body dimensions
 * Uses shoulder width and torso height as reference
 */
const calculatePoseScale = (landmarks: PoseLandmark[]): number => {
  const leftShoulder = landmarks[PoseLandmarkIndex.LEFT_SHOULDER];
  const rightShoulder = landmarks[PoseLandmarkIndex.RIGHT_SHOULDER];
  const leftHip = landmarks[PoseLandmarkIndex.LEFT_HIP];
  const rightHip = landmarks[PoseLandmarkIndex.RIGHT_HIP];

  if (
    !leftShoulder ||
    !rightShoulder ||
    !leftHip ||
    !rightHip ||
    leftShoulder.visibility < 0.5 ||
    rightShoulder.visibility < 0.5 ||
    leftHip.visibility < 0.5 ||
    rightHip.visibility < 0.5
  ) {
    // Fallback: use bounding box
    const bbox = calculateBoundingBox(landmarks);
    return Math.sqrt(bbox.width * bbox.width + bbox.height * bbox.height);
  }

  // Calculate shoulder width
  const shoulderWidth = Math.sqrt(
    Math.pow(rightShoulder.x - leftShoulder.x, 2) +
      Math.pow(rightShoulder.y - leftShoulder.y, 2)
  );

  // Calculate torso height (average of left and right side)
  const leftTorsoHeight = Math.sqrt(
    Math.pow(leftHip.x - leftShoulder.x, 2) + Math.pow(leftHip.y - leftShoulder.y, 2)
  );

  const rightTorsoHeight = Math.sqrt(
    Math.pow(rightHip.x - rightShoulder.x, 2) + Math.pow(rightHip.y - rightShoulder.y, 2)
  );

  const torsoHeight = (leftTorsoHeight + rightTorsoHeight) / 2;

  // Combine shoulder width and torso height for scale
  // Weight torso height more as it's more consistent
  return shoulderWidth * 0.3 + torsoHeight * 0.7;
};

/**
 * Calculate pose center (center of hips)
 */
const calculatePoseCenter = (
  landmarks: PoseLandmark[]
): { centerX: number; centerY: number } => {
  const leftHip = landmarks[PoseLandmarkIndex.LEFT_HIP];
  const rightHip = landmarks[PoseLandmarkIndex.RIGHT_HIP];

  if (
    leftHip &&
    rightHip &&
    leftHip.visibility > 0.5 &&
    rightHip.visibility > 0.5
  ) {
    return {
      centerX: (leftHip.x + rightHip.x) / 2,
      centerY: (leftHip.y + rightHip.y) / 2,
    };
  }

  // Fallback: use bounding box center
  const bbox = calculateBoundingBox(landmarks);
  return {
    centerX: (bbox.minX + bbox.maxX) / 2,
    centerY: (bbox.minY + bbox.maxY) / 2,
  };
};

/**
 * Normalize pose by scaling and centering
 * This makes poses comparable regardless of person size or position
 */
export const normalizePose = (pose: Pose): NormalizedPose => {
  const scale = calculatePoseScale(pose.landmarks);
  const { centerX, centerY } = calculatePoseCenter(pose.landmarks);

  const normalizedLandmarks: PoseLandmark[] = pose.landmarks.map((landmark) => ({
    x: (landmark.x - centerX) / scale,
    y: (landmark.y - centerY) / scale,
    z: landmark.z / scale,
    visibility: landmark.visibility,
  }));

  return {
    landmarks: normalizedLandmarks,
    scale,
    centerX,
    centerY,
    timestamp: pose.timestamp, // Preserve timestamp
  } as NormalizedPose;
};

/**
 * Normalize multiple poses using a consistent scale
 * Useful when comparing poses across a video sequence
 */
export const normalizeMultiplePoses = (poses: Pose[]): NormalizedPose[] => {
  if (poses.length === 0) return [];

  // Calculate average scale across all poses
  const scales = poses.map((pose) => calculatePoseScale(pose.landmarks));
  const averageScale = scales.reduce((sum, scale) => sum + scale, 0) / scales.length;

  // Normalize all poses with the average scale
  return poses.map((pose) => {
    const { centerX, centerY } = calculatePoseCenter(pose.landmarks);

    const normalizedLandmarks: PoseLandmark[] = pose.landmarks.map((landmark) => ({
      x: (landmark.x - centerX) / averageScale,
      y: (landmark.y - centerY) / averageScale,
      z: landmark.z / averageScale,
      visibility: landmark.visibility,
    }));

    return {
      landmarks: normalizedLandmarks,
      scale: averageScale,
      centerX,
      centerY,
      timestamp: pose.timestamp, // Preserve timestamp
    } as NormalizedPose;
  });
};
