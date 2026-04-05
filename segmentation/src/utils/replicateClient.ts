const BACKEND_URL = 'http://localhost:3001';

export const segmentVideo = async (
  videoFile: File,
  onProgress?: (status: string, progress?: number) => void
): Promise<string> => {
  try {
    onProgress?.('Initializing...', 0);

    const videoDataUrl = await fileToDataUrl(videoFile);

    onProgress?.('Uploading video & running segmentation...', 10);

    const response = await fetch(`${BACKEND_URL}/api/segment-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ videoDataUrl }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to segment video');
    }

    onProgress?.('Receiving mask video...', 80);

    const { maskVideoUrl } = await response.json();

    if (!maskVideoUrl) {
      throw new Error('No mask video received from segmentation');
    }

    onProgress?.('Complete!', 100);

    return maskVideoUrl;
  } catch (error) {
    console.error('Error segmenting video:', error);
    throw error;
  }
};

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const isBackendConfigured = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.modal === true;
  } catch (error) {
    return false;
  }
};
