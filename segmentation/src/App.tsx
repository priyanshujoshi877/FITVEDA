import { useState } from 'react';
import { VideoUploader } from './components/VideoUploader';
import { WebcamFeed } from './components/WebcamFeed';
import './App.css';

function App() {
  const [, setOriginalVideoUrl] = useState<string | null>(null);
  const [segmentedVideoUrl, setSegmentedVideoUrl] = useState<string | null>(null);

  const handleVideoProcessed = (
    originalUrl: string,
    segmentedUrl: string
  ) => {
    setOriginalVideoUrl(originalUrl);
    setSegmentedVideoUrl(segmentedUrl);
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.appTitle}>JiggleWiggle</h1>
      </header>

      <main style={styles.main}>
        <section style={styles.section}>
          <VideoUploader onVideoProcessed={handleVideoProcessed} />
        </section>

        {segmentedVideoUrl && (
          <section style={styles.section}>
            <WebcamFeed segmentedVideoUrl={segmentedVideoUrl} />
          </section>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    color: '#ffffff',
  },
  header: {
    padding: '30px 20px',
    textAlign: 'center',
    backgroundColor: '#141414',
    borderBottom: '2px solid #333333',
  },
  appTitle: {
    fontSize: '48px',
    fontWeight: 'bold',
    margin: 0,
    background: 'linear-gradient(135deg, #00ff88 0%, #0088ff 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
  },
  section: {
    marginBottom: '30px',
  },
};

export default App;
