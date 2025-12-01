import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { HfInference } from '@huggingface/inference';
import { LandmarkData, LandmarkDetails, GroundingSource } from '../types';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const PORT = Number(process.env.PORT) || 4000;
const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN?.split(',').map(origin => origin.trim()).filter(Boolean) || '*',
}));
app.use(express.json({ limit: '15mb' }));

const geminiApiKey = process.env.FREE_GEMINI_API_KEY;
const aiClient = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

const paidGeminiApiKey = process.env.PAID_GEMINI_API_KEY;
const paidAiClient = paidGeminiApiKey ? new GoogleGenAI({ apiKey: paidGeminiApiKey }) : null;

const hfToken = process.env.HF_API_TOKEN;
const hfClient = hfToken ? new HfInference(hfToken) : null;

const ensureGeminiClient = () => {
  if (!aiClient) {
    throw new Error('Gemini API key is not configured.');
  }
  return aiClient;
};

const ensurePaidGeminiClient = () => {
  if (!paidAiClient) {
    throw new Error('Paid Gemini API key is not configured.');
  }
  return paidAiClient;
};

const ensureHfClient = () => {
  if (!hfClient) {
    throw new Error('Hugging Face API token is not configured.');
  }
  return hfClient;
};

const identifyLandmark = async (base64Image: string, mimeType = 'image/jpeg'): Promise<LandmarkData> => {
  const ai = ensureGeminiClient();
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
          text: 'Identify the landmark in this photo. If it is a famous building, statue, or place, provide its name and a brief (1 sentence) visual description.',
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

  const jsonText = response.text || '{}';
  return JSON.parse(jsonText) as LandmarkData;
};

const getLandmarkDetails = async (landmarkName: string): Promise<LandmarkDetails> => {
  const ai = ensureGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Tell me the history and 2 interesting facts about ${landmarkName}. Also include current visitor information (like opening hours or ticket status if available). Keep the tone engaging for a tourist.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text || 'No details found.';
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources: GroundingSource[] = chunks
    .map(chunk => chunk.web)
    .filter((web): web is NonNullable<typeof web> => Boolean(web))
    .map(web => ({
      uri: web.uri || '',
      title: web.title || 'Source',
    }));

  return {
    history: text,
    visitorInfo: '',
    sources,
  };
};

const generateNarration = async (text: string): Promise<string> => {
  const ai = ensureGeminiClient();
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

const blobToBase64 = async (blob: Blob) => {
  const buffer = Buffer.from(await blob.arrayBuffer());
  return buffer.toString('base64');
};

const generateCartoonPostcard = async (landmarkName: string): Promise<string> => {
  const hf = ensureHfClient();
  const modelId = process.env.HF_IMAGE_MODEL_ID || 'black-forest-labs/FLUX.1-dev';
  const prompt = `Create a vibrant, fun, high-quality cartoon-style illustration of ${landmarkName}. It should look like a travel postcard, with bold colors and a clear composition, suitable for a landmark tour app.`;

  const imageBlob = await hf.textToImage({
    model: modelId,
    inputs: prompt,
  });

  if (!imageBlob) {
    throw new Error('No image returned from Hugging Face.');
  }

  return blobToBase64(imageBlob);
};

const identifyLandmarkPaid = async (base64Image: string, mimeType = 'image/jpeg'): Promise<LandmarkData> => {
  const ai = ensurePaidGeminiClient();
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
          text: 'Identify the landmark in this photo. If it is a famous building, statue, or place, provide its name and a brief (1 sentence) visual description.',
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

  const jsonText = response.text || '{}';
  return JSON.parse(jsonText) as LandmarkData;
};

const getLandmarkDetailsPaid = async (landmarkName: string): Promise<LandmarkDetails> => {
  const ai = ensurePaidGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Tell me the history and 2 interesting facts about ${landmarkName}. Also include current visitor information (like opening hours or ticket status if available). Keep the tone engaging for a tourist.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text || 'No details found.';
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources: GroundingSource[] = chunks
    .map(chunk => chunk.web)
    .filter((web): web is NonNullable<typeof web> => Boolean(web))
    .map(web => ({
      uri: web.uri || '',
      title: web.title || 'Source',
    }));

  return {
    history: text,
    visitorInfo: '',
    sources,
  };
};

const generateNarrationPaid = async (text: string): Promise<string> => {
  const ai = ensurePaidGeminiClient();
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

const generateCartoonPostcardPaid = async (landmarkName: string): Promise<string> => {
  const ai = ensurePaidGeminiClient();
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

  throw new Error('No image generated from Gemini image model.');
};

const asyncRoute = <T extends express.RequestHandler>(handler: T): express.RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

app.post('/api/identify', asyncRoute(async (req, res) => {
  const { image, mimeType } = req.body as { image?: string; mimeType?: string };
  if (!image) {
    return res.status(400).json({ error: 'Image is required.' });
  }

  const data = await identifyLandmark(image, mimeType);
  res.json(data);
}));

app.post('/api/details', asyncRoute(async (req, res) => {
  const { landmarkName } = req.body as { landmarkName?: string };
  if (!landmarkName) {
    return res.status(400).json({ error: 'landmarkName is required.' });
  }

  const details = await getLandmarkDetails(landmarkName);
  res.json(details);
}));

app.post('/api/narration', asyncRoute(async (req, res) => {
  const { text } = req.body as { text?: string };
  if (!text) {
    return res.status(400).json({ error: 'text is required.' });
  }

  const audio = await generateNarration(text);
  res.json({ audio });
}));

app.post('/api/cartoon', asyncRoute(async (req, res) => {
  const { landmarkName } = req.body as { landmarkName?: string };
  if (!landmarkName) {
    return res.status(400).json({ error: 'landmarkName is required.' });
  }

  const image = await generateCartoonPostcard(landmarkName);
  res.json({ image });
}));

app.post('/api/paid/identify', asyncRoute(async (req, res) => {
  const { image, mimeType } = req.body as { image?: string; mimeType?: string };
  if (!image) {
    return res.status(400).json({ error: 'Image is required.' });
  }

  const data = await identifyLandmarkPaid(image, mimeType);
  res.json(data);
}));

app.post('/api/paid/details', asyncRoute(async (req, res) => {
  const { landmarkName } = req.body as { landmarkName?: string };
  if (!landmarkName) {
    return res.status(400).json({ error: 'landmarkName is required.' });
  }

  const details = await getLandmarkDetailsPaid(landmarkName);
  res.json(details);
}));

app.post('/api/paid/narration', asyncRoute(async (req, res) => {
  const { text } = req.body as { text?: string };
  if (!text) {
    return res.status(400).json({ error: 'text is required.' });
  }

  const audio = await generateNarrationPaid(text);
  res.json({ audio });
}));

app.post('/api/paid/cartoon', asyncRoute(async (req, res) => {
  const { landmarkName } = req.body as { landmarkName?: string };
  if (!landmarkName) {
    return res.status(400).json({ error: 'landmarkName is required.' });
  }

  const image = await generateCartoonPostcardPaid(landmarkName);
  res.json({ image });
}));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});
