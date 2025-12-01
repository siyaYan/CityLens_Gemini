const MAX_UPLOAD_BYTES = 1024 * 1024; // 1MB limit

export function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  base64Data: string,
  ctx: AudioContext
): Promise<AudioBuffer> {
  const bytes = base64ToBytes(base64Data);
  
  // Gemini TTS returns raw PCM 16-bit LE, 24kHz, Mono
  // We must decode this manually as it lacks file headers (WAV/MP3)
  const sampleRate = 24000;
  const numChannels = 1;
  
  // Ensure we don't read past the buffer if the byte length is odd
  // Int16Array requires a multiple of 2 bytes
  const int16Count = Math.floor(bytes.length / 2);
  const dataInt16 = new Int16Array(bytes.buffer, 0, int16Count);
  
  const frameCount = dataInt16.length / numChannels;
  
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  
  return buffer;
}

export function createWavBlob(base64Data: string): Blob {
  const pcmData = base64ToBytes(base64Data);
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM data
  const pcmBytes = new Uint8Array(buffer, 44);
  pcmBytes.set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
}

const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const estimateBase64Size = (dataUrl: string) => {
  const [, base64] = dataUrl.split(',');
  const payload = base64 ?? dataUrl;
  return Math.ceil((payload.length * 3) / 4);
};

const dataUrlToBase64 = (dataUrl: string) => {
  const [, base64] = dataUrl.split(',');
  return base64 ?? dataUrl;
};

export async function prepareImageForUpload(file: File, maxBytes = MAX_UPLOAD_BYTES): Promise<string> {
  const dataUrl = await readFileAsDataURL(file);
  const image = await loadImageElement(dataUrl);

  const canvas = document.createElement('canvas');
  const MAX_DIMENSION = 1600;
  const MIN_DIMENSION_SCALE = 0.5;
  const MIN_QUALITY = 0.4;

  const renderScaled = (scale: number) => {
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context is not available in this browser.');
    }
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  };

  let scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  scale = scale > 0 ? scale : 1;
  let quality = 0.85;
  let attempts = 0;

  renderScaled(scale);
  let data = canvas.toDataURL('image/jpeg', quality);

  while (estimateBase64Size(data) > maxBytes && attempts < 12) {
    if (quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - 0.1);
    } else if (scale > MIN_DIMENSION_SCALE) {
      scale = Math.max(MIN_DIMENSION_SCALE, scale * 0.85);
      renderScaled(scale);
    } else {
      break;
    }
    data = canvas.toDataURL('image/jpeg', quality);
    attempts += 1;
  }

  if (estimateBase64Size(data) > maxBytes) {
    throw new Error('Unable to compress image below 1MB. Please use a smaller image.');
  }

  return dataUrlToBase64(data);
}
