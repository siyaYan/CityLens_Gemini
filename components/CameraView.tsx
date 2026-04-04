'use client';

import React, { useRef, useState } from 'react';
import { Camera, Upload, Image as ImageIcon, Sparkles } from 'lucide-react';
import { prepareImageForUpload } from '../utils';

interface CameraViewProps {
  onCapture: (base64Image: string) => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture }) => {
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = async (file?: File | null) => {
    if (!file) {
      return;
    }

    setIsProcessing(true);
    try {
      const base64 = await prepareImageForUpload(file);
      onCapture(base64);
    } catch (err) {
      console.error('Error processing file', err);
      alert('Could not process image. Please try another photo under 1MB.');
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    await processFile(e.dataTransfer.files?.[0]);
  };

  return (
    <section className="relative flex min-h-screen items-center px-6 py-10 sm:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-cyan-300/15 bg-cyan-400/10 px-4 py-2 text-sm tracking-[0.3em] text-cyan-100/75">
            <Sparkles size={16} />
            Geo-visual landmark explorer
          </div>

          <div className="space-y-5">
            <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[0.92] text-white sm:text-6xl lg:text-7xl">
              Turn one photo into a landmark on the globe.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Upload an interesting place. CityLens identifies it, gives a short intro, and highlights it on an
              interactive world globe filled with famous preset landmarks.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="glass-panel rounded-[28px] p-5">
              <p className="mb-2 text-xs uppercase tracking-[0.3em] text-cyan-200/60">Step 01</p>
              <p className="text-lg text-white">Upload or shoot a photo</p>
            </div>
            <div className="glass-panel rounded-[28px] p-5">
              <p className="mb-2 text-xs uppercase tracking-[0.3em] text-cyan-200/60">Step 02</p>
              <p className="text-lg text-white">AI identifies the place and geo-pins it</p>
            </div>
            <div className="glass-panel rounded-[28px] p-5">
              <p className="mb-2 text-xs uppercase tracking-[0.3em] text-cyan-200/60">Step 03</p>
              <p className="text-lg text-white">Explore the world map and other landmarks</p>
            </div>
          </div>
        </div>

        <div className="glass-panel glow-outline rounded-[32px] p-5 sm:p-6">
          <div
            className={`relative flex min-h-[420px] flex-col overflow-hidden rounded-[28px] border border-dashed p-6 transition-all duration-300 ${
              dragActive
                ? 'border-cyan-300 bg-cyan-400/10 shadow-[0_0_50px_rgba(103,232,249,0.18)]'
                : 'border-white/12 bg-white/[0.03] hover:border-cyan-300/60 hover:bg-white/[0.05]'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => libraryInputRef.current?.click()}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(111,236,255,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent)]" />
            <div className="relative z-10 flex flex-1 flex-col justify-between">
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-[24px] border border-cyan-300/15 bg-cyan-400/10 p-4 text-cyan-100">
                  <Camera size={36} />
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-300">
                  JPG or PNG under 1MB
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
                  Drop a landmark photo here
                </h2>
                <p className="max-w-md text-base leading-7 text-slate-300">
                  AI identifies the place, gives a short intro, and highlights it on the interactive world globe with
                  other famous landmarks already pinned.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    libraryInputRef.current?.click();
                  }}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-4 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Upload size={18} />
                  {isProcessing ? 'Processing...' : 'Upload Photo'}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/14 bg-white/[0.06] px-5 py-4 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ImageIcon size={18} />
                  Use Camera
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-[24px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
            <span>Best results: clear daylight shots, visible facade, minimal motion blur.</span>
            <span className="hidden rounded-full border border-cyan-300/15 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-100/80 sm:inline-flex">
              Drag and drop enabled
            </span>
          </div>

          <input
            type="file"
            ref={libraryInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
          <input
            type="file"
            ref={cameraInputRef}
            className="hidden"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
          />
        </div>
      </div>
    </section>
  );
};

export default CameraView;
