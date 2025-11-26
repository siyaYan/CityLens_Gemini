import { GoogleGenAI, Type, Modality } from "@google/genai";
import { LandmarkData, LandmarkDetails, GroundingSource } from "../types";
import { HfInference } from "@huggingface/inference";  // <-- add this at top of file

const hf = new HfInference(process.env.HF_API_TOKEN!);

// Ensure API key is present
const apiKey = process.env.FREE_GEMINI_API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing from environment variables");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

// 1. Identify the landmark using gemini-3-pro-preview
export const identifyLandmark = async (base64Image: string, mimeType: string = 'image/jpeg'): Promise<LandmarkData> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          },
          {
            text: "Identify the landmark in this photo. If it's a famous building, statue, or place, provide its name. Also provide a very brief (1 sentence) visual description."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            visualDescription: { type: Type.STRING },
          },
          required: ["name", "visualDescription"]
        }
      }
    });

    const jsonText = response.text || "{}";
    return JSON.parse(jsonText) as LandmarkData;
  } catch (error) {
    console.error("Error identifying landmark:", error);
    throw new Error("Could not identify landmark.");
  }
};

// 2. Fetch history and details using gemini-2.5-flash with Google Search
export const getLandmarkDetails = async (landmarkName: string): Promise<LandmarkDetails> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Tell me the history and 2 interesting facts about ${landmarkName}. Also include current visitor information (like opening hours or ticket status if available). Keep the tone engaging for a tourist.`,
      config: {
        tools: [{ googleSearch: {} }],
        // Note: responseMimeType/responseSchema NOT allowed with googleSearch
      }
    });

    const text = response.text || "No details found.";
    
    // Extract grounding sources if available
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = chunks
      .map(chunk => chunk.web)
      .filter(web => web !== undefined && web !== null)
      .map(web => ({
        uri: web!.uri || '',
        title: web!.title || 'Source'
      }));
      
    // Naive parsing since we can't use JSON schema with Search tool easily
    // We'll just return the full text as history for now, split logically if needed in UI
    return {
      history: text,
      visitorInfo: "", // Included in history text due to unstructured response
      sources: sources
    };

  } catch (error) {
    console.error("Error fetching details:", error);
    throw new Error("Could not fetch landmark details.");
  }
};

// 3. Generate Speech using gemini-2.5-flash-preview-tts
export const generateNarration = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: {
        parts: [{ text: `Welcome to this tour! ${text}` }]
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' } // Deep, narrator-like voice
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data generated");
    
    return base64Audio;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw new Error("Could not generate narration.");
  }
};

// // 4. Generate Cartoon Version using gemini-2.5-flash-image(paid)
// export const generateCartoonPostcard = async (landmarkName: string): Promise<string> => {
//   try {
//     const response = await ai.models.generateContent({
//       model: 'gemini-2.5-flash-image',
//       contents: {
//         parts: [
//           {
//             text: `Create a vibrant, fun, high-quality cartoon-style illustration of ${landmarkName}. It should look like a travel postcard.`
//           }
//         ]
//       },
//       config: {
//         imageConfig: {
//             aspectRatio: "4:3",
//         },
//       }
//     });

//     // Check parts for the image
//     const parts = response.candidates?.[0]?.content?.parts;
//     if (parts) {
//       for (const part of parts) {
//         if (part.inlineData && part.inlineData.data) {
//           return part.inlineData.data;
//         }
//       }
//     }
    
//     throw new Error("No image generated");
//   } catch (error) {
//     console.error("Error generating cartoon:", error);
//     throw new Error("Could not generate cartoon.");
//   }
// };


// 5. Generate Cartoon Version using Hugging Face Inference API

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;           // "data:image/png;base64,AAA..."
      const [, base64] = result.split(",");             // take the part after comma
      resolve(base64 ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export const generateCartoonPostcard = async (landmarkName: string): Promise<string> => {
  const modelId = process.env.HF_IMAGE_MODEL_ID || "black-forest-labs/FLUX.1-dev";

  if (!process.env.HF_API_TOKEN) {
    console.error("HF_API_TOKEN is missing from environment variables");
    throw new Error("Hugging Face API token is missing.");
  }

  const prompt = `Create a vibrant, fun, high-quality cartoon-style illustration of ${landmarkName}. 
It should look like a travel postcard, with bold colors and a clear composition, suitable for a landmark tour app.`;

  try {
    const imageBlob = await hf.textToImage({
      model: modelId,
      inputs: prompt,
      // optional: force a specific provider, e.g. "fal-ai"
      // provider: "fal-ai",
    });
    if (!imageBlob) {
      throw new Error("No image returned from Hugging Face.");
    }

    // convert Blob -> base64 so you can keep your existing frontend logic
    const base64Image = await blobToBase64(imageBlob);

    return base64Image;
  } catch (error) {
    console.error("Error generating cartoon via Hugging Face:", error);
    throw new Error("Could not generate cartoon postcard via Hugging Face.");
  }
};


