import { GoogleGenAI, Type } from '@google/genai';
import { LandmarkData, TourDetails } from '@/types';

const readEnv = (value: string | undefined, fallback = '') => {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  const normalized = trimmed.replace(/^['"]|['"]$/g, '');

  return normalized || fallback;
};

const freeGeminiKey = process.env.FREE_GEMINI_API_KEY || '';
const paidGeminiKey = process.env.PAID_GEMINI_API_KEY || '';

const FREE_IDENTIFY_MODEL = readEnv(process.env.FREE_IDENTIFY_MODEL, 'gemini-3-flash-preview');
const DETAILS_MODEL = readEnv(process.env.DETAILS_MODEL, 'gemini-2.5-flash');
const PAID_IDENTIFY_MODEL = readEnv(process.env.PAID_IDENTIFY_MODEL, 'gemini-2.5-flash');
const PAID_DETAILS_MODEL = readEnv(process.env.PAID_DETAILS_MODEL, DETAILS_MODEL);
const FREE_IMAGE_MODEL = readEnv(process.env.FREE_IMAGE_MODEL, 'gemini-2.5-flash-image');
const PAID_IMAGE_MODEL = readEnv(process.env.PAID_IMAGE_MODEL, 'gemini-2.5-flash-image');

const freeGeminiClient = freeGeminiKey ? new GoogleGenAI({ apiKey: freeGeminiKey }) : null;
const paidGeminiClient = paidGeminiKey ? new GoogleGenAI({ apiKey: paidGeminiKey }) : null;

const ensureClient = <T>(client: T | null, message: string): T => {
  if (!client) {
    throw new Error(message);
  }
  return client;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseJson = <T>(text: string | undefined, fallbackMessage: string): T => {
  if (!text) {
    throw new Error(fallbackMessage);
  }

  return JSON.parse(text) as T;
};

const parseLandmarkResponse = (response: Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>): LandmarkData => {
  const parsed = parseJson<LandmarkData>(response.text, 'No landmark data returned.');

  return {
    name: parsed.name,
    briefIntro: parsed.briefIntro,
    location: {
      latitude: clamp(Number(parsed.location?.latitude ?? 0), -90, 90),
      longitude: clamp(Number(parsed.location?.longitude ?? 0), -180, 180),
      city: parsed.location?.city || 'Unknown city',
      country: parsed.location?.country || 'Unknown country',
    },
  };
};

export const identifyLandmarkFree = async (base64Image: string, mimeType = 'image/jpeg') => {
  const ai = ensureClient(freeGeminiClient, 'FREE_GEMINI_API_KEY is not configured.');
  const response = await ai.models.generateContent({
    model: FREE_IDENTIFY_MODEL,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Image,
          },
        },
        {
          text: "Identify the landmark in this photo. Return JSON with the landmark name, a short 1-2 sentence travel-style intro, and the best approximate city, country, latitude, and longitude for the landmark center. If the exact spot is unclear, return your best estimate for the recognized place.",
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          briefIntro: { type: Type.STRING },
          location: {
            type: Type.OBJECT,
            properties: {
              latitude: { type: Type.NUMBER },
              longitude: { type: Type.NUMBER },
              city: { type: Type.STRING },
              country: { type: Type.STRING },
            },
            required: ['latitude', 'longitude', 'city', 'country'],
          },
        },
        required: ['name', 'briefIntro', 'location'],
      },
    },
  });

  return parseLandmarkResponse(response);
};

const parseDetailsResponse = (
  response: Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>
): TourDetails => {
  const parsed = parseJson<TourDetails>(response.text, 'No tour details returned.');

  return {
    overview: parsed.overview,
    highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 4) : [],
    visitTips: Array.isArray(parsed.visitTips) ? parsed.visitTips.slice(0, 4) : [],
  };
};

export const getLandmarkDetailsFree = async (landmarkName: string) => {
  const ai = ensureClient(freeGeminiClient, 'FREE_GEMINI_API_KEY is not configured.');
  const response = await ai.models.generateContent({
    model: DETAILS_MODEL,
    contents: {
      parts: [
        {
          text: `You are writing a concise tour brief for travelers about ${landmarkName}. Return JSON with:
overview: 2 elegant sentences,
highlights: array of 3 short highlight lines,
visitTips: array of 3 short practical tips.`,
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overview: { type: Type.STRING },
          highlights: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          visitTips: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['overview', 'highlights', 'visitTips'],
      },
    },
  });

  return parseDetailsResponse(response);
};
export const generateCartoonFree = async (landmarkName: string): Promise<string> => {
  const ai = ensureClient(freeGeminiClient, 'FREE_GEMINI_API_KEY is not configured.');
  const prompt = `Create a vibrant, fun, high-quality cartoon-style illustration of ${landmarkName}. It should look like a travel postcard, with bold colors and a clear composition.`;
  const response = await ai.models.generateContent({
    model: FREE_IMAGE_MODEL,
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: '4:3',
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData?.data) {
        return part.inlineData.data;
      }
    }
  }

  throw new Error(`No image generated by Gemini model "${FREE_IMAGE_MODEL}".`);
};

export const identifyLandmarkPaid = async (base64Image: string, mimeType = 'image/jpeg') => {
  const ai = ensureClient(paidGeminiClient, 'PAID_GEMINI_API_KEY is not configured.');
  const response = await ai.models.generateContent({
    model: PAID_IDENTIFY_MODEL,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Image,
          },
        },
        {
          text: "Identify the landmark in this photo. Return JSON with the landmark name, a short 1-2 sentence travel-style intro, and the best approximate city, country, latitude, and longitude for the landmark center. If the exact spot is unclear, return your best estimate for the recognized place.",
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          briefIntro: { type: Type.STRING },
          location: {
            type: Type.OBJECT,
            properties: {
              latitude: { type: Type.NUMBER },
              longitude: { type: Type.NUMBER },
              city: { type: Type.STRING },
              country: { type: Type.STRING },
            },
            required: ['latitude', 'longitude', 'city', 'country'],
          },
        },
        required: ['name', 'briefIntro', 'location'],
      },
    },
  });

  return parseLandmarkResponse(response);
};

export const getLandmarkDetailsPaid = async (landmarkName: string) => {
  const ai = ensureClient(paidGeminiClient, 'PAID_GEMINI_API_KEY is not configured.');
  const response = await ai.models.generateContent({
    model: PAID_DETAILS_MODEL,
    contents: {
      parts: [
        {
          text: `You are writing a concise tour brief for travelers about ${landmarkName}. Return JSON with:
overview: 2 elegant sentences,
highlights: array of 3 short highlight lines,
visitTips: array of 3 short practical tips.`,
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overview: { type: Type.STRING },
          highlights: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          visitTips: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['overview', 'highlights', 'visitTips'],
      },
    },
  });

  return parseDetailsResponse(response);
};

export const generateCartoonPaid = async (landmarkName: string): Promise<string> => {
  const ai = ensureClient(paidGeminiClient, 'PAID_GEMINI_API_KEY is not configured.');
  const response = await ai.models.generateContent({
    model: PAID_IMAGE_MODEL,
    contents: {
      parts: [
        {
          text: `Create a vibrant, fun, high-quality cartoon-style illustration of ${landmarkName}. It should look like a travel postcard.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: '4:3',
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData?.data) {
        return part.inlineData.data;
      }
    }
  }

  throw new Error('No image generated by Gemini image model.');
};
