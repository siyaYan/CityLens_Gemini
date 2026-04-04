import { LandmarkData, TourDetails } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
const API_PREFIX = `${API_BASE}/api`;

const post = async <T>(path: string, body: Record<string, unknown>): Promise<T> => {
  const response = await fetch(`${API_PREFIX}${path}`, {
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

export const getLandmarkDetails = (landmarkName: string): Promise<TourDetails> => {
  return post<TourDetails>('/details', { landmarkName });
};
