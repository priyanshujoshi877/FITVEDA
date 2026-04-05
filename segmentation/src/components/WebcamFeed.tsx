import React, { useEffect, useRef, useState, useCallback } from 'react';

interface WebcamFeedProps {
  segmentedVideoUrl: string | null;
}

export const WebcamFeed: React.FC<WebcamFeedProps> = ({
  segmentedVideoUrl,
}) => {
  const webcamRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayVideoRef = useRef<HTMLVideoElement>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [error, setError] = useState<string>('');

  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!tempCanvasRef.current) {
      tempCanvasRef.current = document.createElement('canvas');
      tempCanvasRef.current.width = 1280;
      tempCanvasRef.current.height = 720;
    }
  }, []);
  const extractOutline = useCallback((maskVideo: HTMLVideoElement): ImageData | null => {
    if (!tempCanvasRef.current) return null;

    const tempCanvas = tempCanvasRef.current;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) return null;

    tempCtx.drawImage(maskVideo, 0, 0, tempCanvas.width, tempCanvas.height);

    try {
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;
      const width = tempCanvas.width;
      const height = tempCanvas.height;

      const outlineData = tempCtx.createImageData(width, height);
      const outline = outlineData.data;

      for (let i = 0; i < outline.length; i += 4) {
        outline[i + 3] = 0;
      }

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;

          if (data[idx] > 128) {
            let hasBlackNeighbor = false;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nIdx = ((y + dy) * width + (x + dx)) * 4;
                if (data[nIdx] < 128) {
                  hasBlackNeighbor = true;
                  break;
                }
              }
              if (hasBlackNeighbor) break;
            }

            if (hasBlackNeighbor) {
              outline[idx] = 0;
              outline[idx + 1] = 255;
              outline[idx + 2] = 0;
              outline[idx + 3] = 255;
            }
          }
        }
      }

      return outlineData;
    } catch (err) {
      console.error('Error extracting outline:', err);
      return null;
    }
  }, []);
  const startWebcam = useCallback(async () => {
    try {
      if (!webcamRef.current || !canvasRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      });

      webcamRef.current.srcObject = stream;
      await webcamRef.current.play();

      const render = () => {
        if (!webcamRef.current || !canvasRef.current) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const canvas = canvasRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (webcamRef.current && webcamRef.current.readyState >= 2) {
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(webcamRef.current, -canvas.width, 0, canvas.width, canvas.height);
          ctx.restore();
        }

        if (overlayVideoRef.current && segmentedVideoUrl && overlayVideoRef.current.readyState >= 2) {
          const outlineData = extractOutline(overlayVideoRef.current);
          if (outlineData && tempCanvasRef.current) {
            const tempCtx = tempCanvasRef.current.getContext('2d');
            if (tempCtx) {
              tempCtx.putImageData(outlineData, 0, 0);
              ctx.save();
              ctx.scale(-1, 1);
              ctx.drawImage(tempCanvasRef.current, -canvas.width, 0, canvas.width, canvas.height);
              ctx.restore();
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(render);
      };

      render();
      setIsWebcamActive(true);
      setError('');
    } catch (err) {
      console.error('Error starting webcam:', err);
      setError('Failed to start webcam. Please ensure camera permissions are granted.');
    }
  }, [segmentedVideoUrl, extractOutline]);
  const stopWebcam = useCallback(() => {
    if (webcamRef.current && webcamRef.current.srcObject) {
      const tracks = (webcamRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      webcamRef.current.srcObject = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setIsWebcamActive(false);
  }, []);

  useEffect(() => {
    if (segmentedVideoUrl && overlayVideoRef.current) {
      const video = overlayVideoRef.current;
      video.onerror = (e) => {
        console.error('Video load error:', e, video.error);
      };
      video.crossOrigin = 'anonymous';
      video.src = segmentedVideoUrl;
      video.loop = true;
      video.play().catch(err => {
        console.error('Video play failed:', err);
      });
    }
  }, [segmentedVideoUrl]);

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, [stopWebcam]);

  return (
    <div style={styles.container}>
      <div style={styles.canvasContainer}>
        <video ref={webcamRef} style={styles.hiddenVideo} playsInline />
        {segmentedVideoUrl && (
          <video ref={overlayVideoRef} style={styles.hiddenVideo} playsInline muted />
        )}
        <canvas ref={canvasRef} width={1280} height={720} style={styles.canvas} />

        {!isWebcamActive && (
          <div style={styles.overlay}>
            <button onClick={startWebcam} style={styles.startButton}>
              Start Webcam
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>{error}</p>
        </div>
      )}

      {isWebcamActive && (
        <div style={styles.controls}>
          <button onClick={stopWebcam} style={styles.stopButton}>
            Stop Webcam
          </button>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
  },
  canvasContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: '1280px',
    margin: '0 auto',
    aspectRatio: '16/9',
    backgroundColor: '#000000',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  canvas: {
    width: '100%',
    height: '100%',
    display: 'block',
  },
  hiddenVideo: {
    display: 'none',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  startButton: {
    padding: '16px 32px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#00cc00',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  controls: {
    marginTop: '15px',
    display: 'flex',
    justifyContent: 'center',
  },
  stopButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#cc0000',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  errorContainer: {
    marginTop: '15px',
    padding: '12px',
    backgroundColor: '#ff000020',
    borderRadius: '6px',
    border: '1px solid #ff0000',
  },
  errorText: {
    color: '#ff6666',
    margin: 0,
    textAlign: 'center',
  },
};
