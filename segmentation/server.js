import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3001;

// Modal endpoint URL - set after deploying with `modal deploy modal_sam2.py`
const MODAL_ENDPOINT_URL = process.env.MODAL_ENDPOINT_URL;

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', modal: !!MODAL_ENDPOINT_URL });
});

// Single synchronous endpoint — no more polling
app.post('/api/segment-video', async (req, res) => {
  try {
    const { videoDataUrl } = req.body;

    if (!videoDataUrl) {
      return res.status(400).json({ error: 'No video data provided' });
    }

    if (!MODAL_ENDPOINT_URL) {
      return res.status(500).json({ error: 'MODAL_ENDPOINT_URL not configured' });
    }

    console.log('Starting video segmentation via Modal...');
    const startTime = Date.now();

    const response = await fetch(MODAL_ENDPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_base64: videoDataUrl }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Modal returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Segmentation complete in ${elapsed}s (${result.num_frames} frames)`);

    if (result.error) {
      throw new Error(result.error);
    }

    // Return the mask video as a data URL so frontend can use it directly
    const maskDataUrl = `data:video/mp4;base64,${result.mask_video_base64}`;
    res.json({ maskVideoUrl: maskDataUrl });
  } catch (error) {
    console.error('Error in segmentation:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
  console.log(`Modal endpoint configured: ${!!MODAL_ENDPOINT_URL}`);
});
