import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RefreshCw, Image as ImageIcon, Sparkles, MapPin, Info, ExternalLink, Download, Loader2 } from 'lucide-react';
import { LandmarkData, LandmarkDetails, AppState } from '../types';
import { decodeAudioData, createWavBlob } from '../utils';
import { generateNarration, generateCartoonPostcard } from '../services/geminiService_free';

interface LandmarkHUDProps {
  image: string;
  landmarkData: LandmarkData;
  details: LandmarkDetails | null;
  onReset: () => void;
  appState: AppState;
}

const LandmarkHUD: React.FC<LandmarkHUDProps> = ({ image, landmarkData, details, onReset, appState }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioDownloadUrl, setAudioDownloadUrl] = useState<string | null>(null);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  
  const [cartoonImage, setCartoonImage] = useState<string | null>(null);
  const [isGeneratingCartoon, setIsGeneratingCartoon] = useState(false);
  const [showCartoon, setShowCartoon] = useState(false);

  // Initialize Audio Context on mount
  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    setAudioContext(ctx);
    return () => {
      ctx.close();
      if (audioDownloadUrl) {
          URL.revokeObjectURL(audioDownloadUrl);
      }
    };
  }, []);

  // Handle Audio Generation & Playback
  const handlePlayAudio = async () => {
    if (!details || !audioContext) return;

    // Resume context if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    if (isPlaying) {
      audioSource?.stop();
      setIsPlaying(false);
      return;
    }

    if (audioBuffer) {
      playBuffer(audioBuffer);
      return;
    }

    setIsGeneratingAudio(true);
    try {
      // Use the history text for narration, limit length if needed
      const narrationText = details.history.slice(0, 800); // Limit to ~800 chars to avoid huge generation
      const base64Audio = await generateNarration(narrationText);
      const buffer = await decodeAudioData(base64Audio, audioContext);
      
      // Create download link for WAV
      const wavBlob = createWavBlob(base64Audio);
      const url = URL.createObjectURL(wavBlob);
      setAudioDownloadUrl(url);

      setAudioBuffer(buffer);
      playBuffer(buffer);
    } catch (e) {
      console.error("Audio generation failed", e);
      alert("Could not generate audio tour. Please try again.");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const playBuffer = (buffer: AudioBuffer) => {
    if (!audioContext) return;
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.onended = () => setIsPlaying(false);
    source.start();
    setAudioSource(source);
    setIsPlaying(true);
  };

  const handleCartoonAction = async () => {
    if (cartoonImage) {
        setShowCartoon(!showCartoon);
        return;
    }
    
    setIsGeneratingCartoon(true);
    try {
        const base64 = await generateCartoonPostcard(landmarkData.name);
        setCartoonImage(base64);
        setShowCartoon(true);
    } catch (e) {
        console.error(e);
        alert("Failed to create cartoon.");
    } finally {
        setIsGeneratingCartoon(false);
    }
  };

  return (
    <div className="relative h-full w-full bg-black overflow-hidden flex flex-col">
      {/* Background Image (Original or Cartoon) */}
      <div className="absolute inset-0 z-0">
        <img 
          src={showCartoon && cartoonImage ? `data:image/png;base64,${cartoonImage}` : `data:image/jpeg;base64,${image}`} 
          className="w-full h-full object-cover opacity-60" 
          alt="Landmark" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />
      </div>

      {/* Header HUD */}
      <div className="relative z-10 p-4 flex justify-between items-start">
         <button onClick={onReset} className="bg-black/40 backdrop-blur border border-white/20 p-2 rounded-full text-white hover:bg-white/20 transition">
            <RefreshCw size={20} />
         </button>
         <div className="flex space-x-2">
            {showCartoon && cartoonImage && (
                <a 
                   href={`data:image/png;base64,${cartoonImage}`} 
                   download={`${landmarkData.name.replace(/\s+/g, '_')}_postcard.png`}
                   className="bg-black/40 backdrop-blur border border-white/20 p-2 rounded-full text-white hover:bg-green-500/50 hover:border-green-400 transition"
                   title="Download Postcard"
                >
                   <Download size={20} />
                </a>
            )}
            <button 
                onClick={handleCartoonAction}
                disabled={(!cartoonImage && !details) || isGeneratingCartoon}
                className={`p-2 rounded-full backdrop-blur border transition flex items-center justify-center ${showCartoon ? 'bg-pink-500/80 border-pink-400 text-white' : 'bg-black/40 border-white/20 text-white'}`}
            >
                {isGeneratingCartoon ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
            </button>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col justify-end p-6 space-y-4 overflow-y-auto pb-24">
        
        {/* Landmark Title Badge */}
        <div className="self-start">
            <div className="inline-flex items-center space-x-2 bg-sky-500/20 backdrop-blur-md border border-sky-500/50 px-4 py-2 rounded-lg">
                <MapPin className="text-sky-400" size={18} />
                <h2 className="text-xl font-display font-bold text-sky-100 uppercase tracking-widest">
                    {landmarkData.name}
                </h2>
            </div>
        </div>

        {/* Loading State for Details */}
        {appState === AppState.FETCHING_DETAILS && (
            <div className="bg-black/50 backdrop-blur-md border border-white/10 p-4 rounded-xl animate-pulse">
                <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-white/20 rounded w-1/2"></div>
                <p className="text-xs text-sky-300 mt-2 font-mono">ACCESSING GLOBAL DATABASE...</p>
            </div>
        )}

        {/* Details Card */}
        {details && (
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl text-slate-200">
                <div className="max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-sky-500 scrollbar-track-transparent">
                     {/* Markdown-ish rendering for plain text */}
                    <p className="text-sm leading-relaxed whitespace-pre-line">{details.history}</p>
                </div>

                {/* Sources */}
                {details.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <p className="text-xs text-slate-400 mb-2 font-bold uppercase">Sources Verified</p>
                    <div className="flex flex-wrap gap-2">
                      {details.sources.map((source, idx) => (
                        <a 
                          key={idx} 
                          href={source.uri} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center space-x-1 text-xs bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/10 transition text-sky-300 truncate max-w-[150px]"
                        >
                          <ExternalLink size={10} />
                          <span className="truncate">{source.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
            </div>
        )}
      </div>

      {/* Bottom Controls */}
      {details && (
        <div className="absolute bottom-0 left-0 w-full z-20 bg-gradient-to-t from-black to-transparent p-6 pt-12">
            <div className="flex items-center gap-4">
                <button 
                    onClick={handlePlayAudio}
                    disabled={isGeneratingAudio}
                    className="flex-1 bg-sky-500 hover:bg-sky-400 text-black font-display font-bold py-4 rounded-xl flex items-center justify-center space-x-3 transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(14,165,233,0.4)]"
                >
                    {isGeneratingAudio ? (
                        <Loader2 className="animate-spin" size={24} />
                    ) : isPlaying ? (
                        <Pause size={24} fill="currentColor" />
                    ) : (
                        <Play size={24} fill="currentColor" />
                    )}
                    <span>{isPlaying ? "PAUSE TOUR" : isGeneratingAudio ? "GENERATING..." : "START AUDIO TOUR"}</span>
                </button>

                {audioDownloadUrl && (
                    <a 
                        href={audioDownloadUrl}
                        download={`${landmarkData.name.replace(/\s+/g, '_')}_tour.wav`}
                        className="bg-slate-700 hover:bg-slate-600 text-white p-4 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center"
                        title="Download Audio Tour"
                    >
                        <Download size={24} />
                    </a>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default LandmarkHUD;