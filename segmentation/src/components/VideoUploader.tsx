import React, { useState, useRef, useEffect } from 'react';
import { segmentVideo, isBackendConfigured } from '../utils/replicateClient';

interface VideoUploaderProps {
  onVideoProcessed: (
    originalVideoUrl: string,
    segmentedVideoUrl: string
  ) => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ onVideoProcessed }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if backend is available on mount
  useEffect(() => {
    isBackendConfigured().then(setBackendAvailable);
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }

    // Check if backend is available
    if (!backendAvailable) {
      setError('Backend server is not running. Please start the server with: npm run server');
      return;
    }

    setError('');
    setIsProcessing(true);
    setProgress(0);

    try {
      // Create object URL for original video
      const originalVideoUrl = URL.createObjectURL(file);

      // Segment video using Modal SAM2
      setStatus('Segmenting video via Modal...');
      const maskVideoUrl = await segmentVideo(file, (statusText, progressValue) => {
        setStatus(statusText);
        if (progressValue !== undefined) {
          setProgress(progressValue * 0.9); // 0-90%
        }
      });

      // Complete — mask comes back as a data URL, no proxy needed
      setStatus('Complete!');
      setProgress(100);

      onVideoProcessed(originalVideoUrl, maskVideoUrl);

      // Reset after a short delay
      setTimeout(() => {
        setIsProcessing(false);
        setStatus('');
        setProgress(0);
      }, 1000);
    } catch (err) {
      console.error('Error processing video:', err);
      setError(err instanceof Error ? err.message : 'Failed to process video');
      setIsProcessing(false);
      setStatus('');
      setProgress(0);
    }
  };

  return (
    <div style={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        style={styles.fileInput}
        disabled={isProcessing}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          ...styles.uploadButton,
          ...(isProcessing ? styles.uploadButtonDisabled : {}),
        }}
        disabled={isProcessing}
      >
        {isProcessing ? 'Processing...' : 'Upload Video'}
      </button>

      {isProcessing && (
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progress}%`,
              }}
            />
          </div>
          <p style={styles.statusText}>{status}</p>
        </div>
      )}

      {error && (
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>{error}</p>
        </div>
      )}

      {backendAvailable === false && (
        <p style={styles.warningText}>
          Backend server not running. Start with: npm run server
        </p>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  fileInput: {
    display: 'none',
  },
  uploadButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#0066cc',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  uploadButtonDisabled: {
    backgroundColor: '#555555',
    cursor: 'not-allowed',
  },
  progressContainer: {
    marginTop: '20px',
  },
  progressBar: {
    width: '100%',
    height: '20px',
    backgroundColor: '#333333',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00ff00',
    transition: 'width 0.3s ease',
  },
  statusText: {
    marginTop: '10px',
    fontSize: '14px',
    color: '#cccccc',
  },
  errorContainer: {
    marginTop: '20px',
    padding: '12px',
    backgroundColor: '#ff000020',
    borderRadius: '6px',
    border: '1px solid #ff0000',
  },
  errorText: {
    color: '#ff6666',
    margin: 0,
  },
  warningText: {
    fontSize: '13px',
    color: '#ffaa00',
    marginTop: '10px',
    padding: '8px',
    backgroundColor: '#ffaa0015',
    borderRadius: '4px',
  },
};
