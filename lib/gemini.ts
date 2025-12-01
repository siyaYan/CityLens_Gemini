import { GoogleGenAI, Modality, Type } from '@google/genai';
import { HfInference } from '@huggingface/inference';
import { LandmarkData, LandmarkDetails, GroundingSource } from '@/types';

const freeGeminiKey = process.env.FREE_GEMINI_API_KEY || '';
const paidGeminiKey = process.env.PAID_GEMINI_API_KEY || '';
const hfToken = process.env.HF_API_TOKEN || '';
const hfModelId = process.env.HF_IMAGE_MODEL_ID || 'black-forest-labs/FLUX.1-dev';

const freeGeminiClient = freeGeminiKey ? new GoogleGenAI({ apiKey: freeGeminiKey }) : null;
const paidGeminiClient = paidGeminiKey ? new GoogleGenAI({ apiKey: paidGeminiKey }) : null;
const hfClient = hfToken ? new HfInference(hfToken) : null;

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

const blobToBase64 = async (blob: Blob) => {
  const buffer = Buffer.from(await blob.arrayBuffer());
  return buffer.toString('base64');
};

export const identifyLandmarkFree = async (base64Image: string, mimeType = 'image/jpeg') => {
  const ai = ensureClient(freeGeminiClient, 'FREE_GEMINI_API_KEY is not configured.');
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
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
    model: 'gemini-2.5-flash',
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

export const generateNarrationFree = async (text: string): Promise<string> => {
  const ai = ensureClient(freeGeminiClient, 'FREE_GEMINI_API_KEY is not configured.');
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
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

export const generateCartoonFree = async (landmarkName: string): Promise<string> => {
  const hf = ensureClient(hfClient, 'HF_API_TOKEN is not configured.');
  const prompt = `Create a vibrant, fun, high-quality cartoon-style illustration of ${landmarkName}. It should look like a travel postcard, with bold colors and a clear composition, suitable for a landmark tour app.`;
  const imageBlob = await hf.textToImage({
    model: hfModelId,
    inputs: prompt,
  });

  if (!imageBlob) {
    throw new Error('No image returned from Hugging Face.');
  }

  return blobToBase64(imageBlob);
};

export const identifyLandmarkPaid = async (base64Image: string, mimeType = 'image/jpeg') => {
  const ai = ensureClient(paidGeminiClient, 'PAID_GEMINI_API_KEY is not configured.');
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
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
    model: 'gemini-2.5-flash',
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
    model: 'gemini-2.5-flash-preview-tts',
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

export const generateCartoonPaid = async (landmarkName: string): Promise<string> => {
  const ai = ensureClient(paidGeminiClient, 'PAID_GEMINI_API_KEY is not configured.');
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
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
