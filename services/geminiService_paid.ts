import { LandmarkData, LandmarkDetails } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
const PAID_BASE_URL = `${API_BASE}/api/paid`;

const post = async <T>(path: string, body: Record<string, unknown>): Promise<T> => {
  const response = await fetch(`${PAID_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const errorBody = await response.json();
      message = errorBody.error || message;
    } catch {
      message = await response.text() || message;
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
};

export const identifyLandmark = (base64Image: string, mimeType: string = 'image/jpeg'): Promise<LandmarkData> => {
  return post<LandmarkData>('/identify', { image: base64Image, mimeType });
};

export const getLandmarkDetails = (landmarkName: string): Promise<LandmarkDetails> => {
  return post<LandmarkDetails>('/details', { landmarkName });
};

export const generateNarration = (text: string): Promise<string> => {
  return post<{ audio: string }>('/narration', { text }).then(res => res.audio);
};

export const generateCartoonPostcard = (landmarkName: string): Promise<string> => {
  return post<{ image: string }>('/cartoon', { landmarkName }).then(res => res.image);
};
