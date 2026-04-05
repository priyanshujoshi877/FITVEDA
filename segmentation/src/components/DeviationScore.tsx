import React, { useEffect, useState } from 'react';
import { getDeviationColor, calculateMovingAverage } from '../utils/deviationCalculator';

interface DeviationScoreProps {
  currentScore: number;
  confidence: number;
}

export const DeviationScore: React.FC<DeviationScoreProps> = ({
  currentScore,
  confidence,
}) => {
  const [, setScoreHistory] = useState<number[]>([]);
  const [smoothedScore, setSmoothedScore] = useState<number>(0);

  // Update score history and calculate smoothed score
  useEffect(() => {
    setScoreHistory((prev) => {
      const newHistory = [...prev, currentScore].slice(-10); // Keep last 10 scores
      const averaged = calculateMovingAverage(newHistory, 5);
      setSmoothedScore(averaged);
      return newHistory;
    });
  }, [currentScore]);

  const color = getDeviationColor(smoothedScore);

  // Determine feedback message
  const getFeedbackMessage = (score: number): string => {
    if (score < 20) return 'Excellent! Perfect match!';
    if (score < 40) return 'Great! Keep it up!';
    if (score < 60) return 'Good! Minor adjustments needed.';
    if (score < 80) return 'Getting there! Focus on alignment.';
    return 'Try to match the reference pose more closely.';
  };

  // Calculate percentage match (inverse of deviation)
  const matchPercentage = Math.max(0, Math.min(100, 100 - smoothedScore));

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Pose Match Score</h2>

      {/* Main score display */}
      <div style={styles.scoreContainer}>
        <div
          style={{
            ...styles.scoreCircle,
            borderColor: color,
            boxShadow: `0 0 20px ${color}40`,
          }}
        >
          <div style={styles.scoreValue}>{Math.round(matchPercentage)}</div>
          <div style={styles.scoreLabel}>MATCH</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={styles.progressContainer}>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${matchPercentage}%`,
              backgroundColor: color,
            }}
          />
        </div>
        <div style={styles.progressLabels}>
          <span style={styles.progressLabel}>0%</span>
          <span style={styles.progressLabel}>50%</span>
          <span style={styles.progressLabel}>100%</span>
        </div>
      </div>

      {/* Feedback message */}
      <div
        style={{
          ...styles.feedbackContainer,
          backgroundColor: `${color}20`,
          borderColor: color,
        }}
      >
        <p style={{ ...styles.feedbackText, color }}>{getFeedbackMessage(smoothedScore)}</p>
      </div>

      {/* Stats */}
      <div style={styles.statsContainer}>
        <div style={styles.statItem}>
          <div style={styles.statLabel}>Deviation</div>
          <div style={styles.statValue}>{Math.round(smoothedScore)}</div>
        </div>
        <div style={styles.statItem}>
          <div style={styles.statLabel}>Confidence</div>
          <div style={styles.statValue}>{Math.round(confidence * 100)}%</div>
        </div>
        <div style={styles.statItem}>
          <div style={styles.statLabel}>Raw Score</div>
          <div style={styles.statValue}>{Math.round(currentScore)}</div>
        </div>
      </div>

      {/* Score interpretation guide */}
      <div style={styles.guideContainer}>
        <h3 style={styles.guideTitle}>Score Guide</h3>
        <div style={styles.guideItems}>
          <div style={styles.guideItem}>
            <div style={{ ...styles.guideColor, backgroundColor: '#00ff00' }} />
            <span style={styles.guideText}>90-100: Excellent</span>
          </div>
          <div style={styles.guideItem}>
            <div style={{ ...styles.guideColor, backgroundColor: '#7fff00' }} />
            <span style={styles.guideText}>70-90: Good</span>
          </div>
          <div style={styles.guideItem}>
            <div style={{ ...styles.guideColor, backgroundColor: '#ffff00' }} />
            <span style={styles.guideText}>50-70: Fair</span>
          </div>
          <div style={styles.guideItem}>
            <div style={{ ...styles.guideColor, backgroundColor: '#ff8c00' }} />
            <span style={styles.guideText}>30-50: Needs Work</span>
          </div>
          <div style={styles.guideItem}>
            <div style={{ ...styles.guideColor, backgroundColor: '#ff0000' }} />
            <span style={styles.guideText}>0-30: Poor</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    marginTop: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#ffffff',
    textAlign: 'center',
  },
  scoreContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '30px',
  },
  scoreCircle: {
    width: '180px',
    height: '180px',
    borderRadius: '50%',
    border: '8px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  },
  scoreValue: {
    fontSize: '56px',
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: '1',
  },
  scoreLabel: {
    fontSize: '16px',
    color: '#cccccc',
    marginTop: '8px',
    letterSpacing: '2px',
  },
  progressContainer: {
    marginBottom: '20px',
  },
  progressBar: {
    width: '100%',
    height: '30px',
    backgroundColor: '#333333',
    borderRadius: '15px',
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    transition: 'all 0.3s ease',
    borderRadius: '15px',
  },
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '8px',
  },
  progressLabel: {
    fontSize: '12px',
    color: '#999999',
  },
  feedbackContainer: {
    padding: '15px',
    borderRadius: '8px',
    border: '2px solid',
    marginBottom: '20px',
    textAlign: 'center',
  },
  feedbackText: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    marginBottom: '20px',
  },
  statItem: {
    backgroundColor: '#2a2a2a',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '12px',
    color: '#999999',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  guideContainer: {
    backgroundColor: '#2a2a2a',
    padding: '15px',
    borderRadius: '8px',
  },
  guideTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '12px',
  },
  guideItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  guideItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  guideColor: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
  },
  guideText: {
    fontSize: '14px',
    color: '#cccccc',
  },
};
