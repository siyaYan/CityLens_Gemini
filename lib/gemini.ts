import { GoogleGenAI, Modality, Type } from '@google/genai';
import { LandmarkData, LandmarkDetails, GroundingSource } from '@/types';

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
const TTS_MODEL = readEnv(process.env.TTS_MODEL, 'gemini-2.5-flash-preview-tts');
const PAID_IDENTIFY_MODEL = readEnv(process.env.PAID_IDENTIFY_MODEL, 'gemini-2.5-flash');

const freeGeminiClient = freeGeminiKey ? new GoogleGenAI({ apiKey: freeGeminiKey }) : null;
const paidGeminiClient = paidGeminiKey ? new GoogleGenAI({ apiKey: paidGeminiKey }) : null;

const ensureClient = <T>(client: T | null, message: string): T => {
  if (!client) {
    throw new Error(message);
  }
  return client;
};

const parseLandmarkResponse = (response: Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>): LandmarkData => {
  const jsonText = response.text || '{}';
  return JSON.parse(jsonText) as LandmarkData;
};

const mapSources = (response: Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>): GroundingSource[] => {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return chunks
    .map(chunk => chunk.web)
    .filter((web): web is NonNullable<typeof web> => Boolean(web))
    .map(web => ({
      uri: web.uri || '',
      title: web.title || 'Source',
    }));
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
          text: "Identify the landmark in this photo. If it's a famous building, statue, or place, provide its name. Also provide a very brief (1 sentence) visual description.",
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          visualDescription: { type: Type.STRING },
        },
        required: ['name', 'visualDescription'],
      },
    },
  });

  return parseLandmarkResponse(response);
};
export const getLandmarkDetailsFree = async (landmarkName: string): Promise<LandmarkDetails> => {
  const ai = ensureClient(freeGeminiClient, 'FREE_GEMINI_API_KEY is not configured.');
  const response = await ai.models.generateContent({
    // Free-tier Gemini 3 Flash preview does not support Google Search grounding.
    // Use 2.5 Flash here so the second request can succeed with grounded results.
    model: DETAILS_MODEL,
    contents: `Tell me the history and 2 interesting facts about ${landmarkName}. Also include current visitor information (like opening hours or ticket status if available). Keep the tone engaging for a tourist.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  return {
    history: response.text || 'No details found.',
    visitorInfo: '',
    sources: mapSources(response),
  };
};
// export const getLandmarkDetailsFree = async (landmarkName: string): Promise<LandmarkDetails> => {

//   let delay = 3000;
//   const ai = ensureClient(freeGeminiClient, 'FREE_GEMINI_API_KEY is not configured.');
//   const response = await ai.models.generateContent({
//     model: 'gemini-3-flash-preview',
//     contents: `Tell me the history and 2 interesting facts about ${landmarkName}. Also include current visitor information (like opening hours or ticket status if available). Keep the tone engaging for a tourist.`,
//     config: {
//       tools: [{ googleSearch: {} }],
//     },
//   });

//   return {
//     history: response.text || 'No details found.',
//     visitorInfo: '',
//     sources: mapSources(response),
//   };
// };

export const generateNarrationFree = async (text: string): Promise<string> => {
  const ai = ensureClient(freeGeminiClient, 'FREE_GEMINI_API_KEY is not configured.');
  const response = await ai.models.generateContent({
    model: TTS_MODEL,
    contents: {
      parts: [{ text: `Welcome to this tour! ${text}` }],
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Fenrir' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error('No audio data generated.');
  }
  return base64Audio;
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
          text: "Identify the landmark in this photo. If it's a famous building, statue, or place, provide its name. Also provide a very brief (1 sentence) visual description.",
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          visualDescription: { type: Type.STRING },
        },
        required: ['name', 'visualDescription'],
      },
    },
  });

  return parseLandmarkResponse(response);
};

export const getLandmarkDetailsPaid = async (landmarkName: string): Promise<LandmarkDetails> => {
  const ai = ensureClient(paidGeminiClient, 'PAID_GEMINI_API_KEY is not configured.');
  const response = await ai.models.generateContent({
    model: DETAILS_MODEL,
    contents: `Tell me the history and 2 interesting facts about ${landmarkName}. Also include current visitor information (like opening hours or ticket status if available). Keep the tone engaging for a tourist.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  return {
    history: response.text || 'No details found.',
    visitorInfo: '',
    sources: mapSources(response),
  };
};

export const generateNarrationPaid = async (text: string): Promise<string> => {
  const ai = ensureClient(paidGeminiClient, 'PAID_GEMINI_API_KEY is not configured.');
  const response = await ai.models.generateContent({
    model: TTS_MODEL,
    contents: {
      parts: [{ text: `Welcome to this tour! ${text}` }],
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Fenrir' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error('No audio data generated.');
  }
  return base64Audio;
};
