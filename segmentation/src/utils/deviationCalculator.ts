import type {
  NormalizedPose,
  PoseComparison,
  PoseLandmark,
} from '../types/pose.types';
import { LANDMARK_WEIGHTS } from '../types/pose.types';

/**
 * Calculate Euclidean distance between two landmarks
 */
const calculateLandmarkDistance = (
  landmark1: PoseLandmark,
  landmark2: PoseLandmark
): number => {
  const dx = landmark1.x - landmark2.x;
  const dy = landmark1.y - landmark2.y;
  const dz = landmark1.z - landmark2.z;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Calculate confidence based on landmark visibility
 */
const calculateConfidence = (
  landmarks1: PoseLandmark[],
  landmarks2: PoseLandmark[]
): number => {
  let totalConfidence = 0;
  let count = 0;

  for (let i = 0; i < Math.min(landmarks1.length, landmarks2.length); i++) {
    const visibility1 = landmarks1[i].visibility;
    const visibility2 = landmarks2[i].visibility;

    totalConfidence += Math.min(visibility1, visibility2);
    count++;
  }

  return count > 0 ? totalConfidence / count : 0;
};

/**
 * Compare two normalized poses and calculate deviation
 * @param referencePose - The target pose (from video)
 * @param currentPose - The pose to compare (from webcam)
 * @returns PoseComparison with deviation score and per-keypoint distances
 */
export const comparePoses = (
  referencePose: NormalizedPose,
  currentPose: NormalizedPose
): PoseComparison => {
  const keypointDistances: number[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  const minLength = Math.min(
    referencePose.landmarks.length,
    currentPose.landmarks.length
  );

  for (let i = 0; i < minLength; i++) {
    const refLandmark = referencePose.landmarks[i];
    const currLandmark = currentPose.landmarks[i];

    // Only compare if both landmarks are visible
    if (refLandmark.visibility > 0.5 && currLandmark.visibility > 0.5) {
      const distance = calculateLandmarkDistance(refLandmark, currLandmark);
      keypointDistances.push(distance);

      // Get weight for this landmark (default to 1.0 if not specified)
      const weight = LANDMARK_WEIGHTS[i] || 1.0;

      weightedSum += distance * weight;
      totalWeight += weight;
    } else {
      // If landmark is not visible, use a high penalty
      keypointDistances.push(1.0);
      const weight = LANDMARK_WEIGHTS[i] || 1.0;
      weightedSum += 1.0 * weight;
      totalWeight += weight;
    }
  }

  // Calculate average weighted distance
  const averageDistance = totalWeight > 0 ? weightedSum / totalWeight : 1.0;

  // Convert to a 0-100 score (lower is better)
  // Scale so that perfect match = 0, and reasonable deviation = 50-100
  // Distance typically ranges from 0 to ~2 in normalized space
  const deviationScore = Math.min(100, averageDistance * 50);

  // Calculate confidence based on landmark visibility
  const confidence = calculateConfidence(
    referencePose.landmarks,
    currentPose.landmarks
  );

  return {
    deviationScore,
    keypointDistances,
    confidence,
    timestamp: Date.now(),
  };
};

/**
 * Find the closest pose in a sequence based on timestamp
 */
export const findClosestPose = (
  poses: NormalizedPose[],
  timestamp: number
): NormalizedPose | null => {
  if (poses.length === 0) return null;

  // Binary search would be more efficient for large arrays,
  // but linear search is fine for typical video lengths
  let closestPose = poses[0];
  let minDiff = Infinity;

  for (const pose of poses) {
    // Assuming poses have timestamps from the original Pose type
    // We'll need to track this through normalization
    const diff = Math.abs((pose as any).timestamp - timestamp);
    if (diff < minDiff) {
      minDiff = diff;
      closestPose = pose;
    }
  }

  return closestPose;
};

/**
 * Calculate moving average of deviation scores for smoother display
 */
export const calculateMovingAverage = (
  scores: number[],
  windowSize: number = 5
): number => {
  if (scores.length === 0) return 0;

  const relevantScores = scores.slice(-windowSize);
  const sum = relevantScores.reduce((acc, score) => acc + score, 0);

  return sum / relevantScores.length;
};

/**
 * Get color for deviation score (for visual feedback)
 * Green = good match, Yellow = okay, Red = poor match
 */
export const getDeviationColor = (score: number): string => {
  if (score < 20) return '#00ff00'; // Green - excellent
  if (score < 40) return '#7fff00'; // Chartreuse - good
  if (score < 60) return '#ffff00'; // Yellow - okay
  if (score < 80) return '#ff8c00'; // Orange - needs improvement
  return '#ff0000'; // Red - poor
};
